using System.Text.Json;
using DER3.Api.DTOs;
using DER3.Api.Repositories;

namespace DER3.Api.Services
{
    public sealed record NotificationLogWriteResult(bool Success, string? Error = null, Dictionary<string, object?>? Item = null);

    public interface INotificationLogService
    {
        Task<NotificationLogWriteResult> CreateAsync(CreateNotificationLogRequestDto request, CancellationToken cancellationToken);
        Task<NotificationLogWriteResult> UpdateAsync(string id, UpdateNotificationLogRequestDto request, CancellationToken cancellationToken);
        Task<NotificationLogWriteResult> DeleteAsync(string id, CancellationToken cancellationToken);
    }

    public sealed class NotificationLogService : INotificationLogService
    {
        private readonly INotificationLogRepository _notificationLogRepository;

        public NotificationLogService(INotificationLogRepository notificationLogRepository)
        {
            _notificationLogRepository = notificationLogRepository;
        }

        public async Task<NotificationLogWriteResult> CreateAsync(CreateNotificationLogRequestDto request, CancellationToken cancellationToken)
        {
            if (IncidentService.HasUnknownFields(request.UnknownFields))
            {
                return new NotificationLogWriteResult(false, "Payload contains unsupported fields");
            }

            var log = new NotificationLogRecord(
                string.IsNullOrWhiteSpace(request.Id) ? IncidentService.GenerateId() : request.Id.Trim(),
                IncidentService.NormalizeOptionalString(request.RecipientId),
                IncidentService.NormalizeOptionalString(request.RecipientEmail),
                IncidentService.NormalizeOptionalString(request.RecipientName),
                IncidentService.NormalizeOptionalString(request.Type),
                IncidentService.NormalizeOptionalString(request.Subject),
                IncidentService.NormalizeOptionalString(request.Body),
                IncidentService.NormalizeOptionalString(request.Status),
                request.SentAt ?? DateTime.UtcNow,
                IncidentService.NormalizeOptionalString(request.ErrorMessage));

            var item = await _notificationLogRepository.InsertAsync(log, cancellationToken);
            return new NotificationLogWriteResult(true, Item: item);
        }

        public async Task<NotificationLogWriteResult> UpdateAsync(string id, UpdateNotificationLogRequestDto request, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(id))
            {
                return new NotificationLogWriteResult(false, "NotificationLog id is required");
            }

            if (IncidentService.HasUnknownFields(request.UnknownFields))
            {
                return new NotificationLogWriteResult(false, "Payload contains unsupported fields");
            }

            var trimmedId = id.Trim();
            var fields = new Dictionary<string, object?>(StringComparer.Ordinal);

            if (request.Id.HasValue)
            {
                var bodyId = IncidentService.ReadString(request.Id.Value, "id", required: false);
                if (!string.IsNullOrWhiteSpace(bodyId) && !string.Equals(bodyId, trimmedId, StringComparison.Ordinal))
                {
                    return new NotificationLogWriteResult(false, "Route id and body id must match");
                }
            }

            AddStringField(fields, "recipientId", request.RecipientId, required: false);
            AddStringField(fields, "recipientEmail", request.RecipientEmail, required: false);
            AddStringField(fields, "recipientName", request.RecipientName, required: false);
            AddStringField(fields, "type", request.Type, required: false);
            AddStringField(fields, "subject", request.Subject, required: false);
            AddStringField(fields, "body", request.Body, required: false);
            AddStringField(fields, "status", request.Status, required: false);
            AddDateField(fields, "sentAt", request.SentAt);
            AddStringField(fields, "errorMessage", request.ErrorMessage, required: false);

            if (fields.Count == 0)
            {
                return new NotificationLogWriteResult(false, "No supported fields were provided");
            }

            var item = await _notificationLogRepository.UpdateAsync(trimmedId, fields, cancellationToken);
            return item is null
                ? new NotificationLogWriteResult(false, "NotificationLog not found")
                : new NotificationLogWriteResult(true, Item: item);
        }

        public async Task<NotificationLogWriteResult> DeleteAsync(string id, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(id))
            {
                return new NotificationLogWriteResult(false, "NotificationLog id is required");
            }

            var deleted = await _notificationLogRepository.DeleteAsync(id.Trim(), cancellationToken);
            return deleted
                ? new NotificationLogWriteResult(true)
                : new NotificationLogWriteResult(false, "NotificationLog not found");
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
    }
}
