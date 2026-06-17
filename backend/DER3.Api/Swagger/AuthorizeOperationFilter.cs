using Microsoft.AspNetCore.Authorization;
using Microsoft.OpenApi;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace DER3.Api.Swagger
{
    public sealed class AuthorizeOperationFilter : IOperationFilter
    {
        public void Apply(OpenApiOperation operation, OperationFilterContext context)
        {
            var hasAllowAnonymous = context.ApiDescription.ActionDescriptor.EndpointMetadata
                .OfType<IAllowAnonymous>()
                .Any();

            if (hasAllowAnonymous)
            {
                operation.Security = new List<OpenApiSecurityRequirement>();
                return;
            }
        }
    }
}
