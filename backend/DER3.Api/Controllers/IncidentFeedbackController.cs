using DER3.Api.DTOs;
using DER3.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;

namespace DER3.Api.Controllers
{
    [ApiController]
    [Route("api/incidentFeedback")]
    [Produces("application/json")]
    [Authorize]
    public sealed class IncidentFeedbackController : ControllerBase
    {
        private const string DeleteConflictError = "Cannot delete item because it is referenced by other records.";
        private readonly IIncidentFeedbackService _incidentFeedbackService;

        public IncidentFeedbackController(IIncidentFeedbackService incidentFeedbackService)
        {
            _incidentFeedbackService = incidentFeedbackService;
        }

        /// <summary>Creates incident feedback.</summary>
        /// <remarks>Accepts only existing IncidentFeedback table fields.</remarks>
        [HttpPost]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> Create([FromBody] CreateIncidentFeedbackRequestDto request, CancellationToken cancellationToken)
        {
            // TODO: Add authorization before enabling incident feedback writes in production.
            try
            {
                var result = await _incidentFeedbackService.CreateAsync(request, cancellationToken);
                return result.Success
                    ? Ok(new { success = true, item = result.Item })
                    : BadRequest(new { success = false, error = result.Error });
            }
            catch (SqlException ex) when (ex.Number is 2601 or 2627)
            {
                return Conflict(new { success = false, error = "Incident feedback already exists" });
            }
            catch (SqlException ex) when (ex.Number == 547)
            {
                return BadRequest(new { success = false, error = "Referenced incident was not found" });
            }
            catch (SqlException)
            {
                return StatusCode(500, new { success = false, error = "Incident feedback could not be saved" });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { success = false, error = ex.Message });
            }
            catch (InvalidOperationException)
            {
                return StatusCode(500, new { success = false, error = "Incident feedback storage is not configured" });
            }
        }

        /// <summary>Updates incident feedback.</summary>
        /// <remarks>Updates only provided supported IncidentFeedback fields.</remarks>
        [HttpPut("{id}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> Update(string id, [FromBody] UpdateIncidentFeedbackRequestDto request, CancellationToken cancellationToken)
        {
            // TODO: Add authorization before enabling incident feedback writes in production.
            try
            {
                var result = await _incidentFeedbackService.UpdateAsync(id, request, cancellationToken);
                if (result.Success)
                {
                    return Ok(new { success = true, item = result.Item });
                }

                return result.Error == "Incident feedback not found"
                    ? NotFound(new { success = false, error = result.Error })
                    : BadRequest(new { success = false, error = result.Error });
            }
            catch (SqlException ex) when (ex.Number == 547)
            {
                return BadRequest(new { success = false, error = "Referenced incident was not found" });
            }
            catch (SqlException)
            {
                return StatusCode(500, new { success = false, error = "Incident feedback could not be saved" });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { success = false, error = ex.Message });
            }
            catch (InvalidOperationException)
            {
                return StatusCode(500, new { success = false, error = "Incident feedback storage is not configured" });
            }
        }

        /// <summary>Deletes incident feedback.</summary>
        /// <remarks>Deletes by id only. No related records are deleted automatically.</remarks>
        [HttpDelete("{id}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> Delete(string id, CancellationToken cancellationToken)
        {
            // TODO: Add authorization before enabling incident feedback deletion in production.
            try
            {
                var result = await _incidentFeedbackService.DeleteAsync(id, cancellationToken);
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
                return StatusCode(500, new { success = false, error = "Incident feedback could not be deleted" });
            }
            catch (InvalidOperationException)
            {
                return StatusCode(500, new { success = false, error = "Incident feedback storage is not configured" });
            }
        }
    }
}
