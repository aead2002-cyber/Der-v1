using System.Text.Json;
using System.Text.Json.Serialization;

namespace DER3.Api.DTOs
{
    public sealed class UpdateIncidentNoteRequestDto
    {
        public JsonElement? Id { get; set; }
        public JsonElement? IncidentId { get; set; }
        public JsonElement? AuthorId { get; set; }
        public JsonElement? AuthorName { get; set; }
        public JsonElement? Content { get; set; }
        public JsonElement? CreatedAt { get; set; }
        public JsonElement? Attachments { get; set; }

        [JsonExtensionData]
        public Dictionary<string, JsonElement>? UnknownFields { get; set; }
    }
}
