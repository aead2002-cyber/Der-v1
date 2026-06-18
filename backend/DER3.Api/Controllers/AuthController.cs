using DER3.Api.DTOs;
using DER3.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using System.Net.Mail;
using System.Security.Claims;

namespace DER3.Api.Controllers
{
    [ApiController]
    [Route("api/auth")]
    [Authorize]
    public sealed class AuthController : ControllerBase
    {
        private const string InvalidCredentialsMessage = "Invalid email or password";
        private const string InvalidOtpMessage = "Invalid or expired OTP";
        private readonly IOtpService _otpService;

        public AuthController(IOtpService otpService)
        {
            _otpService = otpService;
        }

        [HttpPost("verify")]
        [AllowAnonymous]
        public async Task<ActionResult<LoginVerifyResponseDto>> Verify(
            [FromBody] LoginRequestDto request,
            CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(request.Email) || request.Password is null)
            {
                return BadRequest(new LoginVerifyResponseDto
                {
                    Ok = false,
                    Error = InvalidCredentialsMessage
                });
            }

            try
            {
                var ok = await _otpService.RequestOtpAsync(
                    new OtpRequestDto
                    {
                        Email = request.Email,
                        Password = request.Password
                    },
                    cancellationToken);

                if (!ok)
                {
                    return Ok(new LoginVerifyResponseDto
                    {
                        Ok = false,
                        Error = InvalidCredentialsMessage
                    });
                }

                return Ok(new LoginVerifyResponseDto
                {
                    Ok = true,
                    RequiresOtp = true,
                    Message = "OTP sent"
                });
            }
            catch (SqlException)
            {
                return StatusCode(500, new LoginVerifyResponseDto
                {
                    Ok = false,
                    Error = "Authentication query failed"
                });
            }
            catch (SmtpException)
            {
                return StatusCode(502, new LoginVerifyResponseDto
                {
                    Ok = false,
                    Error = "OTP email could not be sent"
                });
            }
            catch (InvalidOperationException)
            {
                return StatusCode(500, new LoginVerifyResponseDto
                {
                    Ok = false,
                    Error = "OTP service is not configured"
                });
            }
        }

        [HttpPost("verify-otp")]
        [AllowAnonymous]
        public IActionResult VerifyOtp([FromBody] OtpVerifyDto request)
        {
            try
            {
                var result = _otpService.VerifyOtp(request);
                if (!result.Ok)
                {
                    return Ok(new { ok = false, error = InvalidOtpMessage });
                }

                return Ok(new
                {
                    ok = true,
                    token = result.Token,
                    user = result.User
                });
            }
            catch (InvalidOperationException)
            {
                return StatusCode(500, new { ok = false, error = "JWT service is not configured" });
            }
        }

        [Authorize]
        [HttpGet("me")]
        public IActionResult Me()
        {
            var claims = User.Claims
                .GroupBy(claim => claim.Type)
                .ToDictionary(
                    group => group.Key,
                    group => group.Count() == 1
                        ? (object)group.First().Value
                        : group.Select(claim => claim.Value).ToArray(),
                    StringComparer.Ordinal);

            return Ok(new
            {
                authenticated = User.Identity?.IsAuthenticated == true,
                uid = User.FindFirstValue(ClaimTypes.NameIdentifier),
                email = User.FindFirstValue(ClaimTypes.Email),
                name = User.FindFirstValue(ClaimTypes.Name),
                role = User.FindFirstValue(ClaimTypes.Role),
                claims
            });
        }
    }
}
