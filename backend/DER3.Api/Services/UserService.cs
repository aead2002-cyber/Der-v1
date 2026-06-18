using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using DER3.Api.DTOs;
using DER3.Api.Repositories;

namespace DER3.Api.Services
{
    public sealed record UserWriteResult(bool Success, string? Error = null, Dictionary<string, object?>? User = null);

    public interface IUserService
    {
        Task<UserWriteResult> CreateUserAsync(CreateUserRequestDto request, CancellationToken cancellationToken);

        Task<UserWriteResult> UpdateUserAsync(string uid, UpdateUserRequestDto request, CancellationToken cancellationToken);

        Task<UserWriteResult> SetPasswordAsync(string uid, SetPasswordRequestDto request, CancellationToken cancellationToken);

        Task<UserWriteResult> DeleteAsync(string uid, CancellationToken cancellationToken);
    }

    public sealed class UserService : IUserService
    {
        private const int MinimumPasswordLength = 6;
        private readonly IUserRepository _userRepository;

        public UserService(IUserRepository userRepository)
        {
            _userRepository = userRepository;
        }

        public async Task<UserWriteResult> CreateUserAsync(CreateUserRequestDto request, CancellationToken cancellationToken)
        {
            if (IncidentService.HasUnknownFields(request.UnknownFields))
            {
                return new UserWriteResult(false, "Payload contains unsupported fields");
            }

            if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.DisplayName))
            {
                return new UserWriteResult(false, "email and displayName are required");
            }

            var uid = string.IsNullOrWhiteSpace(request.Uid)
                ? Guid.NewGuid().ToString("N")
                : request.Uid.Trim();

            string? passwordHash = null;
            string? passwordSalt = null;
            if (!string.IsNullOrEmpty(request.Password))
            {
                if (request.Password.Length < MinimumPasswordLength)
                {
                    return new UserWriteResult(false, "Password must be at least 6 characters");
                }

                (passwordHash, passwordSalt) = HashPassword(request.Password);
            }

            var user = await _userRepository.CreateUserAsync(
                new CreateUserRecord(
                    uid,
                    request.Email.Trim(),
                    request.DisplayName.Trim(),
                    NullIfWhiteSpace(request.DisplayNameEn),
                    NormalizeRole(request.Role),
                    NullIfWhiteSpace(request.GroupId),
                    SerializeJsonObject(request.PermissionOverrides),
                    SerializeStringArray(request.Teams),
                    SerializeStringArray(request.Departments),
                    NullIfWhiteSpace(request.PhotoURL),
                    request.BypassOtp ?? false,
                    request.ReceiveSecurityIncidents ?? false,
                    passwordHash,
                    passwordSalt),
                cancellationToken);

            return new UserWriteResult(true, User: user);
        }

        public async Task<UserWriteResult> UpdateUserAsync(string uid, UpdateUserRequestDto request, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(uid))
            {
                return new UserWriteResult(false, "uid is required");
            }

            if (IncidentService.HasUnknownFields(request.UnknownFields))
            {
                return new UserWriteResult(false, "Payload contains unsupported fields");
            }

            if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.DisplayName))
            {
                return new UserWriteResult(false, "email and displayName are required");
            }

            var user = await _userRepository.UpdateUserAsync(
                uid.Trim(),
                new UpdateUserRecord(
                    request.Email.Trim(),
                    request.DisplayName.Trim(),
                    NullIfWhiteSpace(request.DisplayNameEn),
                    NormalizeRole(request.Role),
                    NullIfWhiteSpace(request.GroupId),
                    SerializeJsonObject(request.PermissionOverrides),
                    SerializeStringArray(request.Teams),
                    SerializeStringArray(request.Departments),
                    NullIfWhiteSpace(request.PhotoURL),
                    request.BypassOtp ?? false,
                    request.ReceiveSecurityIncidents ?? false),
                cancellationToken);

            return user is null
                ? new UserWriteResult(false, "User not found")
                : new UserWriteResult(true, User: user);
        }

        public async Task<UserWriteResult> SetPasswordAsync(string uid, SetPasswordRequestDto request, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(uid))
            {
                return new UserWriteResult(false, "uid is required");
            }

            if (IncidentService.HasUnknownFields(request.UnknownFields))
            {
                return new UserWriteResult(false, "Payload contains unsupported fields");
            }

            if (request.Password is null || request.Password.Length < MinimumPasswordLength)
            {
                return new UserWriteResult(false, "Password must be at least 6 characters");
            }

            var (passwordHash, passwordSalt) = HashPassword(request.Password);
            var updated = await _userRepository.SetPasswordAsync(uid.Trim(), passwordHash, passwordSalt, cancellationToken);

            return updated
                ? new UserWriteResult(true)
                : new UserWriteResult(false, "User not found");
        }

        public async Task<UserWriteResult> DeleteAsync(string uid, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(uid))
            {
                return new UserWriteResult(false, "uid is required");
            }

            var deleted = await _userRepository.DeleteAsync(uid.Trim(), cancellationToken);
            return deleted
                ? new UserWriteResult(true)
                : new UserWriteResult(false, "User not found");
        }

        private static (string Hash, string Salt) HashPassword(string password)
        {
            var saltBytes = RandomNumberGenerator.GetBytes(16);
            var salt = Convert.ToHexString(saltBytes).ToLowerInvariant();
            var hash = Rfc2898DeriveBytes.Pbkdf2(
                password,
                Encoding.UTF8.GetBytes(salt),
                100000,
                HashAlgorithmName.SHA256,
                32);

            return (Convert.ToHexString(hash).ToLowerInvariant(), salt);
        }

        private static string NormalizeRole(string? role) =>
            string.IsNullOrWhiteSpace(role) ? "user" : role.Trim();

        private static string? NullIfWhiteSpace(string? value) =>
            string.IsNullOrWhiteSpace(value) ? null : value.Trim();

        private static string SerializeStringArray(List<string>? values) =>
            JsonSerializer.Serialize(values?.Where(value => !string.IsNullOrWhiteSpace(value)).ToArray() ?? []);

        private static string SerializeJsonObject(JsonElement? value)
        {
            if (value is not { } element || element.ValueKind is JsonValueKind.Null or JsonValueKind.Undefined)
            {
                return "{}";
            }

            return element.GetRawText();
        }
    }
}
