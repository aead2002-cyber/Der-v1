using DER3.Api.DTOs;
using DER3.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using System.Security.Claims;

namespace DER3.Api.Controllers
{
    [ApiController]
    [Route("api/notificationTemplates")]
    [Produces("application/json")]
    [Authorize]
    public sealed class NotificationTemplatesController : ControllerBase
    {
        private const string DeleteConflictError = "Cannot delete notification template because it is referenced by other records. Delete dependent records first.";
        private readonly INotificationTemplateService _notificationTemplateService;

        public NotificationTemplatesController(INotificationTemplateService notificationTemplateService)
        {
            _notificationTemplateService = notificationTemplateService;
        }

        /// <summary>Creates a notification template.</summary>
        /// <remarks>Accepts only existing NotificationTemplate table fields.</remarks>
        [HttpPost]
        [EndpointSummary("Create notification template")]
        [EndpointDescription("Creates a NotificationTemplate row using only allowed fields.")]
        [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(object), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(object), StatusCodes.Status409Conflict)]
        [ProducesResponseType(typeof(object), StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> Create([FromBody] CreateNotificationTemplateRequestDto request, CancellationToken cancellationToken)
        {
            // TODO: Add authorization before enabling notification template writes in production.
            try
            {
                var result = await _notificationTemplateService.CreateAsync(request, cancellationToken);
                return result.Success
                    ? Ok(new { success = true, item = result.Item })
                    : BadRequest(new { success = false, error = result.Error });
            }
            catch (SqlException ex) when (ex.Number is 2601 or 2627)
            {
                return Conflict(new { success = false, error = "NotificationTemplate already exists" });
            }
            catch (SqlException)
            {
                return StatusCode(500, new { success = false, error = "NotificationTemplate could not be saved" });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { success = false, error = ex.Message });
            }
            catch (InvalidOperationException)
            {
                return StatusCode(500, new { success = false, error = "NotificationTemplate storage is not configured" });
            }
        }

        /// <summary>Updates a notification template.</summary>
        /// <remarks>Updates only provided supported fields.</remarks>
        [HttpPut("{id}")]
        [EndpointSummary("Update notification template")]
        [EndpointDescription("Updates an existing NotificationTemplate row by id. Unknown fields are rejected.")]
        [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(object), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(object), StatusCodes.Status404NotFound)]
        [ProducesResponseType(typeof(object), StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> Update(string id, [FromBody] UpdateNotificationTemplateRequestDto request, CancellationToken cancellationToken)
        {
            // TODO: Add authorization before enabling notification template writes in production.
            try
            {
                var result = await _notificationTemplateService.UpdateAsync(id, request, cancellationToken);
                if (result.Success)
                {
                    return Ok(new { success = true, item = result.Item });
                }

                return result.Error == "NotificationTemplate not found"
                    ? NotFound(new { success = false, error = result.Error })
                    : BadRequest(new { success = false, error = result.Error });
            }
            catch (SqlException)
            {
                return StatusCode(500, new { success = false, error = "NotificationTemplate could not be saved" });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { success = false, error = ex.Message });
            }
            catch (InvalidOperationException)
            {
                return StatusCode(500, new { success = false, error = "NotificationTemplate storage is not configured" });
            }
        }

        /// <summary>Deletes a notification template.</summary>
        /// <remarks>Deletes the NotificationTemplate row only. Related records are not cascade deleted.</remarks>
        [HttpDelete("{id}")]
        [EndpointSummary("Delete notification template")]
        [EndpointDescription("Deletes a NotificationTemplate row by id without cascading related records.")]
        [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(object), StatusCodes.Status404NotFound)]
        [ProducesResponseType(typeof(object), StatusCodes.Status409Conflict)]
        [ProducesResponseType(typeof(object), StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> Delete(string id, CancellationToken cancellationToken)
        {
            // TODO: Add authorization before enabling notification template deletion in production.
            try
            {
                var deletedBy = User.FindFirstValue(ClaimTypes.Email) ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
                var result = await _notificationTemplateService.DeleteAsync(id, deletedBy, cancellationToken);
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
                return StatusCode(500, new { success = false, error = "NotificationTemplate could not be deleted" });
            }
            catch (InvalidOperationException)
            {
                return StatusCode(500, new { success = false, error = "NotificationTemplate storage is not configured" });
            }
        }
    }
}
