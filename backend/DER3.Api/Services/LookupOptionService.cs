using System.Text.Json;
using DER3.Api.DTOs;
using DER3.Api.Repositories;

namespace DER3.Api.Services
{
    public sealed record LookupOptionWriteResult(bool Success, string? Error = null, Dictionary<string, object?>? Item = null);

    public interface ILookupOptionService
    {
        Task<IReadOnlyList<Dictionary<string, object?>>> GetActivePublicAsync(string? category, CancellationToken cancellationToken);
        Task<LookupOptionWriteResult> CreateAsync(CreateLookupOptionRequestDto request, CancellationToken cancellationToken);
        Task<LookupOptionWriteResult> UpdateAsync(string id, UpdateLookupOptionRequestDto request, CancellationToken cancellationToken);
        Task<LookupOptionWriteResult> DeleteAsync(string id, string? deletedBy, CancellationToken cancellationToken);
    }

    public sealed class LookupOptionService : ILookupOptionService
    {
        private readonly ILookupOptionRepository _lookupOptionRepository;

        public LookupOptionService(ILookupOptionRepository lookupOptionRepository)
        {
            _lookupOptionRepository = lookupOptionRepository;
        }

        public Task<IReadOnlyList<Dictionary<string, object?>>> GetActivePublicAsync(string? category, CancellationToken cancellationToken) =>
            _lookupOptionRepository.GetActivePublicAsync(category, cancellationToken);

        public async Task<LookupOptionWriteResult> CreateAsync(CreateLookupOptionRequestDto request, CancellationToken cancellationToken)
        {
            if (IncidentService.HasUnknownFields(request.UnknownFields))
            {
                return new LookupOptionWriteResult(false, "Payload contains unsupported fields");
            }

            if (string.IsNullOrWhiteSpace(request.Category) ||
                string.IsNullOrWhiteSpace(request.Value) ||
                string.IsNullOrWhiteSpace(request.LabelAr) ||
                string.IsNullOrWhiteSpace(request.LabelEn))
            {
                return new LookupOptionWriteResult(false, "category, value, labelAr and labelEn are required");
            }

            var lookupOption = new LookupOptionRecord(
                string.IsNullOrWhiteSpace(request.Id) ? IncidentService.GenerateId() : request.Id.Trim(),
                request.Category.Trim(),
                request.Value.Trim(),
                request.LabelAr.Trim(),
                request.LabelEn.Trim(),
                request.IsActive ?? true,
                IncidentService.NormalizeOptionalString(request.DescriptionAr),
                IncidentService.NormalizeOptionalString(request.DescriptionEn));

            var item = await _lookupOptionRepository.InsertAsync(lookupOption, cancellationToken);
            return new LookupOptionWriteResult(true, Item: item);
        }

        public async Task<LookupOptionWriteResult> UpdateAsync(string id, UpdateLookupOptionRequestDto request, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(id))
            {
                return new LookupOptionWriteResult(false, "LookupOption id is required");
            }

            if (IncidentService.HasUnknownFields(request.UnknownFields))
            {
                return new LookupOptionWriteResult(false, "Payload contains unsupported fields");
            }

            var trimmedId = id.Trim();
            var fields = new Dictionary<string, object?>(StringComparer.Ordinal);

            if (request.Id.HasValue)
            {
                var bodyId = IncidentService.ReadString(request.Id.Value, "id", required: false);
                if (!string.IsNullOrWhiteSpace(bodyId) && !string.Equals(bodyId, trimmedId, StringComparison.Ordinal))
                {
                    return new LookupOptionWriteResult(false, "Route id and body id must match");
                }
            }

            AddStringField(fields, "category", request.Category, required: true);
            AddStringField(fields, "value", request.Value, required: true);
            AddStringField(fields, "labelAr", request.LabelAr, required: true);
            AddStringField(fields, "labelEn", request.LabelEn, required: true);
            AddBoolField(fields, "isActive", request.IsActive);
            AddStringField(fields, "descriptionAr", request.DescriptionAr, required: false);
            AddStringField(fields, "descriptionEn", request.DescriptionEn, required: false);

            if (fields.Count == 0)
            {
                return new LookupOptionWriteResult(false, "No supported fields were provided");
            }

            var item = await _lookupOptionRepository.UpdateAsync(trimmedId, fields, cancellationToken);
            return item is null
                ? new LookupOptionWriteResult(false, "LookupOption not found")
                : new LookupOptionWriteResult(true, Item: item);
        }

        public async Task<LookupOptionWriteResult> DeleteAsync(string id, string? deletedBy, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(id))
            {
                return new LookupOptionWriteResult(false, "LookupOption id is required");
            }

            var deleted = await _lookupOptionRepository.DeleteAsync(id.Trim(), deletedBy, cancellationToken);
            return deleted
                ? new LookupOptionWriteResult(true)
                : new LookupOptionWriteResult(false, "LookupOption not found");
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
                fields[name] = ReadBool(value.Value, name);
            }
        }

        internal static bool? ReadBool(JsonElement element, string name)
        {
            if (element.ValueKind is JsonValueKind.Null or JsonValueKind.Undefined)
            {
                return null;
            }

            if (element.ValueKind is JsonValueKind.True or JsonValueKind.False)
            {
                return element.GetBoolean();
            }

            throw new ArgumentException($"{name} must be a boolean");
        }
    }
}
