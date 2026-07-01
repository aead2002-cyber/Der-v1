using DER3.Api.DTOs;
using DER3.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using System.Security.Claims;

namespace DER3.Api.Controllers
{
    [ApiController]
    [Route("api/commitments")]
    [Produces("application/json")]
    [Authorize]
    public sealed class CommitmentsController : ControllerBase
    {
        private const string DeleteConflictError = "Cannot delete commitment because it is referenced by other records. Delete dependent records first.";
        private readonly ICommitmentService _commitmentService;

        public CommitmentsController(ICommitmentService commitmentService)
        {
            _commitmentService = commitmentService;
        }

        /// <summary>Creates a commitment.</summary>
        /// <remarks>Accepts only existing Commitment table fields.</remarks>
        [HttpPost]
        [EndpointSummary("Create commitment")]
        [EndpointDescription("Creates a Commitment row using only allowed fields.")]
        [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(object), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(object), StatusCodes.Status409Conflict)]
        [ProducesResponseType(typeof(object), StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> Create([FromBody] CreateCommitmentRequestDto request, CancellationToken cancellationToken)
        {
            // TODO: Add authorization before enabling commitment writes in production.
            try
            {
                var result = await _commitmentService.CreateAsync(request, cancellationToken);
                return result.Success
                    ? Ok(new { success = true, item = result.Item })
                    : BadRequest(new { success = false, error = result.Error });
            }
            catch (SqlException ex) when (ex.Number is 2601 or 2627)
            {
                return Conflict(new { success = false, error = "Commitment already exists" });
            }
            catch (SqlException ex) when (ex.Number == 547)
            {
                return BadRequest(new { success = false, error = "Referenced record was not found" });
            }
            catch (SqlException)
            {
                return StatusCode(500, new { success = false, error = "Commitment could not be saved" });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { success = false, error = ex.Message });
            }
            catch (InvalidOperationException)
            {
                return StatusCode(500, new { success = false, error = "Commitment storage is not configured" });
            }
        }

        /// <summary>Updates a commitment.</summary>
        /// <remarks>Updates only provided supported fields.</remarks>
        [HttpPut("{id}")]
        [EndpointSummary("Update commitment")]
        [EndpointDescription("Updates an existing Commitment row by id. Unknown fields are rejected.")]
        [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(object), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(object), StatusCodes.Status404NotFound)]
        [ProducesResponseType(typeof(object), StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> Update(string id, [FromBody] UpdateCommitmentRequestDto request, CancellationToken cancellationToken)
        {
            // TODO: Add authorization before enabling commitment writes in production.
            try
            {
                var result = await _commitmentService.UpdateAsync(id, request, cancellationToken);
                if (result.Success)
                {
                    return Ok(new { success = true, item = result.Item });
                }

                return result.Error == "Commitment not found"
                    ? NotFound(new { success = false, error = result.Error })
                    : BadRequest(new { success = false, error = result.Error });
            }
            catch (SqlException ex) when (ex.Number == 547)
            {
                return BadRequest(new { success = false, error = "Referenced record was not found" });
            }
            catch (SqlException)
            {
                return StatusCode(500, new { success = false, error = "Commitment could not be saved" });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { success = false, error = ex.Message });
            }
            catch (InvalidOperationException)
            {
                return StatusCode(500, new { success = false, error = "Commitment storage is not configured" });
            }
        }

        /// <summary>Deletes a commitment.</summary>
        /// <remarks>Deletes the Commitment row only. Related records are not cascade deleted.</remarks>
        [HttpDelete("{id}")]
        [EndpointSummary("Delete commitment")]
        [EndpointDescription("Deletes a Commitment row by id without cascading related records.")]
        [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(object), StatusCodes.Status404NotFound)]
        [ProducesResponseType(typeof(object), StatusCodes.Status409Conflict)]
        [ProducesResponseType(typeof(object), StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> Delete(string id, CancellationToken cancellationToken)
        {
            // TODO: Add authorization before enabling commitment deletion in production.
            try
            {
                var deletedBy = User.FindFirstValue(ClaimTypes.Email) ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
                var result = await _commitmentService.DeleteAsync(id, deletedBy, cancellationToken);
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
                return StatusCode(500, new { success = false, error = "Commitment could not be deleted" });
            }
            catch (InvalidOperationException)
            {
                return StatusCode(500, new { success = false, error = "Commitment storage is not configured" });
            }
        }
    }
}
