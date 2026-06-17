using DER3.Api.DTOs;
using DER3.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;

namespace DER3.Api.Controllers
{
    [ApiController]
    [Route("api/standardClassifications")]
    [Produces("application/json")]
    [Authorize]
    public sealed class StandardClassificationsController : ControllerBase
    {
        private const string DeleteConflictError = "Cannot delete standard classification because it is referenced by other records. Delete dependent records first.";
        private readonly IStandardClassificationService _standardClassificationService;

        public StandardClassificationsController(IStandardClassificationService standardClassificationService)
        {
            _standardClassificationService = standardClassificationService;
        }

        /// <summary>Creates a standard classification.</summary>
        /// <remarks>Accepts only existing StandardClassification table fields.</remarks>
        [HttpPost]
        [EndpointSummary("Create standard classification")]
        [EndpointDescription("Creates a StandardClassification row using only allowed fields.")]
        [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(object), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(object), StatusCodes.Status409Conflict)]
        [ProducesResponseType(typeof(object), StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> Create([FromBody] CreateStandardClassificationRequestDto request, CancellationToken cancellationToken)
        {
            // TODO: Add authorization before enabling standard classification writes in production.
            try
            {
                var result = await _standardClassificationService.CreateAsync(request, cancellationToken);
                return result.Success
                    ? Ok(new { success = true, item = result.Item })
                    : BadRequest(new { success = false, error = result.Error });
            }
            catch (SqlException ex) when (ex.Number is 2601 or 2627)
            {
                return Conflict(new { success = false, error = "StandardClassification already exists" });
            }
            catch (SqlException)
            {
                return StatusCode(500, new { success = false, error = "StandardClassification could not be saved" });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { success = false, error = ex.Message });
            }
            catch (InvalidOperationException)
            {
                return StatusCode(500, new { success = false, error = "StandardClassification storage is not configured" });
            }
        }

        /// <summary>Updates a standard classification.</summary>
        /// <remarks>Updates only provided supported fields.</remarks>
        [HttpPut("{id}")]
        [EndpointSummary("Update standard classification")]
        [EndpointDescription("Updates an existing StandardClassification row by id. Unknown fields are rejected.")]
        [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(object), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(object), StatusCodes.Status404NotFound)]
        [ProducesResponseType(typeof(object), StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> Update(string id, [FromBody] UpdateStandardClassificationRequestDto request, CancellationToken cancellationToken)
        {
            // TODO: Add authorization before enabling standard classification writes in production.
            try
            {
                var result = await _standardClassificationService.UpdateAsync(id, request, cancellationToken);
                if (result.Success)
                {
                    return Ok(new { success = true, item = result.Item });
                }

                return result.Error == "StandardClassification not found"
                    ? NotFound(new { success = false, error = result.Error })
                    : BadRequest(new { success = false, error = result.Error });
            }
            catch (SqlException)
            {
                return StatusCode(500, new { success = false, error = "StandardClassification could not be saved" });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { success = false, error = ex.Message });
            }
            catch (InvalidOperationException)
            {
                return StatusCode(500, new { success = false, error = "StandardClassification storage is not configured" });
            }
        }

        /// <summary>Deletes a standard classification.</summary>
        /// <remarks>Deletes the StandardClassification row only. Related records are not cascade deleted.</remarks>
        [HttpDelete("{id}")]
        [EndpointSummary("Delete standard classification")]
        [EndpointDescription("Deletes a StandardClassification row by id without cascading related records.")]
        [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(object), StatusCodes.Status404NotFound)]
        [ProducesResponseType(typeof(object), StatusCodes.Status409Conflict)]
        [ProducesResponseType(typeof(object), StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> Delete(string id, CancellationToken cancellationToken)
        {
            // TODO: Add authorization before enabling standard classification deletion in production.
            try
            {
                var result = await _standardClassificationService.DeleteAsync(id, cancellationToken);
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
                return StatusCode(500, new { success = false, error = "StandardClassification could not be deleted" });
            }
            catch (InvalidOperationException)
            {
                return StatusCode(500, new { success = false, error = "StandardClassification storage is not configured" });
            }
        }
    }
}
