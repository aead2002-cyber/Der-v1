using System.Text.Json;
using DER3.Api.DTOs;
using DER3.Api.Repositories;

namespace DER3.Api.Services
{
    public sealed record StandardClassificationWriteResult(bool Success, string? Error = null, Dictionary<string, object?>? Item = null);

    public interface IStandardClassificationService
    {
        Task<StandardClassificationWriteResult> CreateAsync(CreateStandardClassificationRequestDto request, CancellationToken cancellationToken);
        Task<StandardClassificationWriteResult> UpdateAsync(string id, UpdateStandardClassificationRequestDto request, CancellationToken cancellationToken);
        Task<StandardClassificationWriteResult> DeleteAsync(string id, CancellationToken cancellationToken);
    }

    public sealed class StandardClassificationService : IStandardClassificationService
    {
        private readonly IStandardClassificationRepository _standardClassificationRepository;

        public StandardClassificationService(IStandardClassificationRepository standardClassificationRepository)
        {
            _standardClassificationRepository = standardClassificationRepository;
        }

        public async Task<StandardClassificationWriteResult> CreateAsync(CreateStandardClassificationRequestDto request, CancellationToken cancellationToken)
        {
            if (IncidentService.HasUnknownFields(request.UnknownFields))
            {
                return new StandardClassificationWriteResult(false, "Payload contains unsupported fields");
            }

            if (string.IsNullOrWhiteSpace(request.NameAr) || string.IsNullOrWhiteSpace(request.NameEn))
            {
                return new StandardClassificationWriteResult(false, "nameAr and nameEn are required");
            }

            var now = DateTime.UtcNow;
            var standardClassification = new StandardClassificationRecord(
                string.IsNullOrWhiteSpace(request.Id) ? IncidentService.GenerateId() : request.Id.Trim(),
                request.NameAr.Trim(),
                request.NameEn.Trim(),
                request.CreatedAt ?? now,
                request.UpdatedAt ?? now);

            var item = await _standardClassificationRepository.InsertAsync(standardClassification, cancellationToken);
            return new StandardClassificationWriteResult(true, Item: item);
        }

        public async Task<StandardClassificationWriteResult> UpdateAsync(string id, UpdateStandardClassificationRequestDto request, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(id))
            {
                return new StandardClassificationWriteResult(false, "StandardClassification id is required");
            }

            if (IncidentService.HasUnknownFields(request.UnknownFields))
            {
                return new StandardClassificationWriteResult(false, "Payload contains unsupported fields");
            }

            var trimmedId = id.Trim();
            var fields = new Dictionary<string, object?>(StringComparer.Ordinal);

            if (request.Id.HasValue)
            {
                var bodyId = IncidentService.ReadString(request.Id.Value, "id", required: false);
                if (!string.IsNullOrWhiteSpace(bodyId) && !string.Equals(bodyId, trimmedId, StringComparison.Ordinal))
                {
                    return new StandardClassificationWriteResult(false, "Route id and body id must match");
                }
            }

            AddStringField(fields, "nameAr", request.NameAr, required: true);
            AddStringField(fields, "nameEn", request.NameEn, required: true);
            AddDateField(fields, "createdAt", request.CreatedAt);
            AddDateField(fields, "updatedAt", request.UpdatedAt);

            if (!fields.ContainsKey("updatedAt"))
            {
                fields["updatedAt"] = DateTime.UtcNow;
            }

            var item = await _standardClassificationRepository.UpdateAsync(trimmedId, fields, cancellationToken);
            return item is null
                ? new StandardClassificationWriteResult(false, "StandardClassification not found")
                : new StandardClassificationWriteResult(true, Item: item);
        }

        public async Task<StandardClassificationWriteResult> DeleteAsync(string id, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(id))
            {
                return new StandardClassificationWriteResult(false, "StandardClassification id is required");
            }

            var deleted = await _standardClassificationRepository.DeleteAsync(id.Trim(), cancellationToken);
            return deleted
                ? new StandardClassificationWriteResult(true)
                : new StandardClassificationWriteResult(false, "StandardClassification not found");
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
