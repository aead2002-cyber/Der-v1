using Microsoft.Data.SqlClient;
using System.Data;

namespace DER3.Api.Repositories
{
    public sealed record LookupOptionRecord(
        string Id,
        string Category,
        string Value,
        string LabelAr,
        string LabelEn,
        bool IsActive,
        string? DescriptionAr,
        string? DescriptionEn);

    public interface ILookupOptionRepository
    {
        Task<Dictionary<string, object?>?> InsertAsync(LookupOptionRecord lookupOption, CancellationToken cancellationToken);
        Task<Dictionary<string, object?>?> UpdateAsync(string id, IReadOnlyDictionary<string, object?> fields, CancellationToken cancellationToken);
        Task<bool> DeleteAsync(string id, CancellationToken cancellationToken);
    }

    public sealed class LookupOptionRepository : ILookupOptionRepository
    {
        private readonly IConfiguration _configuration;

        public LookupOptionRepository(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        public async Task<Dictionary<string, object?>?> InsertAsync(LookupOptionRecord lookupOption, CancellationToken cancellationToken)
        {
            await using var connection = await OpenConnectionAsync(cancellationToken);
            await using var command = connection.CreateCommand();
            command.CommandText = """
                INSERT INTO LookupOption (id, category, value, labelAr, labelEn, isActive, descriptionAr, descriptionEn)
                VALUES (@id, @category, @value, @labelAr, @labelEn, @isActive, @descriptionAr, @descriptionEn)
                """;

            AddNVarChar(command, "@id", 64, lookupOption.Id);
            AddNVarChar(command, "@category", 255, lookupOption.Category);
            AddNVarChar(command, "@value", 255, lookupOption.Value);
            AddNVarChar(command, "@labelAr", 255, lookupOption.LabelAr);
            AddNVarChar(command, "@labelEn", 255, lookupOption.LabelEn);
            AddBit(command, "@isActive", lookupOption.IsActive);
            AddNVarCharMax(command, "@descriptionAr", lookupOption.DescriptionAr);
            AddNVarCharMax(command, "@descriptionEn", lookupOption.DescriptionEn);

            await command.ExecuteNonQueryAsync(cancellationToken);
            return await FindByIdAsync(connection, lookupOption.Id, cancellationToken);
        }

        public async Task<Dictionary<string, object?>?> UpdateAsync(string id, IReadOnlyDictionary<string, object?> fields, CancellationToken cancellationToken)
        {
            await using var connection = await OpenConnectionAsync(cancellationToken);
            await using var command = connection.CreateCommand();
            command.CommandText = $"UPDATE LookupOption SET {string.Join(", ", fields.Keys.Select((key, index) => $"[{key}] = @p{index}"))} WHERE id = @id";

            var index = 0;
            foreach (var (key, value) in fields)
            {
                AddLookupOptionParameter(command, $"@p{index}", key, value);
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
            command.CommandText = "DELETE FROM LookupOption WHERE id = @id";
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
            command.CommandText = "SELECT id, category, value, labelAr, labelEn, isActive, descriptionAr, descriptionEn FROM LookupOption WHERE id = @id";
            AddNVarChar(command, "@id", 64, id);

            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            return await reader.ReadAsync(cancellationToken) ? await ReadRowAsync(reader, cancellationToken) : null;
        }

        private static async Task<Dictionary<string, object?>> ReadRowAsync(SqlDataReader reader, CancellationToken cancellationToken)
        {
            var row = new Dictionary<string, object?>(StringComparer.Ordinal);
            for (var i = 0; i < reader.FieldCount; i++)
            {
                row[reader.GetName(i)] = await reader.IsDBNullAsync(i, cancellationToken) ? null : reader.GetValue(i);
            }

            return row;
        }

        private static void AddLookupOptionParameter(SqlCommand command, string name, string key, object? value)
        {
            switch (key)
            {
                case "category":
                case "value":
                case "labelAr":
                case "labelEn":
                    AddNVarChar(command, name, 255, value);
                    break;
                case "isActive":
                    AddBit(command, name, value);
                    break;
                case "descriptionAr":
                case "descriptionEn":
                    AddNVarCharMax(command, name, value);
                    break;
                default:
                    throw new InvalidOperationException($"Unsupported LookupOption field '{key}'.");
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
