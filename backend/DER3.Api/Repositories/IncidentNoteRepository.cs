using Microsoft.Data.SqlClient;
using System.Data;
using System.Text.Json;

namespace DER3.Api.Repositories
{
    public sealed record IncidentNoteRecord(
        string Id,
        string IncidentId,
        string? AuthorId,
        string? AuthorName,
        string? Content,
        DateTime? CreatedAt,
        string AttachmentsJson);

    public interface IIncidentNoteRepository
    {
        Task<Dictionary<string, object?>?> InsertAsync(IncidentNoteRecord note, CancellationToken cancellationToken);
        Task<Dictionary<string, object?>?> UpdateAsync(string id, IReadOnlyDictionary<string, object?> fields, CancellationToken cancellationToken);
        Task<bool> DeleteAsync(string id, CancellationToken cancellationToken);
    }

    public sealed class IncidentNoteRepository : IIncidentNoteRepository
    {
        private readonly IConfiguration _configuration;

        public IncidentNoteRepository(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        public async Task<Dictionary<string, object?>?> InsertAsync(IncidentNoteRecord note, CancellationToken cancellationToken)
        {
            await using var connection = await OpenConnectionAsync(cancellationToken);
            await using var command = connection.CreateCommand();
            command.CommandText = """
                INSERT INTO IncidentNote (id, incidentId, authorId, authorName, content, createdAt, attachments)
                VALUES (@id, @incidentId, @authorId, @authorName, @content, @createdAt, @attachments)
                """;

            AddNVarChar(command, "@id", 64, note.Id);
            AddNVarChar(command, "@incidentId", 64, note.IncidentId);
            AddNVarChar(command, "@authorId", 64, note.AuthorId);
            AddNVarChar(command, "@authorName", 255, note.AuthorName);
            AddNVarCharMax(command, "@content", note.Content);
            AddDateTime(command, "@createdAt", note.CreatedAt);
            AddNVarCharMax(command, "@attachments", note.AttachmentsJson);

            await command.ExecuteNonQueryAsync(cancellationToken);
            return await FindByIdAsync(connection, note.Id, cancellationToken);
        }

        public async Task<Dictionary<string, object?>?> UpdateAsync(string id, IReadOnlyDictionary<string, object?> fields, CancellationToken cancellationToken)
        {
            await using var connection = await OpenConnectionAsync(cancellationToken);
            await using var command = connection.CreateCommand();
            command.CommandText = $"UPDATE IncidentNote SET {string.Join(", ", fields.Keys.Select((key, index) => $"[{key}] = @p{index}"))} WHERE id = @id";

            var index = 0;
            foreach (var (key, value) in fields)
            {
                AddIncidentNoteParameter(command, $"@p{index}", key, value);
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
            command.CommandText = "DELETE FROM IncidentNote WHERE id = @id";
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
            command.CommandText = "SELECT id, incidentId, authorId, authorName, content, createdAt, attachments FROM IncidentNote WHERE id = @id";
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

        private static void AddIncidentNoteParameter(SqlCommand command, string name, string key, object? value)
        {
            switch (key)
            {
                case "incidentId":
                case "authorId":
                    AddNVarChar(command, name, 64, value);
                    break;
                case "authorName":
                    AddNVarChar(command, name, 255, value);
                    break;
                case "content":
                case "attachments":
                    AddNVarCharMax(command, name, value);
                    break;
                case "createdAt":
                    AddDateTime(command, name, value);
                    break;
                default:
                    throw new InvalidOperationException($"Unsupported incident note field '{key}'.");
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
