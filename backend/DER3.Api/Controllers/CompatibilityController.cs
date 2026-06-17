using DER3.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;

namespace DER3.Api.Controllers
{
    [ApiController]
    [Route("api")]
    [Produces("application/json")]
    [Authorize]
    public sealed class CompatibilityController : ControllerBase
    {
        private readonly ICompatibilityReadService _compatibilityReadService;

        public CompatibilityController(ICompatibilityReadService compatibilityReadService)
        {
            _compatibilityReadService = compatibilityReadService;
        }

        [HttpGet("{entity}")]
        [EndpointSummary("Get compatibility entity rows")]
        [EndpointDescription("Returns rows for a supported compatibility entity without changing existing GET /api/{entity} behavior.")]
        [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(object), StatusCodes.Status404NotFound)]
        [ProducesResponseType(typeof(object), StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> GetAll(string entity, CancellationToken cancellationToken)
        {
            try
            {
                var rows = await _compatibilityReadService.GetAllAsync(entity, cancellationToken);
                return Ok(rows);
            }
            catch (EntityNotSupportedException ex)
            {
                return NotFound(new { error = ex.Message });
            }
            catch (SqlException)
            {
                return StatusCode(500, new { error = "Query failed." });
            }
            catch (InvalidOperationException)
            {
                return StatusCode(500, new { error = "Configuration error." });
            }
        }
    }
}
