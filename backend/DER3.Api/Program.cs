using DER3.Api.Data;
using DER3.Api.Repositories;
using DER3.Api.Services;
using DER3.Api.Swagger;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using System.Text;

var builder = WebApplication.CreateBuilder(args);
const string LocalFrontendCorsPolicy = "LocalFrontendCors";

// Add services
builder.Services.AddControllers();
builder.Services.AddCors(options =>
{
    options.AddPolicy(LocalFrontendCorsPolicy, policy =>
    {
        policy
          .WithOrigins(
    "http://localhost:3000",
    "http://localhost:5173",
    "https://localhost:3000",
    "https://localhost:5173",
    "http://10.10.12.117:3000")
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});
builder.Services.AddAuthorization();
builder.Services.AddMemoryCache();
builder.Services.AddScoped<ICompatibilityReadRepository, CompatibilityReadRepository>();
builder.Services.AddScoped<ICompatibilityReadService, CompatibilityReadService>();
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IFileRepository, FileRepository>();
builder.Services.AddScoped<IPolicyRepository, PolicyRepository>();
builder.Services.AddScoped<IPolicyItemRepository, PolicyItemRepository>();
builder.Services.AddScoped<IStandardRepository, StandardRepository>();
builder.Services.AddScoped<IProcedureRepository, ProcedureRepository>();
builder.Services.AddScoped<IIncidentRepository, IncidentRepository>();
builder.Services.AddScoped<IIncidentNoteRepository, IncidentNoteRepository>();
builder.Services.AddScoped<IIncidentFeedbackRepository, IncidentFeedbackRepository>();
builder.Services.AddScoped<IRiskRepository, RiskRepository>();
builder.Services.AddScoped<ICommitmentRepository, CommitmentRepository>();
builder.Services.AddScoped<IChangeRequestRepository, ChangeRequestRepository>();
builder.Services.AddScoped<ITeamRepository, TeamRepository>();
builder.Services.AddScoped<IDepartmentRepository, DepartmentRepository>();
builder.Services.AddScoped<ILookupOptionRepository, LookupOptionRepository>();
builder.Services.AddScoped<IPermissionGroupRepository, PermissionGroupRepository>();
builder.Services.AddScoped<IFrameworkRepository, FrameworkRepository>();
builder.Services.AddScoped<IStandardClassificationRepository, StandardClassificationRepository>();
builder.Services.AddScoped<IEvidenceRepository, EvidenceRepository>();
builder.Services.AddScoped<IAuditLogRepository, AuditLogRepository>();
builder.Services.AddScoped<INotificationRepository, NotificationRepository>();
builder.Services.AddScoped<INotificationTemplateRepository, NotificationTemplateRepository>();
builder.Services.AddScoped<INotificationLogRepository, NotificationLogRepository>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IFileEncryptionService, FileEncryptionService>();
builder.Services.AddScoped<IFileService, FileService>();
builder.Services.AddScoped<IPolicyService, PolicyService>();
builder.Services.AddScoped<IPolicyItemService, PolicyItemService>();
builder.Services.AddScoped<IStandardService, StandardService>();
builder.Services.AddScoped<IProcedureService, ProcedureService>();
builder.Services.AddScoped<IIncidentService, IncidentService>();
builder.Services.AddScoped<IIncidentNoteService, IncidentNoteService>();
builder.Services.AddScoped<IIncidentFeedbackService, IncidentFeedbackService>();
builder.Services.AddScoped<IRiskService, RiskService>();
builder.Services.AddScoped<ICommitmentService, CommitmentService>();
builder.Services.AddScoped<IChangeRequestService, ChangeRequestService>();
builder.Services.AddScoped<ITeamService, TeamService>();
builder.Services.AddScoped<IDepartmentService, DepartmentService>();
builder.Services.AddScoped<ILookupOptionService, LookupOptionService>();
builder.Services.AddScoped<IPermissionGroupService, PermissionGroupService>();
builder.Services.AddScoped<IFrameworkService, FrameworkService>();
builder.Services.AddScoped<IStandardClassificationService, StandardClassificationService>();
builder.Services.AddScoped<IEvidenceService, EvidenceService>();
builder.Services.AddScoped<IAuditLogService, AuditLogService>();
builder.Services.AddScoped<INotificationService, NotificationService>();
builder.Services.AddScoped<INotificationTemplateService, NotificationTemplateService>();
builder.Services.AddScoped<INotificationLogService, NotificationLogService>();
builder.Services.AddScoped<IJwtTokenService, JwtTokenService>();
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<IOtpService, OtpService>();
builder.Services.AddScoped<IPasswordResetService, PasswordResetService>();

builder.Services.AddDbContext<Der3DbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

var jwtKey = builder.Configuration["Jwt:Key"];
var jwtIssuer = builder.Configuration["Jwt:Issuer"];
var jwtAudience = builder.Configuration["Jwt:Audience"];
if (string.IsNullOrWhiteSpace(jwtKey) ||
    string.IsNullOrWhiteSpace(jwtIssuer) ||
    string.IsNullOrWhiteSpace(jwtAudience))
{
    throw new InvalidOperationException("JWT settings are not configured.");
}

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwtIssuer,
            ValidateAudience = true,
            ValidAudience = jwtAudience,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(1)
        };

        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                if (builder.Environment.IsDevelopment() && RequiresJwt(context.HttpContext))
                {
                    var logger = context.HttpContext.RequestServices
                        .GetRequiredService<ILoggerFactory>()
                        .CreateLogger("JwtAuth");

                    var hasToken = context.Request.Headers.Authorization.Count > 0 &&
                        context.Request.Headers.Authorization.ToString().StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase);

                    if (!hasToken)
                    {
                        logger.LogWarning("JWT authentication request was missing a bearer token for {Path}", context.Request.Path);
                    }
                }

                return Task.CompletedTask;
            },
            OnAuthenticationFailed = context =>
            {
                if (builder.Environment.IsDevelopment() && RequiresJwt(context.HttpContext))
                {
                    var logger = context.HttpContext.RequestServices
                        .GetRequiredService<ILoggerFactory>()
                        .CreateLogger("JwtAuth");

                    var reason = context.Exception switch
                    {
                        SecurityTokenExpiredException => "expired token",
                        SecurityTokenInvalidSignatureException => "invalid signature",
                        SecurityTokenInvalidIssuerException => "invalid issuer",
                        SecurityTokenInvalidAudienceException => "invalid audience",
                        _ => "authentication failure"
                    };

                    logger.LogWarning(context.Exception, "JWT authentication failed: {Reason} for {Path}", reason, context.Request.Path);
                }

                return Task.CompletedTask;
            }
        };
    });

// Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        Description = "Enter the JWT token returned by POST /api/auth/verify-otp."
    });

    options.AddSecurityRequirement(document => new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecuritySchemeReference("Bearer", document, null),
            new List<string>()
        }
    });

    options.OperationFilter<AuthorizeOperationFilter>();
});

var app = builder.Build();

// Swagger UI
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// For local HTTP testing
// app.UseHttpsRedirection();

app.UseCors(LocalFrontendCorsPolicy);

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();

static bool RequiresJwt(HttpContext context)
{
    var endpoint = context.GetEndpoint();
    if (endpoint is null)
    {
        return false;
    }

    var allowAnonymous = endpoint.Metadata.GetMetadata<IAllowAnonymous>() is not null;
    if (allowAnonymous)
    {
        return false;
    }

    return endpoint.Metadata.GetMetadata<IAuthorizeData>() is not null;
}
