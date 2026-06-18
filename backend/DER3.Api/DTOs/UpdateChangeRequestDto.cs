using System.Text.Json;
using System.Text.Json.Serialization;

namespace DER3.Api.DTOs
{
    public sealed class UpdateChangeRequestDto
    {
        public JsonElement? Id { get; set; }
        public JsonElement? Title { get; set; }
        public JsonElement? Description { get; set; }
        public JsonElement? Type { get; set; }
        public JsonElement? SenderId { get; set; }
        public JsonElement? SenderName { get; set; }
        public JsonElement? ReceiverId { get; set; }
        public JsonElement? ReceiverName { get; set; }
        public JsonElement? Status { get; set; }
        public JsonElement? Attachments { get; set; }
        public JsonElement? History { get; set; }
        public JsonElement? CreatedAt { get; set; }
        public JsonElement? UpdatedAt { get; set; }

        [JsonExtensionData]
        public Dictionary<string, JsonElement>? UnknownFields { get; set; }
    }
}
