using DER3.Api.DTOs;
using DER3.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using System.Security.Claims;

namespace DER3.Api.Controllers
{
    [ApiController]
    [Route("api/policies")]
    [Produces("application/json")]
    [Authorize]
    public sealed class PoliciesController : ControllerBase
    {
        private readonly IPolicyService _policyService;

        public PoliciesController(IPolicyService policyService)
        {
            _policyService = policyService;
        }

        [HttpPost]
        [EndpointSummary("Create policy")]
        [EndpointDescription("Creates a Policy row using only allowed fields.")]
        [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(object), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(object), StatusCodes.Status409Conflict)]
        [ProducesResponseType(typeof(object), StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> Create(
            [FromBody] CreatePolicyRequestDto request,
            CancellationToken cancellationToken)
        {
            // TODO: Add authorization before enabling policy writes in production.
            try
            {
                var result = await _policyService.CreateAsync(request, cancellationToken);
                return result.Success
                    ? Ok(new { success = true, item = result.Item })
                    : BadRequest(new { success = false, error = result.Error });
            }
            catch (SqlException ex) when (ex.Number is 2601 or 2627)
            {
                return Conflict(new { success = false, error = "Policy already exists" });
            }
            catch (SqlException ex) when (ex.Number == 547)
            {
                return BadRequest(new { success = false, error = "frameworkId must reference an existing Framework" });
            }
            catch (SqlException ex) when (ex.Number is 8152 or 2628)
            {
                return BadRequest(new { success = false, error = "Policy field exceeds allowed database length" });
            }
            catch (SqlException)
            {
                return StatusCode(500, new { success = false, error = "Policy could not be saved" });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { success = false, error = ex.Message });
            }
            catch (InvalidOperationException)
            {
                return StatusCode(500, new { success = false, error = "Policy storage is not configured" });
            }
        }

        [HttpPut("{id}")]
        [EndpointSummary("Update policy")]
        [EndpointDescription("Updates an existing Policy row by id. Unknown fields are rejected.")]
        [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(object), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(object), StatusCodes.Status404NotFound)]
        [ProducesResponseType(typeof(object), StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> Update(
            string id,
            [FromBody] UpdatePolicyRequestDto request,
            CancellationToken cancellationToken)
        {
            // TODO: Add authorization before enabling policy writes in production.
            try
            {
                var result = await _policyService.UpdateAsync(id, request, cancellationToken);
                if (result.Success)
                {
                    return Ok(new { success = true, item = result.Item });
                }

                return result.Error == "Policy not found"
                    ? NotFound(new { success = false, error = result.Error })
                    : BadRequest(new { success = false, error = result.Error });
            }
            catch (SqlException ex) when (ex.Number == 547)
            {
                return BadRequest(new { success = false, error = "frameworkId must reference an existing Framework" });
            }
            catch (SqlException ex) when (ex.Number is 8152 or 2628)
            {
                return BadRequest(new { success = false, error = "Policy field exceeds allowed database length" });
            }
            catch (SqlException)
            {
                return StatusCode(500, new { success = false, error = "Policy could not be saved" });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { success = false, error = ex.Message });
            }
            catch (InvalidOperationException)
            {
                return StatusCode(500, new { success = false, error = "Policy storage is not configured" });
            }
        }

        [HttpDelete("{id}")]
        [EndpointSummary("Delete policy")]
        [EndpointDescription("Deletes a Policy row by id without cascading related records.")]
        [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(object), StatusCodes.Status404NotFound)]
        [ProducesResponseType(typeof(object), StatusCodes.Status409Conflict)]
        [ProducesResponseType(typeof(object), StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> Delete(string id, CancellationToken cancellationToken)
        {
            // TODO: Add authorization before enabling policy deletion in production.
            try
            {
                var deletedBy = User.FindFirstValue(ClaimTypes.Email) ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
                var result = await _policyService.DeleteAsync(id, deletedBy, cancellationToken);
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
                return StatusCode(500, new { success = false, error = "Policy could not be deleted" });
            }
            catch (InvalidOperationException)
            {
                return StatusCode(500, new { success = false, error = "Policy storage is not configured" });
            }
        }
    }
}
