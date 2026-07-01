using DER3.Api.DTOs;
using DER3.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using System.Security.Claims;

namespace DER3.Api.Controllers
{
    [ApiController]
    [Route("api/procedures")]
    [Produces("application/json")]
    [Authorize]
    public sealed class ProceduresController : ControllerBase
    {
        private readonly IProcedureService _procedureService;

        public ProceduresController(IProcedureService procedureService)
        {
            _procedureService = procedureService;
        }

        /// <summary>Creates a procedure using only supported Procedure table fields.</summary>
        [HttpPost]
        [EndpointSummary("Create procedure")]
        [EndpointDescription("Creates a Procedure row using only allowed fields. assignedTo, assignedTeams, attachments, and comments are stored as JSON.")]
        [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(object), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(object), StatusCodes.Status409Conflict)]
        [ProducesResponseType(typeof(object), StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> Create([FromBody] CreateProcedureRequestDto request, CancellationToken cancellationToken)
        {
            // TODO: Add authorization before enabling procedure writes in production.
            try
            {
                var result = await _procedureService.CreateAsync(request, cancellationToken);
                return result.Success
                    ? Ok(new { success = true, item = result.Item })
                    : BadRequest(new { success = false, error = result.Error });
            }
            catch (SqlException ex) when (ex.Number is 2601 or 2627)
            {
                return Conflict(new { success = false, error = "Procedure already exists" });
            }
            catch (SqlException ex) when (ex.Number == 547)
            {
                return BadRequest(new { success = false, error = "Referenced standard or policy was not found" });
            }
            catch (SqlException)
            {
                return StatusCode(500, new { success = false, error = "Procedure could not be saved" });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { success = false, error = ex.Message });
            }
            catch (InvalidOperationException)
            {
                return StatusCode(500, new { success = false, error = "Procedure storage is not configured" });
            }
        }

        /// <summary>Updates a procedure using only supported Procedure table fields.</summary>
        [HttpPut("{id}")]
        [EndpointSummary("Update procedure")]
        [EndpointDescription("Updates an existing Procedure row by id. Unknown fields are rejected and JSON fields are validated.")]
        [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(object), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(object), StatusCodes.Status404NotFound)]
        [ProducesResponseType(typeof(object), StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> Update(string id, [FromBody] UpdateProcedureRequestDto request, CancellationToken cancellationToken)
        {
            // TODO: Add authorization before enabling procedure writes in production.
            try
            {
                var result = await _procedureService.UpdateAsync(id, request, cancellationToken);
                if (result.Success)
                {
                    return Ok(new { success = true, item = result.Item });
                }

                return result.Error == "Procedure not found"
                    ? NotFound(new { success = false, error = result.Error })
                    : BadRequest(new { success = false, error = result.Error });
            }
            catch (SqlException ex) when (ex.Number == 547)
            {
                return BadRequest(new { success = false, error = "Referenced standard or policy was not found" });
            }
            catch (SqlException)
            {
                return StatusCode(500, new { success = false, error = "Procedure could not be saved" });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { success = false, error = ex.Message });
            }
            catch (InvalidOperationException)
            {
                return StatusCode(500, new { success = false, error = "Procedure storage is not configured" });
            }
        }

        /// <summary>Deletes a procedure by id only. Related records are not deleted automatically.</summary>
        [HttpDelete("{id}")]
        [EndpointSummary("Delete procedure")]
        [EndpointDescription("Deletes a Procedure row by id without cascading related records.")]
        [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(object), StatusCodes.Status404NotFound)]
        [ProducesResponseType(typeof(object), StatusCodes.Status409Conflict)]
        [ProducesResponseType(typeof(object), StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> Delete(string id, CancellationToken cancellationToken)
        {
            // TODO: Add authorization before enabling procedure deletion in production.
            try
            {
                var deletedBy = User.FindFirstValue(ClaimTypes.Email) ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
                var result = await _procedureService.DeleteAsync(id, deletedBy, cancellationToken);
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
                return StatusCode(500, new { success = false, error = "Procedure could not be deleted" });
            }
            catch (InvalidOperationException)
            {
                return StatusCode(500, new { success = false, error = "Procedure storage is not configured" });
            }
        }
    }
}
