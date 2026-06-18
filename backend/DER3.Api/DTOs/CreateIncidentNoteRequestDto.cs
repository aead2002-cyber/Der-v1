using System.Text.Json;
using System.Text.Json.Serialization;

namespace DER3.Api.DTOs
{
    public sealed class CreateIncidentNoteRequestDto
    {
        public string? Id { get; set; }
        public string? IncidentId { get; set; }
        public string? AuthorId { get; set; }
        public string? AuthorName { get; set; }
        public string? Content { get; set; }
        public DateTime? CreatedAt { get; set; }
        public List<string>? Attachments { get; set; }

        [JsonExtensionData]
        public Dictionary<string, JsonElement>? UnknownFields { get; set; }
    }
}
