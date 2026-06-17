using System.Text.Json;
using DER3.Api.DTOs;
using DER3.Api.Repositories;

namespace DER3.Api.Services
{
    public sealed record NotificationTemplateWriteResult(bool Success, string? Error = null, Dictionary<string, object?>? Item = null);

    public interface INotificationTemplateService
    {
        Task<NotificationTemplateWriteResult> CreateAsync(CreateNotificationTemplateRequestDto request, CancellationToken cancellationToken);
        Task<NotificationTemplateWriteResult> UpdateAsync(string id, UpdateNotificationTemplateRequestDto request, CancellationToken cancellationToken);
        Task<NotificationTemplateWriteResult> DeleteAsync(string id, CancellationToken cancellationToken);
    }

    public sealed class NotificationTemplateService : INotificationTemplateService
    {
        private readonly INotificationTemplateRepository _notificationTemplateRepository;

        public NotificationTemplateService(INotificationTemplateRepository notificationTemplateRepository)
        {
            _notificationTemplateRepository = notificationTemplateRepository;
        }

        public async Task<NotificationTemplateWriteResult> CreateAsync(CreateNotificationTemplateRequestDto request, CancellationToken cancellationToken)
        {
            if (IncidentService.HasUnknownFields(request.UnknownFields))
            {
                return new NotificationTemplateWriteResult(false, "Payload contains unsupported fields");
            }

            if (string.IsNullOrWhiteSpace(request.Name))
            {
                return new NotificationTemplateWriteResult(false, "name is required");
            }

            var template = new NotificationTemplateRecord(
                string.IsNullOrWhiteSpace(request.Id) ? IncidentService.GenerateId() : request.Id.Trim(),
                request.Name.Trim(),
                IncidentService.NormalizeOptionalString(request.Subject),
                IncidentService.NormalizeOptionalString(request.Body),
                IncidentService.NormalizeOptionalString(request.Type));

            var item = await _notificationTemplateRepository.InsertAsync(template, cancellationToken);
            return new NotificationTemplateWriteResult(true, Item: item);
        }

        public async Task<NotificationTemplateWriteResult> UpdateAsync(string id, UpdateNotificationTemplateRequestDto request, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(id))
            {
                return new NotificationTemplateWriteResult(false, "NotificationTemplate id is required");
            }

            if (IncidentService.HasUnknownFields(request.UnknownFields))
            {
                return new NotificationTemplateWriteResult(false, "Payload contains unsupported fields");
            }

            var trimmedId = id.Trim();
            var fields = new Dictionary<string, object?>(StringComparer.Ordinal);

            if (request.Id.HasValue)
            {
                var bodyId = IncidentService.ReadString(request.Id.Value, "id", required: false);
                if (!string.IsNullOrWhiteSpace(bodyId) && !string.Equals(bodyId, trimmedId, StringComparison.Ordinal))
                {
                    return new NotificationTemplateWriteResult(false, "Route id and body id must match");
                }
            }

            AddStringField(fields, "name", request.Name, required: true);
            AddStringField(fields, "subject", request.Subject, required: false);
            AddStringField(fields, "body", request.Body, required: false);
            AddStringField(fields, "type", request.Type, required: false);

            if (fields.Count == 0)
            {
                return new NotificationTemplateWriteResult(false, "No supported fields were provided");
            }

            var item = await _notificationTemplateRepository.UpdateAsync(trimmedId, fields, cancellationToken);
            return item is null
                ? new NotificationTemplateWriteResult(false, "NotificationTemplate not found")
                : new NotificationTemplateWriteResult(true, Item: item);
        }

        public async Task<NotificationTemplateWriteResult> DeleteAsync(string id, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(id))
            {
                return new NotificationTemplateWriteResult(false, "NotificationTemplate id is required");
            }

            var deleted = await _notificationTemplateRepository.DeleteAsync(id.Trim(), cancellationToken);
            return deleted
                ? new NotificationTemplateWriteResult(true)
                : new NotificationTemplateWriteResult(false, "NotificationTemplate not found");
        }

        private static void AddStringField(Dictionary<string, object?> fields, string name, JsonElement? value, bool required)
        {
            if (value.HasValue)
            {
                fields[name] = IncidentService.NormalizeOptionalString(IncidentService.ReadString(value.Value, name, required));
            }
        }
    }
}
