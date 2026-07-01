using System.Text.Json;
using DER3.Api.DTOs;
using DER3.Api.Repositories;

namespace DER3.Api.Services
{
    public sealed record EvidenceWriteResult(bool Success, string? Error = null, Dictionary<string, object?>? Item = null);

    public interface IEvidenceService
    {
        Task<EvidenceWriteResult> CreateAsync(CreateEvidenceRequestDto request, CancellationToken cancellationToken);
        Task<EvidenceWriteResult> UpdateAsync(string id, UpdateEvidenceRequestDto request, CancellationToken cancellationToken);
        Task<EvidenceWriteResult> DeleteAsync(string id, string? deletedBy, CancellationToken cancellationToken);
    }

    public sealed class EvidenceService : IEvidenceService
    {
        private readonly IEvidenceRepository _evidenceRepository;

        public EvidenceService(IEvidenceRepository evidenceRepository)
        {
            _evidenceRepository = evidenceRepository;
        }

        public async Task<EvidenceWriteResult> CreateAsync(CreateEvidenceRequestDto request, CancellationToken cancellationToken)
        {
            if (IncidentService.HasUnknownFields(request.UnknownFields))
            {
                return new EvidenceWriteResult(false, "Payload contains unsupported fields");
            }

            if (string.IsNullOrWhiteSpace(request.ProcedureId))
            {
                return new EvidenceWriteResult(false, "procedureId is required");
            }

            var evidence = new EvidenceRecord(
                string.IsNullOrWhiteSpace(request.Id) ? IncidentService.GenerateId() : request.Id.Trim(),
                request.ProcedureId.Trim(),
                IncidentService.NormalizeOptionalString(request.Name),
                IncidentService.NormalizeOptionalString(request.Url),
                IncidentService.NormalizeOptionalString(request.Type),
                IncidentService.NormalizeOptionalString(request.UploadedBy),
                request.UploadedAt ?? DateTime.UtcNow,
                IncidentService.NormalizeOptionalString(request.Description));

            var item = await _evidenceRepository.InsertAsync(evidence, cancellationToken);
            return new EvidenceWriteResult(true, Item: item);
        }

        public async Task<EvidenceWriteResult> UpdateAsync(string id, UpdateEvidenceRequestDto request, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(id))
            {
                return new EvidenceWriteResult(false, "Evidence id is required");
            }

            if (IncidentService.HasUnknownFields(request.UnknownFields))
            {
                return new EvidenceWriteResult(false, "Payload contains unsupported fields");
            }

            var trimmedId = id.Trim();
            var fields = new Dictionary<string, object?>(StringComparer.Ordinal);

            if (request.Id.HasValue)
            {
                var bodyId = IncidentService.ReadString(request.Id.Value, "id", required: false);
                if (!string.IsNullOrWhiteSpace(bodyId) && !string.Equals(bodyId, trimmedId, StringComparison.Ordinal))
                {
                    return new EvidenceWriteResult(false, "Route id and body id must match");
                }
            }

            AddStringField(fields, "procedureId", request.ProcedureId, required: true);
            AddStringField(fields, "name", request.Name, required: false);
            AddStringField(fields, "url", request.Url, required: false);
            AddStringField(fields, "type", request.Type, required: false);
            AddStringField(fields, "uploadedBy", request.UploadedBy, required: false);
            AddDateField(fields, "uploadedAt", request.UploadedAt);
            AddStringField(fields, "description", request.Description, required: false);

            if (fields.Count == 0)
            {
                return new EvidenceWriteResult(false, "No supported fields were provided");
            }

            var item = await _evidenceRepository.UpdateAsync(trimmedId, fields, cancellationToken);
            return item is null
                ? new EvidenceWriteResult(false, "Evidence not found")
                : new EvidenceWriteResult(true, Item: item);
        }

        public async Task<EvidenceWriteResult> DeleteAsync(string id, string? deletedBy, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(id))
            {
                return new EvidenceWriteResult(false, "Evidence id is required");
            }

            var deleted = await _evidenceRepository.DeleteAsync(id.Trim(), deletedBy, cancellationToken);
            return deleted ? new EvidenceWriteResult(true) : new EvidenceWriteResult(false, "Evidence not found");
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
