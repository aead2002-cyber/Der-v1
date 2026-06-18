using System.Text.Json;
using System.Text.Json.Serialization;

namespace DER3.Api.DTOs
{
    public sealed class CreateIncidentFeedbackRequestDto
    {
        public string? Id { get; set; }
        public string? IncidentId { get; set; }
        public int? Rating { get; set; }
        public string? Comment { get; set; }
        public DateTime? SubmittedAt { get; set; }

        [JsonExtensionData]
        public Dictionary<string, JsonElement>? UnknownFields { get; set; }
    }
}
