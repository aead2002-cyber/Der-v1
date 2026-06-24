using System.Text.Json;
using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using DER3.Api.DTOs;
using DER3.Api.Repositories;

namespace DER3.Api.Services
{
    public sealed record FrameworkWriteResult(bool Success, string? Error = null, Dictionary<string, object?>? Item = null);

    public interface IFrameworkService
    {
        Task<FrameworkWriteResult> CreateAsync(CreateFrameworkRequestDto request, ClaimsPrincipal? currentUser, HttpContext? httpContext, CancellationToken cancellationToken);
        Task<FrameworkWriteResult> UpdateAsync(string id, UpdateFrameworkRequestDto request, ClaimsPrincipal? currentUser, HttpContext? httpContext, CancellationToken cancellationToken);
        Task<FrameworkWriteResult> DeleteAsync(string id, string? deletedBy, ClaimsPrincipal? currentUser, HttpContext? httpContext, CancellationToken cancellationToken);
    }

    public sealed class FrameworkService : IFrameworkService
    {
        private readonly IFrameworkRepository _frameworkRepository;
        private readonly IAuditLogger _auditLogger;

        public FrameworkService(IFrameworkRepository frameworkRepository, IAuditLogger auditLogger)
        {
            _frameworkRepository = frameworkRepository;
            _auditLogger = auditLogger;
        }

        public async Task<FrameworkWriteResult> CreateAsync(CreateFrameworkRequestDto request, ClaimsPrincipal? currentUser, HttpContext? httpContext, CancellationToken cancellationToken)
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
            await _auditLogger.LogAsync("create", "Framework", framework.Id, null, item, null, currentUser, httpContext, cancellationToken);
            return new FrameworkWriteResult(true, Item: item);
        }

        public async Task<FrameworkWriteResult> UpdateAsync(string id, UpdateFrameworkRequestDto request, ClaimsPrincipal? currentUser, HttpContext? httpContext, CancellationToken cancellationToken)
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

            var before = await _frameworkRepository.GetByIdAsync(trimmedId, cancellationToken);
            if (before is null)
            {
                return new FrameworkWriteResult(false, "Framework not found");
            }

            var item = await _frameworkRepository.UpdateAsync(trimmedId, fields, cancellationToken);
            if (item is null)
            {
                return new FrameworkWriteResult(false, "Framework not found");
            }

            await _auditLogger.LogAsync("update", "Framework", trimmedId, before, item, null, currentUser, httpContext, cancellationToken);
            return new FrameworkWriteResult(true, Item: item);
        }

        public async Task<FrameworkWriteResult> DeleteAsync(string id, string? deletedBy, ClaimsPrincipal? currentUser, HttpContext? httpContext, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(id))
            {
                return new FrameworkWriteResult(false, "Framework id is required");
            }

            var trimmedId = id.Trim();
            var before = await _frameworkRepository.GetByIdAsync(trimmedId, cancellationToken);
            if (before is null)
            {
                return new FrameworkWriteResult(false, "Framework not found");
            }

            var deletedAt = DateTime.UtcNow;
            var deleted = await _frameworkRepository.DeleteAsync(trimmedId, deletedBy, deletedAt, cancellationToken);
            if (!deleted)
            {
                return new FrameworkWriteResult(false, "Framework not found");
            }

            var after = new Dictionary<string, object?>(before, StringComparer.Ordinal)
            {
                ["IsDeleted"] = true,
                ["DeletedAt"] = deletedAt,
                ["DeletedBy"] = deletedBy
            };

            await _auditLogger.LogAsync("delete", "Framework", trimmedId, before, after, null, currentUser, httpContext, cancellationToken);
            return new FrameworkWriteResult(true);
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
