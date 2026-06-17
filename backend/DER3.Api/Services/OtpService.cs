using System.Security.Cryptography;
using DER3.Api.DTOs;
using Microsoft.Extensions.Caching.Memory;

namespace DER3.Api.Services
{
    public sealed record OtpVerificationResult(bool Ok, string? Token = null, object? User = null);

    public interface IOtpService
    {
        Task<bool> RequestOtpAsync(OtpRequestDto request, CancellationToken cancellationToken);

        OtpVerificationResult VerifyOtp(OtpVerifyDto request);
    }

    public sealed class OtpService : IOtpService
    {
        private const int OtpExpiryMinutes = 5;
        private readonly IAuthService _authService;
        private readonly IEmailService _emailService;
        private readonly IJwtTokenService _jwtTokenService;
        private readonly IMemoryCache _memoryCache;

        public OtpService(
            IAuthService authService,
            IEmailService emailService,
            IJwtTokenService jwtTokenService,
            IMemoryCache memoryCache)
        {
            _authService = authService;
            _emailService = emailService;
            _jwtTokenService = jwtTokenService;
            _memoryCache = memoryCache;
        }

        public async Task<bool> RequestOtpAsync(OtpRequestDto request, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(request.Email) || request.Password is null)
            {
                return false;
            }

            var user = await _authService.VerifyAsync(request.Email, request.Password, cancellationToken);
            if (user is null)
            {
                return false;
            }

            var otp = GenerateOtp();
            var cacheEntry = new PendingOtp(otp, user);
            var cacheKey = CacheKey(request.Email);

            _memoryCache.Set(
                cacheKey,
                cacheEntry,
                new MemoryCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(OtpExpiryMinutes)
                });

            try
            {
                await _emailService.SendOtpAsync(request.Email.Trim(), otp, cancellationToken);
            }
            catch
            {
                _memoryCache.Remove(cacheKey);
                throw;
            }

            return true;
        }

        public OtpVerificationResult VerifyOtp(OtpVerifyDto request)
        {
            if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Otp))
            {
                return new OtpVerificationResult(false);
            }

            var cacheKey = CacheKey(request.Email);
            if (!_memoryCache.TryGetValue<PendingOtp>(cacheKey, out var pendingOtp) || pendingOtp is null)
            {
                return new OtpVerificationResult(false);
            }

            var providedOtp = request.Otp.Trim();
            if (!FixedTimeEquals(providedOtp, pendingOtp.Otp))
            {
                return new OtpVerificationResult(false);
            }

            _memoryCache.Remove(cacheKey);
            return new OtpVerificationResult(
                true,
                _jwtTokenService.CreateToken(pendingOtp.User),
                pendingOtp.User.User);
        }

        private static string GenerateOtp() =>
            RandomNumberGenerator.GetInt32(0, 1000000).ToString("D6");

        private static string CacheKey(string email) =>
            $"auth:otp:{email.Trim().ToLowerInvariant()}";

        private static bool FixedTimeEquals(string providedOtp, string expectedOtp)
        {
            if (providedOtp.Length != expectedOtp.Length)
            {
                return false;
            }

            return CryptographicOperations.FixedTimeEquals(
                System.Text.Encoding.UTF8.GetBytes(providedOtp),
                System.Text.Encoding.UTF8.GetBytes(expectedOtp));
        }

        private sealed record PendingOtp(string Otp, AuthenticatedUser User);
    }
}
