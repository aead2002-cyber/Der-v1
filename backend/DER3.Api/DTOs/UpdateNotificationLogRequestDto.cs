using System.Text.Json;
using System.Text.Json.Serialization;

namespace DER3.Api.DTOs
{
    public sealed class UpdateNotificationLogRequestDto
    {
        public JsonElement? Id { get; set; }
        public JsonElement? RecipientId { get; set; }
        public JsonElement? RecipientEmail { get; set; }
        public JsonElement? RecipientName { get; set; }
        public JsonElement? Type { get; set; }
        public JsonElement? Subject { get; set; }
        public JsonElement? Body { get; set; }
        public JsonElement? Status { get; set; }
        public JsonElement? SentAt { get; set; }
        public JsonElement? ErrorMessage { get; set; }

        [JsonExtensionData]
        public Dictionary<string, JsonElement>? UnknownFields { get; set; }
    }
}
