using System.Text.Json;
using System.Text.Json.Serialization;

namespace DER3.Api.DTOs
{
    public sealed class UpdateIncidentFeedbackRequestDto
    {
        public JsonElement? Id { get; set; }
        public JsonElement? IncidentId { get; set; }
        public JsonElement? Rating { get; set; }
        public JsonElement? Comment { get; set; }
        public JsonElement? SubmittedAt { get; set; }

        [JsonExtensionData]
        public Dictionary<string, JsonElement>? UnknownFields { get; set; }
    }
}
