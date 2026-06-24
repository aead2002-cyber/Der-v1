using Microsoft.Data.SqlClient;
using System.Data;
using System.Text.Json;

namespace DER3.Api.Repositories
{
    public sealed record ProcedureRecord(
        string Id,
        string StandardId,
        string PolicyId,
        string NameAr,
        string NameEn,
        string? DescriptionAr,
        string? DescriptionEn,
        string Status,
        string? Importance,
        DateTime? StartDate,
        DateTime? EndDate,
        string AssignedToJson,
        string AssignedTeamsJson,
        bool IsPeriodic,
        string? Frequency,
        string AttachmentsJson,
        string CommentsJson,
        DateTime CreatedAt,
        DateTime UpdatedAt);

    public interface IProcedureRepository
    {
        Task<Dictionary<string, object?>?> InsertAsync(ProcedureRecord procedure, CancellationToken cancellationToken);
        Task<Dictionary<string, object?>?> UpdateAsync(string id, IReadOnlyDictionary<string, object?> fields, CancellationToken cancellationToken);
        Task<bool> DeleteAsync(string id, CancellationToken cancellationToken);
    }

    public sealed class ProcedureRepository : IProcedureRepository
    {
        private readonly IConfiguration _configuration;

        public ProcedureRepository(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        public async Task<Dictionary<string, object?>?> InsertAsync(ProcedureRecord procedure, CancellationToken cancellationToken)
        {
            await using var connection = await OpenConnectionAsync(cancellationToken);
            await using var command = connection.CreateCommand();
            command.CommandText = """
                INSERT INTO [Procedure] (id, standardId, policyId, nameAr, nameEn, descriptionAr, descriptionEn, status, importance, startDate, endDate, assignedTo, assignedTeams, isPeriodic, frequency, attachments, comments, createdAt, updatedAt)
                VALUES (@id, @standardId, @policyId, @nameAr, @nameEn, @descriptionAr, @descriptionEn, @status, @importance, @startDate, @endDate, @assignedTo, @assignedTeams, @isPeriodic, @frequency, @attachments, @comments, @createdAt, @updatedAt)
                """;

            AddNVarChar(command, "@id", 64, procedure.Id);
            AddNVarChar(command, "@standardId", 64, procedure.StandardId);
            AddNVarChar(command, "@policyId", 64, procedure.PolicyId);
            AddNVarChar(command, "@nameAr", 255, procedure.NameAr);
            AddNVarChar(command, "@nameEn", 255, procedure.NameEn);
            AddNVarCharMax(command, "@descriptionAr", procedure.DescriptionAr);
            AddNVarCharMax(command, "@descriptionEn", procedure.DescriptionEn);
            AddNVarChar(command, "@status", 20, procedure.Status);
            AddNVarChar(command, "@importance", 20, procedure.Importance);
            AddDate(command, "@startDate", procedure.StartDate);
            AddDate(command, "@endDate", procedure.EndDate);
            AddNVarCharMax(command, "@assignedTo", procedure.AssignedToJson);
            AddNVarCharMax(command, "@assignedTeams", procedure.AssignedTeamsJson);
            AddBit(command, "@isPeriodic", procedure.IsPeriodic);
            AddNVarChar(command, "@frequency", 20, procedure.Frequency);
            AddNVarCharMax(command, "@attachments", procedure.AttachmentsJson);
            AddNVarCharMax(command, "@comments", procedure.CommentsJson);
            AddDateTime(command, "@createdAt", procedure.CreatedAt);
            AddDateTime(command, "@updatedAt", procedure.UpdatedAt);

            await command.ExecuteNonQueryAsync(cancellationToken);
            return await FindByIdAsync(connection, procedure.Id, cancellationToken);
        }

        public async Task<Dictionary<string, object?>?> UpdateAsync(string id, IReadOnlyDictionary<string, object?> fields, CancellationToken cancellationToken)
        {
            await using var connection = await OpenConnectionAsync(cancellationToken);
            await using var command = connection.CreateCommand();
            command.CommandText = $"UPDATE [Procedure] SET {string.Join(", ", fields.Keys.Select((key, index) => $"[{key}] = @p{index}"))} WHERE id = @id AND IsDeleted = 0";

            var index = 0;
            foreach (var (key, value) in fields)
            {
                AddProcedureParameter(command, $"@p{index}", key, value);
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
            command.CommandText = """
                UPDATE [Procedure]
                SET IsDeleted = 1,
                    DeletedAt = SYSUTCDATETIME(),
                    DeletedBy = NULL
                WHERE id = @id
                  AND IsDeleted = 0
                """;
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
            command.CommandText = "SELECT id, standardId, policyId, nameAr, nameEn, descriptionAr, descriptionEn, status, importance, startDate, endDate, assignedTo, assignedTeams, isPeriodic, frequency, attachments, comments, createdAt, updatedAt FROM [Procedure] WHERE id = @id AND IsDeleted = 0";
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
                row[columnName] = IsJsonField(columnName) ? ParseJson(value, columnName) : value;
            }

            return row;
        }

        private static bool IsJsonField(string columnName) =>
            columnName.Equals("assignedTo", StringComparison.OrdinalIgnoreCase) ||
            columnName.Equals("assignedTeams", StringComparison.OrdinalIgnoreCase) ||
            columnName.Equals("attachments", StringComparison.OrdinalIgnoreCase) ||
            columnName.Equals("comments", StringComparison.OrdinalIgnoreCase);

        private static object ParseJson(object? value, string columnName)
        {
            if (value is not string text || string.IsNullOrWhiteSpace(text))
            {
                return Array.Empty<object>();
            }

            try
            {
                if (columnName.Equals("comments", StringComparison.OrdinalIgnoreCase))
                {
                    return JsonSerializer.Deserialize<JsonElement>(text);
                }

                return JsonSerializer.Deserialize<List<string>>(text) ?? new List<string>();
            }
            catch (JsonException)
            {
                return Array.Empty<object>();
            }
        }

        private static void AddProcedureParameter(SqlCommand command, string name, string key, object? value)
        {
            switch (key)
            {
                case "standardId":
                case "policyId":
                    AddNVarChar(command, name, 64, value);
                    break;
                case "nameAr":
                case "nameEn":
                    AddNVarChar(command, name, 255, value);
                    break;
                case "status":
                case "importance":
                case "frequency":
                    AddNVarChar(command, name, 20, value);
                    break;
                case "descriptionAr":
                case "descriptionEn":
                case "assignedTo":
                case "assignedTeams":
                case "attachments":
                case "comments":
                    AddNVarCharMax(command, name, value);
                    break;
                case "startDate":
                case "endDate":
                    AddDate(command, name, value);
                    break;
                case "isPeriodic":
                    AddBit(command, name, value);
                    break;
                case "createdAt":
                case "updatedAt":
                    AddDateTime(command, name, value);
                    break;
                default:
                    throw new InvalidOperationException($"Unsupported Procedure field '{key}'.");
            }
        }

        private static void AddNVarChar(SqlCommand command, string name, int size, object? value) =>
            command.Parameters.Add(new SqlParameter(name, SqlDbType.NVarChar, size) { Value = value ?? DBNull.Value });

        private static void AddNVarCharMax(SqlCommand command, string name, object? value) =>
            command.Parameters.Add(new SqlParameter(name, SqlDbType.NVarChar, -1) { Value = value ?? DBNull.Value });

        private static void AddDate(SqlCommand command, string name, object? value) =>
            command.Parameters.Add(new SqlParameter(name, SqlDbType.Date) { Value = value ?? DBNull.Value });

        private static void AddDateTime(SqlCommand command, string name, object? value) =>
            command.Parameters.Add(new SqlParameter(name, SqlDbType.DateTime) { Value = value ?? DBNull.Value });

        private static void AddBit(SqlCommand command, string name, object? value) =>
            command.Parameters.Add(new SqlParameter(name, SqlDbType.Bit) { Value = value ?? DBNull.Value });
    }
}
