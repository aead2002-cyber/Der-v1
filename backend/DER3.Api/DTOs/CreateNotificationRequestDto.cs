using System.Text.Json;
using System.Text.Json.Serialization;

namespace DER3.Api.DTOs
{
    public sealed class CreateNotificationRequestDto
    {
        public string? Id { get; set; }
        public string? UserId { get; set; }
        public string? TitleAr { get; set; }
        public string? TitleEn { get; set; }
        public string? MessageAr { get; set; }
        public string? MessageEn { get; set; }
        public string? Type { get; set; }
        public string? Link { get; set; }
        public bool? IsRead { get; set; }
        public DateTime? CreatedAt { get; set; }

        [JsonExtensionData]
        public Dictionary<string, JsonElement>? UnknownFields { get; set; }
    }
}
