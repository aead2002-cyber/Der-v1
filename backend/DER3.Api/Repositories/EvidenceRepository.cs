using Microsoft.Data.SqlClient;
using System.Data;

namespace DER3.Api.Repositories
{
    public sealed record EvidenceRecord(
        string Id,
        string ProcedureId,
        string? Name,
        string? Url,
        string? Type,
        string? UploadedBy,
        DateTime? UploadedAt,
        string? Description);

    public interface IEvidenceRepository
    {
        Task<Dictionary<string, object?>?> InsertAsync(EvidenceRecord evidence, CancellationToken cancellationToken);
        Task<Dictionary<string, object?>?> UpdateAsync(string id, IReadOnlyDictionary<string, object?> fields, CancellationToken cancellationToken);
        Task<bool> DeleteAsync(string id, CancellationToken cancellationToken);
    }

    public sealed class EvidenceRepository : IEvidenceRepository
    {
        private readonly IConfiguration _configuration;

        public EvidenceRepository(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        public async Task<Dictionary<string, object?>?> InsertAsync(EvidenceRecord evidence, CancellationToken cancellationToken)
        {
            await using var connection = await OpenConnectionAsync(cancellationToken);
            await using var command = connection.CreateCommand();
            command.CommandText = """
                INSERT INTO Evidence (id, procedureId, name, url, type, uploadedBy, uploadedAt, description)
                VALUES (@id, @procedureId, @name, @url, @type, @uploadedBy, @uploadedAt, @description)
                """;

            AddNVarChar(command, "@id", 64, evidence.Id);
            AddNVarChar(command, "@procedureId", 64, evidence.ProcedureId);
            AddNVarChar(command, "@name", 255, evidence.Name);
            AddNVarCharMax(command, "@url", evidence.Url);
            AddNVarChar(command, "@type", 100, evidence.Type);
            AddNVarChar(command, "@uploadedBy", 64, evidence.UploadedBy);
            AddDateTime(command, "@uploadedAt", evidence.UploadedAt);
            AddNVarCharMax(command, "@description", evidence.Description);

            await command.ExecuteNonQueryAsync(cancellationToken);
            return await FindByIdAsync(connection, evidence.Id, cancellationToken);
        }

        public async Task<Dictionary<string, object?>?> UpdateAsync(string id, IReadOnlyDictionary<string, object?> fields, CancellationToken cancellationToken)
        {
            await using var connection = await OpenConnectionAsync(cancellationToken);
            await using var command = connection.CreateCommand();
            command.CommandText = $"UPDATE Evidence SET {string.Join(", ", fields.Keys.Select((key, index) => $"[{key}] = @p{index}"))} WHERE id = @id";

            var index = 0;
            foreach (var (key, value) in fields)
            {
                AddEvidenceParameter(command, $"@p{index}", key, value);
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
            command.CommandText = "DELETE FROM Evidence WHERE id = @id";
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
            command.CommandText = "SELECT id, procedureId, name, url, type, uploadedBy, uploadedAt, description FROM Evidence WHERE id = @id";
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

        private static void AddEvidenceParameter(SqlCommand command, string name, string key, object? value)
        {
            switch (key)
            {
                case "procedureId":
                case "uploadedBy":
                    AddNVarChar(command, name, 64, value);
                    break;
                case "name":
                    AddNVarChar(command, name, 255, value);
                    break;
                case "type":
                    AddNVarChar(command, name, 100, value);
                    break;
                case "url":
                case "description":
                    AddNVarCharMax(command, name, value);
                    break;
                case "uploadedAt":
                    AddDateTime(command, name, value);
                    break;
                default:
                    throw new InvalidOperationException($"Unsupported Evidence field '{key}'.");
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
