using Microsoft.Data.SqlClient;
using System.Data;
using System.Text.Json;

namespace DER3.Api.Repositories
{
    public sealed record StandardRecord(
        string Id,
        string PolicyId,
        string? PolicyItemId,
        string? PolicyItemIdsJson,
        string NameAr,
        string NameEn,
        string? DescriptionAr,
        string? DescriptionEn,
        string? PotentialRisksAr,
        string? PotentialRisksEn,
        string ClassificationsJson,
        string AttachmentsJson,
        DateTime CreatedAt,
        DateTime UpdatedAt);

    public interface IStandardRepository
    {
        Task<Dictionary<string, object?>?> InsertAsync(StandardRecord standard, CancellationToken cancellationToken);
        Task<Dictionary<string, object?>?> UpdateAsync(string id, IReadOnlyDictionary<string, object?> fields, CancellationToken cancellationToken);
        Task<bool> DeleteAsync(string id, string? deletedBy, CancellationToken cancellationToken);
    }

    public sealed class StandardRepository : IStandardRepository
    {
        private readonly IConfiguration _configuration;

        public StandardRepository(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        public async Task<Dictionary<string, object?>?> InsertAsync(StandardRecord standard, CancellationToken cancellationToken)
        {
            await using var connection = await OpenConnectionAsync(cancellationToken);
            await using var command = connection.CreateCommand();
            command.CommandText = """
                INSERT INTO Standard (id, policyId, policyItemId, policyItemIds, nameAr, nameEn, descriptionAr, descriptionEn, potentialRisksAr, potentialRisksEn, classifications, attachments, createdAt, updatedAt)
                VALUES (@id, @policyId, @policyItemId, @policyItemIds, @nameAr, @nameEn, @descriptionAr, @descriptionEn, @potentialRisksAr, @potentialRisksEn, @classifications, @attachments, @createdAt, @updatedAt)
                """;

            AddNVarChar(command, "@id", 64, standard.Id);
            AddNVarChar(command, "@policyId", 64, standard.PolicyId);
            AddNVarChar(command, "@policyItemId", 64, standard.PolicyItemId);
            AddNVarCharMax(command, "@policyItemIds", standard.PolicyItemIdsJson);
            AddNVarChar(command, "@nameAr", 255, standard.NameAr);
            AddNVarChar(command, "@nameEn", 255, standard.NameEn);
            AddNVarCharMax(command, "@descriptionAr", standard.DescriptionAr);
            AddNVarCharMax(command, "@descriptionEn", standard.DescriptionEn);
            AddNVarCharMax(command, "@potentialRisksAr", standard.PotentialRisksAr);
            AddNVarCharMax(command, "@potentialRisksEn", standard.PotentialRisksEn);
            AddNVarCharMax(command, "@classifications", standard.ClassificationsJson);
            AddNVarCharMax(command, "@attachments", standard.AttachmentsJson);
            AddDateTime(command, "@createdAt", standard.CreatedAt);
            AddDateTime(command, "@updatedAt", standard.UpdatedAt);

            await command.ExecuteNonQueryAsync(cancellationToken);
            return await FindByIdAsync(connection, standard.Id, cancellationToken);
        }

        public async Task<Dictionary<string, object?>?> UpdateAsync(string id, IReadOnlyDictionary<string, object?> fields, CancellationToken cancellationToken)
        {
            await using var connection = await OpenConnectionAsync(cancellationToken);
            await using var command = connection.CreateCommand();
            command.CommandText = $"UPDATE Standard SET {string.Join(", ", fields.Keys.Select((key, index) => $"[{key}] = @p{index}"))} WHERE id = @id AND IsDeleted = 0";

            var index = 0;
            foreach (var (key, value) in fields)
            {
                AddStandardParameter(command, $"@p{index}", key, value);
                index++;
            }

            AddNVarChar(command, "@id", 64, id);
            var rowsAffected = await command.ExecuteNonQueryAsync(cancellationToken);
            return rowsAffected == 0 ? null : await FindByIdAsync(connection, id, cancellationToken);
        }

        public async Task<bool> DeleteAsync(string id, string? deletedBy, CancellationToken cancellationToken)
        {
            await using var connection = await OpenConnectionAsync(cancellationToken);
            await using var command = connection.CreateCommand();
            command.CommandText = """
                UPDATE Standard
                SET IsDeleted = 1,
                    DeletedAt = SYSUTCDATETIME(),
                    DeletedBy = @DeletedBy
                WHERE id = @id
                  AND IsDeleted = 0
                """;
            AddNVarChar(command, "@id", 64, id);
            AddNVarChar(command, "@DeletedBy", 100, deletedBy);

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
            command.CommandText = "SELECT id, policyId, policyItemId, policyItemIds, nameAr, nameEn, descriptionAr, descriptionEn, potentialRisksAr, potentialRisksEn, classifications, attachments, createdAt, updatedAt FROM Standard WHERE id = @id AND IsDeleted = 0";
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
                row[columnName] = IsJsonArrayField(columnName) ? ParseStringArray(value) : value;
            }

            return row;
        }

        private static bool IsJsonArrayField(string columnName) =>
            columnName.Equals("classifications", StringComparison.OrdinalIgnoreCase) ||
            columnName.Equals("attachments", StringComparison.OrdinalIgnoreCase) ||
            columnName.Equals("policyItemIds", StringComparison.OrdinalIgnoreCase);

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

        private static void AddStandardParameter(SqlCommand command, string name, string key, object? value)
        {
            switch (key)
            {
                case "policyId":
                case "policyItemId":
                    AddNVarChar(command, name, 64, value);
                    break;
                case "nameAr":
                case "nameEn":
                    AddNVarChar(command, name, 255, value);
                    break;
                case "descriptionAr":
                case "descriptionEn":
                case "potentialRisksAr":
                case "potentialRisksEn":
                case "classifications":
                case "attachments":
                case "policyItemIds":
                    AddNVarCharMax(command, name, value);
                    break;
                case "createdAt":
                case "updatedAt":
                    AddDateTime(command, name, value);
                    break;
                default:
                    throw new InvalidOperationException($"Unsupported Standard field '{key}'.");
            }
        }

        private static void AddNVarChar(SqlCommand command, string name, int size, object? value) =>
            command.Parameters.Add(new SqlParameter(name, SqlDbType.NVarChar, size) { Value = value ?? DBNull.Value });

        private static void AddNVarCharMax(SqlCommand command, string name, object? value) =>
            command.Parameters.Add(new SqlParameter(name, SqlDbType.NVarChar, -1) { Value = value ?? DBNull.Value });

        private static void AddDateTime(SqlCommand command, string name, object? value) =>
            command.Parameters.Add(new SqlParameter(name, SqlDbType.DateTime) { Value = value ?? DBNull.Value });
    }
}
