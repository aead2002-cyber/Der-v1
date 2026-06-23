using System.Security.Cryptography;
using DER3.Api.DTOs;
using DER3.Api.Repositories;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.Caching.Memory;

namespace DER3.Api.Services
{
    public sealed record PasswordResetTokenRecord(string Uid, string Email);

    public sealed record PasswordResetRequestResult(bool Success);

    public sealed record PasswordResetVerificationResult(bool Success, string? Email = null, string? Error = null);

    public sealed record PasswordResetCompletionResult(bool Success, string? Error = null);

    public interface IPasswordResetService
    {
        Task<PasswordResetRequestResult> RequestPasswordResetAsync(string email, CancellationToken cancellationToken);

        Task<PasswordResetVerificationResult> VerifyResetTokenAsync(string token, CancellationToken cancellationToken);

        Task<PasswordResetCompletionResult> ResetPasswordAsync(string token, string newPassword, CancellationToken cancellationToken);
    }

    public sealed class PasswordResetService : IPasswordResetService
    {
        private static readonly TimeSpan ResetTokenLifetime = TimeSpan.FromMinutes(30);
        private static readonly SemaphoreSlim ResetLock = new(1, 1);
        private const string CacheKeyPrefix = "password_reset:";

        private readonly IMemoryCache _memoryCache;
        private readonly IUserRepository _userRepository;
        private readonly IUserService _userService;
        private readonly IEmailService _emailService;
        private readonly IConfiguration _configuration;

        public PasswordResetService(
            IMemoryCache memoryCache,
            IUserRepository userRepository,
            IUserService userService,
            IEmailService emailService,
            IConfiguration configuration)
        {
            _memoryCache = memoryCache;
            _userRepository = userRepository;
            _userService = userService;
            _emailService = emailService;
            _configuration = configuration;
        }

        public async Task<PasswordResetRequestResult> RequestPasswordResetAsync(string email, CancellationToken cancellationToken)
        {
            var normalizedEmail = email.Trim();
            if (string.IsNullOrWhiteSpace(normalizedEmail))
            {
                return new PasswordResetRequestResult(true);
            }

            var user = await _userRepository.FindAuthByEmailAsync(normalizedEmail, cancellationToken);
            if (user is null || string.IsNullOrWhiteSpace(user.Email))
            {
                return new PasswordResetRequestResult(true);
            }

            var token = GenerateToken();
            var tokenHash = HashToken(token);
            _memoryCache.Set(
                CacheKey(tokenHash),
                new PasswordResetTokenRecord(user.Uid, user.Email!),
                new MemoryCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = ResetTokenLifetime
                });

            var frontendBaseUrl = _configuration["Frontend:BaseUrl"]?.TrimEnd('/') ?? "http://10.10.12.117:3000";
            var resetLink = $"{frontendBaseUrl}/reset-password?token={token}";

            try
            {
                await _emailService.SendPasswordResetAsync(user.Email!, resetLink, cancellationToken);
            }
            catch
            {
                // Intentionally swallow delivery errors here so the endpoint remains non-enumerable.
            }

            return new PasswordResetRequestResult(true);
        }

        public Task<PasswordResetVerificationResult> VerifyResetTokenAsync(string token, CancellationToken cancellationToken)
        {
            var record = TryGetRecord(token);
            return Task.FromResult(record is null
                ? new PasswordResetVerificationResult(false, Error: "Invalid or expired reset token")
                : new PasswordResetVerificationResult(true, record.Email));
        }

        public async Task<PasswordResetCompletionResult> ResetPasswordAsync(string token, string newPassword, CancellationToken cancellationToken)
        {
            var acquired = false;
            try
            {
                await ResetLock.WaitAsync(cancellationToken);
                acquired = true;

                var tokenRecord = TryGetRecord(token);
                if (tokenRecord is null)
                {
                    return new PasswordResetCompletionResult(false, "Invalid or expired reset token");
                }

                var result = await _userService.SetPasswordAsync(
                    tokenRecord.Uid,
                    new SetPasswordRequestDto { Password = newPassword },
                    cancellationToken);

                if (!result.Success)
                {
                    return new PasswordResetCompletionResult(false, "Invalid or expired reset token");
                }

                _memoryCache.Remove(CacheKey(HashToken(token)));
                return new PasswordResetCompletionResult(true);
            }
            finally
            {
                if (acquired)
                {
                    ResetLock.Release();
                }
            }
        }

        private PasswordResetTokenRecord? TryGetRecord(string token)
        {
            if (string.IsNullOrWhiteSpace(token))
            {
                return null;
            }

            return _memoryCache.TryGetValue(CacheKey(HashToken(token)), out PasswordResetTokenRecord? record)
                ? record
                : null;
        }

        private static string CacheKey(string tokenHash) => $"{CacheKeyPrefix}{tokenHash}";

        private static string GenerateToken()
        {
            var bytes = RandomNumberGenerator.GetBytes(32);
            return WebEncoders.Base64UrlEncode(bytes);
        }

        private static string HashToken(string token)
        {
            var hashBytes = SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(token));
            return Convert.ToHexString(hashBytes).ToLowerInvariant();
        }
    }
}
