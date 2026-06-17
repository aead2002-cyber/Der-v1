using System.Text.Json;
using System.Text.Json.Serialization;

namespace DER3.Api.DTOs
{
    public sealed class UpdateEvidenceRequestDto
    {
        public JsonElement? Id { get; set; }
        public JsonElement? ProcedureId { get; set; }
        public JsonElement? Name { get; set; }
        public JsonElement? Url { get; set; }
        public JsonElement? Type { get; set; }
        public JsonElement? UploadedBy { get; set; }
        public JsonElement? UploadedAt { get; set; }
        public JsonElement? Description { get; set; }

        [JsonExtensionData]
        public Dictionary<string, JsonElement>? UnknownFields { get; set; }
    }
}
