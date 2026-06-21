using Microsoft.Data.SqlClient;
using System.Data;
using System.Text.Json;

namespace DER3.Api.Repositories
{
    public sealed record PermissionGroupRecord(
        string Id,
        string? NameAr,
        string? NameEn,
        string? DescriptionAr,
        string? DescriptionEn,
        bool IsSystem,
        string PermissionsJson,
        string? CreatedAt,
        string? UpdatedAt);

    public interface IPermissionGroupRepository
    {
        Task<IReadOnlyList<Dictionary<string, object?>>> GetAllAsync(CancellationToken cancellationToken);
        Task<Dictionary<string, object?>?> InsertAsync(PermissionGroupRecord permissionGroup, CancellationToken cancellationToken);
        Task<Dictionary<string, object?>?> UpdateAsync(string id, IReadOnlyDictionary<string, object?> fields, CancellationToken cancellationToken);
        Task<bool> DeleteAsync(string id, CancellationToken cancellationToken);
    }

    public sealed class PermissionGroupRepository : IPermissionGroupRepository
    {
        private readonly IConfiguration _configuration;

        public PermissionGroupRepository(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        public async Task<IReadOnlyList<Dictionary<string, object?>>> GetAllAsync(CancellationToken cancellationToken)
        {
            await using var connection = await OpenConnectionAsync(cancellationToken);
            await using var command = connection.CreateCommand();
            command.CommandText = "SELECT id, nameAr, nameEn, descriptionAr, descriptionEn, isSystem, permissions, createdAt, updatedAt FROM PermissionGroup";

            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            var rows = new List<Dictionary<string, object?>>();
            while (await reader.ReadAsync(cancellationToken))
            {
                rows.Add(await ReadRowAsync(reader, cancellationToken));
            }

            return rows;
        }

        public async Task<Dictionary<string, object?>?> InsertAsync(PermissionGroupRecord permissionGroup, CancellationToken cancellationToken)
        {
            await using var connection = await OpenConnectionAsync(cancellationToken);
            await using var command = connection.CreateCommand();
            command.CommandText = """
                INSERT INTO PermissionGroup (id, nameAr, nameEn, descriptionAr, descriptionEn, isSystem, permissions, createdAt, updatedAt)
                VALUES (@id, @nameAr, @nameEn, @descriptionAr, @descriptionEn, @isSystem, @permissions, @createdAt, @updatedAt)
                """;

            AddNVarChar(command, "@id", 64, permissionGroup.Id);
            AddNVarChar(command, "@nameAr", 255, permissionGroup.NameAr);
            AddNVarChar(command, "@nameEn", 255, permissionGroup.NameEn);
            AddNVarCharMax(command, "@descriptionAr", permissionGroup.DescriptionAr);
            AddNVarCharMax(command, "@descriptionEn", permissionGroup.DescriptionEn);
            AddBit(command, "@isSystem", permissionGroup.IsSystem);
            AddNVarCharMax(command, "@permissions", permissionGroup.PermissionsJson);
            AddNVarChar(command, "@createdAt", 64, permissionGroup.CreatedAt);
            AddNVarChar(command, "@updatedAt", 64, permissionGroup.UpdatedAt);

            await command.ExecuteNonQueryAsync(cancellationToken);
            return await FindByIdAsync(connection, permissionGroup.Id, cancellationToken);
        }

        public async Task<Dictionary<string, object?>?> UpdateAsync(string id, IReadOnlyDictionary<string, object?> fields, CancellationToken cancellationToken)
        {
            await using var connection = await OpenConnectionAsync(cancellationToken);
            await using var command = connection.CreateCommand();
            command.CommandText = $"UPDATE PermissionGroup SET {string.Join(", ", fields.Keys.Select((key, index) => $"[{key}] = @p{index}"))} WHERE id = @id";

            var index = 0;
            foreach (var (key, value) in fields)
            {
                AddPermissionGroupParameter(command, $"@p{index}", key, value);
                index++;
            }

            AddNVarChar(command, "@id", 64, id);
            var rowsAffected = await command.ExecuteNonQueryAsync(cancellationToken);
            return rowsAffected == 0 ? null : await FindByIdAsync(connection, id, cancellationToken);
        }

        public async Task<bool> DeleteAsync(string id, CancellationToken cancellationToken)
        {
            await using var connection = await OpenConnectionAsync(cancellationToken);
            await using var command = connection.CreateCommand();
            command.CommandText = "DELETE FROM PermissionGroup WHERE id = @id";
            AddNVarChar(command, "@id", 64, id);

            var rowsAffected = await command.ExecuteNonQueryAsync(cancellationToken);
            return rowsAffected > 0;
        }

        private async Task<SqlConnection> OpenConnectionAsync(CancellationToken cancellationToken)
        {
            var connectionString = _configuration.GetConnectionString("DefaultConnection");
            if (string.IsNullOrWhiteSpace(connectionString))
            {
                throw new InvalidOperationException("DefaultConnection is not configured.");
            }

            var connection = new SqlConnection(connectionString);
            await connection.OpenAsync(cancellationToken);
            return connection;
        }

        private static async Task<Dictionary<string, object?>?> FindByIdAsync(SqlConnection connection, string id, CancellationToken cancellationToken)
        {
            await using var command = connection.CreateCommand();
            command.CommandText = "SELECT id, nameAr, nameEn, descriptionAr, descriptionEn, isSystem, permissions, createdAt, updatedAt FROM PermissionGroup WHERE id = @id";
            AddNVarChar(command, "@id", 64, id);

            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            return await reader.ReadAsync(cancellationToken) ? await ReadRowAsync(reader, cancellationToken) : null;
        }

        private static async Task<Dictionary<string, object?>> ReadRowAsync(SqlDataReader reader, CancellationToken cancellationToken)
        {
            var row = new Dictionary<string, object?>(StringComparer.Ordinal);
            for (var i = 0; i < reader.FieldCount; i++)
            {
                var columnName = reader.GetName(i);
                var value = await reader.IsDBNullAsync(i, cancellationToken) ? null : reader.GetValue(i);
                row[columnName] = columnName.Equals("permissions", StringComparison.OrdinalIgnoreCase)
                    ? ParseStringArray(value)
                    : value;
            }

            return row;
        }

        private static object ParseStringArray(object? value)
        {
            if (value is not string text || string.IsNullOrWhiteSpace(text))
            {
                return Array.Empty<string>();
            }

            try
            {
                return JsonSerializer.Deserialize<List<string>>(text) ?? new List<string>();
            }
            catch (JsonException)
            {
                return Array.Empty<string>();
            }
        }

        private static void AddPermissionGroupParameter(SqlCommand command, string name, string key, object? value)
        {
            switch (key)
            {
                case "nameAr":
                case "nameEn":
                    AddNVarChar(command, name, 255, value);
                    break;
                case "descriptionAr":
                case "descriptionEn":
                case "permissions":
                    AddNVarCharMax(command, name, value);
                    break;
                case "isSystem":
                    AddBit(command, name, value);
                    break;
                case "createdAt":
                case "updatedAt":
                    AddNVarChar(command, name, 64, value);
                    break;
                default:
                    throw new InvalidOperationException($"Unsupported PermissionGroup field '{key}'.");
            }
        }

        private static void AddNVarChar(SqlCommand command, string name, int size, object? value) =>
            command.Parameters.Add(new SqlParameter(name, SqlDbType.NVarChar, size) { Value = value ?? DBNull.Value });

        private static void AddNVarCharMax(SqlCommand command, string name, object? value) =>
            command.Parameters.Add(new SqlParameter(name, SqlDbType.NVarChar, -1) { Value = value ?? DBNull.Value });

        private static void AddBit(SqlCommand command, string name, object? value) =>
            command.Parameters.Add(new SqlParameter(name, SqlDbType.Bit) { Value = value ?? DBNull.Value });
    }
}
