using System.Text.Json;
using DER3.Api.DTOs;
using DER3.Api.Repositories;

namespace DER3.Api.Services
{
    public sealed record PermissionGroupWriteResult(bool Success, string? Error = null, Dictionary<string, object?>? Item = null);

    public interface IPermissionGroupService
    {
        Task<IReadOnlyList<Dictionary<string, object?>>> GetAllAsync(CancellationToken cancellationToken);
        Task<PermissionGroupWriteResult> CreateAsync(CreatePermissionGroupRequestDto request, CancellationToken cancellationToken);
        Task<PermissionGroupWriteResult> UpdateAsync(string id, UpdatePermissionGroupRequestDto request, CancellationToken cancellationToken);
        Task<PermissionGroupWriteResult> DeleteAsync(string id, string? deletedBy, CancellationToken cancellationToken);
    }

    public sealed class PermissionGroupService : IPermissionGroupService
    {
        private readonly IPermissionGroupRepository _permissionGroupRepository;

        public PermissionGroupService(IPermissionGroupRepository permissionGroupRepository)
        {
            _permissionGroupRepository = permissionGroupRepository;
        }

        public Task<IReadOnlyList<Dictionary<string, object?>>> GetAllAsync(CancellationToken cancellationToken) =>
            _permissionGroupRepository.GetAllAsync(cancellationToken);

        public async Task<PermissionGroupWriteResult> CreateAsync(CreatePermissionGroupRequestDto request, CancellationToken cancellationToken)
        {
            if (IncidentService.HasUnknownFields(request.UnknownFields))
            {
                return new PermissionGroupWriteResult(false, "Payload contains unsupported fields");
            }

            if (string.IsNullOrWhiteSpace(request.NameAr) || string.IsNullOrWhiteSpace(request.NameEn))
            {
                return new PermissionGroupWriteResult(false, "nameAr and nameEn are required");
            }

            var now = DateTime.UtcNow.ToString("O");
            var permissionGroup = new PermissionGroupRecord(
                string.IsNullOrWhiteSpace(request.Id) ? IncidentService.GenerateId() : request.Id.Trim(),
                request.NameAr.Trim(),
                request.NameEn.Trim(),
                IncidentService.NormalizeOptionalString(request.DescriptionAr),
                IncidentService.NormalizeOptionalString(request.DescriptionEn),
                request.IsSystem ?? false,
                JsonSerializer.Serialize(IncidentService.CleanStringArray(request.Permissions)),
                IncidentService.NormalizeOptionalString(request.CreatedAt) ?? now,
                IncidentService.NormalizeOptionalString(request.UpdatedAt) ?? now);

            var item = await _permissionGroupRepository.InsertAsync(permissionGroup, cancellationToken);
            return new PermissionGroupWriteResult(true, Item: item);
        }

        public async Task<PermissionGroupWriteResult> UpdateAsync(string id, UpdatePermissionGroupRequestDto request, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(id))
            {
                return new PermissionGroupWriteResult(false, "PermissionGroup id is required");
            }

            if (IncidentService.HasUnknownFields(request.UnknownFields))
            {
                return new PermissionGroupWriteResult(false, "Payload contains unsupported fields");
            }

            var trimmedId = id.Trim();
            var fields = new Dictionary<string, object?>(StringComparer.Ordinal);

            if (request.Id.HasValue)
            {
                var bodyId = IncidentService.ReadString(request.Id.Value, "id", required: false);
                if (!string.IsNullOrWhiteSpace(bodyId) && !string.Equals(bodyId, trimmedId, StringComparison.Ordinal))
                {
                    return new PermissionGroupWriteResult(false, "Route id and body id must match");
                }
            }

            AddStringField(fields, "nameAr", request.NameAr, required: true);
            AddStringField(fields, "nameEn", request.NameEn, required: true);
            AddStringField(fields, "descriptionAr", request.DescriptionAr, required: false);
            AddStringField(fields, "descriptionEn", request.DescriptionEn, required: false);
            AddBoolField(fields, "isSystem", request.IsSystem);
            AddStringArrayField(fields, "permissions", request.Permissions);
            AddStringField(fields, "createdAt", request.CreatedAt, required: false);
            AddStringField(fields, "updatedAt", request.UpdatedAt, required: false);

            if (!fields.ContainsKey("updatedAt"))
            {
                fields["updatedAt"] = DateTime.UtcNow.ToString("O");
            }

            var item = await _permissionGroupRepository.UpdateAsync(trimmedId, fields, cancellationToken);
            return item is null
                ? new PermissionGroupWriteResult(false, "PermissionGroup not found")
                : new PermissionGroupWriteResult(true, Item: item);
        }

        public async Task<PermissionGroupWriteResult> DeleteAsync(string id, string? deletedBy, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(id))
            {
                return new PermissionGroupWriteResult(false, "PermissionGroup id is required");
            }

            var deleted = await _permissionGroupRepository.DeleteAsync(id.Trim(), deletedBy, cancellationToken);
            return deleted
                ? new PermissionGroupWriteResult(true)
                : new PermissionGroupWriteResult(false, "PermissionGroup not found");
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

        private static void AddStringArrayField(Dictionary<string, object?> fields, string name, JsonElement? value)
        {
            if (value.HasValue)
            {
                fields[name] = JsonSerializer.Serialize(IncidentService.ReadStringArray(value.Value, name));
            }
        }
    }
}
