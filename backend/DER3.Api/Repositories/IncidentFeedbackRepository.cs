using Microsoft.Data.SqlClient;
using System.Data;

namespace DER3.Api.Repositories
{
    public sealed record IncidentFeedbackRecord(
        string Id,
        string IncidentId,
        int? Rating,
        string? Comment,
        DateTime? SubmittedAt);

    public interface IIncidentFeedbackRepository
    {
        Task<Dictionary<string, object?>?> InsertAsync(IncidentFeedbackRecord feedback, CancellationToken cancellationToken);
        Task<Dictionary<string, object?>?> UpdateAsync(string id, IReadOnlyDictionary<string, object?> fields, CancellationToken cancellationToken);
        Task<bool> DeleteAsync(string id, CancellationToken cancellationToken);
    }

    public sealed class IncidentFeedbackRepository : IIncidentFeedbackRepository
    {
        private readonly IConfiguration _configuration;

        public IncidentFeedbackRepository(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        public async Task<Dictionary<string, object?>?> InsertAsync(IncidentFeedbackRecord feedback, CancellationToken cancellationToken)
        {
            await using var connection = await OpenConnectionAsync(cancellationToken);
            await using var command = connection.CreateCommand();
            command.CommandText = """
                INSERT INTO IncidentFeedback (id, incidentId, rating, comment, submittedAt)
                VALUES (@id, @incidentId, @rating, @comment, @submittedAt)
                """;

            AddNVarChar(command, "@id", 64, feedback.Id);
            AddNVarChar(command, "@incidentId", 64, feedback.IncidentId);
            AddInt(command, "@rating", feedback.Rating);
            AddNVarCharMax(command, "@comment", feedback.Comment);
            AddDateTime(command, "@submittedAt", feedback.SubmittedAt);

            await command.ExecuteNonQueryAsync(cancellationToken);
            return await FindByIdAsync(connection, feedback.Id, cancellationToken);
        }

        public async Task<Dictionary<string, object?>?> UpdateAsync(string id, IReadOnlyDictionary<string, object?> fields, CancellationToken cancellationToken)
        {
            await using var connection = await OpenConnectionAsync(cancellationToken);
            await using var command = connection.CreateCommand();
            command.CommandText = $"UPDATE IncidentFeedback SET {string.Join(", ", fields.Keys.Select((key, index) => $"[{key}] = @p{index}"))} WHERE id = @id";

            var index = 0;
            foreach (var (key, value) in fields)
            {
                AddIncidentFeedbackParameter(command, $"@p{index}", key, value);
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
            command.CommandText = "DELETE FROM IncidentFeedback WHERE id = @id";
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
            command.CommandText = "SELECT id, incidentId, rating, comment, submittedAt FROM IncidentFeedback WHERE id = @id";
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

        private static void AddIncidentFeedbackParameter(SqlCommand command, string name, string key, object? value)
        {
            switch (key)
            {
                case "incidentId":
                    AddNVarChar(command, name, 64, value);
                    break;
                case "rating":
                    AddInt(command, name, value);
                    break;
                case "comment":
                    AddNVarCharMax(command, name, value);
                    break;
                case "submittedAt":
                    AddDateTime(command, name, value);
                    break;
                default:
                    throw new InvalidOperationException($"Unsupported incident feedback field '{key}'.");
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
