using System.Text.Json;
using DER3.Api.DTOs;
using DER3.Api.Repositories;

namespace DER3.Api.Services
{
    public sealed record NotificationWriteResult(bool Success, string? Error = null, Dictionary<string, object?>? Item = null);

    public interface INotificationService
    {
        Task<NotificationWriteResult> CreateAsync(CreateNotificationRequestDto request, CancellationToken cancellationToken);
        Task<NotificationWriteResult> UpdateAsync(string id, UpdateNotificationRequestDto request, CancellationToken cancellationToken);
        Task<NotificationWriteResult> DeleteAsync(string id, CancellationToken cancellationToken);
    }

    public sealed class NotificationService : INotificationService
    {
        private readonly INotificationRepository _notificationRepository;

        public NotificationService(INotificationRepository notificationRepository)
        {
            _notificationRepository = notificationRepository;
        }

        public async Task<NotificationWriteResult> CreateAsync(CreateNotificationRequestDto request, CancellationToken cancellationToken)
        {
            if (IncidentService.HasUnknownFields(request.UnknownFields))
            {
                return new NotificationWriteResult(false, "Payload contains unsupported fields");
            }

            var notification = new NotificationRecord(
                string.IsNullOrWhiteSpace(request.Id) ? IncidentService.GenerateId() : request.Id.Trim(),
                IncidentService.NormalizeOptionalString(request.UserId),
                IncidentService.NormalizeOptionalString(request.TitleAr),
                IncidentService.NormalizeOptionalString(request.TitleEn),
                IncidentService.NormalizeOptionalString(request.MessageAr),
                IncidentService.NormalizeOptionalString(request.MessageEn),
                IncidentService.NormalizeOptionalString(request.Type),
                IncidentService.NormalizeOptionalString(request.Link),
                request.IsRead ?? false,
                request.CreatedAt ?? DateTime.UtcNow);

            var item = await _notificationRepository.InsertAsync(notification, cancellationToken);
            return new NotificationWriteResult(true, Item: item);
        }

        public async Task<NotificationWriteResult> UpdateAsync(string id, UpdateNotificationRequestDto request, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(id))
            {
                return new NotificationWriteResult(false, "Notification id is required");
            }

            if (IncidentService.HasUnknownFields(request.UnknownFields))
            {
                return new NotificationWriteResult(false, "Payload contains unsupported fields");
            }

            var trimmedId = id.Trim();
            var fields = new Dictionary<string, object?>(StringComparer.Ordinal);

            if (request.Id.HasValue)
            {
                var bodyId = IncidentService.ReadString(request.Id.Value, "id", required: false);
                if (!string.IsNullOrWhiteSpace(bodyId) && !string.Equals(bodyId, trimmedId, StringComparison.Ordinal))
                {
                    return new NotificationWriteResult(false, "Route id and body id must match");
                }
            }

            AddStringField(fields, "userId", request.UserId, required: false);
            AddStringField(fields, "titleAr", request.TitleAr, required: false);
            AddStringField(fields, "titleEn", request.TitleEn, required: false);
            AddStringField(fields, "messageAr", request.MessageAr, required: false);
            AddStringField(fields, "messageEn", request.MessageEn, required: false);
            AddStringField(fields, "type", request.Type, required: false);
            AddStringField(fields, "link", request.Link, required: false);
            AddBoolField(fields, "isRead", request.IsRead);
            AddDateField(fields, "createdAt", request.CreatedAt);

            if (fields.Count == 0)
            {
                return new NotificationWriteResult(false, "No supported fields were provided");
            }

            var item = await _notificationRepository.UpdateAsync(trimmedId, fields, cancellationToken);
            return item is null
                ? new NotificationWriteResult(false, "Notification not found")
                : new NotificationWriteResult(true, Item: item);
        }

        public async Task<NotificationWriteResult> DeleteAsync(string id, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(id))
            {
                return new NotificationWriteResult(false, "Notification id is required");
            }

            var deleted = await _notificationRepository.DeleteAsync(id.Trim(), cancellationToken);
            return deleted
                ? new NotificationWriteResult(true)
                : new NotificationWriteResult(false, "Notification not found");
        }

        private static void AddStringField(Dictionary<string, object?> fields, string name, JsonElement? value, bool required)
        {
            if (value.HasValue)
            {
                fields[name] = IncidentService.NormalizeOptionalString(IncidentService.ReadString(value.Value, name, required));
            }
        }

        private static void AddBoolField(Dictionary<string, object?> fields, string name, JsonElement? value)
        {
            if (value.HasValue)
            {
                fields[name] = LookupOptionService.ReadBool(value.Value, name);
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
