using Microsoft.Data.SqlClient;
using System.Data;

namespace DER3.Api.Repositories
{
    public sealed record NotificationLogRecord(
        string Id,
        string? RecipientId,
        string? RecipientEmail,
        string? RecipientName,
        string? Type,
        string? Subject,
        string? Body,
        string? Status,
        DateTime? SentAt,
        string? ErrorMessage);

    public interface INotificationLogRepository
    {
        Task<Dictionary<string, object?>?> InsertAsync(NotificationLogRecord log, CancellationToken cancellationToken);
        Task<Dictionary<string, object?>?> UpdateAsync(string id, IReadOnlyDictionary<string, object?> fields, CancellationToken cancellationToken);
        Task<bool> DeleteAsync(string id, string? deletedBy, CancellationToken cancellationToken);
    }

    public sealed class NotificationLogRepository : INotificationLogRepository
    {
        private readonly IConfiguration _configuration;

        public NotificationLogRepository(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        public async Task<Dictionary<string, object?>?> InsertAsync(NotificationLogRecord log, CancellationToken cancellationToken)
        {
            await using var connection = await OpenConnectionAsync(cancellationToken);
            await using var command = connection.CreateCommand();
            command.CommandText = """
                INSERT INTO NotificationLog (id, recipientId, recipientEmail, recipientName, type, subject, body, status, sentAt, errorMessage)
                VALUES (@id, @recipientId, @recipientEmail, @recipientName, @type, @subject, @body, @status, @sentAt, @errorMessage)
                """;

            AddNVarChar(command, "@id", 64, log.Id);
            AddNVarChar(command, "@recipientId", 64, log.RecipientId);
            AddNVarChar(command, "@recipientEmail", 255, log.RecipientEmail);
            AddNVarChar(command, "@recipientName", 255, log.RecipientName);
            AddNVarChar(command, "@type", 50, log.Type);
            AddNVarChar(command, "@subject", 500, log.Subject);
            AddNVarCharMax(command, "@body", log.Body);
            AddNVarChar(command, "@status", 20, log.Status);
            AddDateTime(command, "@sentAt", log.SentAt);
            AddNVarCharMax(command, "@errorMessage", log.ErrorMessage);

            await command.ExecuteNonQueryAsync(cancellationToken);
            return await FindByIdAsync(connection, log.Id, cancellationToken);
        }

        public async Task<Dictionary<string, object?>?> UpdateAsync(string id, IReadOnlyDictionary<string, object?> fields, CancellationToken cancellationToken)
        {
            await using var connection = await OpenConnectionAsync(cancellationToken);
            await using var command = connection.CreateCommand();
            command.CommandText = $"UPDATE NotificationLog SET {string.Join(", ", fields.Keys.Select((key, index) => $"[{key}] = @p{index}"))} WHERE id = @id AND IsDeleted = 0";

            var index = 0;
            foreach (var (key, value) in fields)
            {
                AddNotificationLogParameter(command, $"@p{index}", key, value);
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
                UPDATE NotificationLog
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
            command.CommandText = "SELECT id, recipientId, recipientEmail, recipientName, type, subject, body, status, sentAt, errorMessage FROM NotificationLog WHERE id = @id AND IsDeleted = 0";
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

        private static void AddNotificationLogParameter(SqlCommand command, string name, string key, object? value)
        {
            switch (key)
            {
                case "recipientId":
                    AddNVarChar(command, name, 64, value);
                    break;
                case "recipientEmail":
                case "recipientName":
                    AddNVarChar(command, name, 255, value);
                    break;
                case "type":
                    AddNVarChar(command, name, 50, value);
                    break;
                case "subject":
                    AddNVarChar(command, name, 500, value);
                    break;
                case "body":
                case "errorMessage":
                    AddNVarCharMax(command, name, value);
                    break;
                case "status":
                    AddNVarChar(command, name, 20, value);
                    break;
                case "sentAt":
                    AddDateTime(command, name, value);
                    break;
                default:
                    throw new InvalidOperationException($"Unsupported NotificationLog field '{key}'.");
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
