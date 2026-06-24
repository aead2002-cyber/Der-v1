using System.Text.Json;
using DER3.Api.DTOs;
using DER3.Api.Repositories;

namespace DER3.Api.Services
{
    public sealed record FrameworkWriteResult(bool Success, string? Error = null, Dictionary<string, object?>? Item = null);

    public interface IFrameworkService
    {
        Task<FrameworkWriteResult> CreateAsync(CreateFrameworkRequestDto request, CancellationToken cancellationToken);
        Task<FrameworkWriteResult> UpdateAsync(string id, UpdateFrameworkRequestDto request, CancellationToken cancellationToken);
        Task<FrameworkWriteResult> DeleteAsync(string id, string? deletedBy, CancellationToken cancellationToken);
    }

    public sealed class FrameworkService : IFrameworkService
    {
        private readonly IFrameworkRepository _frameworkRepository;

        public FrameworkService(IFrameworkRepository frameworkRepository)
        {
            _frameworkRepository = frameworkRepository;
        }

        public async Task<FrameworkWriteResult> CreateAsync(CreateFrameworkRequestDto request, CancellationToken cancellationToken)
        {
            if (IncidentService.HasUnknownFields(request.UnknownFields))
            {
                return new FrameworkWriteResult(false, "Payload contains unsupported fields");
            }

            if (string.IsNullOrWhiteSpace(request.NameAr) || string.IsNullOrWhiteSpace(request.NameEn))
            {
                return new FrameworkWriteResult(false, "nameAr and nameEn are required");
            }

            var now = DateTime.UtcNow;
            var framework = new FrameworkRecord(
                string.IsNullOrWhiteSpace(request.Id) ? IncidentService.GenerateId() : request.Id.Trim(),
                request.NameAr.Trim(),
                request.NameEn.Trim(),
                IncidentService.NormalizeOptionalString(request.DescriptionAr),
                IncidentService.NormalizeOptionalString(request.DescriptionEn),
                request.CreatedAt ?? now,
                request.UpdatedAt ?? now);

            var item = await _frameworkRepository.InsertAsync(framework, cancellationToken);
            return new FrameworkWriteResult(true, Item: item);
        }

        public async Task<FrameworkWriteResult> UpdateAsync(string id, UpdateFrameworkRequestDto request, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(id))
            {
                return new FrameworkWriteResult(false, "Framework id is required");
            }

            if (IncidentService.HasUnknownFields(request.UnknownFields))
            {
                return new FrameworkWriteResult(false, "Payload contains unsupported fields");
            }

            var trimmedId = id.Trim();
            var fields = new Dictionary<string, object?>(StringComparer.Ordinal);

            if (request.Id.HasValue)
            {
                var bodyId = IncidentService.ReadString(request.Id.Value, "id", required: false);
                if (!string.IsNullOrWhiteSpace(bodyId) && !string.Equals(bodyId, trimmedId, StringComparison.Ordinal))
                {
                    return new FrameworkWriteResult(false, "Route id and body id must match");
                }
            }

            AddStringField(fields, "nameAr", request.NameAr, required: true);
            AddStringField(fields, "nameEn", request.NameEn, required: true);
            AddStringField(fields, "descriptionAr", request.DescriptionAr, required: false);
            AddStringField(fields, "descriptionEn", request.DescriptionEn, required: false);
            AddDateField(fields, "createdAt", request.CreatedAt);
            AddDateField(fields, "updatedAt", request.UpdatedAt);

            if (!fields.ContainsKey("updatedAt"))
            {
                fields["updatedAt"] = DateTime.UtcNow;
            }

            var item = await _frameworkRepository.UpdateAsync(trimmedId, fields, cancellationToken);
            return item is null
                ? new FrameworkWriteResult(false, "Framework not found")
                : new FrameworkWriteResult(true, Item: item);
        }

        public async Task<FrameworkWriteResult> DeleteAsync(string id, string? deletedBy, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(id))
            {
                return new FrameworkWriteResult(false, "Framework id is required");
            }

            var deleted = await _frameworkRepository.DeleteAsync(id.Trim(), deletedBy, cancellationToken);
            return deleted ? new FrameworkWriteResult(true) : new FrameworkWriteResult(false, "Framework not found");
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
