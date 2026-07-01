using DER3.Api.DTOs;
using DER3.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using System.Security.Claims;

namespace DER3.Api.Controllers
{
    [ApiController]
    [Route("api/standards")]
    [Produces("application/json")]
    [Authorize]
    public sealed class StandardsController : ControllerBase
    {
        private readonly IStandardService _standardService;

        public StandardsController(IStandardService standardService)
        {
            _standardService = standardService;
        }

        /// <summary>Creates a standard using only supported Standard table fields.</summary>
        [HttpPost]
        [EndpointSummary("Create standard")]
        [EndpointDescription("Creates a Standard row using only allowed fields. classifications, attachments, and policyItemIds are stored as JSON.")]
        [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(object), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(object), StatusCodes.Status409Conflict)]
        [ProducesResponseType(typeof(object), StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> Create([FromBody] CreateStandardRequestDto request, CancellationToken cancellationToken)
        {
            // TODO: Add authorization before enabling standard writes in production.
            try
            {
                var result = await _standardService.CreateAsync(request, cancellationToken);
                return result.Success
                    ? Ok(new { success = true, item = result.Item })
                    : BadRequest(new { success = false, error = result.Error });
            }
            catch (SqlException ex) when (ex.Number is 2601 or 2627)
            {
                return Conflict(new { success = false, error = "Standard already exists" });
            }
            catch (SqlException ex) when (ex.Number == 547)
            {
                return BadRequest(new { success = false, error = "Referenced policy or policy item was not found" });
            }
            catch (SqlException)
            {
                return StatusCode(500, new { success = false, error = "Standard could not be saved" });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { success = false, error = ex.Message });
            }
            catch (InvalidOperationException)
            {
                return StatusCode(500, new { success = false, error = "Standard storage is not configured" });
            }
        }

        /// <summary>Updates a standard using only supported Standard table fields.</summary>
        [HttpPut("{id}")]
        [EndpointSummary("Update standard")]
        [EndpointDescription("Updates an existing Standard row by id. Unknown fields are rejected and JSON fields are validated.")]
        [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(object), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(object), StatusCodes.Status404NotFound)]
        [ProducesResponseType(typeof(object), StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> Update(string id, [FromBody] UpdateStandardRequestDto request, CancellationToken cancellationToken)
        {
            // TODO: Add authorization before enabling standard writes in production.
            try
            {
                var result = await _standardService.UpdateAsync(id, request, cancellationToken);
                if (result.Success)
                {
                    return Ok(new { success = true, item = result.Item });
                }

                return result.Error == "Standard not found"
                    ? NotFound(new { success = false, error = result.Error })
                    : BadRequest(new { success = false, error = result.Error });
            }
            catch (SqlException ex) when (ex.Number == 547)
            {
                return BadRequest(new { success = false, error = "Referenced policy or policy item was not found" });
            }
            catch (SqlException)
            {
                return StatusCode(500, new { success = false, error = "Standard could not be saved" });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { success = false, error = ex.Message });
            }
            catch (InvalidOperationException)
            {
                return StatusCode(500, new { success = false, error = "Standard storage is not configured" });
            }
        }

        /// <summary>Deletes a standard by id only. Child records are not deleted automatically.</summary>
        [HttpDelete("{id}")]
        [EndpointSummary("Delete standard")]
        [EndpointDescription("Deletes a Standard row by id without cascading related records.")]
        [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(object), StatusCodes.Status404NotFound)]
        [ProducesResponseType(typeof(object), StatusCodes.Status409Conflict)]
        [ProducesResponseType(typeof(object), StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> Delete(string id, CancellationToken cancellationToken)
        {
            // TODO: Add authorization before enabling standard deletion in production.
            try
            {
                var deletedBy = User.FindFirstValue(ClaimTypes.Email) ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
                var result = await _standardService.DeleteAsync(id, deletedBy, cancellationToken);
                return result.Success
                    ? Ok(new { success = true })
                    : NotFound(new { success = false, error = result.Error });
            }
            catch (SqlException ex) when (ex.Number == 547)
            {
                return Conflict(new { success = false, error = "Cannot delete item because it is referenced by other records." });
            }
            catch (SqlException)
            {
                return StatusCode(500, new { success = false, error = "Standard could not be deleted" });
            }
            catch (InvalidOperationException)
            {
                return StatusCode(500, new { success = false, error = "Standard storage is not configured" });
            }
        }
    }
}
