using System.Text.Json;
using System.Text.Json.Serialization;

namespace DER3.Api.DTOs
{
    public sealed class UpdateAuditLogRequestDto
    {
        public JsonElement? Id { get; set; }
        public JsonElement? UserId { get; set; }
        public JsonElement? UserName { get; set; }
        public JsonElement? Action { get; set; }
        public JsonElement? EntityType { get; set; }
        public JsonElement? EntityId { get; set; }
        public JsonElement? OldValue { get; set; }
        public JsonElement? NewValue { get; set; }
        public JsonElement? Timestamp { get; set; }
        public JsonElement? Ip { get; set; }
        public JsonElement? UserAgent { get; set; }

        [JsonExtensionData]
        public Dictionary<string, JsonElement>? UnknownFields { get; set; }
    }
}
