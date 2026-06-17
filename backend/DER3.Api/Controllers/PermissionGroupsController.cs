using DER3.Api.DTOs;
using DER3.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;

namespace DER3.Api.Controllers
{
    [ApiController]
    [Route("api/permissionGroups")]
    [Produces("application/json")]
    [Authorize]
    public sealed class PermissionGroupsController : ControllerBase
    {
        private const string DeleteConflictError = "Cannot delete permission group because it is referenced by other records. Delete dependent records first.";
        private readonly IPermissionGroupService _permissionGroupService;

        public PermissionGroupsController(IPermissionGroupService permissionGroupService)
        {
            _permissionGroupService = permissionGroupService;
        }

        /// <summary>Creates a permission group.</summary>
        /// <remarks>Accepts only existing PermissionGroup table fields. permissions is stored as JSON.</remarks>
        [HttpPost]
        [EndpointSummary("Create permission group")]
        [EndpointDescription("Creates a PermissionGroup row using only allowed fields. permissions must be an array of strings.")]
        [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(object), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(object), StatusCodes.Status409Conflict)]
        [ProducesResponseType(typeof(object), StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> Create([FromBody] CreatePermissionGroupRequestDto request, CancellationToken cancellationToken)
        {
            // TODO: Add authorization before enabling permission group writes in production.
            try
            {
                var result = await _permissionGroupService.CreateAsync(request, cancellationToken);
                return result.Success
                    ? Ok(new { success = true, item = result.Item })
                    : BadRequest(new { success = false, error = result.Error });
            }
            catch (SqlException ex) when (ex.Number is 2601 or 2627)
            {
                return Conflict(new { success = false, error = "PermissionGroup already exists" });
            }
            catch (SqlException)
            {
                return StatusCode(500, new { success = false, error = "PermissionGroup could not be saved" });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { success = false, error = ex.Message });
            }
            catch (InvalidOperationException)
            {
                return StatusCode(500, new { success = false, error = "PermissionGroup storage is not configured" });
            }
        }

        /// <summary>Updates a permission group.</summary>
        /// <remarks>Updates only provided supported fields. permissions must be an array of strings.</remarks>
        [HttpPut("{id}")]
        [EndpointSummary("Update permission group")]
        [EndpointDescription("Updates an existing PermissionGroup row by id. Unknown fields are rejected and permissions is stored as JSON.")]
        [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(object), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(object), StatusCodes.Status404NotFound)]
        [ProducesResponseType(typeof(object), StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> Update(string id, [FromBody] UpdatePermissionGroupRequestDto request, CancellationToken cancellationToken)
        {
            // TODO: Add authorization before enabling permission group writes in production.
            try
            {
                var result = await _permissionGroupService.UpdateAsync(id, request, cancellationToken);
                if (result.Success)
                {
                    return Ok(new { success = true, item = result.Item });
                }

                return result.Error == "PermissionGroup not found"
                    ? NotFound(new { success = false, error = result.Error })
                    : BadRequest(new { success = false, error = result.Error });
            }
            catch (SqlException)
            {
                return StatusCode(500, new { success = false, error = "PermissionGroup could not be saved" });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { success = false, error = ex.Message });
            }
            catch (InvalidOperationException)
            {
                return StatusCode(500, new { success = false, error = "PermissionGroup storage is not configured" });
            }
        }

        /// <summary>Deletes a permission group.</summary>
        /// <remarks>Deletes the PermissionGroup row only. Related records are not cascade deleted.</remarks>
        [HttpDelete("{id}")]
        [EndpointSummary("Delete permission group")]
        [EndpointDescription("Deletes a PermissionGroup row by id without cascading related records.")]
        [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(object), StatusCodes.Status404NotFound)]
        [ProducesResponseType(typeof(object), StatusCodes.Status409Conflict)]
        [ProducesResponseType(typeof(object), StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> Delete(string id, CancellationToken cancellationToken)
        {
            // TODO: Add authorization before enabling permission group deletion in production.
            try
            {
                var result = await _permissionGroupService.DeleteAsync(id, cancellationToken);
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
                return StatusCode(500, new { success = false, error = "PermissionGroup could not be deleted" });
            }
            catch (InvalidOperationException)
            {
                return StatusCode(500, new { success = false, error = "PermissionGroup storage is not configured" });
            }
        }
    }
}
