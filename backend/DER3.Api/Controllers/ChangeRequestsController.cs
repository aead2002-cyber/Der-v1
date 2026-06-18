using DER3.Api.DTOs;
using DER3.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;

namespace DER3.Api.Controllers
{
    [ApiController]
    [Route("api/changeRequests")]
    [Produces("application/json")]
    [Authorize]
    public sealed class ChangeRequestsController : ControllerBase
    {
        private const string DeleteConflictError = "Cannot delete change request because it is referenced by other records. Delete dependent records first.";
        private readonly IChangeRequestService _changeRequestService;

        public ChangeRequestsController(IChangeRequestService changeRequestService)
        {
            _changeRequestService = changeRequestService;
        }

        /// <summary>Creates a change request.</summary>
        /// <remarks>Accepts only existing ChangeRequest table fields. attachments and history are stored as JSON.</remarks>
        [HttpPost]
        [EndpointSummary("Create change request")]
        [EndpointDescription("Creates a ChangeRequest row using only allowed fields. attachments must be an array of strings and history must be an array.")]
        [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(object), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(object), StatusCodes.Status409Conflict)]
        [ProducesResponseType(typeof(object), StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> Create([FromBody] CreateChangeRequestDto request, CancellationToken cancellationToken)
        {
            // TODO: Add authorization before enabling change request writes in production.
            try
            {
                var result = await _changeRequestService.CreateAsync(request, cancellationToken);
                return result.Success
                    ? Ok(new { success = true, item = result.Item })
                    : BadRequest(new { success = false, error = result.Error });
            }
            catch (SqlException ex) when (ex.Number is 2601 or 2627)
            {
                return Conflict(new { success = false, error = "ChangeRequest already exists" });
            }
            catch (SqlException ex) when (ex.Number == 547)
            {
                return BadRequest(new { success = false, error = "Referenced record was not found" });
            }
            catch (SqlException)
            {
                return StatusCode(500, new { success = false, error = "ChangeRequest could not be saved" });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { success = false, error = ex.Message });
            }
            catch (InvalidOperationException)
            {
                return StatusCode(500, new { success = false, error = "ChangeRequest storage is not configured" });
            }
        }

        /// <summary>Updates a change request.</summary>
        /// <remarks>Updates only provided supported fields. attachments and history must be JSON arrays.</remarks>
        [HttpPut("{id}")]
        [EndpointSummary("Update change request")]
        [EndpointDescription("Updates an existing ChangeRequest row by id. Unknown fields are rejected and JSON fields are validated.")]
        [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(object), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(object), StatusCodes.Status404NotFound)]
        [ProducesResponseType(typeof(object), StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> Update(string id, [FromBody] UpdateChangeRequestDto request, CancellationToken cancellationToken)
        {
            // TODO: Add authorization before enabling change request writes in production.
            try
            {
                var result = await _changeRequestService.UpdateAsync(id, request, cancellationToken);
                if (result.Success)
                {
                    return Ok(new { success = true, item = result.Item });
                }

                return result.Error == "ChangeRequest not found"
                    ? NotFound(new { success = false, error = result.Error })
                    : BadRequest(new { success = false, error = result.Error });
            }
            catch (SqlException ex) when (ex.Number == 547)
            {
                return BadRequest(new { success = false, error = "Referenced record was not found" });
            }
            catch (SqlException)
            {
                return StatusCode(500, new { success = false, error = "ChangeRequest could not be saved" });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { success = false, error = ex.Message });
            }
            catch (InvalidOperationException)
            {
                return StatusCode(500, new { success = false, error = "ChangeRequest storage is not configured" });
            }
        }

        /// <summary>Deletes a change request.</summary>
        /// <remarks>Deletes the ChangeRequest row only. Related records are not cascade deleted.</remarks>
        [HttpDelete("{id}")]
        [EndpointSummary("Delete change request")]
        [EndpointDescription("Deletes a ChangeRequest row by id without cascading related records.")]
        [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(object), StatusCodes.Status404NotFound)]
        [ProducesResponseType(typeof(object), StatusCodes.Status409Conflict)]
        [ProducesResponseType(typeof(object), StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> Delete(string id, CancellationToken cancellationToken)
        {
            // TODO: Add authorization before enabling change request deletion in production.
            try
            {
                var result = await _changeRequestService.DeleteAsync(id, cancellationToken);
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
                return StatusCode(500, new { success = false, error = "ChangeRequest could not be deleted" });
            }
            catch (InvalidOperationException)
            {
                return StatusCode(500, new { success = false, error = "ChangeRequest storage is not configured" });
            }
        }
    }
}
