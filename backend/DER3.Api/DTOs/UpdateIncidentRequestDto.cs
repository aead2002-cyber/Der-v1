using System.Text.Json;
using System.Text.Json.Serialization;

namespace DER3.Api.DTOs
{
    public sealed class UpdateIncidentRequestDto
    {
        public JsonElement? Id { get; set; }
        public JsonElement? ReporterEmail { get; set; }
        public JsonElement? Title { get; set; }
        public JsonElement? Description { get; set; }
        public JsonElement? Type { get; set; }
        public JsonElement? Priority { get; set; }
        public JsonElement? Status { get; set; }
        public JsonElement? ReportedAt { get; set; }
        public JsonElement? AssignedTo { get; set; }
        public JsonElement? UpdatedAt { get; set; }
        public JsonElement? ClosedAt { get; set; }
        public JsonElement? Attachments { get; set; }

        [JsonExtensionData]
        public Dictionary<string, JsonElement>? UnknownFields { get; set; }
    }
}
