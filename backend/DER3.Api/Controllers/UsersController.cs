using DER3.Api.DTOs;
using DER3.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using System.Security.Claims;

namespace DER3.Api.Controllers
{
    [ApiController]
    [Route("api/users")]
    [Produces("application/json")]
    [Authorize]
    public sealed class UsersController : ControllerBase
    {
        private readonly IUserService _userService;

        public UsersController(IUserService userService)
        {
            _userService = userService;
        }

        [HttpGet("me")]
        [EndpointSummary("Get current user profile")]
        [EndpointDescription("Returns the authenticated user's profile from the User table. Password hashes and salts are never returned.")]
        [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(object), StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(typeof(object), StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetCurrentUser(CancellationToken cancellationToken)
        {
            var uid = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrWhiteSpace(uid))
            {
                return Unauthorized(new { success = false, error = "User identity is not available" });
            }

            var result = await _userService.GetCurrentUserAsync(uid, cancellationToken);
            return result.Success
                ? Ok(new { success = true, user = result.User })
                : NotFound(new { success = false, error = result.Error });
        }

        [HttpPut("me/profile")]
        [EndpointSummary("Update current user profile")]
        [EndpointDescription("Updates only the authenticated user's safe profile fields: displayName, displayNameEn, and photoURL.")]
        [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(object), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(object), StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(typeof(object), StatusCodes.Status404NotFound)]
        public async Task<IActionResult> UpdateCurrentUserProfile(
            [FromBody] UpdateMyProfileRequestDto request,
            CancellationToken cancellationToken)
        {
            var uid = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrWhiteSpace(uid))
            {
                return Unauthorized(new { success = false, error = "User identity is not available" });
            }

            try
            {
                var result = await _userService.UpdateCurrentUserProfileAsync(uid, request, cancellationToken);
                if (!result.Success)
                {
                    return result.Error == "User not found"
                        ? NotFound(new { success = false, error = result.Error })
                        : BadRequest(new { success = false, error = result.Error });
                }

                return Ok(new { success = true, user = result.User });
            }
            catch (SqlException)
            {
                return StatusCode(500, new { success = false, error = "Profile update failed" });
            }
            catch (InvalidOperationException)
            {
                return StatusCode(500, new { success = false, error = "User storage is not configured" });
            }
        }

        [HttpPost]
        [EndpointSummary("Create user")]
        [EndpointDescription("Creates a User row using only allowed fields. Password hashes and salts are never returned.")]
        [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(object), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(object), StatusCodes.Status409Conflict)]
        [ProducesResponseType(typeof(object), StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> CreateUser(
            [FromBody] CreateUserRequestDto request,
            CancellationToken cancellationToken)
        {
            // TODO: Add authorization before enabling user management in production.
            try
            {
                var result = await _userService.CreateUserAsync(request, cancellationToken);
                if (!result.Success)
                {
                    return BadRequest(new { success = false, error = result.Error });
                }

                return Ok(new { success = true, user = result.User });
            }
            catch (SqlException ex) when (ex.Number is 2601 or 2627)
            {
                return Conflict(new { success = false, error = "User already exists" });
            }
            catch (SqlException)
            {
                return StatusCode(500, new { success = false, error = "User create failed" });
            }
            catch (InvalidOperationException)
            {
                return StatusCode(500, new { success = false, error = "User storage is not configured" });
            }
        }

        [HttpPut("{id}")]
        [EndpointSummary("Update user")]
        [EndpointDescription("Updates an existing User row by id using only allowed fields. Password hashes and salts are never returned.")]
        [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(object), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(object), StatusCodes.Status404NotFound)]
        [ProducesResponseType(typeof(object), StatusCodes.Status409Conflict)]
        [ProducesResponseType(typeof(object), StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> UpdateUser(
            string id,
            [FromBody] UpdateUserRequestDto request,
            CancellationToken cancellationToken)
        {
            // TODO: Add authorization before enabling user management in production.
            try
            {
                var result = await _userService.UpdateUserAsync(id, request, cancellationToken);
                if (!result.Success)
                {
                    return result.Error == "User not found"
                        ? NotFound(new { success = false, error = result.Error })
                        : BadRequest(new { success = false, error = result.Error });
                }

                return Ok(new { success = true, user = result.User });
            }
            catch (SqlException ex) when (ex.Number is 2601 or 2627)
            {
                return Conflict(new { success = false, error = "Email or user identifier already exists" });
            }
            catch (SqlException)
            {
                return StatusCode(500, new { success = false, error = "User update failed" });
            }
            catch (InvalidOperationException)
            {
                return StatusCode(500, new { success = false, error = "User storage is not configured" });
            }
        }

        [HttpPost("{uid}/password")]
        [EndpointSummary("Set user password")]
        [EndpointDescription("Sets a user's password by uid using a hashed and salted password value.")]
        [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(object), StatusCodes.Status400BadRequest)]
        [ProducesResponseType(typeof(object), StatusCodes.Status404NotFound)]
        [ProducesResponseType(typeof(object), StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> SetPassword(
            string uid,
            [FromBody] SetPasswordRequestDto request,
            CancellationToken cancellationToken)
        {
            // TODO: Add authorization before enabling user password management in production.
            try
            {
                var result = await _userService.SetPasswordAsync(uid, request, cancellationToken);
                if (!result.Success)
                {
                    return result.Error == "User not found"
                        ? NotFound(new { success = false, error = result.Error })
                        : BadRequest(new { success = false, error = result.Error });
                }

                return Ok(new { success = true });
            }
            catch (SqlException)
            {
                return StatusCode(500, new { success = false, error = "Password update failed" });
            }
            catch (InvalidOperationException)
            {
                return StatusCode(500, new { success = false, error = "User storage is not configured" });
            }
        }

        [HttpDelete("{id}")]
        [EndpointSummary("Delete user")]
        [EndpointDescription("Deletes a User row by id without cascading related records.")]
        [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(object), StatusCodes.Status404NotFound)]
        [ProducesResponseType(typeof(object), StatusCodes.Status409Conflict)]
        [ProducesResponseType(typeof(object), StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> DeleteUser(string id, CancellationToken cancellationToken)
        {
            // TODO: Add authorization before enabling user deletion in production.
            try
            {
                var deletedBy = User.FindFirstValue(ClaimTypes.Email) ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
                var result = await _userService.DeleteAsync(id, deletedBy, cancellationToken);
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
                return StatusCode(500, new { success = false, error = "User could not be deleted" });
            }
            catch (InvalidOperationException)
            {
                return StatusCode(500, new { success = false, error = "User storage is not configured" });
            }
        }
    }
}
