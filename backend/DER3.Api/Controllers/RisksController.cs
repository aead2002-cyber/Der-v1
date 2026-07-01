using DER3.Api.DTOs;
using DER3.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using System.Security.Claims;

namespace DER3.Api.Controllers
{
    [ApiController]
    [Route("api/risks")]
    [Produces("application/json")]
    [Authorize]
    public sealed class RisksController : ControllerBase
    {
        private const string DeleteConflictError = "Cannot delete risk because it is referenced by other records. Delete dependent records first.";
        private readonly IRiskService _riskService;

        public RisksController(IRiskService riskService)
        {
            _riskService = riskService;
        }

        /// <summary>Creates a risk.</summary>
        /// <remarks>Accepts only existing Risk table fields. procedureIds is stored as JSON.</remarks>
        [HttpPost]
        [EndpointSummary("Create risk")]
        [EndpointDescription("Creates a Risk row using only allowed fields. procedureIds must be an array of strings.")]
        [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(object), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(object), StatusCodes.Status409Conflict)]
        [ProducesResponseType(typeof(object), StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> Create([FromBody] CreateRiskRequestDto request, CancellationToken cancellationToken)
        {
            // TODO: Add authorization before enabling risk writes in production.
            try
            {
                var result = await _riskService.CreateAsync(request, cancellationToken);
                return result.Success
                    ? Ok(new { success = true, item = result.Item })
                    : BadRequest(new { success = false, error = result.Error });
            }
            catch (SqlException ex) when (ex.Number is 2601 or 2627)
            {
                return Conflict(new { success = false, error = "Risk already exists" });
            }
            catch (SqlException)
            {
                return StatusCode(500, new { success = false, error = "Risk could not be saved" });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { success = false, error = ex.Message });
            }
            catch (InvalidOperationException)
            {
                return StatusCode(500, new { success = false, error = "Risk storage is not configured" });
            }
        }

        /// <summary>Updates a risk.</summary>
        /// <remarks>Updates only provided supported fields. procedureIds must be an array of strings.</remarks>
        [HttpPut("{id}")]
        [EndpointSummary("Update risk")]
        [EndpointDescription("Updates an existing Risk row by id. Unknown fields are rejected and procedureIds is stored as JSON.")]
        [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(object), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(object), StatusCodes.Status404NotFound)]
        [ProducesResponseType(typeof(object), StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> Update(string id, [FromBody] UpdateRiskRequestDto request, CancellationToken cancellationToken)
        {
            // TODO: Add authorization before enabling risk writes in production.
            try
            {
                var result = await _riskService.UpdateAsync(id, request, cancellationToken);
                if (result.Success)
                {
                    return Ok(new { success = true, item = result.Item });
                }

                return result.Error == "Risk not found"
                    ? NotFound(new { success = false, error = result.Error })
                    : BadRequest(new { success = false, error = result.Error });
            }
            catch (SqlException)
            {
                return StatusCode(500, new { success = false, error = "Risk could not be saved" });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { success = false, error = ex.Message });
            }
            catch (InvalidOperationException)
            {
                return StatusCode(500, new { success = false, error = "Risk storage is not configured" });
            }
        }

        /// <summary>Deletes a risk.</summary>
        /// <remarks>Deletes the Risk row only. Related records are not cascade deleted.</remarks>
        [HttpDelete("{id}")]
        [EndpointSummary("Delete risk")]
        [EndpointDescription("Deletes a Risk row by id without cascading related records.")]
        [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(object), StatusCodes.Status404NotFound)]
        [ProducesResponseType(typeof(object), StatusCodes.Status409Conflict)]
        [ProducesResponseType(typeof(object), StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> Delete(string id, CancellationToken cancellationToken)
        {
            // TODO: Add authorization before enabling risk deletion in production.
            try
            {
                var deletedBy = User.FindFirstValue(ClaimTypes.Email) ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
                var result = await _riskService.DeleteAsync(id, deletedBy, cancellationToken);
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
                return StatusCode(500, new { success = false, error = "Risk could not be deleted" });
            }
            catch (InvalidOperationException)
            {
                return StatusCode(500, new { success = false, error = "Risk storage is not configured" });
            }
        }
    }
}
