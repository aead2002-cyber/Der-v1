using System.Security.Cryptography;
using System.Text.Json;
using DER3.Api.DTOs;
using DER3.Api.Repositories;

namespace DER3.Api.Services
{
    public sealed record StandardWriteResult(bool Success, string? Error = null, Dictionary<string, object?>? Item = null);

    public interface IStandardService
    {
        Task<StandardWriteResult> CreateAsync(CreateStandardRequestDto request, CancellationToken cancellationToken);
        Task<StandardWriteResult> UpdateAsync(string id, UpdateStandardRequestDto request, CancellationToken cancellationToken);
        Task<StandardWriteResult> DeleteAsync(string id, CancellationToken cancellationToken);
    }

    public sealed class StandardService : IStandardService
    {
        private readonly IStandardRepository _standardRepository;

        public StandardService(IStandardRepository standardRepository)
        {
            _standardRepository = standardRepository;
        }

        public async Task<StandardWriteResult> CreateAsync(CreateStandardRequestDto request, CancellationToken cancellationToken)
        {
            if (HasUnknownFields(request.UnknownFields))
            {
                return new StandardWriteResult(false, "Payload contains unsupported fields");
            }

            if (string.IsNullOrWhiteSpace(request.PolicyId) ||
                string.IsNullOrWhiteSpace(request.NameAr) ||
                string.IsNullOrWhiteSpace(request.NameEn))
            {
                return new StandardWriteResult(false, "policyId, nameAr and nameEn are required");
            }

            var now = DateTime.UtcNow;
            var standard = new StandardRecord(
                string.IsNullOrWhiteSpace(request.Id) ? GenerateId() : request.Id.Trim(),
                request.PolicyId.Trim(),
                NormalizeOptionalString(request.PolicyItemId),
                request.PolicyItemIds is null ? null : JsonSerializer.Serialize(CleanStringArray(request.PolicyItemIds)),
                request.NameAr.Trim(),
                request.NameEn.Trim(),
                NormalizeOptionalString(request.DescriptionAr),
                NormalizeOptionalString(request.DescriptionEn),
                NormalizeOptionalString(request.PotentialRisksAr),
                NormalizeOptionalString(request.PotentialRisksEn),
                JsonSerializer.Serialize(CleanStringArray(request.Classifications)),
                JsonSerializer.Serialize(CleanStringArray(request.Attachments)),
                request.CreatedAt ?? now,
                request.UpdatedAt ?? now);

            var item = await _standardRepository.InsertAsync(standard, cancellationToken);
            return new StandardWriteResult(true, Item: item);
        }

        public async Task<StandardWriteResult> UpdateAsync(string id, UpdateStandardRequestDto request, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(id))
            {
                return new StandardWriteResult(false, "Standard id is required");
            }

            if (HasUnknownFields(request.UnknownFields))
            {
                return new StandardWriteResult(false, "Payload contains unsupported fields");
            }

            var trimmedId = id.Trim();
            var fields = new Dictionary<string, object?>(StringComparer.Ordinal);

            if (request.Id.HasValue)
            {
                var bodyId = ReadString(request.Id.Value, "id", required: false);
                if (!string.IsNullOrWhiteSpace(bodyId) && !string.Equals(bodyId, trimmedId, StringComparison.Ordinal))
                {
                    return new StandardWriteResult(false, "Route id and body id must match");
                }
            }

            AddStringField(fields, "policyId", request.PolicyId, required: true);
            AddStringField(fields, "policyItemId", request.PolicyItemId, required: false);
            AddStringArrayField(fields, "policyItemIds", request.PolicyItemIds);
            AddStringField(fields, "nameAr", request.NameAr, required: true);
            AddStringField(fields, "nameEn", request.NameEn, required: true);
            AddStringField(fields, "descriptionAr", request.DescriptionAr, required: false);
            AddStringField(fields, "descriptionEn", request.DescriptionEn, required: false);
            AddStringField(fields, "potentialRisksAr", request.PotentialRisksAr, required: false);
            AddStringField(fields, "potentialRisksEn", request.PotentialRisksEn, required: false);
            AddStringArrayField(fields, "classifications", request.Classifications);
            AddStringArrayField(fields, "attachments", request.Attachments);
            AddDateTimeField(fields, "createdAt", request.CreatedAt);
            AddDateTimeField(fields, "updatedAt", request.UpdatedAt);

            if (!fields.ContainsKey("updatedAt"))
            {
                fields["updatedAt"] = DateTime.UtcNow;
            }

            var item = await _standardRepository.UpdateAsync(trimmedId, fields, cancellationToken);
            return item is null
                ? new StandardWriteResult(false, "Standard not found")
                : new StandardWriteResult(true, Item: item);
        }

        public async Task<StandardWriteResult> DeleteAsync(string id, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(id))
            {
                return new StandardWriteResult(false, "Standard id is required");
            }

            var deleted = await _standardRepository.DeleteAsync(id.Trim(), cancellationToken);
            return deleted
                ? new StandardWriteResult(true)
                : new StandardWriteResult(false, "Standard not found");
        }

        private static void AddStringField(Dictionary<string, object?> fields, string name, JsonElement? value, bool required)
        {
            if (value.HasValue)
            {
                fields[name] = NormalizeOptionalString(ReadString(value.Value, name, required));
            }
        }

        private static void AddStringArrayField(Dictionary<string, object?> fields, string name, JsonElement? value)
        {
            if (value.HasValue)
            {
                fields[name] = JsonSerializer.Serialize(ReadStringArray(value.Value, name));
            }
        }

        private static void AddDateTimeField(Dictionary<string, object?> fields, string name, JsonElement? value)
        {
            if (value.HasValue)
            {
                fields[name] = ReadDateTime(value.Value, name);
            }
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

        private static List<string> CleanStringArray(IEnumerable<string>? values) =>
            values?.Where(value => !string.IsNullOrWhiteSpace(value)).Select(value => value.Trim()).ToList() ?? new List<string>();

        private static bool HasUnknownFields(Dictionary<string, JsonElement>? unknownFields) =>
            unknownFields is { Count: > 0 };

        private static string? NormalizeOptionalString(string? value) =>
            string.IsNullOrWhiteSpace(value) ? null : value.Trim();

        private static string GenerateId() =>
            Convert.ToHexString(RandomNumberGenerator.GetBytes(6)).ToLowerInvariant();
    }
}
