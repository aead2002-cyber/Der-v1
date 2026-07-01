using System.Security.Cryptography;
using System.Text;
using DER3.Api.Repositories;

namespace DER3.Api.Services
{
    public sealed record AuthenticatedUser(
        string Uid,
        string? Email,
        string? DisplayName,
        string? Role,
        Dictionary<string, object?> User);

    public interface IAuthService
    {
        Task<AuthenticatedUser?> VerifyAsync(string email, string password, CancellationToken cancellationToken);
    }

    public sealed class AuthService : IAuthService
    {
        private readonly IUserRepository _userRepository;
        private readonly IPlatformAccessService _platformAccessService;

        public AuthService(IUserRepository userRepository, IPlatformAccessService platformAccessService)
        {
            _userRepository = userRepository;
            _platformAccessService = platformAccessService;
        }

        public async Task<AuthenticatedUser?> VerifyAsync(string email, string password, CancellationToken cancellationToken)
        {
            var user = await _userRepository.FindAuthByEmailAsync(email, cancellationToken);
            if (user is null)
            {
                return null;
            }

            var hasHash = !string.IsNullOrEmpty(user.PasswordHash);
            var hasSalt = !string.IsNullOrEmpty(user.PasswordSalt);

            if (!hasHash || !hasSalt)
            {
                return null;
            }

            var passwordIsValid = VerifyPasswordHash(password, user.PasswordSalt!, user.PasswordHash!);

            return passwordIsValid
                ? new AuthenticatedUser(user.Uid, user.Email, user.DisplayName, user.Role, _platformAccessService.WithPlatforms(user.User))
                : null;
        }

        private static bool VerifyPasswordHash(string password, string salt, string expectedHash)
        {
            try
            {
                var computedHash = Rfc2898DeriveBytes.Pbkdf2(
                    password,
                    Encoding.UTF8.GetBytes(salt),
                    100000,
                    HashAlgorithmName.SHA256,
                    32);

                var expectedHashBytes = Convert.FromHexString(expectedHash);
                return computedHash.Length == expectedHashBytes.Length &&
                    CryptographicOperations.FixedTimeEquals(computedHash, expectedHashBytes);
            }
            catch (FormatException)
            {
                return false;
            }
        }
    }
}
