using System.Text.Json;
using DER3.Api.DTOs;
using DER3.Api.Repositories;

namespace DER3.Api.Services
{
    public sealed record RiskWriteResult(bool Success, string? Error = null, Dictionary<string, object?>? Item = null);

    public interface IRiskService
    {
        Task<RiskWriteResult> CreateAsync(CreateRiskRequestDto request, CancellationToken cancellationToken);
        Task<RiskWriteResult> UpdateAsync(string id, UpdateRiskRequestDto request, CancellationToken cancellationToken);
        Task<RiskWriteResult> DeleteAsync(string id, string? deletedBy, CancellationToken cancellationToken);
    }

    public sealed class RiskService : IRiskService
    {
        private readonly IRiskRepository _riskRepository;

        public RiskService(IRiskRepository riskRepository)
        {
            _riskRepository = riskRepository;
        }

        public async Task<RiskWriteResult> CreateAsync(CreateRiskRequestDto request, CancellationToken cancellationToken)
        {
            if (IncidentService.HasUnknownFields(request.UnknownFields))
            {
                return new RiskWriteResult(false, "Payload contains unsupported fields");
            }

            if (string.IsNullOrWhiteSpace(request.NameAr) || string.IsNullOrWhiteSpace(request.NameEn))
            {
                return new RiskWriteResult(false, "nameAr and nameEn are required");
            }

            var now = DateTime.UtcNow;
            var risk = new RiskRecord(
                string.IsNullOrWhiteSpace(request.Id) ? IncidentService.GenerateId() : request.Id.Trim(),
                request.NameAr.Trim(),
                request.NameEn.Trim(),
                IncidentService.NormalizeOptionalString(request.DescriptionAr),
                IncidentService.NormalizeOptionalString(request.DescriptionEn),
                request.Likelihood,
                request.Impact,
                JsonSerializer.Serialize(IncidentService.CleanStringArray(request.ProcedureIds)),
                request.CreatedAt ?? now,
                request.UpdatedAt ?? now);

            var item = await _riskRepository.InsertAsync(risk, cancellationToken);
            return new RiskWriteResult(true, Item: item);
        }

        public async Task<RiskWriteResult> UpdateAsync(string id, UpdateRiskRequestDto request, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(id))
            {
                return new RiskWriteResult(false, "Risk id is required");
            }

            if (IncidentService.HasUnknownFields(request.UnknownFields))
            {
                return new RiskWriteResult(false, "Payload contains unsupported fields");
            }

            var trimmedId = id.Trim();
            var fields = new Dictionary<string, object?>(StringComparer.Ordinal);

            if (request.Id.HasValue)
            {
                var bodyId = IncidentService.ReadString(request.Id.Value, "id", required: false);
                if (!string.IsNullOrWhiteSpace(bodyId) && !string.Equals(bodyId, trimmedId, StringComparison.Ordinal))
                {
                    return new RiskWriteResult(false, "Route id and body id must match");
                }
            }

            AddStringField(fields, "nameAr", request.NameAr, required: true);
            AddStringField(fields, "nameEn", request.NameEn, required: true);
            AddStringField(fields, "descriptionAr", request.DescriptionAr, required: false);
            AddStringField(fields, "descriptionEn", request.DescriptionEn, required: false);
            AddIntField(fields, "likelihood", request.Likelihood);
            AddIntField(fields, "impact", request.Impact);
            AddStringArrayField(fields, "procedureIds", request.ProcedureIds);
            AddDateField(fields, "createdAt", request.CreatedAt);
            AddDateField(fields, "updatedAt", request.UpdatedAt);

            if (!fields.ContainsKey("updatedAt"))
            {
                fields["updatedAt"] = DateTime.UtcNow;
            }

            var item = await _riskRepository.UpdateAsync(trimmedId, fields, cancellationToken);
            return item is null
                ? new RiskWriteResult(false, "Risk not found")
                : new RiskWriteResult(true, Item: item);
        }

        public async Task<RiskWriteResult> DeleteAsync(string id, string? deletedBy, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(id))
            {
                return new RiskWriteResult(false, "Risk id is required");
            }

            var deleted = await _riskRepository.DeleteAsync(id.Trim(), deletedBy, cancellationToken);
            return deleted ? new RiskWriteResult(true) : new RiskWriteResult(false, "Risk not found");
        }

        private static void AddStringField(Dictionary<string, object?> fields, string name, JsonElement? value, bool required)
        {
            if (value.HasValue)
            {
                fields[name] = IncidentService.NormalizeOptionalString(IncidentService.ReadString(value.Value, name, required));
            }
        }

        private static void AddIntField(Dictionary<string, object?> fields, string name, JsonElement? value)
        {
            if (value.HasValue)
            {
                fields[name] = IncidentService.ReadInt(value.Value, name);
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
