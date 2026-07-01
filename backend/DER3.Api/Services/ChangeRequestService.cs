using System.Text.Json;
using DER3.Api.DTOs;
using DER3.Api.Repositories;

namespace DER3.Api.Services
{
    public sealed record ChangeRequestWriteResult(bool Success, string? Error = null, Dictionary<string, object?>? Item = null);

    public interface IChangeRequestService
    {
        Task<ChangeRequestWriteResult> CreateAsync(CreateChangeRequestDto request, CancellationToken cancellationToken);
        Task<ChangeRequestWriteResult> UpdateAsync(string id, UpdateChangeRequestDto request, CancellationToken cancellationToken);
        Task<ChangeRequestWriteResult> DeleteAsync(string id, string? deletedBy, CancellationToken cancellationToken);
    }

    public sealed class ChangeRequestService : IChangeRequestService
    {
        private readonly IChangeRequestRepository _changeRequestRepository;

        public ChangeRequestService(IChangeRequestRepository changeRequestRepository)
        {
            _changeRequestRepository = changeRequestRepository;
        }

        public async Task<ChangeRequestWriteResult> CreateAsync(CreateChangeRequestDto request, CancellationToken cancellationToken)
        {
            if (IncidentService.HasUnknownFields(request.UnknownFields))
            {
                return new ChangeRequestWriteResult(false, "Payload contains unsupported fields");
            }

            if (string.IsNullOrWhiteSpace(request.Title) || string.IsNullOrWhiteSpace(request.Status))
            {
                return new ChangeRequestWriteResult(false, "title and status are required");
            }

            var now = DateTime.UtcNow;
            var changeRequest = new ChangeRequestRecord(
                string.IsNullOrWhiteSpace(request.Id) ? IncidentService.GenerateId() : request.Id.Trim(),
                request.Title.Trim(),
                IncidentService.NormalizeOptionalString(request.Description),
                IncidentService.NormalizeOptionalString(request.Type),
                IncidentService.NormalizeOptionalString(request.SenderId),
                IncidentService.NormalizeOptionalString(request.SenderName),
                IncidentService.NormalizeOptionalString(request.ReceiverId),
                IncidentService.NormalizeOptionalString(request.ReceiverName),
                request.Status.Trim(),
                JsonSerializer.Serialize(IncidentService.CleanStringArray(request.Attachments)),
                SerializeHistory(request.History),
                request.CreatedAt ?? now,
                request.UpdatedAt ?? now);

            var item = await _changeRequestRepository.InsertAsync(changeRequest, cancellationToken);
            return new ChangeRequestWriteResult(true, Item: item);
        }

        public async Task<ChangeRequestWriteResult> UpdateAsync(string id, UpdateChangeRequestDto request, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(id))
            {
                return new ChangeRequestWriteResult(false, "ChangeRequest id is required");
            }

            if (IncidentService.HasUnknownFields(request.UnknownFields))
            {
                return new ChangeRequestWriteResult(false, "Payload contains unsupported fields");
            }

            var trimmedId = id.Trim();
            var fields = new Dictionary<string, object?>(StringComparer.Ordinal);

            if (request.Id.HasValue)
            {
                var bodyId = IncidentService.ReadString(request.Id.Value, "id", required: false);
                if (!string.IsNullOrWhiteSpace(bodyId) && !string.Equals(bodyId, trimmedId, StringComparison.Ordinal))
                {
                    return new ChangeRequestWriteResult(false, "Route id and body id must match");
                }
            }

            AddStringField(fields, "title", request.Title, required: true);
            AddStringField(fields, "description", request.Description, required: false);
            AddStringField(fields, "type", request.Type, required: false);
            AddStringField(fields, "senderId", request.SenderId, required: false);
            AddStringField(fields, "senderName", request.SenderName, required: false);
            AddStringField(fields, "receiverId", request.ReceiverId, required: false);
            AddStringField(fields, "receiverName", request.ReceiverName, required: false);
            AddStringField(fields, "status", request.Status, required: true);
            AddStringArrayField(fields, "attachments", request.Attachments);
            AddJsonArrayField(fields, "history", request.History);
            AddDateField(fields, "createdAt", request.CreatedAt);
            AddDateField(fields, "updatedAt", request.UpdatedAt);

            if (!fields.ContainsKey("updatedAt"))
            {
                fields["updatedAt"] = DateTime.UtcNow;
            }

            var item = await _changeRequestRepository.UpdateAsync(trimmedId, fields, cancellationToken);
            return item is null
                ? new ChangeRequestWriteResult(false, "ChangeRequest not found")
                : new ChangeRequestWriteResult(true, Item: item);
        }

        public async Task<ChangeRequestWriteResult> DeleteAsync(string id, string? deletedBy, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(id))
            {
                return new ChangeRequestWriteResult(false, "ChangeRequest id is required");
            }

            var deleted = await _changeRequestRepository.DeleteAsync(id.Trim(), deletedBy, cancellationToken);
            return deleted
                ? new ChangeRequestWriteResult(true)
                : new ChangeRequestWriteResult(false, "ChangeRequest not found");
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

        private static void AddStringArrayField(Dictionary<string, object?> fields, string name, JsonElement? value)
        {
            if (value.HasValue)
            {
                fields[name] = JsonSerializer.Serialize(IncidentService.ReadStringArray(value.Value, name));
            }
        }

        private static void AddJsonArrayField(Dictionary<string, object?> fields, string name, JsonElement? value)
        {
            if (value.HasValue)
            {
                fields[name] = SerializeHistory(value);
            }
        }

        private static string SerializeHistory(JsonElement? value)
        {
            if (!value.HasValue || value.Value.ValueKind is JsonValueKind.Null or JsonValueKind.Undefined)
            {
                return "[]";
            }

            if (value.Value.ValueKind != JsonValueKind.Array)
            {
                throw new ArgumentException("history must be an array");
            }

            return value.Value.GetRawText();
        }
    }
}
