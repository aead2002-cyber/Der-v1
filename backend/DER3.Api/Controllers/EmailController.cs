using DER3.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DER3.Api.Controllers
{
    [ApiController]
    [Route("api/email")]
    [Authorize]
    public sealed class EmailController : ControllerBase
    {
        private readonly IEmailService _emailService;
        private readonly IWebHostEnvironment _environment;

        public EmailController(IEmailService emailService, IWebHostEnvironment environment)
        {
            _emailService = emailService;
            _environment = environment;
        }

        [HttpPost("test")]
        public async Task<IActionResult> Test(CancellationToken cancellationToken)
        {
            var result = await _emailService.TestSmtpAsync(cancellationToken);
            if (_environment.IsDevelopment())
            {
                return result.Ok ? Ok(result) : StatusCode(502, result);
            }

            return result.Ok
                ? Ok(new { ok = true })
                : StatusCode(502, new { ok = false, error = "SMTP test failed" });
        }
    }
}
