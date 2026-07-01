using System.Security.Cryptography;
using System.Text.Json;
using DER3.Api.DTOs;
using DER3.Api.Repositories;

namespace DER3.Api.Services
{
    public sealed record PolicyWriteResult(bool Success, string? Error = null, Dictionary<string, object?>? Item = null);

    public interface IPolicyService
    {
        Task<PolicyWriteResult> CreateAsync(CreatePolicyRequestDto request, CancellationToken cancellationToken);

        Task<PolicyWriteResult> UpdateAsync(string id, UpdatePolicyRequestDto request, CancellationToken cancellationToken);

        Task<PolicyWriteResult> DeleteAsync(string id, string? deletedBy, CancellationToken cancellationToken);
    }

    public sealed class PolicyService : IPolicyService
    {
        private const int IdMaxLength = 64;
        private const int NameMaxLength = 255;
        private const int FrameworkIdMaxLength = 20;
        private readonly IPolicyRepository _policyRepository;

        public PolicyService(IPolicyRepository policyRepository)
        {
            _policyRepository = policyRepository;
        }

        public async Task<PolicyWriteResult> CreateAsync(CreatePolicyRequestDto request, CancellationToken cancellationToken)
        {
            if (HasUnknownFields(request.UnknownFields))
            {
                return new PolicyWriteResult(false, "Payload contains unsupported fields");
            }

            if (string.IsNullOrWhiteSpace(request.NameAr) || string.IsNullOrWhiteSpace(request.NameEn))
            {
                return new PolicyWriteResult(false, "nameAr and nameEn are required");
            }

            var now = DateTime.UtcNow;
            var id = string.IsNullOrWhiteSpace(request.Id) ? GenerateId() : request.Id.Trim();
            var frameworkId = NormalizeOptionalString(request.FrameworkId);

            if (!ValidateMaxLength(id, IdMaxLength, "id", out var idError) ||
                !ValidateMaxLength(request.NameAr.Trim(), NameMaxLength, "nameAr", out idError) ||
                !ValidateMaxLength(request.NameEn.Trim(), NameMaxLength, "nameEn", out idError) ||
                !ValidateMaxLength(frameworkId, FrameworkIdMaxLength, "frameworkId", out idError))
            {
                return new PolicyWriteResult(false, idError);
            }

            if (frameworkId is not null && !await _policyRepository.FrameworkExistsAsync(frameworkId, cancellationToken))
            {
                return new PolicyWriteResult(false, "frameworkId must reference an existing Framework");
            }

            var policy = new PolicyRecord(
                id,
                request.NameAr.Trim(),
                request.NameEn.Trim(),
                NormalizeOptionalString(request.DescriptionAr),
                NormalizeOptionalString(request.DescriptionEn),
                frameworkId,
                request.CreatedAt ?? now,
                request.UpdatedAt ?? now);

            var item = await _policyRepository.InsertAsync(policy, cancellationToken);
            return new PolicyWriteResult(true, Item: item);
        }

        public async Task<PolicyWriteResult> UpdateAsync(string id, UpdatePolicyRequestDto request, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(id))
            {
                return new PolicyWriteResult(false, "Policy id is required");
            }

            if (HasUnknownFields(request.UnknownFields))
            {
                return new PolicyWriteResult(false, "Payload contains unsupported fields");
            }

            var fields = new Dictionary<string, object?>(StringComparer.Ordinal);
            var trimmedId = id.Trim();

            if (request.Id.HasValue)
            {
                var bodyId = ReadString(request.Id.Value, "id", required: false);
                if (!string.IsNullOrWhiteSpace(bodyId) && !string.Equals(bodyId, trimmedId, StringComparison.Ordinal))
                {
                    return new PolicyWriteResult(false, "Route id and body id must match");
                }
            }

            AddStringField(fields, "nameAr", request.NameAr, required: true);
            AddStringField(fields, "nameEn", request.NameEn, required: true);
            AddStringField(fields, "descriptionAr", request.DescriptionAr, required: false);
            AddStringField(fields, "descriptionEn", request.DescriptionEn, required: false);
            AddStringField(fields, "frameworkId", request.FrameworkId, required: false);
            AddDateTimeField(fields, "createdAt", request.CreatedAt);
            AddDateTimeField(fields, "updatedAt", request.UpdatedAt);

            if (fields.Count == 0)
            {
                return new PolicyWriteResult(false, "No supported fields were provided");
            }

            if (fields.TryGetValue("nameAr", out var nameAr) &&
                !ValidateMaxLength(nameAr as string, NameMaxLength, "nameAr", out var fieldError))
            {
                return new PolicyWriteResult(false, fieldError);
            }

            if (fields.TryGetValue("nameEn", out var nameEn) &&
                !ValidateMaxLength(nameEn as string, NameMaxLength, "nameEn", out fieldError))
            {
                return new PolicyWriteResult(false, fieldError);
            }

            if (fields.TryGetValue("frameworkId", out var frameworkValue))
            {
                var frameworkId = frameworkValue as string;
                if (!ValidateMaxLength(frameworkId, FrameworkIdMaxLength, "frameworkId", out fieldError))
                {
                    return new PolicyWriteResult(false, fieldError);
                }

                if (frameworkId is not null && !await _policyRepository.FrameworkExistsAsync(frameworkId, cancellationToken))
                {
                    return new PolicyWriteResult(false, "frameworkId must reference an existing Framework");
                }
            }

            if (!fields.ContainsKey("updatedAt"))
            {
                fields["updatedAt"] = DateTime.UtcNow;
            }

            var item = await _policyRepository.UpdateAsync(trimmedId, fields, cancellationToken);
            return item is null
                ? new PolicyWriteResult(false, "Policy not found")
                : new PolicyWriteResult(true, Item: item);
        }

        public async Task<PolicyWriteResult> DeleteAsync(string id, string? deletedBy, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(id))
            {
                return new PolicyWriteResult(false, "Policy id is required");
            }

            var deleted = await _policyRepository.DeleteAsync(id.Trim(), deletedBy, cancellationToken);
            return deleted
                ? new PolicyWriteResult(true)
                : new PolicyWriteResult(false, "Policy not found");
        }

        private static void AddStringField(Dictionary<string, object?> fields, string name, JsonElement? value, bool required)
        {
            if (!value.HasValue)
            {
                return;
            }

            fields[name] = NormalizeOptionalString(ReadString(value.Value, name, required));
        }

        private static void AddDateTimeField(Dictionary<string, object?> fields, string name, JsonElement? value)
        {
            if (!value.HasValue)
            {
                return;
            }

            fields[name] = ReadDateTime(value.Value, name);
        }

        private static string? ReadString(JsonElement element, string name, bool required)
        {
            if (element.ValueKind is JsonValueKind.Null or JsonValueKind.Undefined)
            {
                if (required)
                {
                    throw new ArgumentException($"{name} cannot be empty");
                }

                return null;
            }

            if (element.ValueKind != JsonValueKind.String)
            {
                throw new ArgumentException($"{name} must be a string");
            }

            var value = element.GetString();
            if (required && string.IsNullOrWhiteSpace(value))
            {
                throw new ArgumentException($"{name} cannot be empty");
            }

            return value;
        }

        private static DateTime? ReadDateTime(JsonElement element, string name)
        {
            if (element.ValueKind is JsonValueKind.Null or JsonValueKind.Undefined)
            {
                return null;
            }

            if (element.ValueKind == JsonValueKind.String && DateTime.TryParse(element.GetString(), out var parsed))
            {
                return parsed;
            }

            throw new ArgumentException($"{name} must be a valid date");
        }

        private static bool HasUnknownFields(Dictionary<string, JsonElement>? unknownFields) =>
            unknownFields is { Count: > 0 };

        private static string? NormalizeOptionalString(string? value) =>
            string.IsNullOrWhiteSpace(value) ? null : value.Trim();

        private static bool ValidateMaxLength(string? value, int maxLength, string fieldName, out string? error)
        {
            if (value is not null && value.Length > maxLength)
            {
                error = $"{fieldName} must be {maxLength} characters or fewer";
                return false;
            }

            error = null;
            return true;
        }

        private static string GenerateId() =>
            Convert.ToHexString(RandomNumberGenerator.GetBytes(6)).ToLowerInvariant();
    }
}
