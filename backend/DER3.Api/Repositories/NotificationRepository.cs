using Microsoft.Data.SqlClient;
using System.Data;

namespace DER3.Api.Repositories
{
    public sealed record NotificationRecord(
        string Id,
        string? UserId,
        string? TitleAr,
        string? TitleEn,
        string? MessageAr,
        string? MessageEn,
        string? Type,
        string? Link,
        bool IsRead,
        DateTime? CreatedAt);

    public interface INotificationRepository
    {
        Task<Dictionary<string, object?>?> InsertAsync(NotificationRecord notification, CancellationToken cancellationToken);
        Task<Dictionary<string, object?>?> UpdateAsync(string id, IReadOnlyDictionary<string, object?> fields, CancellationToken cancellationToken);
        Task<bool> DeleteAsync(string id, CancellationToken cancellationToken);
    }

    public sealed class NotificationRepository : INotificationRepository
    {
        private readonly IConfiguration _configuration;

        public NotificationRepository(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        public async Task<Dictionary<string, object?>?> InsertAsync(NotificationRecord notification, CancellationToken cancellationToken)
        {
            await using var connection = await OpenConnectionAsync(cancellationToken);
            await using var command = connection.CreateCommand();
            command.CommandText = """
                INSERT INTO Notification (id, userId, titleAr, titleEn, messageAr, messageEn, type, link, isRead, createdAt)
                VALUES (@id, @userId, @titleAr, @titleEn, @messageAr, @messageEn, @type, @link, @isRead, @createdAt)
                """;

            AddNVarChar(command, "@id", 64, notification.Id);
            AddNVarChar(command, "@userId", 64, notification.UserId);
            AddNVarChar(command, "@titleAr", 500, notification.TitleAr);
            AddNVarChar(command, "@titleEn", 500, notification.TitleEn);
            AddNVarCharMax(command, "@messageAr", notification.MessageAr);
            AddNVarCharMax(command, "@messageEn", notification.MessageEn);
            AddNVarChar(command, "@type", 50, notification.Type);
            AddNVarCharMax(command, "@link", notification.Link);
            AddBit(command, "@isRead", notification.IsRead);
            AddDateTime(command, "@createdAt", notification.CreatedAt);

            await command.ExecuteNonQueryAsync(cancellationToken);
            return await FindByIdAsync(connection, notification.Id, cancellationToken);
        }

        public async Task<Dictionary<string, object?>?> UpdateAsync(string id, IReadOnlyDictionary<string, object?> fields, CancellationToken cancellationToken)
        {
            await using var connection = await OpenConnectionAsync(cancellationToken);
            await using var command = connection.CreateCommand();
            command.CommandText = $"UPDATE Notification SET {string.Join(", ", fields.Keys.Select((key, index) => $"[{key}] = @p{index}"))} WHERE id = @id";

            var index = 0;
            foreach (var (key, value) in fields)
            {
                AddNotificationParameter(command, $"@p{index}", key, value);
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
            command.CommandText = "DELETE FROM Notification WHERE id = @id";
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
            command.CommandText = "SELECT id, userId, titleAr, titleEn, messageAr, messageEn, type, link, isRead, createdAt FROM Notification WHERE id = @id";
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

        private static void AddNotificationParameter(SqlCommand command, string name, string key, object? value)
        {
            switch (key)
            {
                case "userId":
                    AddNVarChar(command, name, 64, value);
                    break;
                case "titleAr":
                case "titleEn":
                    AddNVarChar(command, name, 500, value);
                    break;
                case "messageAr":
                case "messageEn":
                case "link":
                    AddNVarCharMax(command, name, value);
                    break;
                case "type":
                    AddNVarChar(command, name, 50, value);
                    break;
                case "isRead":
                    AddBit(command, name, value);
                    break;
                case "createdAt":
                    AddDateTime(command, name, value);
                    break;
                default:
                    throw new InvalidOperationException($"Unsupported Notification field '{key}'.");
            }
        }

        private static void AddNVarChar(SqlCommand command, string name, int size, object? value) =>
            command.Parameters.Add(new SqlParameter(name, SqlDbType.NVarChar, size) { Value = value ?? DBNull.Value });

        private static void AddNVarCharMax(SqlCommand command, string name, object? value) =>
            command.Parameters.Add(new SqlParameter(name, SqlDbType.NVarChar, -1) { Value = value ?? DBNull.Value });

        private static void AddBit(SqlCommand command, string name, object? value) =>
            command.Parameters.Add(new SqlParameter(name, SqlDbType.Bit) { Value = value ?? DBNull.Value });

        private static void AddDateTime(SqlCommand command, string name, object? value) =>
            command.Parameters.Add(new SqlParameter(name, SqlDbType.DateTime) { Value = value ?? DBNull.Value });
    }
}
