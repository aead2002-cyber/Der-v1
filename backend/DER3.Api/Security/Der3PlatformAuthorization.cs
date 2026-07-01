using DER3.Api.Services;
using Microsoft.AspNetCore.Authorization;

namespace DER3.Api.Security
{
    public sealed class Der3PlatformRequirement : IAuthorizationRequirement
    {
    }

    public sealed class Der3PlatformAuthorizationHandler : AuthorizationHandler<Der3PlatformRequirement>
    {
        private readonly IPlatformAccessService _platformAccessService;

        public Der3PlatformAuthorizationHandler(IPlatformAccessService platformAccessService)
        {
            _platformAccessService = platformAccessService;
        }

        protected override Task HandleRequirementAsync(
            AuthorizationHandlerContext context,
            Der3PlatformRequirement requirement)
        {
            if (_platformAccessService.HasDer3Access(context.User))
            {
                context.Succeed(requirement);
            }

            return Task.CompletedTask;
        }
    }
}
