using Microsoft.Data.SqlClient;
using System.Data;
using System.Text.Json;

namespace DER3.Api.Repositories
{
    public sealed record IncidentRecord(
        string Id,
        string? ReporterEmail,
        string? Title,
        string? Description,
        string? Type,
        string? Priority,
        string? Status,
        DateTime? ReportedAt,
        string? AssignedTo,
        DateTime? UpdatedAt,
        DateTime? ClosedAt,
        string AttachmentsJson);

    public interface IIncidentRepository
    {
        Task<Dictionary<string, object?>?> InsertAsync(IncidentRecord incident, CancellationToken cancellationToken);
        Task<Dictionary<string, object?>?> UpdateAsync(string id, IReadOnlyDictionary<string, object?> fields, CancellationToken cancellationToken);
        Task<bool> DeleteAsync(string id, CancellationToken cancellationToken);
    }

    public sealed class IncidentRepository : IIncidentRepository
    {
        private readonly IConfiguration _configuration;

        public IncidentRepository(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        public async Task<Dictionary<string, object?>?> InsertAsync(IncidentRecord incident, CancellationToken cancellationToken)
        {
            await using var connection = await OpenConnectionAsync(cancellationToken);
            await using var command = connection.CreateCommand();
            command.CommandText = """
                INSERT INTO SecurityIncident (id, reporterEmail, title, description, type, priority, status, reportedAt, assignedTo, updatedAt, closedAt, attachments)
                VALUES (@id, @reporterEmail, @title, @description, @type, @priority, @status, @reportedAt, @assignedTo, @updatedAt, @closedAt, @attachments)
                """;

            AddNVarChar(command, "@id", 64, incident.Id);
            AddNVarChar(command, "@reporterEmail", 255, incident.ReporterEmail);
            AddNVarChar(command, "@title", 500, incident.Title);
            AddNVarCharMax(command, "@description", incident.Description);
            AddNVarChar(command, "@type", 100, incident.Type);
            AddNVarChar(command, "@priority", 20, incident.Priority);
            AddNVarChar(command, "@status", 30, incident.Status);
            AddDateTime(command, "@reportedAt", incident.ReportedAt);
            AddNVarChar(command, "@assignedTo", 64, incident.AssignedTo);
            AddDateTime(command, "@updatedAt", incident.UpdatedAt);
            AddDateTime(command, "@closedAt", incident.ClosedAt);
            AddNVarCharMax(command, "@attachments", incident.AttachmentsJson);

            await command.ExecuteNonQueryAsync(cancellationToken);
            return await FindByIdAsync(connection, incident.Id, cancellationToken);
        }

        public async Task<Dictionary<string, object?>?> UpdateAsync(string id, IReadOnlyDictionary<string, object?> fields, CancellationToken cancellationToken)
        {
            await using var connection = await OpenConnectionAsync(cancellationToken);
            await using var command = connection.CreateCommand();
            command.CommandText = $"UPDATE SecurityIncident SET {string.Join(", ", fields.Keys.Select((key, index) => $"[{key}] = @p{index}"))} WHERE id = @id";

            var index = 0;
            foreach (var (key, value) in fields)
            {
                AddIncidentParameter(command, $"@p{index}", key, value);
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
            command.CommandText = "DELETE FROM SecurityIncident WHERE id = @id";
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
            command.CommandText = "SELECT id, reporterEmail, title, description, type, priority, status, reportedAt, assignedTo, updatedAt, closedAt, attachments FROM SecurityIncident WHERE id = @id";
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

        private static void AddIncidentParameter(SqlCommand command, string name, string key, object? value)
        {
            switch (key)
            {
                case "reporterEmail":
                    AddNVarChar(command, name, 255, value);
                    break;
                case "title":
                    AddNVarChar(command, name, 500, value);
                    break;
                case "description":
                case "attachments":
                    AddNVarCharMax(command, name, value);
                    break;
                case "type":
                    AddNVarChar(command, name, 100, value);
                    break;
                case "priority":
                    AddNVarChar(command, name, 20, value);
                    break;
                case "status":
                    AddNVarChar(command, name, 30, value);
                    break;
                case "assignedTo":
                    AddNVarChar(command, name, 64, value);
                    break;
                case "reportedAt":
                case "updatedAt":
                case "closedAt":
                    AddDateTime(command, name, value);
                    break;
                default:
                    throw new InvalidOperationException($"Unsupported incident field '{key}'.");
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
