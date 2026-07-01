using System.Security.Cryptography;
using System.Text.Json;
using DER3.Api.DTOs;
using DER3.Api.Repositories;

namespace DER3.Api.Services
{
    public sealed record ProcedureWriteResult(bool Success, string? Error = null, Dictionary<string, object?>? Item = null);

    public interface IProcedureService
    {
        Task<ProcedureWriteResult> CreateAsync(CreateProcedureRequestDto request, CancellationToken cancellationToken);
        Task<ProcedureWriteResult> UpdateAsync(string id, UpdateProcedureRequestDto request, CancellationToken cancellationToken);
        Task<ProcedureWriteResult> DeleteAsync(string id, string? deletedBy, CancellationToken cancellationToken);
    }

    public sealed class ProcedureService : IProcedureService
    {
        private readonly IProcedureRepository _procedureRepository;

        public ProcedureService(IProcedureRepository procedureRepository)
        {
            _procedureRepository = procedureRepository;
        }

        public async Task<ProcedureWriteResult> CreateAsync(CreateProcedureRequestDto request, CancellationToken cancellationToken)
        {
            if (HasUnknownFields(request.UnknownFields))
            {
                return new ProcedureWriteResult(false, "Payload contains unsupported fields");
            }

            if (string.IsNullOrWhiteSpace(request.StandardId) ||
                string.IsNullOrWhiteSpace(request.PolicyId) ||
                string.IsNullOrWhiteSpace(request.NameAr) ||
                string.IsNullOrWhiteSpace(request.NameEn) ||
                string.IsNullOrWhiteSpace(request.Status))
            {
                return new ProcedureWriteResult(false, "standardId, policyId, nameAr, nameEn and status are required");
            }

            var now = DateTime.UtcNow;
            var procedure = new ProcedureRecord(
                string.IsNullOrWhiteSpace(request.Id) ? GenerateId() : request.Id.Trim(),
                request.StandardId.Trim(),
                request.PolicyId.Trim(),
                request.NameAr.Trim(),
                request.NameEn.Trim(),
                NormalizeOptionalString(request.DescriptionAr),
                NormalizeOptionalString(request.DescriptionEn),
                request.Status.Trim(),
                NormalizeOptionalString(request.Importance),
                request.StartDate,
                request.EndDate,
                JsonSerializer.Serialize(CleanStringArray(request.AssignedTo)),
                JsonSerializer.Serialize(CleanStringArray(request.AssignedTeams)),
                request.IsPeriodic ?? false,
                NormalizeOptionalString(request.Frequency),
                JsonSerializer.Serialize(CleanStringArray(request.Attachments)),
                SerializeComments(request.Comments),
                request.CreatedAt ?? now,
                request.UpdatedAt ?? now);

            var item = await _procedureRepository.InsertAsync(procedure, cancellationToken);
            return new ProcedureWriteResult(true, Item: item);
        }

        public async Task<ProcedureWriteResult> UpdateAsync(string id, UpdateProcedureRequestDto request, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(id))
            {
                return new ProcedureWriteResult(false, "Procedure id is required");
            }

            if (HasUnknownFields(request.UnknownFields))
            {
                return new ProcedureWriteResult(false, "Payload contains unsupported fields");
            }

            var trimmedId = id.Trim();
            var fields = new Dictionary<string, object?>(StringComparer.Ordinal);

            if (request.Id.HasValue)
            {
                var bodyId = ReadString(request.Id.Value, "id", required: false);
                if (!string.IsNullOrWhiteSpace(bodyId) && !string.Equals(bodyId, trimmedId, StringComparison.Ordinal))
                {
                    return new ProcedureWriteResult(false, "Route id and body id must match");
                }
            }

            AddStringField(fields, "standardId", request.StandardId, required: true);
            AddStringField(fields, "policyId", request.PolicyId, required: true);
            AddStringField(fields, "nameAr", request.NameAr, required: true);
            AddStringField(fields, "nameEn", request.NameEn, required: true);
            AddStringField(fields, "descriptionAr", request.DescriptionAr, required: false);
            AddStringField(fields, "descriptionEn", request.DescriptionEn, required: false);
            AddStringField(fields, "status", request.Status, required: true);
            AddStringField(fields, "importance", request.Importance, required: false);
            AddDateField(fields, "startDate", request.StartDate);
            AddDateField(fields, "endDate", request.EndDate);
            AddStringArrayField(fields, "assignedTo", request.AssignedTo);
            AddStringArrayField(fields, "assignedTeams", request.AssignedTeams);
            AddBoolField(fields, "isPeriodic", request.IsPeriodic);
            AddStringField(fields, "frequency", request.Frequency, required: false);
            AddStringArrayField(fields, "attachments", request.Attachments);
            AddCommentsField(fields, request.Comments);
            AddDateTimeField(fields, "createdAt", request.CreatedAt);
            AddDateTimeField(fields, "updatedAt", request.UpdatedAt);

            if (!fields.ContainsKey("updatedAt"))
            {
                fields["updatedAt"] = DateTime.UtcNow;
            }

            var item = await _procedureRepository.UpdateAsync(trimmedId, fields, cancellationToken);
            return item is null
                ? new ProcedureWriteResult(false, "Procedure not found")
                : new ProcedureWriteResult(true, Item: item);
        }

        public async Task<ProcedureWriteResult> DeleteAsync(string id, string? deletedBy, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(id))
            {
                return new ProcedureWriteResult(false, "Procedure id is required");
            }

            var deleted = await _procedureRepository.DeleteAsync(id.Trim(), deletedBy, cancellationToken);
            return deleted
                ? new ProcedureWriteResult(true)
                : new ProcedureWriteResult(false, "Procedure not found");
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

        private static void AddCommentsField(Dictionary<string, object?> fields, JsonElement? value)
        {
            if (!value.HasValue)
            {
                return;
            }

            fields["comments"] = SerializeComments(value);
        }

        private static void AddDateField(Dictionary<string, object?> fields, string name, JsonElement? value)
        {
            if (value.HasValue)
            {
                fields[name] = ReadDate(value.Value, name);
            }
        }

        private static void AddDateTimeField(Dictionary<string, object?> fields, string name, JsonElement? value)
        {
            if (value.HasValue)
            {
                fields[name] = ReadDate(value.Value, name);
            }
        }

        private static void AddBoolField(Dictionary<string, object?> fields, string name, JsonElement? value)
        {
            if (!value.HasValue)
            {
                return;
            }

            if (value.Value.ValueKind is JsonValueKind.Null or JsonValueKind.Undefined)
            {
                fields[name] = null;
                return;
            }

            if (value.Value.ValueKind != JsonValueKind.True && value.Value.ValueKind != JsonValueKind.False)
            {
                throw new ArgumentException($"{name} must be a boolean");
            }

            fields[name] = value.Value.GetBoolean();
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

        private static DateTime? ReadDate(JsonElement element, string name)
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

        private static string SerializeComments(JsonElement? comments)
        {
            if (!comments.HasValue || comments.Value.ValueKind is JsonValueKind.Null or JsonValueKind.Undefined)
            {
                return "[]";
            }

            if (comments.Value.ValueKind != JsonValueKind.Array)
            {
                throw new ArgumentException("comments must be an array");
            }

            return comments.Value.GetRawText();
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
