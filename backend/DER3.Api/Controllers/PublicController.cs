using DER3.Api.DTOs;
using DER3.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;

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
                        ReporterEmail = request.ReporterEmail,
                        Title = request.Title,
                        Description = request.Description,
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
