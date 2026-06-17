using Microsoft.Data.SqlClient;
using System.Data;
using System.Text.Json;

namespace DER3.Api.Repositories
{
    public sealed record PolicyItemRecord(
        string Id,
        string PolicyId,
        string? ParentId,
        int? Order,
        string NameAr,
        string NameEn,
        string? DescriptionAr,
        string? DescriptionEn,
        string AttachmentsJson,
        DateTime CreatedAt,
        DateTime UpdatedAt);

    public interface IPolicyItemRepository
    {
        Task<Dictionary<string, object?>?> InsertAsync(PolicyItemRecord item, CancellationToken cancellationToken);

        Task<Dictionary<string, object?>?> UpdateAsync(string id, IReadOnlyDictionary<string, object?> fields, CancellationToken cancellationToken);

        Task<bool> DeleteAsync(string id, CancellationToken cancellationToken);
    }

    public sealed class PolicyItemRepository : IPolicyItemRepository
    {
        private readonly IConfiguration _configuration;

        public PolicyItemRepository(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        public async Task<Dictionary<string, object?>?> InsertAsync(PolicyItemRecord item, CancellationToken cancellationToken)
        {
            await using var connection = await OpenConnectionAsync(cancellationToken);
            await using var command = connection.CreateCommand();
            command.CommandText = """
                INSERT INTO PolicyItem (id, policyId, parentId, [order], nameAr, nameEn, descriptionAr, descriptionEn, attachments, createdAt, updatedAt)
                VALUES (@id, @policyId, @parentId, @order, @nameAr, @nameEn, @descriptionAr, @descriptionEn, @attachments, @createdAt, @updatedAt)
                """;

            AddNVarChar(command, "@id", 64, item.Id);
            AddNVarChar(command, "@policyId", 64, item.PolicyId);
            AddNVarChar(command, "@parentId", 64, item.ParentId);
            AddInt(command, "@order", item.Order);
            AddNVarCharMax(command, "@nameAr", item.NameAr);
            AddNVarCharMax(command, "@nameEn", item.NameEn);
            AddNVarCharMax(command, "@descriptionAr", item.DescriptionAr);
            AddNVarCharMax(command, "@descriptionEn", item.DescriptionEn);
            AddNVarCharMax(command, "@attachments", item.AttachmentsJson);
            AddDateTime(command, "@createdAt", item.CreatedAt);
            AddDateTime(command, "@updatedAt", item.UpdatedAt);

            await command.ExecuteNonQueryAsync(cancellationToken);
            return await FindByIdAsync(connection, item.Id, cancellationToken);
        }

        public async Task<Dictionary<string, object?>?> UpdateAsync(string id, IReadOnlyDictionary<string, object?> fields, CancellationToken cancellationToken)
        {
            await using var connection = await OpenConnectionAsync(cancellationToken);
            await using var command = connection.CreateCommand();

            var assignments = fields.Keys.Select((key, index) => key == "order" ? $"[order] = @p{index}" : $"[{key}] = @p{index}").ToArray();
            command.CommandText = $"UPDATE PolicyItem SET {string.Join(", ", assignments)} WHERE id = @id";

            var parameterIndex = 0;
            foreach (var (key, value) in fields)
            {
                AddPolicyItemParameter(command, $"@p{parameterIndex}", key, value);
                parameterIndex++;
            }

            AddNVarChar(command, "@id", 64, id);
            var rowsAffected = await command.ExecuteNonQueryAsync(cancellationToken);
            return rowsAffected == 0 ? null : await FindByIdAsync(connection, id, cancellationToken);
        }

        public async Task<bool> DeleteAsync(string id, CancellationToken cancellationToken)
        {
            await using var connection = await OpenConnectionAsync(cancellationToken);
            await using var command = connection.CreateCommand();
            command.CommandText = "DELETE FROM PolicyItem WHERE id = @id";
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
            command.CommandText = "SELECT id, policyId, parentId, [order], nameAr, nameEn, descriptionAr, descriptionEn, attachments, createdAt, updatedAt FROM PolicyItem WHERE id = @id";
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
                row[columnName] = columnName.Equals("attachments", StringComparison.OrdinalIgnoreCase)
                    ? ParseAttachments(value)
                    : value;
            }

            return row;
        }

        private static object ParseAttachments(object? value)
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

        private static void AddPolicyItemParameter(SqlCommand command, string name, string key, object? value)
        {
            switch (key)
            {
                case "policyId":
                case "parentId":
                    AddNVarChar(command, name, 64, value);
                    break;
                case "order":
                    AddInt(command, name, value);
                    break;
                case "nameAr":
                case "nameEn":
                case "descriptionAr":
                case "descriptionEn":
                case "attachments":
                    AddNVarCharMax(command, name, value);
                    break;
                case "createdAt":
                case "updatedAt":
                    AddDateTime(command, name, value);
                    break;
                default:
                    throw new InvalidOperationException($"Unsupported PolicyItem field '{key}'.");
            }
        }

        private static void AddNVarChar(SqlCommand command, string name, int size, object? value) =>
            command.Parameters.Add(new SqlParameter(name, SqlDbType.NVarChar, size) { Value = value ?? DBNull.Value });

        private static void AddNVarCharMax(SqlCommand command, string name, object? value) =>
            command.Parameters.Add(new SqlParameter(name, SqlDbType.NVarChar, -1) { Value = value ?? DBNull.Value });

        private static void AddInt(SqlCommand command, string name, object? value) =>
            command.Parameters.Add(new SqlParameter(name, SqlDbType.Int) { Value = value ?? DBNull.Value });

        private static void AddDateTime(SqlCommand command, string name, object? value) =>
            command.Parameters.Add(new SqlParameter(name, SqlDbType.DateTime) { Value = value ?? DBNull.Value });
    }
}
