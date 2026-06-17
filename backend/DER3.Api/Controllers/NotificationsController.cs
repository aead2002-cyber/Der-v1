using DER3.Api.DTOs;
using DER3.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;

namespace DER3.Api.Controllers
{
    [ApiController]
    [Route("api/notifications")]
    [Produces("application/json")]
    [Authorize]
    public sealed class NotificationsController : ControllerBase
    {
        private const string DeleteConflictError = "Cannot delete notification because it is referenced by other records. Delete dependent records first.";
        private readonly INotificationService _notificationService;

        public NotificationsController(INotificationService notificationService)
        {
            _notificationService = notificationService;
        }

        /// <summary>Creates a notification.</summary>
        /// <remarks>Accepts only existing Notification table fields.</remarks>
        [HttpPost]
        [EndpointSummary("Create notification")]
        [EndpointDescription("Creates a Notification row using only allowed fields.")]
        [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(object), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(object), StatusCodes.Status409Conflict)]
        [ProducesResponseType(typeof(object), StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> Create([FromBody] CreateNotificationRequestDto request, CancellationToken cancellationToken)
        {
            // TODO: Add authorization before enabling notification writes in production.
            try
            {
                var result = await _notificationService.CreateAsync(request, cancellationToken);
                return result.Success
                    ? Ok(new { success = true, item = result.Item })
                    : BadRequest(new { success = false, error = result.Error });
            }
            catch (SqlException ex) when (ex.Number is 2601 or 2627)
            {
                return Conflict(new { success = false, error = "Notification already exists" });
            }
            catch (SqlException)
            {
                return StatusCode(500, new { success = false, error = "Notification could not be saved" });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { success = false, error = ex.Message });
            }
            catch (InvalidOperationException)
            {
                return StatusCode(500, new { success = false, error = "Notification storage is not configured" });
            }
        }

        /// <summary>Updates a notification.</summary>
        /// <remarks>Updates only provided supported fields.</remarks>
        [HttpPut("{id}")]
        [EndpointSummary("Update notification")]
        [EndpointDescription("Updates an existing Notification row by id. Unknown fields are rejected.")]
        [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(object), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(object), StatusCodes.Status404NotFound)]
        [ProducesResponseType(typeof(object), StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> Update(string id, [FromBody] UpdateNotificationRequestDto request, CancellationToken cancellationToken)
        {
            // TODO: Add authorization before enabling notification writes in production.
            try
            {
                var result = await _notificationService.UpdateAsync(id, request, cancellationToken);
                if (result.Success)
                {
                    return Ok(new { success = true, item = result.Item });
                }

                return result.Error == "Notification not found"
                    ? NotFound(new { success = false, error = result.Error })
                    : BadRequest(new { success = false, error = result.Error });
            }
            catch (SqlException)
            {
                return StatusCode(500, new { success = false, error = "Notification could not be saved" });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { success = false, error = ex.Message });
            }
            catch (InvalidOperationException)
            {
                return StatusCode(500, new { success = false, error = "Notification storage is not configured" });
            }
        }

        /// <summary>Deletes a notification.</summary>
        /// <remarks>Deletes the Notification row only. Related records are not cascade deleted.</remarks>
        [HttpDelete("{id}")]
        [EndpointSummary("Delete notification")]
        [EndpointDescription("Deletes a Notification row by id without cascading related records.")]
        [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(object), StatusCodes.Status404NotFound)]
        [ProducesResponseType(typeof(object), StatusCodes.Status409Conflict)]
        [ProducesResponseType(typeof(object), StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> Delete(string id, CancellationToken cancellationToken)
        {
            // TODO: Add authorization before enabling notification deletion in production.
            try
            {
                var result = await _notificationService.DeleteAsync(id, cancellationToken);
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
                return StatusCode(500, new { success = false, error = "Notification could not be deleted" });
            }
            catch (InvalidOperationException)
            {
                return StatusCode(500, new { success = false, error = "Notification storage is not configured" });
            }
        }
    }
}
