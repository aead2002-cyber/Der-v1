using DER3.Api.DTOs;
using DER3.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using System.Security.Claims;

namespace DER3.Api.Controllers
{
    [ApiController]
    [Route("api/policyItems")]
    [Produces("application/json")]
    [Authorize]
    public sealed class PolicyItemsController : ControllerBase
    {
        private readonly IPolicyItemService _policyItemService;

        public PolicyItemsController(IPolicyItemService policyItemService)
        {
            _policyItemService = policyItemService;
        }

        [HttpPost]
        [EndpointSummary("Create policy item")]
        [EndpointDescription("Creates a PolicyItem row using only allowed fields. attachments is stored as JSON.")]
        [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(object), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(object), StatusCodes.Status409Conflict)]
        [ProducesResponseType(typeof(object), StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> Create(
            [FromBody] CreatePolicyItemRequestDto request,
            CancellationToken cancellationToken)
        {
            // TODO: Add authorization before enabling policy item writes in production.
            try
            {
                var result = await _policyItemService.CreateAsync(request, cancellationToken);
                return result.Success
                    ? Ok(new { success = true, item = result.Item })
                    : BadRequest(new { success = false, error = result.Error });
            }
            catch (SqlException ex) when (ex.Number is 2601 or 2627)
            {
                return Conflict(new { success = false, error = "Policy item already exists" });
            }
            catch (SqlException ex) when (ex.Number == 547)
            {
                return BadRequest(new { success = false, error = "Referenced policy or parent item was not found" });
            }
            catch (SqlException)
            {
                return StatusCode(500, new { success = false, error = "Policy item could not be saved" });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { success = false, error = ex.Message });
            }
            catch (InvalidOperationException)
            {
                return StatusCode(500, new { success = false, error = "Policy item storage is not configured" });
            }
        }

        [HttpPut("{id}")]
        [EndpointSummary("Update policy item")]
        [EndpointDescription("Updates an existing PolicyItem row by id. Unknown fields are rejected and attachments is stored as JSON.")]
        [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(object), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(object), StatusCodes.Status404NotFound)]
        [ProducesResponseType(typeof(object), StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> Update(
            string id,
            [FromBody] UpdatePolicyItemRequestDto request,
            CancellationToken cancellationToken)
        {
            // TODO: Add authorization before enabling policy item writes in production.
            try
            {
                var result = await _policyItemService.UpdateAsync(id, request, cancellationToken);
                if (result.Success)
                {
                    return Ok(new { success = true, item = result.Item });
                }

                return result.Error == "Policy item not found"
                    ? NotFound(new { success = false, error = result.Error })
                    : BadRequest(new { success = false, error = result.Error });
            }
            catch (SqlException ex) when (ex.Number == 547)
            {
                return BadRequest(new { success = false, error = "Referenced policy or parent item was not found" });
            }
            catch (SqlException)
            {
                return StatusCode(500, new { success = false, error = "Policy item could not be saved" });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { success = false, error = ex.Message });
            }
            catch (InvalidOperationException)
            {
                return StatusCode(500, new { success = false, error = "Policy item storage is not configured" });
            }
        }

        [HttpDelete("{id}")]
        [EndpointSummary("Delete policy item")]
        [EndpointDescription("Deletes a PolicyItem row by id without cascading related records.")]
        [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(object), StatusCodes.Status404NotFound)]
        [ProducesResponseType(typeof(object), StatusCodes.Status409Conflict)]
        [ProducesResponseType(typeof(object), StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> Delete(string id, CancellationToken cancellationToken)
        {
            // TODO: Add authorization before enabling policy item deletion in production.
            try
            {
                var deletedBy = User.FindFirstValue(ClaimTypes.Email) ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
                var result = await _policyItemService.DeleteAsync(id, deletedBy, cancellationToken);
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
                return StatusCode(500, new { success = false, error = "Policy item could not be deleted" });
            }
            catch (InvalidOperationException)
            {
                return StatusCode(500, new { success = false, error = "Policy item storage is not configured" });
            }
        }
    }
}
