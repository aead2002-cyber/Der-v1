using System.Text.Json;
using DER3.Api.DTOs;
using DER3.Api.Repositories;

namespace DER3.Api.Services
{
    public sealed record IncidentNoteWriteResult(bool Success, string? Error = null, Dictionary<string, object?>? Item = null);

    public interface IIncidentNoteService
    {
        Task<IncidentNoteWriteResult> CreateAsync(CreateIncidentNoteRequestDto request, CancellationToken cancellationToken);
        Task<IncidentNoteWriteResult> UpdateAsync(string id, UpdateIncidentNoteRequestDto request, CancellationToken cancellationToken);
        Task<IncidentNoteWriteResult> DeleteAsync(string id, CancellationToken cancellationToken);
    }

    public sealed class IncidentNoteService : IIncidentNoteService
    {
        private readonly IIncidentNoteRepository _incidentNoteRepository;

        public IncidentNoteService(IIncidentNoteRepository incidentNoteRepository)
        {
            _incidentNoteRepository = incidentNoteRepository;
        }

        public async Task<IncidentNoteWriteResult> CreateAsync(CreateIncidentNoteRequestDto request, CancellationToken cancellationToken)
        {
            if (IncidentService.HasUnknownFields(request.UnknownFields))
            {
                return new IncidentNoteWriteResult(false, "Payload contains unsupported fields");
            }

            if (string.IsNullOrWhiteSpace(request.IncidentId))
            {
                return new IncidentNoteWriteResult(false, "incidentId is required");
            }

            var note = new IncidentNoteRecord(
                string.IsNullOrWhiteSpace(request.Id) ? IncidentService.GenerateId() : request.Id.Trim(),
                request.IncidentId.Trim(),
                IncidentService.NormalizeOptionalString(request.AuthorId),
                IncidentService.NormalizeOptionalString(request.AuthorName),
                IncidentService.NormalizeOptionalString(request.Content),
                request.CreatedAt ?? DateTime.UtcNow,
                JsonSerializer.Serialize(IncidentService.CleanStringArray(request.Attachments)));

            var item = await _incidentNoteRepository.InsertAsync(note, cancellationToken);
            return new IncidentNoteWriteResult(true, Item: item);
        }

        public async Task<IncidentNoteWriteResult> UpdateAsync(string id, UpdateIncidentNoteRequestDto request, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(id))
            {
                return new IncidentNoteWriteResult(false, "Incident note id is required");
            }

            if (IncidentService.HasUnknownFields(request.UnknownFields))
            {
                return new IncidentNoteWriteResult(false, "Payload contains unsupported fields");
            }

            var trimmedId = id.Trim();
            var fields = new Dictionary<string, object?>(StringComparer.Ordinal);

            if (request.Id.HasValue)
            {
                var bodyId = IncidentService.ReadString(request.Id.Value, "id", required: false);
                if (!string.IsNullOrWhiteSpace(bodyId) && !string.Equals(bodyId, trimmedId, StringComparison.Ordinal))
                {
                    return new IncidentNoteWriteResult(false, "Route id and body id must match");
                }
            }

            AddStringField(fields, "incidentId", request.IncidentId, required: true);
            AddStringField(fields, "authorId", request.AuthorId, required: false);
            AddStringField(fields, "authorName", request.AuthorName, required: false);
            AddStringField(fields, "content", request.Content, required: false);
            AddDateField(fields, "createdAt", request.CreatedAt);
            AddStringArrayField(fields, "attachments", request.Attachments);

            var item = await _incidentNoteRepository.UpdateAsync(trimmedId, fields, cancellationToken);
            return item is null
                ? new IncidentNoteWriteResult(false, "Incident note not found")
                : new IncidentNoteWriteResult(true, Item: item);
        }

        public async Task<IncidentNoteWriteResult> DeleteAsync(string id, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(id))
            {
                return new IncidentNoteWriteResult(false, "Incident note id is required");
            }

            var deleted = await _incidentNoteRepository.DeleteAsync(id.Trim(), cancellationToken);
            return deleted
                ? new IncidentNoteWriteResult(true)
                : new IncidentNoteWriteResult(false, "Incident note not found");
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
    }
}
