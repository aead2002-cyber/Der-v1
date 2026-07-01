using Microsoft.Data.SqlClient;
using System.Data;
using System.Text.Json;

namespace DER3.Api.Repositories
{
    public sealed record ChangeRequestRecord(
        string Id,
        string Title,
        string? Description,
        string? Type,
        string? SenderId,
        string? SenderName,
        string? ReceiverId,
        string? ReceiverName,
        string Status,
        string AttachmentsJson,
        string HistoryJson,
        DateTime? CreatedAt,
        DateTime? UpdatedAt);

    public interface IChangeRequestRepository
    {
        Task<Dictionary<string, object?>?> InsertAsync(ChangeRequestRecord changeRequest, CancellationToken cancellationToken);
        Task<Dictionary<string, object?>?> UpdateAsync(string id, IReadOnlyDictionary<string, object?> fields, CancellationToken cancellationToken);
        Task<bool> DeleteAsync(string id, string? deletedBy, CancellationToken cancellationToken);
    }

    public sealed class ChangeRequestRepository : IChangeRequestRepository
    {
        private readonly IConfiguration _configuration;

        public ChangeRequestRepository(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        public async Task<Dictionary<string, object?>?> InsertAsync(ChangeRequestRecord changeRequest, CancellationToken cancellationToken)
        {
            await using var connection = await OpenConnectionAsync(cancellationToken);
            await using var command = connection.CreateCommand();
            command.CommandText = """
                INSERT INTO ChangeRequest (id, title, description, type, senderId, senderName, receiverId, receiverName, status, attachments, history, createdAt, updatedAt)
                VALUES (@id, @title, @description, @type, @senderId, @senderName, @receiverId, @receiverName, @status, @attachments, @history, @createdAt, @updatedAt)
                """;

            AddNVarChar(command, "@id", 64, changeRequest.Id);
            AddNVarChar(command, "@title", 255, changeRequest.Title);
            AddNVarCharMax(command, "@description", changeRequest.Description);
            AddNVarChar(command, "@type", 50, changeRequest.Type);
            AddNVarChar(command, "@senderId", 64, changeRequest.SenderId);
            AddNVarChar(command, "@senderName", 255, changeRequest.SenderName);
            AddNVarChar(command, "@receiverId", 64, changeRequest.ReceiverId);
            AddNVarChar(command, "@receiverName", 255, changeRequest.ReceiverName);
            AddNVarChar(command, "@status", 30, changeRequest.Status);
            AddNVarCharMax(command, "@attachments", changeRequest.AttachmentsJson);
            AddNVarCharMax(command, "@history", changeRequest.HistoryJson);
            AddDateTime(command, "@createdAt", changeRequest.CreatedAt);
            AddDateTime(command, "@updatedAt", changeRequest.UpdatedAt);

            await command.ExecuteNonQueryAsync(cancellationToken);
            return await FindByIdAsync(connection, changeRequest.Id, cancellationToken);
        }

        public async Task<Dictionary<string, object?>?> UpdateAsync(string id, IReadOnlyDictionary<string, object?> fields, CancellationToken cancellationToken)
        {
            await using var connection = await OpenConnectionAsync(cancellationToken);
            await using var command = connection.CreateCommand();
            command.CommandText = $"UPDATE ChangeRequest SET {string.Join(", ", fields.Keys.Select((key, index) => $"[{key}] = @p{index}"))} WHERE id = @id AND IsDeleted = 0";

            var index = 0;
            foreach (var (key, value) in fields)
            {
                AddChangeRequestParameter(command, $"@p{index}", key, value);
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
                UPDATE ChangeRequest
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
            command.CommandText = "SELECT id, title, description, type, senderId, senderName, receiverId, receiverName, status, attachments, history, createdAt, updatedAt FROM ChangeRequest WHERE id = @id AND IsDeleted = 0";
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
                    : columnName.Equals("history", StringComparison.OrdinalIgnoreCase)
                        ? ParseJsonArray(value)
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

        private static object ParseJsonArray(object? value)
        {
            if (value is not string text || string.IsNullOrWhiteSpace(text))
            {
                return Array.Empty<object>();
            }

            try
            {
                var parsed = JsonSerializer.Deserialize<JsonElement>(text);
                return parsed.ValueKind == JsonValueKind.Array ? parsed : Array.Empty<object>();
            }
            catch (JsonException)
            {
                return Array.Empty<object>();
            }
        }

        private static void AddChangeRequestParameter(SqlCommand command, string name, string key, object? value)
        {
            switch (key)
            {
                case "id":
                    AddNVarChar(command, name, 64, value);
                    break;
                case "title":
                case "senderName":
                case "receiverName":
                    AddNVarChar(command, name, 255, value);
                    break;
                case "description":
                case "attachments":
                case "history":
                    AddNVarCharMax(command, name, value);
                    break;
                case "type":
                    AddNVarChar(command, name, 50, value);
                    break;
                case "senderId":
                case "receiverId":
                    AddNVarChar(command, name, 64, value);
                    break;
                case "status":
                    AddNVarChar(command, name, 30, value);
                    break;
                case "createdAt":
                case "updatedAt":
                    AddDateTime(command, name, value);
                    break;
                default:
                    throw new InvalidOperationException($"Unsupported ChangeRequest field '{key}'.");
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
