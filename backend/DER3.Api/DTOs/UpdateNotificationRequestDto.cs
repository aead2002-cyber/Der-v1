using System.Text.Json;
using System.Text.Json.Serialization;

namespace DER3.Api.DTOs
{
    public sealed class UpdateNotificationRequestDto
    {
        public JsonElement? Id { get; set; }
        public JsonElement? UserId { get; set; }
        public JsonElement? TitleAr { get; set; }
        public JsonElement? TitleEn { get; set; }
        public JsonElement? MessageAr { get; set; }
        public JsonElement? MessageEn { get; set; }
        public JsonElement? Type { get; set; }
        public JsonElement? Link { get; set; }
        public JsonElement? IsRead { get; set; }
        public JsonElement? CreatedAt { get; set; }

        [JsonExtensionData]
        public Dictionary<string, JsonElement>? UnknownFields { get; set; }
    }
}
