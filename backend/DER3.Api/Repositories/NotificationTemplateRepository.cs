using Microsoft.Data.SqlClient;
using System.Data;

namespace DER3.Api.Repositories
{
    public sealed record NotificationTemplateRecord(
        string Id,
        string Name,
        string? Subject,
        string? Body,
        string? Type);

    public interface INotificationTemplateRepository
    {
        Task<Dictionary<string, object?>?> InsertAsync(NotificationTemplateRecord template, CancellationToken cancellationToken);
        Task<Dictionary<string, object?>?> UpdateAsync(string id, IReadOnlyDictionary<string, object?> fields, CancellationToken cancellationToken);
        Task<bool> DeleteAsync(string id, string? deletedBy, CancellationToken cancellationToken);
    }

    public sealed class NotificationTemplateRepository : INotificationTemplateRepository
    {
        private readonly IConfiguration _configuration;

        public NotificationTemplateRepository(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        public async Task<Dictionary<string, object?>?> InsertAsync(NotificationTemplateRecord template, CancellationToken cancellationToken)
        {
            await using var connection = await OpenConnectionAsync(cancellationToken);
            await using var command = connection.CreateCommand();
            command.CommandText = """
                INSERT INTO NotificationTemplate (id, name, subject, body, type)
                VALUES (@id, @name, @subject, @body, @type)
                """;

            AddNVarChar(command, "@id", 64, template.Id);
            AddNVarChar(command, "@name", 255, template.Name);
            AddNVarChar(command, "@subject", 500, template.Subject);
            AddNVarCharMax(command, "@body", template.Body);
            AddNVarChar(command, "@type", 50, template.Type);

            await command.ExecuteNonQueryAsync(cancellationToken);
            return await FindByIdAsync(connection, template.Id, cancellationToken);
        }

        public async Task<Dictionary<string, object?>?> UpdateAsync(string id, IReadOnlyDictionary<string, object?> fields, CancellationToken cancellationToken)
        {
            await using var connection = await OpenConnectionAsync(cancellationToken);
            await using var command = connection.CreateCommand();
            command.CommandText = $"UPDATE NotificationTemplate SET {string.Join(", ", fields.Keys.Select((key, index) => $"[{key}] = @p{index}"))} WHERE id = @id AND IsDeleted = 0";

            var index = 0;
            foreach (var (key, value) in fields)
            {
                AddNotificationTemplateParameter(command, $"@p{index}", key, value);
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
                UPDATE NotificationTemplate
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
            command.CommandText = "SELECT id, name, subject, body, type FROM NotificationTemplate WHERE id = @id AND IsDeleted = 0";
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

        private static void AddNotificationTemplateParameter(SqlCommand command, string name, string key, object? value)
        {
            switch (key)
            {
                case "name":
                    AddNVarChar(command, name, 255, value);
                    break;
                case "subject":
                    AddNVarChar(command, name, 500, value);
                    break;
                case "body":
                    AddNVarCharMax(command, name, value);
                    break;
                case "type":
                    AddNVarChar(command, name, 50, value);
                    break;
                default:
                    throw new InvalidOperationException($"Unsupported NotificationTemplate field '{key}'.");
            }
        }

        private static void AddNVarChar(SqlCommand command, string name, int size, object? value) =>
            command.Parameters.Add(new SqlParameter(name, SqlDbType.NVarChar, size) { Value = value ?? DBNull.Value });

        private static void AddNVarCharMax(SqlCommand command, string name, object? value) =>
            command.Parameters.Add(new SqlParameter(name, SqlDbType.NVarChar, -1) { Value = value ?? DBNull.Value });
    }
}
