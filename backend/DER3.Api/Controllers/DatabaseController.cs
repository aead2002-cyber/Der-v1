using DER3.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DER3.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Produces("application/json")]
    [Authorize]
    public class DatabaseController : ControllerBase
    {
        private readonly Der3DbContext _context;

        public DatabaseController(Der3DbContext context)
        {
            _context = context;
        }

        [HttpGet("test")]
        [EndpointSummary("Test database connection")]
        [EndpointDescription("Checks whether the API can connect to the configured SQL Server database.")]
        [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(object), StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> TestConnection()
        {
            try
            {
                var canConnect = await _context.Database.CanConnectAsync();

                if (!canConnect)
                {
                    return StatusCode(500, new
                    {
                        status = "failed",
                        message = "Cannot connect to SQL Server database"
                    });
                }

                return Ok(new
                {
                    status = "ok",
                    message = "SQL Server connection is working"
                });
            }
            catch (Exception)
            {
                return StatusCode(500, new
                {
                    status = "error",
                    message = "Database connection test failed"
                });
            }
        }
    }
}
