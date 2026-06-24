using Microsoft.Data.SqlClient;
using System.Text.Json;

namespace DER3.Api.Repositories
{
    public sealed record UserAuthRecord(
        string Uid,
        string? Email,
        string? DisplayName,
        string? Role,
        string? PasswordHash,
        string? PasswordSalt,
        Dictionary<string, object?> User);

    public sealed record CreateUserRecord(
        string Uid,
        string Email,
        string DisplayName,
        string? DisplayNameEn,
        string Role,
        string? GroupId,
        string PermissionOverridesJson,
        string TeamsJson,
        string DepartmentsJson,
        string? PhotoURL,
        bool BypassOtp,
        bool ReceiveSecurityIncidents,
        string? PasswordHash,
        string? PasswordSalt);

    public sealed record UpdateUserRecord(
        string? Email,
        string? DisplayName,
        string? DisplayNameEn,
        string? Role,
        string? GroupId,
        string PermissionOverridesJson,
        string TeamsJson,
        string DepartmentsJson,
        string? PhotoURL,
        bool BypassOtp,
        bool ReceiveSecurityIncidents);

    public interface IUserRepository
    {
        Task<UserAuthRecord?> FindAuthByEmailAsync(string email, CancellationToken cancellationToken);

        Task<Dictionary<string, object?>?> FindUserByUidAsync(string uid, CancellationToken cancellationToken);

        Task<Dictionary<string, object?>?> CreateUserAsync(CreateUserRecord user, CancellationToken cancellationToken);

        Task<Dictionary<string, object?>?> UpdateUserAsync(string uid, UpdateUserRecord user, CancellationToken cancellationToken);

        Task<bool> SetPasswordAsync(string uid, string passwordHash, string passwordSalt, CancellationToken cancellationToken);

        Task<bool> DeleteAsync(string uid, CancellationToken cancellationToken);
    }

    public sealed class UserRepository : IUserRepository
    {
        private readonly IConfiguration _configuration;

        public UserRepository(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        public async Task<UserAuthRecord?> FindAuthByEmailAsync(string email, CancellationToken cancellationToken)
        {
            var connectionString = _configuration.GetConnectionString("DefaultConnection");
            if (string.IsNullOrWhiteSpace(connectionString))
            {
                throw new InvalidOperationException("DefaultConnection is not configured.");
            }

            await using var connection = new SqlConnection(connectionString);
            await connection.OpenAsync(cancellationToken);

            await using var command = connection.CreateCommand();
            command.CommandText = "SELECT * FROM [User] WHERE LOWER(email) = @email AND IsDeleted = 0";
            command.Parameters.Add(new SqlParameter("@email", email.Trim().ToLowerInvariant()));

            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            if (!await reader.ReadAsync(cancellationToken))
            {
                return null;
            }

            var user = new Dictionary<string, object?>(StringComparer.Ordinal);
            for (var i = 0; i < reader.FieldCount; i++)
            {
                var columnName = reader.GetName(i);
                if (columnName.Equals("passwordHash", StringComparison.OrdinalIgnoreCase) ||
                    columnName.Equals("passwordSalt", StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }

                user[columnName] = await reader.IsDBNullAsync(i, cancellationToken)
                    ? null
                    : reader.GetValue(i);
            }

            return new UserAuthRecord(
                ReadRequiredString(reader, "uid"),
                ReadNullableString(reader, "email"),
                ReadNullableString(reader, "displayName"),
                ReadNullableString(reader, "role"),
                ReadNullableString(reader, "passwordHash"),
                ReadNullableString(reader, "passwordSalt"),
                user);
        }

        public async Task<Dictionary<string, object?>?> FindUserByUidAsync(string uid, CancellationToken cancellationToken)
        {
            await using var connection = await OpenConnectionAsync(cancellationToken);
            return await FindUserByUidAsync(connection, uid, cancellationToken);
        }

        public async Task<Dictionary<string, object?>?> CreateUserAsync(CreateUserRecord user, CancellationToken cancellationToken)
        {
            await using var connection = await OpenConnectionAsync(cancellationToken);

            await using var command = connection.CreateCommand();
            command.CommandText = """
                INSERT INTO [User] (
                    uid,
                    email,
                    displayName,
                    displayNameEn,
                    role,
                    groupId,
                    permissionOverrides,
                    teams,
                    departments,
                    photoURL,
                    bypassOtp,
                    receiveSecurityIncidents,
                    passwordHash,
                    passwordSalt,
                    createdAt,
                    updatedAt
                )
                VALUES (
                    @uid,
                    @email,
                    @displayName,
                    @displayNameEn,
                    @role,
                    @groupId,
                    @permissionOverrides,
                    @teams,
                    @departments,
                    @photoURL,
                    @bypassOtp,
                    @receiveSecurityIncidents,
                    @passwordHash,
                    @passwordSalt,
                    @now,
                    @now
                )
                """;

            AddUserWriteParameters(command, user);
            command.Parameters.Add(new SqlParameter("@passwordHash", (object?)user.PasswordHash ?? DBNull.Value));
            command.Parameters.Add(new SqlParameter("@passwordSalt", (object?)user.PasswordSalt ?? DBNull.Value));
            command.Parameters.Add(new SqlParameter("@now", DateTime.UtcNow));

            await command.ExecuteNonQueryAsync(cancellationToken);
            return await FindUserByUidAsync(connection, user.Uid, cancellationToken);
        }

        public async Task<Dictionary<string, object?>?> UpdateUserAsync(string uid, UpdateUserRecord user, CancellationToken cancellationToken)
        {
            await using var connection = await OpenConnectionAsync(cancellationToken);

            await using var command = connection.CreateCommand();
            command.CommandText = """
                UPDATE [User]
                SET
                    email = @email,
                    displayName = @displayName,
                    displayNameEn = @displayNameEn,
                    role = @role,
                    groupId = @groupId,
                    permissionOverrides = @permissionOverrides,
                    teams = @teams,
                    departments = @departments,
                    photoURL = @photoURL,
                    bypassOtp = @bypassOtp,
                    receiveSecurityIncidents = @receiveSecurityIncidents,
                    updatedAt = @now
                    WHERE uid = @uid AND IsDeleted = 0
                """;

            command.Parameters.Add(new SqlParameter("@uid", uid));
            AddUserWriteParameters(command, user);
            command.Parameters.Add(new SqlParameter("@now", DateTime.UtcNow));

            var rowsAffected = await command.ExecuteNonQueryAsync(cancellationToken);
            if (rowsAffected == 0)
            {
                return null;
            }

            return await FindUserByUidAsync(connection, uid, cancellationToken);
        }

        public async Task<bool> SetPasswordAsync(string uid, string passwordHash, string passwordSalt, CancellationToken cancellationToken)
        {
            await using var connection = await OpenConnectionAsync(cancellationToken);

            await using var command = connection.CreateCommand();
            command.CommandText = """
                UPDATE [User]
                SET passwordHash = @passwordHash,
                    passwordSalt = @passwordSalt,
                    updatedAt = @now
                    WHERE uid = @uid AND IsDeleted = 0
                """;
            command.Parameters.Add(new SqlParameter("@uid", uid));
            command.Parameters.Add(new SqlParameter("@passwordHash", passwordHash));
            command.Parameters.Add(new SqlParameter("@passwordSalt", passwordSalt));
            command.Parameters.Add(new SqlParameter("@now", DateTime.UtcNow));

            var rowsAffected = await command.ExecuteNonQueryAsync(cancellationToken);
            return rowsAffected > 0;
        }

        public async Task<bool> DeleteAsync(string uid, CancellationToken cancellationToken)
        {
            await using var connection = await OpenConnectionAsync(cancellationToken);

            await using var command = connection.CreateCommand();
            command.CommandText = """
                UPDATE [User]
                SET IsDeleted = 1,
                    DeletedAt = SYSUTCDATETIME(),
                    DeletedBy = NULL
                WHERE uid = @uid
                  AND IsDeleted = 0
                """;
            command.Parameters.Add(new SqlParameter("@uid", uid));

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

        private static async Task<Dictionary<string, object?>?> FindUserByUidAsync(
            SqlConnection connection,
            string uid,
            CancellationToken cancellationToken)
        {
            await using var command = connection.CreateCommand();
            command.CommandText = "SELECT * FROM [User] WHERE uid = @uid AND IsDeleted = 0";
            command.Parameters.Add(new SqlParameter("@uid", uid));

            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            if (!await reader.ReadAsync(cancellationToken))
            {
                return null;
            }

            return await ReadSanitizedUserAsync(reader, cancellationToken);
        }

        private static void AddUserWriteParameters(SqlCommand command, CreateUserRecord user)
        {
            command.Parameters.Add(new SqlParameter("@uid", user.Uid));
            command.Parameters.Add(new SqlParameter("@email", user.Email));
            command.Parameters.Add(new SqlParameter("@displayName", user.DisplayName));
            command.Parameters.Add(new SqlParameter("@displayNameEn", (object?)user.DisplayNameEn ?? DBNull.Value));
            command.Parameters.Add(new SqlParameter("@role", user.Role));
            command.Parameters.Add(new SqlParameter("@groupId", (object?)user.GroupId ?? DBNull.Value));
            command.Parameters.Add(new SqlParameter("@permissionOverrides", user.PermissionOverridesJson));
            command.Parameters.Add(new SqlParameter("@teams", user.TeamsJson));
            command.Parameters.Add(new SqlParameter("@departments", user.DepartmentsJson));
            command.Parameters.Add(new SqlParameter("@photoURL", (object?)user.PhotoURL ?? DBNull.Value));
            command.Parameters.Add(new SqlParameter("@bypassOtp", user.BypassOtp));
            command.Parameters.Add(new SqlParameter("@receiveSecurityIncidents", user.ReceiveSecurityIncidents));
        }

        private static void AddUserWriteParameters(SqlCommand command, UpdateUserRecord user)
        {
            command.Parameters.Add(new SqlParameter("@email", (object?)user.Email ?? DBNull.Value));
            command.Parameters.Add(new SqlParameter("@displayName", (object?)user.DisplayName ?? DBNull.Value));
            command.Parameters.Add(new SqlParameter("@displayNameEn", (object?)user.DisplayNameEn ?? DBNull.Value));
            command.Parameters.Add(new SqlParameter("@role", (object?)user.Role ?? DBNull.Value));
            command.Parameters.Add(new SqlParameter("@groupId", (object?)user.GroupId ?? DBNull.Value));
            command.Parameters.Add(new SqlParameter("@permissionOverrides", user.PermissionOverridesJson));
            command.Parameters.Add(new SqlParameter("@teams", user.TeamsJson));
            command.Parameters.Add(new SqlParameter("@departments", user.DepartmentsJson));
            command.Parameters.Add(new SqlParameter("@photoURL", (object?)user.PhotoURL ?? DBNull.Value));
            command.Parameters.Add(new SqlParameter("@bypassOtp", user.BypassOtp));
            command.Parameters.Add(new SqlParameter("@receiveSecurityIncidents", user.ReceiveSecurityIncidents));
        }

        private static async Task<Dictionary<string, object?>> ReadSanitizedUserAsync(
            SqlDataReader reader,
            CancellationToken cancellationToken)
        {
            var user = new Dictionary<string, object?>(StringComparer.Ordinal);
            for (var i = 0; i < reader.FieldCount; i++)
            {
                var columnName = reader.GetName(i);
                if (columnName.Equals("passwordHash", StringComparison.OrdinalIgnoreCase) ||
                    columnName.Equals("passwordSalt", StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }

                var value = await reader.IsDBNullAsync(i, cancellationToken)
                    ? null
                    : reader.GetValue(i);

                user[columnName] = IsJsonField(columnName) && value is string jsonValue
                    ? ParseJsonValue(jsonValue)
                    : value;
            }

            return user;
        }

        private static bool IsJsonField(string columnName) =>
            columnName.Equals("teams", StringComparison.OrdinalIgnoreCase) ||
            columnName.Equals("departments", StringComparison.OrdinalIgnoreCase) ||
            columnName.Equals("permissionOverrides", StringComparison.OrdinalIgnoreCase);

        private static object? ParseJsonValue(string value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return null;
            }

            try
            {
                return JsonSerializer.Deserialize<object>(value);
            }
            catch (JsonException)
            {
                return value;
            }
        }

        private static string ReadRequiredString(SqlDataReader reader, string columnName)
        {
            var ordinal = reader.GetOrdinal(columnName);
            return reader.GetString(ordinal);
        }

        private static string? ReadNullableString(SqlDataReader reader, string columnName)
        {
            var ordinal = reader.GetOrdinal(columnName);
            return reader.IsDBNull(ordinal) ? null : reader.GetString(ordinal);
        }
    }
}
