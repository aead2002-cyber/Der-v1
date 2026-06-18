using DER3.Api.DTOs;
using DER3.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;

namespace DER3.Api.Controllers
{
    [ApiController]
    [Route("api/incidentNotes")]
    [Produces("application/json")]
    [Authorize]
    public sealed class IncidentNotesController : ControllerBase
    {
        private const string DeleteConflictError = "Cannot delete item because it is referenced by other records.";
        private readonly IIncidentNoteService _incidentNoteService;

        public IncidentNotesController(IIncidentNoteService incidentNoteService)
        {
            _incidentNoteService = incidentNoteService;
        }

        /// <summary>Creates an incident note.</summary>
        /// <remarks>Accepts only existing IncidentNote table fields. Attachments are stored as JSON.</remarks>
        [HttpPost]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> Create([FromBody] CreateIncidentNoteRequestDto request, CancellationToken cancellationToken)
        {
            // TODO: Add authorization before enabling incident note writes in production.
            try
            {
                var result = await _incidentNoteService.CreateAsync(request, cancellationToken);
                return result.Success
                    ? Ok(new { success = true, item = result.Item })
                    : BadRequest(new { success = false, error = result.Error });
            }
            catch (SqlException ex) when (ex.Number is 2601 or 2627)
            {
                return Conflict(new { success = false, error = "Incident note already exists" });
            }
            catch (SqlException ex) when (ex.Number == 547)
            {
                return BadRequest(new { success = false, error = "Referenced incident was not found" });
            }
            catch (SqlException)
            {
                return StatusCode(500, new { success = false, error = "Incident note could not be saved" });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { success = false, error = ex.Message });
            }
            catch (InvalidOperationException)
            {
                return StatusCode(500, new { success = false, error = "Incident note storage is not configured" });
            }
        }

        /// <summary>Updates an incident note.</summary>
        /// <remarks>Updates only provided supported fields. Attachments must be an array of strings.</remarks>
        [HttpPut("{id}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> Update(string id, [FromBody] UpdateIncidentNoteRequestDto request, CancellationToken cancellationToken)
        {
            // TODO: Add authorization before enabling incident note writes in production.
            try
            {
                var result = await _incidentNoteService.UpdateAsync(id, request, cancellationToken);
                if (result.Success)
                {
                    return Ok(new { success = true, item = result.Item });
                }

                return result.Error == "Incident note not found"
                    ? NotFound(new { success = false, error = result.Error })
                    : BadRequest(new { success = false, error = result.Error });
            }
            catch (SqlException ex) when (ex.Number == 547)
            {
                return BadRequest(new { success = false, error = "Referenced incident was not found" });
            }
            catch (SqlException)
            {
                return StatusCode(500, new { success = false, error = "Incident note could not be saved" });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { success = false, error = ex.Message });
            }
            catch (InvalidOperationException)
            {
                return StatusCode(500, new { success = false, error = "Incident note storage is not configured" });
            }
        }

        /// <summary>Deletes an incident note.</summary>
        /// <remarks>Deletes by id only. No related records are deleted automatically.</remarks>
        [HttpDelete("{id}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> Delete(string id, CancellationToken cancellationToken)
        {
            // TODO: Add authorization before enabling incident note deletion in production.
            try
            {
                var result = await _incidentNoteService.DeleteAsync(id, cancellationToken);
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
                return StatusCode(500, new { success = false, error = "Incident note could not be deleted" });
            }
            catch (InvalidOperationException)
            {
                return StatusCode(500, new { success = false, error = "Incident note storage is not configured" });
            }
        }
    }
}
