using System.Security.Cryptography;
using System.Text.Json;
using DER3.Api.DTOs;
using DER3.Api.Repositories;

namespace DER3.Api.Services
{
    public sealed record IncidentWriteResult(bool Success, string? Error = null, Dictionary<string, object?>? Item = null);

    public interface IIncidentService
    {
        Task<IncidentWriteResult> CreateAsync(CreateIncidentRequestDto request, CancellationToken cancellationToken);
        Task<IncidentWriteResult> UpdateAsync(string id, UpdateIncidentRequestDto request, CancellationToken cancellationToken);
        Task<IncidentWriteResult> DeleteAsync(string id, CancellationToken cancellationToken);
    }

    public sealed class IncidentService : IIncidentService
    {
        private readonly IIncidentRepository _incidentRepository;

        public IncidentService(IIncidentRepository incidentRepository)
        {
            _incidentRepository = incidentRepository;
        }

        public async Task<IncidentWriteResult> CreateAsync(CreateIncidentRequestDto request, CancellationToken cancellationToken)
        {
            if (HasUnknownFields(request.UnknownFields))
            {
                return new IncidentWriteResult(false, "Payload contains unsupported fields");
            }

            if (string.IsNullOrWhiteSpace(request.Title))
            {
                return new IncidentWriteResult(false, "title is required");
            }

            var now = DateTime.UtcNow;
            var incident = new IncidentRecord(
                string.IsNullOrWhiteSpace(request.Id) ? GenerateId() : request.Id.Trim(),
                NormalizeOptionalString(request.ReporterEmail),
                request.Title.Trim(),
                NormalizeOptionalString(request.Description),
                NormalizeOptionalString(request.Type),
                NormalizeOptionalString(request.Priority),
                NormalizeOptionalString(request.Status),
                request.ReportedAt ?? now,
                NormalizeOptionalString(request.AssignedTo),
                request.UpdatedAt ?? now,
                request.ClosedAt,
                JsonSerializer.Serialize(CleanStringArray(request.Attachments)));

            var item = await _incidentRepository.InsertAsync(incident, cancellationToken);
            return new IncidentWriteResult(true, Item: item);
        }

        public async Task<IncidentWriteResult> UpdateAsync(string id, UpdateIncidentRequestDto request, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(id))
            {
                return new IncidentWriteResult(false, "Incident id is required");
            }

            if (HasUnknownFields(request.UnknownFields))
            {
                return new IncidentWriteResult(false, "Payload contains unsupported fields");
            }

            var trimmedId = id.Trim();
            var fields = new Dictionary<string, object?>(StringComparer.Ordinal);

            if (request.Id.HasValue)
            {
                var bodyId = ReadString(request.Id.Value, "id", required: false);
                if (!string.IsNullOrWhiteSpace(bodyId) && !string.Equals(bodyId, trimmedId, StringComparison.Ordinal))
                {
                    return new IncidentWriteResult(false, "Route id and body id must match");
                }
            }

            AddStringField(fields, "reporterEmail", request.ReporterEmail, required: false);
            AddStringField(fields, "title", request.Title, required: true);
            AddStringField(fields, "description", request.Description, required: false);
            AddStringField(fields, "type", request.Type, required: false);
            AddStringField(fields, "priority", request.Priority, required: false);
            AddStringField(fields, "status", request.Status, required: false);
            AddDateField(fields, "reportedAt", request.ReportedAt);
            AddStringField(fields, "assignedTo", request.AssignedTo, required: false);
            AddDateField(fields, "updatedAt", request.UpdatedAt);
            AddDateField(fields, "closedAt", request.ClosedAt);
            AddStringArrayField(fields, "attachments", request.Attachments);

            if (!fields.ContainsKey("updatedAt"))
            {
                fields["updatedAt"] = DateTime.UtcNow;
            }

            var item = await _incidentRepository.UpdateAsync(trimmedId, fields, cancellationToken);
            return item is null
                ? new IncidentWriteResult(false, "Incident not found")
                : new IncidentWriteResult(true, Item: item);
        }

        public async Task<IncidentWriteResult> DeleteAsync(string id, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(id))
            {
                return new IncidentWriteResult(false, "Incident id is required");
            }

            var deleted = await _incidentRepository.DeleteAsync(id.Trim(), cancellationToken);
            return deleted
                ? new IncidentWriteResult(true)
                : new IncidentWriteResult(false, "Incident not found");
        }

        private static void AddStringField(Dictionary<string, object?> fields, string name, JsonElement? value, bool required)
        {
            if (value.HasValue)
            {
                fields[name] = NormalizeOptionalString(ReadString(value.Value, name, required));
            }
        }

        private static void AddDateField(Dictionary<string, object?> fields, string name, JsonElement? value)
        {
            if (value.HasValue)
            {
                fields[name] = ReadDate(value.Value, name);
            }
        }

        private static void AddStringArrayField(Dictionary<string, object?> fields, string name, JsonElement? value)
        {
            if (value.HasValue)
            {
                fields[name] = JsonSerializer.Serialize(ReadStringArray(value.Value, name));
            }
        }

        internal static string? ReadString(JsonElement element, string name, bool required)
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

        internal static DateTime? ReadDate(JsonElement element, string name)
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

        internal static int? ReadInt(JsonElement element, string name)
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

        internal static List<string> ReadStringArray(JsonElement element, string name)
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

        internal static List<string> CleanStringArray(IEnumerable<string>? values) =>
            values?.Where(value => !string.IsNullOrWhiteSpace(value)).Select(value => value.Trim()).ToList() ?? new List<string>();

        internal static bool HasUnknownFields(Dictionary<string, JsonElement>? unknownFields) =>
            unknownFields is { Count: > 0 };

        internal static string? NormalizeOptionalString(string? value) =>
            string.IsNullOrWhiteSpace(value) ? null : value.Trim();

        internal static string GenerateId() =>
            Convert.ToHexString(RandomNumberGenerator.GetBytes(6)).ToLowerInvariant();
    }
}
