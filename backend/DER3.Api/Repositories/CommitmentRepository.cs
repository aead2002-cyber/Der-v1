using Microsoft.Data.SqlClient;
using System.Data;

namespace DER3.Api.Repositories
{
    public sealed record CommitmentRecord(
        string Id,
        string NameAr,
        string NameEn,
        string? DescriptionAr,
        string? DescriptionEn,
        DateTime? ExpiryDate,
        string? ResponsibleUser,
        string Status,
        string? EvidenceTitle,
        string? EvidenceLink,
        DateTime? EvidenceUploadedAt,
        DateTime? CreatedAt,
        DateTime? UpdatedAt);

    public interface ICommitmentRepository
    {
        Task<Dictionary<string, object?>?> InsertAsync(CommitmentRecord commitment, CancellationToken cancellationToken);
        Task<Dictionary<string, object?>?> UpdateAsync(string id, IReadOnlyDictionary<string, object?> fields, CancellationToken cancellationToken);
        Task<bool> DeleteAsync(string id, string? deletedBy, CancellationToken cancellationToken);
    }

    public sealed class CommitmentRepository : ICommitmentRepository
    {
        private readonly IConfiguration _configuration;

        public CommitmentRepository(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        public async Task<Dictionary<string, object?>?> InsertAsync(CommitmentRecord commitment, CancellationToken cancellationToken)
        {
            await using var connection = await OpenConnectionAsync(cancellationToken);
            await using var command = connection.CreateCommand();
            command.CommandText = """
                INSERT INTO Commitment (id, nameAr, nameEn, descriptionAr, descriptionEn, expiryDate, responsibleUser, status, evidenceTitle, evidenceLink, evidenceUploadedAt, createdAt, updatedAt)
                VALUES (@id, @nameAr, @nameEn, @descriptionAr, @descriptionEn, @expiryDate, @responsibleUser, @status, @evidenceTitle, @evidenceLink, @evidenceUploadedAt, @createdAt, @updatedAt)
                """;

            AddNVarChar(command, "@id", 64, commitment.Id);
            AddNVarChar(command, "@nameAr", 255, commitment.NameAr);
            AddNVarChar(command, "@nameEn", 255, commitment.NameEn);
            AddNVarCharMax(command, "@descriptionAr", commitment.DescriptionAr);
            AddNVarCharMax(command, "@descriptionEn", commitment.DescriptionEn);
            AddDate(command, "@expiryDate", commitment.ExpiryDate);
            AddNVarChar(command, "@responsibleUser", 64, commitment.ResponsibleUser);
            AddNVarChar(command, "@status", 30, commitment.Status);
            AddNVarChar(command, "@evidenceTitle", 255, commitment.EvidenceTitle);
            AddNVarCharMax(command, "@evidenceLink", commitment.EvidenceLink);
            AddDateTime(command, "@evidenceUploadedAt", commitment.EvidenceUploadedAt);
            AddDateTime(command, "@createdAt", commitment.CreatedAt);
            AddDateTime(command, "@updatedAt", commitment.UpdatedAt);

            await command.ExecuteNonQueryAsync(cancellationToken);
            return await FindByIdAsync(connection, commitment.Id, cancellationToken);
        }

        public async Task<Dictionary<string, object?>?> UpdateAsync(string id, IReadOnlyDictionary<string, object?> fields, CancellationToken cancellationToken)
        {
            await using var connection = await OpenConnectionAsync(cancellationToken);
            await using var command = connection.CreateCommand();
            command.CommandText = $"UPDATE Commitment SET {string.Join(", ", fields.Keys.Select((key, index) => $"[{key}] = @p{index}"))} WHERE id = @id AND IsDeleted = 0";

            var index = 0;
            foreach (var (key, value) in fields)
            {
                AddCommitmentParameter(command, $"@p{index}", key, value);
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
                UPDATE Commitment
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
            command.CommandText = "SELECT id, nameAr, nameEn, descriptionAr, descriptionEn, expiryDate, responsibleUser, status, evidenceTitle, evidenceLink, evidenceUploadedAt, createdAt, updatedAt FROM Commitment WHERE id = @id AND IsDeleted = 0";
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

        private static void AddCommitmentParameter(SqlCommand command, string name, string key, object? value)
        {
            switch (key)
            {
                case "nameAr":
                case "nameEn":
                case "evidenceTitle":
                    AddNVarChar(command, name, 255, value);
                    break;
                case "descriptionAr":
                case "descriptionEn":
                case "evidenceLink":
                    AddNVarCharMax(command, name, value);
                    break;
                case "expiryDate":
                    AddDate(command, name, value);
                    break;
                case "responsibleUser":
                    AddNVarChar(command, name, 64, value);
                    break;
                case "status":
                    AddNVarChar(command, name, 30, value);
                    break;
                case "evidenceUploadedAt":
                case "createdAt":
                case "updatedAt":
                    AddDateTime(command, name, value);
                    break;
                default:
                    throw new InvalidOperationException($"Unsupported Commitment field '{key}'.");
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
    }
}
