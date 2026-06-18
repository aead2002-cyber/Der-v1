using System.Text.Json;
using System.Text.Json.Serialization;

namespace DER3.Api.DTOs
{
    public sealed class CreateEvidenceRequestDto
    {
        public string? Id { get; set; }
        public string? ProcedureId { get; set; }
        public string? Name { get; set; }
        public string? Url { get; set; }
        public string? Type { get; set; }
        public string? UploadedBy { get; set; }
        public DateTime? UploadedAt { get; set; }
        public string? Description { get; set; }

        [JsonExtensionData]
        public Dictionary<string, JsonElement>? UnknownFields { get; set; }
    }
}
