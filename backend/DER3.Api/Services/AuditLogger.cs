using System.Security.Claims;
using System.Text.Json;
using DER3.Api.Repositories;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

namespace DER3.Api.Services
{
    public interface IAuditLogger
    {
        Task LogAsync(
            string action,
            string entityType,
            string entityId,
            object? before,
            object? after,
            object? details,
            ClaimsPrincipal? currentUser,
            HttpContext? httpContext,
            CancellationToken cancellationToken);
    }

    public sealed class AuditLogger : IAuditLogger
    {
        private readonly IAuditLogRepository _auditLogRepository;
        private readonly ILogger<AuditLogger> _logger;

        public AuditLogger(IAuditLogRepository auditLogRepository, ILogger<AuditLogger> logger)
        {
            _auditLogRepository = auditLogRepository;
            _logger = logger;
        }

        public async Task LogAsync(
            string action,
            string entityType,
            string entityId,
            object? before,
            object? after,
            object? details,
            ClaimsPrincipal? currentUser,
            HttpContext? httpContext,
            CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(action) ||
                string.IsNullOrWhiteSpace(entityType) ||
                string.IsNullOrWhiteSpace(entityId))
            {
                return;
            }

            try
            {
                var userId = currentUser?.FindFirstValue(ClaimTypes.NameIdentifier);
                var userName = currentUser?.FindFirstValue(ClaimTypes.Name);
                var userEmail = currentUser?.FindFirstValue(ClaimTypes.Email);
                var ipAddress = httpContext?.Connection.RemoteIpAddress?.ToString();
                var userAgent = httpContext?.Request.Headers["User-Agent"].ToString();
                var timestampUtc = DateTime.UtcNow;
                var beforeJson = SerializeJson(before);
                var afterJson = SerializeJson(after);
                var detailsJson = SerializeJson(details);

                var auditLog = new AuditLogRecord(
                    IncidentService.GenerateId(),
                    IncidentService.NormalizeOptionalString(userId),
                    IncidentService.NormalizeOptionalString(userName),
                    action.Trim(),
                    entityType.Trim(),
                    entityId.Trim(),
                    beforeJson,
                    afterJson,
                    timestampUtc,
                    IncidentService.NormalizeOptionalString(ipAddress),
                    IncidentService.NormalizeOptionalString(userAgent),
                    IncidentService.NormalizeOptionalString(userEmail),
                    detailsJson,
                    beforeJson,
                    afterJson,
                    IncidentService.NormalizeOptionalString(ipAddress),
                    timestampUtc);

                await _auditLogRepository.InsertAsync(auditLog, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to write audit log for {Action} {EntityType} {EntityId}", action, entityType, entityId);
            }
        }

        private static string? SerializeJson(object? value)
        {
            if (value is null)
            {
                return null;
            }

            return JsonSerializer.Serialize(value);
        }
    }
}
