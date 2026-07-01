using DER3.Api.DTOs;
using DER3.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using System.Security.Claims;

namespace DER3.Api.Controllers
{
    [ApiController]
    [Route("api/notificationLogs")]
    [Produces("application/json")]
    [Authorize]
    public sealed class NotificationLogsController : ControllerBase
    {
        private const string DeleteConflictError = "Cannot delete notification log because it is referenced by other records. Delete dependent records first.";
        private readonly INotificationLogService _notificationLogService;

        public NotificationLogsController(INotificationLogService notificationLogService)
        {
            _notificationLogService = notificationLogService;
        }

        /// <summary>Creates a notification log.</summary>
        /// <remarks>Accepts only existing NotificationLog table fields.</remarks>
        [HttpPost]
        [EndpointSummary("Create notification log")]
        [EndpointDescription("Creates a NotificationLog row using only allowed fields.")]
        [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(object), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(object), StatusCodes.Status409Conflict)]
        [ProducesResponseType(typeof(object), StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> Create([FromBody] CreateNotificationLogRequestDto request, CancellationToken cancellationToken)
        {
            // TODO: Add authorization before enabling notification log writes in production.
            // TODO: Restrict notification log access later.
            try
            {
                var result = await _notificationLogService.CreateAsync(request, cancellationToken);
                return result.Success
                    ? Ok(new { success = true, item = result.Item })
                    : BadRequest(new { success = false, error = result.Error });
            }
            catch (SqlException ex) when (ex.Number is 2601 or 2627)
            {
                return Conflict(new { success = false, error = "NotificationLog already exists" });
            }
            catch (SqlException)
            {
                return StatusCode(500, new { success = false, error = "NotificationLog could not be saved" });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { success = false, error = ex.Message });
            }
            catch (InvalidOperationException)
            {
                return StatusCode(500, new { success = false, error = "NotificationLog storage is not configured" });
            }
        }

        /// <summary>Updates a notification log.</summary>
        /// <remarks>Updates only provided supported fields.</remarks>
        [HttpPut("{id}")]
        [EndpointSummary("Update notification log")]
        [EndpointDescription("Updates an existing NotificationLog row by id. Unknown fields are rejected.")]
        [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(object), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(object), StatusCodes.Status404NotFound)]
        [ProducesResponseType(typeof(object), StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> Update(string id, [FromBody] UpdateNotificationLogRequestDto request, CancellationToken cancellationToken)
        {
            // TODO: Add authorization before enabling notification log writes in production.
            // TODO: Restrict notification log access later.
            try
            {
                var result = await _notificationLogService.UpdateAsync(id, request, cancellationToken);
                if (result.Success)
                {
                    return Ok(new { success = true, item = result.Item });
                }

                return result.Error == "NotificationLog not found"
                    ? NotFound(new { success = false, error = result.Error })
                    : BadRequest(new { success = false, error = result.Error });
            }
            catch (SqlException)
            {
                return StatusCode(500, new { success = false, error = "NotificationLog could not be saved" });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { success = false, error = ex.Message });
            }
            catch (InvalidOperationException)
            {
                return StatusCode(500, new { success = false, error = "NotificationLog storage is not configured" });
            }
        }

        /// <summary>Deletes a notification log.</summary>
        /// <remarks>Deletes the NotificationLog row only. Related records are not cascade deleted.</remarks>
        [HttpDelete("{id}")]
        [EndpointSummary("Delete notification log")]
        [EndpointDescription("Deletes a NotificationLog row by id without cascading related records.")]
        [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(object), StatusCodes.Status404NotFound)]
        [ProducesResponseType(typeof(object), StatusCodes.Status409Conflict)]
        [ProducesResponseType(typeof(object), StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> Delete(string id, CancellationToken cancellationToken)
        {
            // TODO: Add authorization before enabling notification log deletion in production.
            // TODO: Restrict notification log access later.
            try
            {
                var deletedBy = User.FindFirstValue(ClaimTypes.Email) ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
                var result = await _notificationLogService.DeleteAsync(id, deletedBy, cancellationToken);
                return result.Success
                    ? Ok(new { success = true })
                    : NotFound(new { success = false, error = result.Error });
            }
            catch (SqlException ex) when (ex.Number == 547)
            {
                return Conflict(new { success = false, error = DeleteConflictError });
            }
            catch (SqlException)
            {
                return StatusCode(500, new { success = false, error = "NotificationLog could not be deleted" });
            }
            catch (InvalidOperationException)
            {
                return StatusCode(500, new { success = false, error = "NotificationLog storage is not configured" });
            }
        }
    }
}
