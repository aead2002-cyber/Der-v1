using DER3.Api.DTOs;
using DER3.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;

namespace DER3.Api.Controllers
{
    [ApiController]
    [Route("api/evidence")]
    [Produces("application/json")]
    [Authorize]
    public sealed class EvidenceController : ControllerBase
    {
        private const string DeleteConflictError = "Cannot delete evidence because it is referenced by other records. Delete dependent records first.";
        private readonly IEvidenceService _evidenceService;

        public EvidenceController(IEvidenceService evidenceService)
        {
            _evidenceService = evidenceService;
        }

        /// <summary>Creates evidence.</summary>
        /// <remarks>Accepts only existing Evidence table fields.</remarks>
        [HttpPost]
        [EndpointSummary("Create evidence")]
        [EndpointDescription("Creates an Evidence row using only allowed fields.")]
        [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(object), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(object), StatusCodes.Status409Conflict)]
        [ProducesResponseType(typeof(object), StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> Create([FromBody] CreateEvidenceRequestDto request, CancellationToken cancellationToken)
        {
            // TODO: Add authorization before enabling evidence writes in production.
            try
            {
                var result = await _evidenceService.CreateAsync(request, cancellationToken);
                return result.Success
                    ? Ok(new { success = true, item = result.Item })
                    : BadRequest(new { success = false, error = result.Error });
            }
            catch (SqlException ex) when (ex.Number is 2601 or 2627)
            {
                return Conflict(new { success = false, error = "Evidence already exists" });
            }
            catch (SqlException ex) when (ex.Number == 547)
            {
                return BadRequest(new { success = false, error = "Referenced procedure was not found" });
            }
            catch (SqlException)
            {
                return StatusCode(500, new { success = false, error = "Evidence could not be saved" });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { success = false, error = ex.Message });
            }
            catch (InvalidOperationException)
            {
                return StatusCode(500, new { success = false, error = "Evidence storage is not configured" });
            }
        }

        /// <summary>Updates evidence.</summary>
        /// <remarks>Updates only provided supported fields.</remarks>
        [HttpPut("{id}")]
        [EndpointSummary("Update evidence")]
        [EndpointDescription("Updates an existing Evidence row by id. Unknown fields are rejected.")]
        [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(object), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(object), StatusCodes.Status404NotFound)]
        [ProducesResponseType(typeof(object), StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> Update(string id, [FromBody] UpdateEvidenceRequestDto request, CancellationToken cancellationToken)
        {
            // TODO: Add authorization before enabling evidence writes in production.
            try
            {
                var result = await _evidenceService.UpdateAsync(id, request, cancellationToken);
                if (result.Success)
                {
                    return Ok(new { success = true, item = result.Item });
                }

                return result.Error == "Evidence not found"
                    ? NotFound(new { success = false, error = result.Error })
                    : BadRequest(new { success = false, error = result.Error });
            }
            catch (SqlException ex) when (ex.Number == 547)
            {
                return BadRequest(new { success = false, error = "Referenced procedure was not found" });
            }
            catch (SqlException)
            {
                return StatusCode(500, new { success = false, error = "Evidence could not be saved" });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { success = false, error = ex.Message });
            }
            catch (InvalidOperationException)
            {
                return StatusCode(500, new { success = false, error = "Evidence storage is not configured" });
            }
        }

        /// <summary>Deletes evidence.</summary>
        /// <remarks>Deletes the Evidence row only. Related records are not cascade deleted.</remarks>
        [HttpDelete("{id}")]
        [EndpointSummary("Delete evidence")]
        [EndpointDescription("Deletes an Evidence row by id without cascading related records.")]
        [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(object), StatusCodes.Status404NotFound)]
        [ProducesResponseType(typeof(object), StatusCodes.Status409Conflict)]
        [ProducesResponseType(typeof(object), StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> Delete(string id, CancellationToken cancellationToken)
        {
            // TODO: Add authorization before enabling evidence deletion in production.
            try
            {
                var result = await _evidenceService.DeleteAsync(id, cancellationToken);
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
                return StatusCode(500, new { success = false, error = "Evidence could not be deleted" });
            }
            catch (InvalidOperationException)
            {
                return StatusCode(500, new { success = false, error = "Evidence storage is not configured" });
            }
        }
    }
}
