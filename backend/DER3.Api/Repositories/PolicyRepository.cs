using Microsoft.Data.SqlClient;
using System.Data;

namespace DER3.Api.Repositories
{
    public sealed record PolicyRecord(
        string Id,
        string NameAr,
        string NameEn,
        string? DescriptionAr,
        string? DescriptionEn,
        string? FrameworkId,
        DateTime CreatedAt,
        DateTime UpdatedAt);

    public interface IPolicyRepository
    {
        Task<Dictionary<string, object?>?> InsertAsync(PolicyRecord policy, CancellationToken cancellationToken);

        Task<Dictionary<string, object?>?> UpdateAsync(string id, IReadOnlyDictionary<string, object?> fields, CancellationToken cancellationToken);

        Task<bool> DeleteAsync(string id, CancellationToken cancellationToken);

        Task<bool> FrameworkExistsAsync(string frameworkId, CancellationToken cancellationToken);
    }

    public sealed class PolicyRepository : IPolicyRepository
    {
        private readonly IConfiguration _configuration;

        public PolicyRepository(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        public async Task<Dictionary<string, object?>?> InsertAsync(PolicyRecord policy, CancellationToken cancellationToken)
        {
            await using var connection = await OpenConnectionAsync(cancellationToken);
            var frameworkColumn = await GetPolicyFrameworkColumnAsync(connection, cancellationToken);
            await using var command = connection.CreateCommand();
            command.CommandText = $"""
                INSERT INTO Policy (id, nameAr, nameEn, descriptionAr, descriptionEn, [{frameworkColumn}], createdAt, updatedAt)
                VALUES (@id, @nameAr, @nameEn, @descriptionAr, @descriptionEn, @frameworkId, @createdAt, @updatedAt)
                """;

            AddNVarChar(command, "@id", 64, policy.Id);
            AddNVarChar(command, "@nameAr", 255, policy.NameAr);
            AddNVarChar(command, "@nameEn", 255, policy.NameEn);
            AddNVarCharMax(command, "@descriptionAr", policy.DescriptionAr);
            AddNVarCharMax(command, "@descriptionEn", policy.DescriptionEn);
            AddNVarChar(command, "@frameworkId", 64, policy.FrameworkId);
            AddDateTime(command, "@createdAt", policy.CreatedAt);
            AddDateTime(command, "@updatedAt", policy.UpdatedAt);

            await command.ExecuteNonQueryAsync(cancellationToken);
            return await FindByIdAsync(connection, policy.Id, cancellationToken);
        }

        public async Task<Dictionary<string, object?>?> UpdateAsync(string id, IReadOnlyDictionary<string, object?> fields, CancellationToken cancellationToken)
        {
            await using var connection = await OpenConnectionAsync(cancellationToken);
            var frameworkColumn = await GetPolicyFrameworkColumnAsync(connection, cancellationToken);
            await using var command = connection.CreateCommand();

            var assignments = fields.Keys.Select((key, index) => $"[{MapPolicyColumn(key, frameworkColumn)}] = @p{index}").ToArray();
            command.CommandText = $"UPDATE Policy SET {string.Join(", ", assignments)} WHERE id = @id";

            var parameterIndex = 0;
            foreach (var (key, value) in fields)
            {
                AddPolicyParameter(command, $"@p{parameterIndex}", key, value);
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
            command.CommandText = "DELETE FROM Policy WHERE id = @id";
            AddNVarChar(command, "@id", 64, id);

            var rowsAffected = await command.ExecuteNonQueryAsync(cancellationToken);
            return rowsAffected > 0;
        }

        public async Task<bool> FrameworkExistsAsync(string frameworkId, CancellationToken cancellationToken)
        {
            await using var connection = await OpenConnectionAsync(cancellationToken);
            await using var command = connection.CreateCommand();
            command.CommandText = "SELECT 1 FROM Framework WHERE id = @id";
            AddNVarChar(command, "@id", 64, frameworkId);

            return await command.ExecuteScalarAsync(cancellationToken) is not null;
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
            var frameworkColumn = await GetPolicyFrameworkColumnAsync(connection, cancellationToken);
            await using var command = connection.CreateCommand();
            command.CommandText = $"SELECT id, nameAr, nameEn, descriptionAr, descriptionEn, [{frameworkColumn}] AS frameworkId, createdAt, updatedAt FROM Policy WHERE id = @id";
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

        private static void AddPolicyParameter(SqlCommand command, string name, string key, object? value)
        {
            switch (key)
            {
                case "nameAr":
                case "nameEn":
                    AddNVarChar(command, name, 255, value);
                    break;
                case "frameworkId":
                    AddNVarChar(command, name, 64, value);
                    break;
                case "descriptionAr":
                case "descriptionEn":
                    AddNVarCharMax(command, name, value);
                    break;
                case "createdAt":
                case "updatedAt":
                    AddDateTime(command, name, value);
                    break;
                default:
                    throw new InvalidOperationException($"Unsupported Policy field '{key}'.");
            }
        }

        private static string MapPolicyColumn(string key, string frameworkColumn) =>
            key == "frameworkId" ? frameworkColumn : key;

        private static async Task<string> GetPolicyFrameworkColumnAsync(SqlConnection connection, CancellationToken cancellationToken)
        {
            await using var command = connection.CreateCommand();
            command.CommandText = """
                SELECT TOP 1 COLUMN_NAME
                FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_NAME = 'Policy'
                    AND COLUMN_NAME IN ('frameworkId', 'framework')
                ORDER BY CASE WHEN COLUMN_NAME = 'frameworkId' THEN 0 ELSE 1 END
                """;

            var column = await command.ExecuteScalarAsync(cancellationToken) as string;
            return string.IsNullOrWhiteSpace(column)
                ? throw new InvalidOperationException("Policy framework column is not configured.")
                : column;
        }

        private static void AddNVarChar(SqlCommand command, string name, int size, object? value) =>
            command.Parameters.Add(new SqlParameter(name, SqlDbType.NVarChar, size) { Value = value ?? DBNull.Value });

        private static void AddNVarCharMax(SqlCommand command, string name, object? value) =>
            command.Parameters.Add(new SqlParameter(name, SqlDbType.NVarChar, -1) { Value = value ?? DBNull.Value });

        private static void AddDateTime(SqlCommand command, string name, object? value) =>
            command.Parameters.Add(new SqlParameter(name, SqlDbType.DateTime) { Value = value ?? DBNull.Value });
    }
}
