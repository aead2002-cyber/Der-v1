using DER3.Api.DTOs;
using DER3.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using System.Net.Mail;

namespace DER3.Api.Controllers
{
    [ApiController]
    [AllowAnonymous]
    [Route("api/public")]
    [Produces("application/json")]
    public sealed class PublicController : ControllerBase
    {
        private static readonly HashSet<string> AllowedPriorities = new(StringComparer.OrdinalIgnoreCase)
        {
            "low",
            "medium",
            "high",
            "critical"
        };

        private static readonly HashSet<string> AllowedLookupCategories = new(StringComparer.OrdinalIgnoreCase)
        {
            "incident_type"
        };

        private const int MinimumSubmissionAgeMs = 1500;
        private const int MaxSubmissionsPerWindow = 5;
        private static readonly TimeSpan SubmissionWindow = TimeSpan.FromMinutes(10);
        private static readonly object SubmissionThrottleLock = new();
        private static readonly Dictionary<string, SubmissionThrottleState> SubmissionThrottle = new(StringComparer.OrdinalIgnoreCase);

        private readonly IIncidentService _incidentService;
        private readonly IFileService _fileService;
        private readonly ILookupOptionService _lookupOptionService;

        public PublicController(
            IIncidentService incidentService,
            IFileService fileService,
            ILookupOptionService lookupOptionService)
        {
            _incidentService = incidentService;
            _fileService = fileService;
            _lookupOptionService = lookupOptionService;
        }

        [HttpPost("incidents")]
        [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(object), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(object), StatusCodes.Status429TooManyRequests)]
        [ProducesResponseType(typeof(object), StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> CreateIncident(
            [FromBody] CreatePublicIncidentRequestDto request,
            CancellationToken cancellationToken)
        {
            if (IncidentService.HasUnknownFields(request.UnknownFields))
            {
                return BadRequest(new { success = false, error = "Payload contains unsupported fields" });
            }

            if (string.IsNullOrWhiteSpace(request.ReporterEmail) ||
                string.IsNullOrWhiteSpace(request.Title) ||
                string.IsNullOrWhiteSpace(request.Description))
            {
                return BadRequest(new { success = false, error = "reporterEmail, title and description are required" });
            }

            var reporterEmail = request.ReporterEmail.Trim();
            if (!IsValidEmail(reporterEmail))
            {
                return BadRequest(new { success = false, error = "reporterEmail is invalid" });
            }

            var title = request.Title.Trim();
            var description = request.Description.Trim();
            if (!HasMeaningfulText(title, 3) || !HasMeaningfulText(description, 10))
            {
                return BadRequest(new { success = false, error = "title and description must contain meaningful text" });
            }

            if (!string.IsNullOrWhiteSpace(request.Honeypot))
            {
                return BadRequest(new { success = false, error = "Submission was rejected" });
            }

            if (!IsTimingValid(request, out var timingError))
            {
                return BadRequest(new { success = false, error = timingError });
            }

            var remoteIp = HttpContext.Connection.RemoteIpAddress?.ToString();
            if (!string.IsNullOrWhiteSpace(remoteIp) &&
                !TryRegisterSubmission(remoteIp, out var retryAfterSeconds))
            {
                return StatusCode(StatusCodes.Status429TooManyRequests, new
                {
                    success = false,
                    error = "Too many submissions from this IP address",
                    retryAfterSeconds
                });
            }

            var priority = string.IsNullOrWhiteSpace(request.Priority) ? "medium" : request.Priority.Trim().ToLowerInvariant();
            if (!AllowedPriorities.Contains(priority))
            {
                return BadRequest(new { success = false, error = "priority is invalid" });
            }

            try
            {
                var now = DateTime.UtcNow;
                var result = await _incidentService.CreateAsync(
                    new CreateIncidentRequestDto
                    {
                        ReporterEmail = reporterEmail,
                        Title = title,
                        Description = description,
                        Type = IncidentService.NormalizeOptionalString(request.Type) ?? "other",
                        Priority = priority,
                        Status = "new",
                        ReportedAt = now,
                        UpdatedAt = now,
                        Attachments = IncidentService.CleanStringArray(request.Attachments)
                    },
                    cancellationToken);

                if (!result.Success)
                {
                    return BadRequest(new { success = false, error = result.Error });
                }

                object? incidentId = null;
                result.Item?.TryGetValue("id", out incidentId);
                return Ok(new
                {
                    success = true,
                    item = new
                    {
                        id = incidentId?.ToString() ?? string.Empty,
                        status = "new"
                    }
                });
            }
            catch (SqlException)
            {
                return StatusCode(500, new { success = false, error = "Incident could not be saved" });
            }
            catch (InvalidOperationException)
            {
                return StatusCode(500, new { success = false, error = "Incident storage is not configured" });
            }
        }

        private static bool IsValidEmail(string value)
        {
            try
            {
                _ = new MailAddress(value);
                return true;
            }
            catch
            {
                return false;
            }
        }

        private static bool HasMeaningfulText(string value, int minLength)
        {
            var trimmed = value.Trim();
            if (trimmed.Length < minLength)
            {
                return false;
            }

            if (trimmed.All(char.IsWhiteSpace))
            {
                return false;
            }

            var alphanumericCount = trimmed.Count(char.IsLetterOrDigit);
            if (alphanumericCount < 3)
            {
                return false;
            }

            if (trimmed.Distinct().Count() <= 2)
            {
                return false;
            }

            return true;
        }

        private static bool IsTimingValid(CreatePublicIncidentRequestDto request, out string error)
        {
            error = "Submission timing is required";

            var now = DateTime.UtcNow;
            var elapsedMs = request.ClientElapsedMs;
            var start = request.FormStartedAtUtc;

            if (elapsedMs is null && start is null)
            {
                return false;
            }

            if (elapsedMs is < 0)
            {
                error = "Submission timing is invalid";
                return false;
            }

            if (elapsedMs is not null && elapsedMs < MinimumSubmissionAgeMs)
            {
                error = "Submission was sent too quickly";
                return false;
            }

            if (start is not null)
            {
                var observedElapsed = now - start.Value.ToUniversalTime();
                if (observedElapsed < TimeSpan.Zero)
                {
                    error = "Submission timing is invalid";
                    return false;
                }

                if (observedElapsed.TotalMilliseconds < MinimumSubmissionAgeMs)
                {
                    error = "Submission was sent too quickly";
                    return false;
                }
            }

            error = string.Empty;
            return true;
        }

        private static bool TryRegisterSubmission(string remoteIp, out int retryAfterSeconds)
        {
            lock (SubmissionThrottleLock)
            {
                var now = DateTimeOffset.UtcNow;
                if (!SubmissionThrottle.TryGetValue(remoteIp, out var state))
                {
                    SubmissionThrottle[remoteIp] = new SubmissionThrottleState(now, 1);
                    retryAfterSeconds = 0;
                    return true;
                }

                if (now - state.WindowStartUtc > SubmissionWindow)
                {
                    SubmissionThrottle[remoteIp] = new SubmissionThrottleState(now, 1);
                    retryAfterSeconds = 0;
                    return true;
                }

                if (state.Count >= MaxSubmissionsPerWindow)
                {
                    retryAfterSeconds = (int)Math.Ceiling((SubmissionWindow - (now - state.WindowStartUtc)).TotalSeconds);
                    return false;
                }

                SubmissionThrottle[remoteIp] = state with { Count = state.Count + 1 };
                retryAfterSeconds = 0;
                return true;
            }
        }

        private sealed record SubmissionThrottleState(DateTimeOffset WindowStartUtc, int Count);

        [HttpPost("uploads")]
        [Consumes("multipart/form-data")]
        [ProducesResponseType(typeof(FileUploadResponseDto), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(object), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(object), StatusCodes.Status413PayloadTooLarge)]
        [ProducesResponseType(typeof(object), StatusCodes.Status415UnsupportedMediaType)]
        [ProducesResponseType(typeof(object), StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> Upload(IFormFile file)
        {
            try
            {
                var result = await _fileService.UploadAsync(file, HttpContext.RequestAborted);
                if (!result.Success)
                {
                    return result.Error == "File exceeds the maximum allowed size of 2 MB"
                        ? StatusCode(413, new { error = result.Error })
                        : result.Error == "Only images and PDF files are allowed"
                            ? StatusCode(415, new { error = result.Error })
                            : BadRequest(new { error = result.Error });
                }

                return Ok(result.Upload);
            }
            catch (SqlException)
            {
                return StatusCode(500, new { error = "File could not be saved" });
            }
            catch (InvalidOperationException)
            {
                return StatusCode(500, new { error = "File storage is not configured" });
            }
            catch (IOException)
            {
                return StatusCode(500, new { error = "File could not be read" });
            }
        }

        [HttpGet("lookupOptions")]
        [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(object), StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> GetLookupOptions([FromQuery] string? category, CancellationToken cancellationToken)
        {
            var lookupCategory = string.IsNullOrWhiteSpace(category) ? "incident_type" : category.Trim();
            if (!AllowedLookupCategories.Contains(lookupCategory))
            {
                return BadRequest(new { error = "Lookup category is not public" });
            }

            try
            {
                var rows = await _lookupOptionService.GetActivePublicAsync(lookupCategory, cancellationToken);
                return Ok(rows);
            }
            catch (SqlException)
            {
                return StatusCode(500, new { error = "Lookup options query failed" });
            }
            catch (InvalidOperationException)
            {
                return StatusCode(500, new { error = "Lookup option storage is not configured" });
            }
        }
    }
}
