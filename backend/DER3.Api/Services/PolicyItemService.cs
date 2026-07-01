using System.Security.Cryptography;
using System.Text.Json;
using DER3.Api.DTOs;
using DER3.Api.Repositories;

namespace DER3.Api.Services
{
    public sealed record PolicyItemWriteResult(bool Success, string? Error = null, Dictionary<string, object?>? Item = null);

    public interface IPolicyItemService
    {
        Task<PolicyItemWriteResult> CreateAsync(CreatePolicyItemRequestDto request, CancellationToken cancellationToken);

        Task<PolicyItemWriteResult> UpdateAsync(string id, UpdatePolicyItemRequestDto request, CancellationToken cancellationToken);

        Task<PolicyItemWriteResult> DeleteAsync(string id, string? deletedBy, CancellationToken cancellationToken);
    }

    public sealed class PolicyItemService : IPolicyItemService
    {
        private readonly IPolicyItemRepository _policyItemRepository;

        public PolicyItemService(IPolicyItemRepository policyItemRepository)
        {
            _policyItemRepository = policyItemRepository;
        }

        public async Task<PolicyItemWriteResult> CreateAsync(CreatePolicyItemRequestDto request, CancellationToken cancellationToken)
        {
            if (HasUnknownFields(request.UnknownFields))
            {
                return new PolicyItemWriteResult(false, "Payload contains unsupported fields");
            }

            if (string.IsNullOrWhiteSpace(request.PolicyId) ||
                string.IsNullOrWhiteSpace(request.NameAr) ||
                string.IsNullOrWhiteSpace(request.NameEn))
            {
                return new PolicyItemWriteResult(false, "policyId, nameAr and nameEn are required");
            }

            var now = DateTime.UtcNow;
            var item = new PolicyItemRecord(
                string.IsNullOrWhiteSpace(request.Id) ? GenerateId() : request.Id.Trim(),
                request.PolicyId.Trim(),
                NormalizeOptionalString(request.ParentId),
                request.Order,
                request.NameAr.Trim(),
                request.NameEn.Trim(),
                NormalizeOptionalString(request.DescriptionAr),
                NormalizeOptionalString(request.DescriptionEn),
                JsonSerializer.Serialize(request.Attachments ?? new List<string>()),
                request.CreatedAt ?? now,
                request.UpdatedAt ?? now);

            var saved = await _policyItemRepository.InsertAsync(item, cancellationToken);
            return new PolicyItemWriteResult(true, Item: saved);
        }

        public async Task<PolicyItemWriteResult> UpdateAsync(string id, UpdatePolicyItemRequestDto request, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(id))
            {
                return new PolicyItemWriteResult(false, "Policy item id is required");
            }

            if (HasUnknownFields(request.UnknownFields))
            {
                return new PolicyItemWriteResult(false, "Payload contains unsupported fields");
            }

            var fields = new Dictionary<string, object?>(StringComparer.Ordinal);
            var trimmedId = id.Trim();

            if (request.Id.HasValue)
            {
                var bodyId = ReadString(request.Id.Value, "id", required: false);
                if (!string.IsNullOrWhiteSpace(bodyId) && !string.Equals(bodyId, trimmedId, StringComparison.Ordinal))
                {
                    return new PolicyItemWriteResult(false, "Route id and body id must match");
                }
            }

            AddStringField(fields, "policyId", request.PolicyId, required: true);
            AddStringField(fields, "parentId", request.ParentId, required: false);
            AddIntField(fields, "order", request.Order);
            AddStringField(fields, "nameAr", request.NameAr, required: true);
            AddStringField(fields, "nameEn", request.NameEn, required: true);
            AddStringField(fields, "descriptionAr", request.DescriptionAr, required: false);
            AddStringField(fields, "descriptionEn", request.DescriptionEn, required: false);
            AddAttachmentsField(fields, request.Attachments);
            AddDateTimeField(fields, "createdAt", request.CreatedAt);
            AddDateTimeField(fields, "updatedAt", request.UpdatedAt);

            if (!fields.ContainsKey("updatedAt"))
            {
                fields["updatedAt"] = DateTime.UtcNow;
            }

            if (fields.Count == 0)
            {
                return new PolicyItemWriteResult(false, "No supported fields were provided");
            }

            var item = await _policyItemRepository.UpdateAsync(trimmedId, fields, cancellationToken);
            return item is null
                ? new PolicyItemWriteResult(false, "Policy item not found")
                : new PolicyItemWriteResult(true, Item: item);
        }

        public async Task<PolicyItemWriteResult> DeleteAsync(string id, string? deletedBy, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(id))
            {
                return new PolicyItemWriteResult(false, "Policy item id is required");
            }

            var deleted = await _policyItemRepository.DeleteAsync(id.Trim(), deletedBy, cancellationToken);
            return deleted
                ? new PolicyItemWriteResult(true)
                : new PolicyItemWriteResult(false, "Policy item not found");
        }

        private static void AddStringField(Dictionary<string, object?> fields, string name, JsonElement? value, bool required)
        {
            if (!value.HasValue)
            {
                return;
            }

            fields[name] = NormalizeOptionalString(ReadString(value.Value, name, required));
        }

        private static void AddIntField(Dictionary<string, object?> fields, string name, JsonElement? value)
        {
            if (!value.HasValue)
            {
                return;
            }

            fields[name] = ReadInt(value.Value, name);
        }

        private static void AddDateTimeField(Dictionary<string, object?> fields, string name, JsonElement? value)
        {
            if (!value.HasValue)
            {
                return;
            }

            fields[name] = ReadDateTime(value.Value, name);
        }

        private static void AddAttachmentsField(Dictionary<string, object?> fields, JsonElement? value)
        {
            if (!value.HasValue)
            {
                return;
            }

            fields["attachments"] = JsonSerializer.Serialize(ReadStringArray(value.Value, "attachments"));
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

        private static int? ReadInt(JsonElement element, string name)
        {
            if (element.ValueKind is JsonValueKind.Null or JsonValueKind.Undefined)
            {
                return null;
            }

            if (element.ValueKind == JsonValueKind.Number && element.TryGetInt32(out var value))
            {
                return value;
            }

            throw new ArgumentException($"{name} must be a number");
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

        private static List<string> ReadStringArray(JsonElement element, string name)
        {
            if (element.ValueKind is JsonValueKind.Null or JsonValueKind.Undefined)
            {
                return new List<string>();
            }

            if (element.ValueKind != JsonValueKind.Array)
            {
                throw new ArgumentException($"{name} must be an array of strings");
            }

            var values = new List<string>();
            foreach (var item in element.EnumerateArray())
            {
                if (item.ValueKind != JsonValueKind.String)
                {
                    throw new ArgumentException($"{name} must be an array of strings");
                }

                var value = item.GetString();
                if (!string.IsNullOrWhiteSpace(value))
                {
                    values.Add(value);
                }
            }

            return values;
        }

        private static bool HasUnknownFields(Dictionary<string, JsonElement>? unknownFields) =>
            unknownFields is { Count: > 0 };

        private static string? NormalizeOptionalString(string? value) =>
            string.IsNullOrWhiteSpace(value) ? null : value.Trim();

        private static string GenerateId() =>
            Convert.ToHexString(RandomNumberGenerator.GetBytes(6)).ToLowerInvariant();
    }
}
