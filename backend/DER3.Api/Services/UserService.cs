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

        Task<UserWriteResult> GetCurrentUserAsync(string uid, CancellationToken cancellationToken);

        Task<UserWriteResult> UpdateCurrentUserProfileAsync(string uid, UpdateMyProfileRequestDto request, CancellationToken cancellationToken);

        Task<UserWriteResult> SetPasswordAsync(string uid, SetPasswordRequestDto request, CancellationToken cancellationToken);

        Task<UserWriteResult> DeleteAsync(string uid, string? deletedBy, CancellationToken cancellationToken);
    }

    public sealed class UserService : IUserService
    {
        private const int MinimumPasswordLength = 6;
        private readonly IUserRepository _userRepository;
        private readonly IPlatformAccessService _platformAccessService;

        public UserService(IUserRepository userRepository, IPlatformAccessService platformAccessService)
        {
            _userRepository = userRepository;
            _platformAccessService = platformAccessService;
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

            return user is null
                ? new UserWriteResult(false, "User could not be saved")
                : new UserWriteResult(true, User: _platformAccessService.WithPlatforms(user));
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
                : new UserWriteResult(true, User: _platformAccessService.WithPlatforms(user));
        }

        public async Task<UserWriteResult> GetCurrentUserAsync(string uid, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(uid))
            {
                return new UserWriteResult(false, "uid is required");
            }

            var user = await _userRepository.FindUserByUidAsync(uid.Trim(), cancellationToken);
            return user is null
                ? new UserWriteResult(false, "User not found")
                : new UserWriteResult(true, User: _platformAccessService.WithPlatforms(user));
        }

        public async Task<UserWriteResult> UpdateCurrentUserProfileAsync(string uid, UpdateMyProfileRequestDto request, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(uid))
            {
                return new UserWriteResult(false, "uid is required");
            }

            if (IncidentService.HasUnknownFields(request.UnknownFields))
            {
                return new UserWriteResult(false, "Payload contains unsupported fields");
            }

            var trimmedUid = uid.Trim();
            var currentUser = await _userRepository.FindUserByUidAsync(trimmedUid, cancellationToken);
            if (currentUser is null)
            {
                return new UserWriteResult(false, "User not found");
            }

            var currentDisplayName = ReadString(currentUser, "displayName");
            if (string.IsNullOrWhiteSpace(currentDisplayName))
            {
                return new UserWriteResult(false, "User display name is required");
            }

            var displayName = ResolveDisplayName(request.DisplayName, currentDisplayName);
            if (string.IsNullOrWhiteSpace(displayName))
            {
                return new UserWriteResult(false, "displayName is required");
            }

            var displayNameEn = ResolveOptionalString(request.DisplayNameEn, ReadString(currentUser, "displayNameEn"));
            var photoUrl = ResolveOptionalString(request.PhotoURL, ReadString(currentUser, "photoURL"));

            var updated = await _userRepository.UpdateMyProfileAsync(
                trimmedUid,
                new UpdateMyProfileRecord(displayName, displayNameEn, photoUrl),
                cancellationToken);

            return updated is null
                ? new UserWriteResult(false, "User not found")
                : new UserWriteResult(true, User: _platformAccessService.WithPlatforms(updated));
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

        public async Task<UserWriteResult> DeleteAsync(string uid, string? deletedBy, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(uid))
            {
                return new UserWriteResult(false, "uid is required");
            }

            var deleted = await _userRepository.DeleteAsync(uid.Trim(), deletedBy, cancellationToken);
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

        private static string? ResolveOptionalString(string? incoming, string? fallback)
        {
            if (incoming is null)
            {
                return fallback;
            }

            var trimmed = incoming.Trim();
            return string.IsNullOrWhiteSpace(trimmed) ? null : trimmed;
        }

        private static string ResolveDisplayName(string? incoming, string fallback)
        {
            if (incoming is null)
            {
                return fallback;
            }

            var trimmed = incoming.Trim();
            return string.IsNullOrWhiteSpace(trimmed) ? fallback : trimmed;
        }

        private static string? ReadString(Dictionary<string, object?> user, string key)
        {
            if (!user.TryGetValue(key, out var value) || value is null)
            {
                return null;
            }

            return value switch
            {
                string s => s,
                _ => value.ToString()
            };
        }
    }
}
