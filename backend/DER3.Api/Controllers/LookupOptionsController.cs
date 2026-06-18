using DER3.Api.DTOs;
using DER3.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;

namespace DER3.Api.Controllers
{
    [ApiController]
    [Route("api/lookupOptions")]
    [Produces("application/json")]
    [Authorize]
    public sealed class LookupOptionsController : ControllerBase
    {
        private const string DeleteConflictError = "Cannot delete lookup option because it is referenced by other records. Delete dependent records first.";
        private readonly ILookupOptionService _lookupOptionService;

        public LookupOptionsController(ILookupOptionService lookupOptionService)
        {
            _lookupOptionService = lookupOptionService;
        }

        /// <summary>Creates a lookup option.</summary>
        /// <remarks>Accepts only existing LookupOption table fields.</remarks>
        [HttpPost]
        [EndpointSummary("Create lookup option")]
        [EndpointDescription("Creates a LookupOption row using only allowed fields.")]
        [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(object), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(object), StatusCodes.Status409Conflict)]
        [ProducesResponseType(typeof(object), StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> Create([FromBody] CreateLookupOptionRequestDto request, CancellationToken cancellationToken)
        {
            // TODO: Add authorization before enabling lookup option writes in production.
            try
            {
                var result = await _lookupOptionService.CreateAsync(request, cancellationToken);
                return result.Success
                    ? Ok(new { success = true, item = result.Item })
                    : BadRequest(new { success = false, error = result.Error });
            }
            catch (SqlException ex) when (ex.Number is 2601 or 2627)
            {
                return Conflict(new { success = false, error = "LookupOption already exists" });
            }
            catch (SqlException)
            {
                return StatusCode(500, new { success = false, error = "LookupOption could not be saved" });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { success = false, error = ex.Message });
            }
            catch (InvalidOperationException)
            {
                return StatusCode(500, new { success = false, error = "LookupOption storage is not configured" });
            }
        }

        /// <summary>Updates a lookup option.</summary>
        /// <remarks>Updates only provided supported fields.</remarks>
        [HttpPut("{id}")]
        [EndpointSummary("Update lookup option")]
        [EndpointDescription("Updates an existing LookupOption row by id. Unknown fields are rejected.")]
        [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(object), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(object), StatusCodes.Status404NotFound)]
        [ProducesResponseType(typeof(object), StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> Update(string id, [FromBody] UpdateLookupOptionRequestDto request, CancellationToken cancellationToken)
        {
            // TODO: Add authorization before enabling lookup option writes in production.
            try
            {
                var result = await _lookupOptionService.UpdateAsync(id, request, cancellationToken);
                if (result.Success)
                {
                    return Ok(new { success = true, item = result.Item });
                }

                return result.Error == "LookupOption not found"
                    ? NotFound(new { success = false, error = result.Error })
                    : BadRequest(new { success = false, error = result.Error });
            }
            catch (SqlException)
            {
                return StatusCode(500, new { success = false, error = "LookupOption could not be saved" });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { success = false, error = ex.Message });
            }
            catch (InvalidOperationException)
            {
                return StatusCode(500, new { success = false, error = "LookupOption storage is not configured" });
            }
        }

        /// <summary>Deletes a lookup option.</summary>
        /// <remarks>Deletes the LookupOption row only. Related records are not cascade deleted.</remarks>
        [HttpDelete("{id}")]
        [EndpointSummary("Delete lookup option")]
        [EndpointDescription("Deletes a LookupOption row by id without cascading related records.")]
        [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(object), StatusCodes.Status404NotFound)]
        [ProducesResponseType(typeof(object), StatusCodes.Status409Conflict)]
        [ProducesResponseType(typeof(object), StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> Delete(string id, CancellationToken cancellationToken)
        {
            // TODO: Add authorization before enabling lookup option deletion in production.
            try
            {
                var result = await _lookupOptionService.DeleteAsync(id, cancellationToken);
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
                return StatusCode(500, new { success = false, error = "LookupOption could not be deleted" });
            }
            catch (InvalidOperationException)
            {
                return StatusCode(500, new { success = false, error = "LookupOption storage is not configured" });
            }
        }
    }
}
