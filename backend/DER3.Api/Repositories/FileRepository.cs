using Microsoft.Data.SqlClient;

namespace DER3.Api.Repositories
{
    public sealed record FileBlobRecord(
        string Id,
        string OriginalName,
        string MimeType,
        int Size,
        byte[] Iv,
        byte[] AuthTag,
        byte[] Data);

    public sealed record StoredFileBlob(
        string Id,
        string OriginalName,
        string MimeType,
        int Size,
        byte[] Iv,
        byte[] AuthTag,
        byte[] Data);

    public interface IFileRepository
    {
        Task InsertAsync(FileBlobRecord file, CancellationToken cancellationToken);

        Task<StoredFileBlob?> FindByIdAsync(string id, CancellationToken cancellationToken);

        Task<bool> DeleteAsync(string id, CancellationToken cancellationToken);
    }

    public sealed class FileRepository : IFileRepository
    {
        private readonly IConfiguration _configuration;

        public FileRepository(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        public async Task InsertAsync(FileBlobRecord file, CancellationToken cancellationToken)
        {
            await using var connection = await OpenConnectionAsync(cancellationToken);
            await using var command = connection.CreateCommand();
            command.CommandText = """
                INSERT INTO FileBlob (id, originalName, mimeType, size, iv, authTag, data, createdAt)
                VALUES (@id, @originalName, @mimeType, @size, @iv, @authTag, @data, @createdAt)
                """;
            command.Parameters.Add(new SqlParameter("@id", System.Data.SqlDbType.NVarChar, 64) { Value = file.Id });
            command.Parameters.Add(new SqlParameter("@originalName", System.Data.SqlDbType.NVarChar, 500) { Value = file.OriginalName });
            command.Parameters.Add(new SqlParameter("@mimeType", System.Data.SqlDbType.NVarChar, 255) { Value = file.MimeType });
            command.Parameters.Add(new SqlParameter("@size", System.Data.SqlDbType.Int) { Value = file.Size });
            command.Parameters.Add(new SqlParameter("@iv", System.Data.SqlDbType.VarBinary, 16) { Value = file.Iv });
            command.Parameters.Add(new SqlParameter("@authTag", System.Data.SqlDbType.VarBinary, 16) { Value = file.AuthTag });
            command.Parameters.Add(new SqlParameter("@data", System.Data.SqlDbType.VarBinary, -1) { Value = file.Data });
            command.Parameters.Add(new SqlParameter("@createdAt", System.Data.SqlDbType.DateTime) { Value = DateTime.UtcNow });

            await command.ExecuteNonQueryAsync(cancellationToken);
        }

        public async Task<StoredFileBlob?> FindByIdAsync(string id, CancellationToken cancellationToken)
        {
            await using var connection = await OpenConnectionAsync(cancellationToken);
            await using var command = connection.CreateCommand();
            command.CommandText = "SELECT id, originalName, mimeType, size, iv, authTag, data FROM FileBlob WHERE id = @id AND IsDeleted = 0";
            command.Parameters.Add(new SqlParameter("@id", System.Data.SqlDbType.NVarChar, 64) { Value = id });

            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            if (!await reader.ReadAsync(cancellationToken))
            {
                return null;
            }

            return new StoredFileBlob(
                reader.GetString(reader.GetOrdinal("id")),
                ReadNullableString(reader, "originalName") ?? "file",
                ReadNullableString(reader, "mimeType") ?? "application/octet-stream",
                reader.GetInt32(reader.GetOrdinal("size")),
                (byte[])reader["iv"],
                (byte[])reader["authTag"],
                (byte[])reader["data"]);
        }

        public async Task<bool> DeleteAsync(string id, CancellationToken cancellationToken)
        {
            await using var connection = await OpenConnectionAsync(cancellationToken);
            await using var command = connection.CreateCommand();
            command.CommandText = """
                UPDATE FileBlob
                SET IsDeleted = 1,
                    DeletedAt = SYSUTCDATETIME(),
                    DeletedBy = NULL
                WHERE id = @id
                  AND IsDeleted = 0
                """;
            command.Parameters.Add(new SqlParameter("@id", System.Data.SqlDbType.NVarChar, 64) { Value = id });

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

        private static string? ReadNullableString(SqlDataReader reader, string columnName)
        {
            var ordinal = reader.GetOrdinal(columnName);
            return reader.IsDBNull(ordinal) ? null : reader.GetString(ordinal);
        }
    }
}
