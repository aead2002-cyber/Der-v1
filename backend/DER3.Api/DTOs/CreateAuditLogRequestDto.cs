using System.Text.Json;
using System.Text.Json.Serialization;

namespace DER3.Api.DTOs
{
    public sealed class CreateAuditLogRequestDto
    {
        public string? Id { get; set; }
        public string? UserId { get; set; }
        public string? UserName { get; set; }
        public string? Action { get; set; }
        public string? EntityType { get; set; }
        public string? EntityId { get; set; }
        public JsonElement? OldValue { get; set; }
        public JsonElement? NewValue { get; set; }
        public DateTime? Timestamp { get; set; }
        public string? Ip { get; set; }
        public string? UserAgent { get; set; }

        [JsonExtensionData]
        public Dictionary<string, JsonElement>? UnknownFields { get; set; }
    }
}
