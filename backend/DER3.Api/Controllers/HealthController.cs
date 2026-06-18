using Microsoft.AspNetCore.Mvc;

namespace DER3.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Produces("application/json")]
    public class HealthController : ControllerBase
    {
        [HttpGet]
        [EndpointSummary("Get API health")]
        [EndpointDescription("Returns a basic API health response.")]
        [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
        public IActionResult Get()
        {
            return Ok(new
            {
                status = "ok",
                message = "DER3 API is running"
            });
        }
    }
}
