using DER3.Api.DTOs;
using DER3.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;

namespace DER3.Api.Controllers
{
    [ApiController]
    [Route("api/auditLogs")]
    [Produces("application/json")]
    [Authorize]
    public sealed class AuditLogsController : ControllerBase
    {
        private const string DeleteConflictError = "Cannot delete audit log because it is referenced by other records. Delete dependent records first.";
        private readonly IAuditLogService _auditLogService;

        public AuditLogsController(IAuditLogService auditLogService)
        {
            _auditLogService = auditLogService;
        }

        /// <summary>Creates an audit log.</summary>
        /// <remarks>Accepts only existing AuditLog table fields.</remarks>
        [HttpPost]
        [EndpointSummary("Create audit log")]
        [EndpointDescription("Creates an AuditLog row using only allowed fields.")]
        [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(object), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(object), StatusCodes.Status409Conflict)]
        [ProducesResponseType(typeof(object), StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> Create([FromBody] CreateAuditLogRequestDto request, CancellationToken cancellationToken)
        {
            // TODO: Add authorization before enabling audit log writes in production.
            // TODO: Restrict audit log access to admins/auditors only.
            try
            {
                var result = await _auditLogService.CreateAsync(request, cancellationToken);
                return result.Success
                    ? Ok(new { success = true, item = result.Item })
                    : BadRequest(new { success = false, error = result.Error });
            }
            catch (SqlException ex) when (ex.Number is 2601 or 2627)
            {
                return Conflict(new { success = false, error = "AuditLog already exists" });
            }
            catch (SqlException)
            {
                return StatusCode(500, new { success = false, error = "AuditLog could not be saved" });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { success = false, error = ex.Message });
            }
            catch (InvalidOperationException)
            {
                return StatusCode(500, new { success = false, error = "AuditLog storage is not configured" });
            }
        }

        /// <summary>Updates an audit log.</summary>
        /// <remarks>Updates only provided supported fields.</remarks>
        [HttpPut("{id}")]
        [EndpointSummary("Update audit log")]
        [EndpointDescription("Updates an existing AuditLog row by id. Unknown fields are rejected.")]
        [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(object), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(object), StatusCodes.Status404NotFound)]
        [ProducesResponseType(typeof(object), StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> Update(string id, [FromBody] UpdateAuditLogRequestDto request, CancellationToken cancellationToken)
        {
            // TODO: Add authorization before enabling audit log writes in production.
            // TODO: Restrict audit log access to admins/auditors only.
            try
            {
                var result = await _auditLogService.UpdateAsync(id, request, cancellationToken);
                if (result.Success)
                {
                    return Ok(new { success = true, item = result.Item });
                }

                return result.Error == "AuditLog not found"
                    ? NotFound(new { success = false, error = result.Error })
                    : BadRequest(new { success = false, error = result.Error });
            }
            catch (SqlException)
            {
                return StatusCode(500, new { success = false, error = "AuditLog could not be saved" });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { success = false, error = ex.Message });
            }
            catch (InvalidOperationException)
            {
                return StatusCode(500, new { success = false, error = "AuditLog storage is not configured" });
            }
        }

        /// <summary>Deletes an audit log.</summary>
        /// <remarks>Deletes the AuditLog row only. Related records are not cascade deleted.</remarks>
        [HttpDelete("{id}")]
        [EndpointSummary("Delete audit log")]
        [EndpointDescription("Deletes an AuditLog row by id without cascading related records.")]
        [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(object), StatusCodes.Status404NotFound)]
        [ProducesResponseType(typeof(object), StatusCodes.Status409Conflict)]
        [ProducesResponseType(typeof(object), StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> Delete(string id, CancellationToken cancellationToken)
        {
            // TODO: Add authorization before enabling audit log deletion in production.
            // TODO: Restrict audit log access to admins/auditors only.
            try
            {
                var result = await _auditLogService.DeleteAsync(id, cancellationToken);
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
                return StatusCode(500, new { success = false, error = "AuditLog could not be deleted" });
            }
            catch (InvalidOperationException)
            {
                return StatusCode(500, new { success = false, error = "AuditLog storage is not configured" });
            }
        }
    }
}
