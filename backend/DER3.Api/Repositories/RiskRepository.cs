using Microsoft.Data.SqlClient;
using System.Data;
using System.Text.Json;

namespace DER3.Api.Repositories
{
    public sealed record RiskRecord(
        string Id,
        string? NameAr,
        string? NameEn,
        string? DescriptionAr,
        string? DescriptionEn,
        int? Likelihood,
        int? Impact,
        string ProcedureIdsJson,
        DateTime? CreatedAt,
        DateTime? UpdatedAt);

    public interface IRiskRepository
    {
        Task<Dictionary<string, object?>?> InsertAsync(RiskRecord risk, CancellationToken cancellationToken);
        Task<Dictionary<string, object?>?> UpdateAsync(string id, IReadOnlyDictionary<string, object?> fields, CancellationToken cancellationToken);
        Task<bool> DeleteAsync(string id, CancellationToken cancellationToken);
    }

    public sealed class RiskRepository : IRiskRepository
    {
        private readonly IConfiguration _configuration;

        public RiskRepository(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        public async Task<Dictionary<string, object?>?> InsertAsync(RiskRecord risk, CancellationToken cancellationToken)
        {
            await using var connection = await OpenConnectionAsync(cancellationToken);
            await using var command = connection.CreateCommand();
            command.CommandText = """
                INSERT INTO Risk (id, nameAr, nameEn, descriptionAr, descriptionEn, likelihood, impact, procedureIds, createdAt, updatedAt)
                VALUES (@id, @nameAr, @nameEn, @descriptionAr, @descriptionEn, @likelihood, @impact, @procedureIds, @createdAt, @updatedAt)
                """;

            AddNVarChar(command, "@id", 64, risk.Id);
            AddNVarChar(command, "@nameAr", 500, risk.NameAr);
            AddNVarChar(command, "@nameEn", 500, risk.NameEn);
            AddNVarCharMax(command, "@descriptionAr", risk.DescriptionAr);
            AddNVarCharMax(command, "@descriptionEn", risk.DescriptionEn);
            AddInt(command, "@likelihood", risk.Likelihood);
            AddInt(command, "@impact", risk.Impact);
            AddNVarCharMax(command, "@procedureIds", risk.ProcedureIdsJson);
            AddDateTime(command, "@createdAt", risk.CreatedAt);
            AddDateTime(command, "@updatedAt", risk.UpdatedAt);

            await command.ExecuteNonQueryAsync(cancellationToken);
            return await FindByIdAsync(connection, risk.Id, cancellationToken);
        }

        public async Task<Dictionary<string, object?>?> UpdateAsync(string id, IReadOnlyDictionary<string, object?> fields, CancellationToken cancellationToken)
        {
            await using var connection = await OpenConnectionAsync(cancellationToken);
            await using var command = connection.CreateCommand();
            command.CommandText = $"UPDATE Risk SET {string.Join(", ", fields.Keys.Select((key, index) => $"[{key}] = @p{index}"))} WHERE id = @id";

            var index = 0;
            foreach (var (key, value) in fields)
            {
                AddRiskParameter(command, $"@p{index}", key, value);
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
            command.CommandText = "DELETE FROM Risk WHERE id = @id";
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
            command.CommandText = "SELECT id, nameAr, nameEn, descriptionAr, descriptionEn, likelihood, impact, procedureIds, createdAt, updatedAt FROM Risk WHERE id = @id";
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
                row[columnName] = columnName.Equals("procedureIds", StringComparison.OrdinalIgnoreCase)
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

        private static void AddRiskParameter(SqlCommand command, string name, string key, object? value)
        {
            switch (key)
            {
                case "nameAr":
                case "nameEn":
                    AddNVarChar(command, name, 500, value);
                    break;
                case "descriptionAr":
                case "descriptionEn":
                case "procedureIds":
                    AddNVarCharMax(command, name, value);
                    break;
                case "likelihood":
                case "impact":
                    AddInt(command, name, value);
                    break;
                case "createdAt":
                case "updatedAt":
                    AddDateTime(command, name, value);
                    break;
                default:
                    throw new InvalidOperationException($"Unsupported Risk field '{key}'.");
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
