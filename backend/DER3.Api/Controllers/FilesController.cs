using DER3.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using System.Security.Cryptography;
using System.Security.Claims;

namespace DER3.Api.Controllers
{
    [ApiController]
    [Authorize]
    [Produces("application/json")]
    public sealed class FilesController : ControllerBase
    {
        private readonly IFileService _fileService;

        public FilesController(IFileService fileService)
        {
            _fileService = fileService;
        }

        [HttpPost("/api/uploads")]
        [Consumes("multipart/form-data")]
        [EndpointSummary("Upload file")]
        [EndpointDescription("Uploads an image or PDF file and stores encrypted file bytes.")]
        [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(object), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(object), StatusCodes.Status413PayloadTooLarge)]
        [ProducesResponseType(typeof(object), StatusCodes.Status415UnsupportedMediaType)]
        [ProducesResponseType(typeof(object), StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> Upload(IFormFile file)
        {
            // TODO: Add authorization before enabling file upload in production.
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

        [HttpGet("api/files/{id}")]
        [EndpointSummary("Download file")]
        [EndpointDescription("Downloads and decrypts an uploaded file by id.")]
        [ProducesResponseType(typeof(FileResult), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(object), StatusCodes.Status404NotFound)]
        [ProducesResponseType(typeof(object), StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> Download(string id, CancellationToken cancellationToken)
        {
            // TODO: Add authorization before enabling file download in production.
            try
            {
                var result = await _fileService.DownloadAsync(id, cancellationToken);
                if (!result.Success || result.Data is null)
                {
                    return NotFound(new { error = "File not found" });
                }

                Response.Headers.CacheControl = "private, max-age=300";
                Response.Headers.ContentDisposition = $"inline; filename*=UTF-8''{Uri.EscapeDataString(result.OriginalName ?? "file")}";
                return File(result.Data, result.MimeType ?? "application/octet-stream");
            }
            catch (SqlException)
            {
                return StatusCode(500, new { error = "File could not be loaded" });
            }
            catch (CryptographicException)
            {
                return StatusCode(500, new { error = "File could not be decrypted" });
            }
            catch (InvalidOperationException)
            {
                return StatusCode(500, new { error = "File storage is not configured" });
            }
        }

        [HttpDelete("api/files/{id}")]
        [EndpointSummary("Delete file")]
        [EndpointDescription("Deletes an uploaded file by id without cascading related records.")]
        [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(object), StatusCodes.Status404NotFound)]
        [ProducesResponseType(typeof(object), StatusCodes.Status409Conflict)]
        [ProducesResponseType(typeof(object), StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> Delete(string id, CancellationToken cancellationToken)
        {
            // TODO: Add authorization before enabling file deletion in production.
            try
            {
                var deletedBy = User.FindFirstValue(ClaimTypes.Email) ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
                var result = await _fileService.DeleteAsync(id, deletedBy, cancellationToken);
                return result.Success
                    ? Ok(new { success = true })
                    : NotFound(new { success = false, error = result.Error });
            }
            catch (SqlException ex) when (ex.Number == 547)
            {
                return Conflict(new { success = false, error = "Cannot delete file because it is referenced by other records. Delete dependent records first." });
            }
            catch (SqlException)
            {
                return StatusCode(500, new { success = false, error = "File could not be deleted" });
            }
            catch (InvalidOperationException)
            {
                return StatusCode(500, new { success = false, error = "File storage is not configured" });
            }
        }
    }
}
