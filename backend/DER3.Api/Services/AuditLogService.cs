using System.Text.Json;
using DER3.Api.DTOs;
using DER3.Api.Repositories;

namespace DER3.Api.Services
{
    public sealed record AuditLogWriteResult(bool Success, string? Error = null, Dictionary<string, object?>? Item = null);

    public interface IAuditLogService
    {
        Task<AuditLogWriteResult> CreateAsync(CreateAuditLogRequestDto request, CancellationToken cancellationToken);
        Task<AuditLogWriteResult> UpdateAsync(string id, UpdateAuditLogRequestDto request, CancellationToken cancellationToken);
        Task<AuditLogWriteResult> DeleteAsync(string id, CancellationToken cancellationToken);
    }

    public sealed class AuditLogService : IAuditLogService
    {
        private readonly IAuditLogRepository _auditLogRepository;

        public AuditLogService(IAuditLogRepository auditLogRepository)
        {
            _auditLogRepository = auditLogRepository;
        }

        public async Task<AuditLogWriteResult> CreateAsync(CreateAuditLogRequestDto request, CancellationToken cancellationToken)
        {
            if (IncidentService.HasUnknownFields(request.UnknownFields))
            {
                return new AuditLogWriteResult(false, "Payload contains unsupported fields");
            }

            if (string.IsNullOrWhiteSpace(request.Action) ||
                string.IsNullOrWhiteSpace(request.EntityType) ||
                string.IsNullOrWhiteSpace(request.EntityId))
            {
                return new AuditLogWriteResult(false, "action, entityType and entityId are required");
            }

            var auditLog = new AuditLogRecord(
                string.IsNullOrWhiteSpace(request.Id) ? IncidentService.GenerateId() : request.Id.Trim(),
                IncidentService.NormalizeOptionalString(request.UserId),
                IncidentService.NormalizeOptionalString(request.UserName),
                request.Action.Trim(),
                request.EntityType.Trim(),
                request.EntityId.Trim(),
                NormalizeJsonText(request.OldValue),
                NormalizeJsonText(request.NewValue),
                request.Timestamp ?? DateTime.UtcNow,
                IncidentService.NormalizeOptionalString(request.Ip),
                IncidentService.NormalizeOptionalString(request.UserAgent));

            var item = await _auditLogRepository.InsertAsync(auditLog, cancellationToken);
            return new AuditLogWriteResult(true, Item: item);
        }

        public async Task<AuditLogWriteResult> UpdateAsync(string id, UpdateAuditLogRequestDto request, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(id))
            {
                return new AuditLogWriteResult(false, "AuditLog id is required");
            }

            if (IncidentService.HasUnknownFields(request.UnknownFields))
            {
                return new AuditLogWriteResult(false, "Payload contains unsupported fields");
            }

            var trimmedId = id.Trim();
            var fields = new Dictionary<string, object?>(StringComparer.Ordinal);

            if (request.Id.HasValue)
            {
                var bodyId = IncidentService.ReadString(request.Id.Value, "id", required: false);
                if (!string.IsNullOrWhiteSpace(bodyId) && !string.Equals(bodyId, trimmedId, StringComparison.Ordinal))
                {
                    return new AuditLogWriteResult(false, "Route id and body id must match");
                }
            }

            AddStringField(fields, "userId", request.UserId, required: false);
            AddStringField(fields, "userName", request.UserName, required: false);
            AddStringField(fields, "action", request.Action, required: true);
            AddStringField(fields, "entityType", request.EntityType, required: true);
            AddStringField(fields, "entityId", request.EntityId, required: true);
            AddJsonTextField(fields, "oldValue", request.OldValue);
            AddJsonTextField(fields, "newValue", request.NewValue);
            AddDateField(fields, "timestamp", request.Timestamp);
            AddStringField(fields, "ip", request.Ip, required: false);
            AddStringField(fields, "userAgent", request.UserAgent, required: false);

            if (fields.Count == 0)
            {
                return new AuditLogWriteResult(false, "No supported fields were provided");
            }

            var item = await _auditLogRepository.UpdateAsync(trimmedId, fields, cancellationToken);
            return item is null
                ? new AuditLogWriteResult(false, "AuditLog not found")
                : new AuditLogWriteResult(true, Item: item);
        }

        public async Task<AuditLogWriteResult> DeleteAsync(string id, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(id))
            {
                return new AuditLogWriteResult(false, "AuditLog id is required");
            }

            var deleted = await _auditLogRepository.DeleteAsync(id.Trim(), cancellationToken);
            return deleted ? new AuditLogWriteResult(true) : new AuditLogWriteResult(false, "AuditLog not found");
        }

        private static void AddStringField(Dictionary<string, object?> fields, string name, JsonElement? value, bool required)
        {
            if (value.HasValue)
            {
                fields[name] = IncidentService.NormalizeOptionalString(IncidentService.ReadString(value.Value, name, required));
            }
        }

        private static void AddDateField(Dictionary<string, object?> fields, string name, JsonElement? value)
        {
            if (value.HasValue)
            {
                fields[name] = IncidentService.ReadDate(value.Value, name);
            }
        }

        private static void AddJsonTextField(Dictionary<string, object?> fields, string name, JsonElement? value)
        {
            if (value.HasValue)
            {
                fields[name] = NormalizeJsonText(value);
            }
        }

        private static string? NormalizeJsonText(JsonElement? value)
        {
            if (!value.HasValue || value.Value.ValueKind is JsonValueKind.Null or JsonValueKind.Undefined)
            {
                return null;
            }

            return value.Value.ValueKind == JsonValueKind.String
                ? value.Value.GetString()
                : value.Value.GetRawText();
        }
    }
}
