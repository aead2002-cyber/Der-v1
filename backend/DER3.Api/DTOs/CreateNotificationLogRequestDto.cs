using System.Text.Json;
using System.Text.Json.Serialization;

namespace DER3.Api.DTOs
{
    public sealed class CreateNotificationLogRequestDto
    {
        public string? Id { get; set; }
        public string? RecipientId { get; set; }
        public string? RecipientEmail { get; set; }
        public string? RecipientName { get; set; }
        public string? Type { get; set; }
        public string? Subject { get; set; }
        public string? Body { get; set; }
        public string? Status { get; set; }
        public DateTime? SentAt { get; set; }
        public string? ErrorMessage { get; set; }

        [JsonExtensionData]
        public Dictionary<string, JsonElement>? UnknownFields { get; set; }
    }
}
