using Microsoft.Data.SqlClient;
using System.Data;

namespace DER3.Api.Repositories
{
    public sealed record AuditLogRecord(
        string Id,
        string? UserId,
        string? UserName,
        string? Action,
        string? EntityType,
        string? EntityId,
        string? OldValue,
        string? NewValue,
        DateTime? Timestamp,
        string? Ip,
        string? UserAgent);

    public interface IAuditLogRepository
    {
        Task<Dictionary<string, object?>?> InsertAsync(AuditLogRecord auditLog, CancellationToken cancellationToken);
        Task<Dictionary<string, object?>?> UpdateAsync(string id, IReadOnlyDictionary<string, object?> fields, CancellationToken cancellationToken);
        Task<bool> DeleteAsync(string id, CancellationToken cancellationToken);
    }

    public sealed class AuditLogRepository : IAuditLogRepository
    {
        private readonly IConfiguration _configuration;

        public AuditLogRepository(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        public async Task<Dictionary<string, object?>?> InsertAsync(AuditLogRecord auditLog, CancellationToken cancellationToken)
        {
            await using var connection = await OpenConnectionAsync(cancellationToken);
            await using var command = connection.CreateCommand();
            command.CommandText = """
                INSERT INTO AuditLog (id, userId, userName, action, entityType, entityId, oldValue, newValue, timestamp, ip, userAgent)
                VALUES (@id, @userId, @userName, @action, @entityType, @entityId, @oldValue, @newValue, @timestamp, @ip, @userAgent)
                """;

            AddNVarChar(command, "@id", 64, auditLog.Id);
            AddNVarChar(command, "@userId", 64, auditLog.UserId);
            AddNVarChar(command, "@userName", 255, auditLog.UserName);
            AddNVarChar(command, "@action", 255, auditLog.Action);
            AddNVarChar(command, "@entityType", 255, auditLog.EntityType);
            AddNVarChar(command, "@entityId", 64, auditLog.EntityId);
            AddNVarCharMax(command, "@oldValue", auditLog.OldValue);
            AddNVarCharMax(command, "@newValue", auditLog.NewValue);
            AddDateTime(command, "@timestamp", auditLog.Timestamp);
            AddNVarChar(command, "@ip", 64, auditLog.Ip);
            AddNVarCharMax(command, "@userAgent", auditLog.UserAgent);

            await command.ExecuteNonQueryAsync(cancellationToken);
            return await FindByIdAsync(connection, auditLog.Id, cancellationToken);
        }

        public async Task<Dictionary<string, object?>?> UpdateAsync(string id, IReadOnlyDictionary<string, object?> fields, CancellationToken cancellationToken)
        {
            await using var connection = await OpenConnectionAsync(cancellationToken);
            await using var command = connection.CreateCommand();
            command.CommandText = $"UPDATE AuditLog SET {string.Join(", ", fields.Keys.Select((key, index) => $"[{key}] = @p{index}"))} WHERE id = @id";

            var index = 0;
            foreach (var (key, value) in fields)
            {
                AddAuditLogParameter(command, $"@p{index}", key, value);
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
            command.CommandText = "DELETE FROM AuditLog WHERE id = @id";
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
            command.CommandText = "SELECT id, userId, userName, action, entityType, entityId, oldValue, newValue, timestamp, ip, userAgent FROM AuditLog WHERE id = @id";
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

        private static void AddAuditLogParameter(SqlCommand command, string name, string key, object? value)
        {
            switch (key)
            {
                case "userId":
                case "entityId":
                case "ip":
                    AddNVarChar(command, name, 64, value);
                    break;
                case "userName":
                case "action":
                case "entityType":
                    AddNVarChar(command, name, 255, value);
                    break;
                case "oldValue":
                case "newValue":
                case "userAgent":
                    AddNVarCharMax(command, name, value);
                    break;
                case "timestamp":
                    AddDateTime(command, name, value);
                    break;
                default:
                    throw new InvalidOperationException($"Unsupported AuditLog field '{key}'.");
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
