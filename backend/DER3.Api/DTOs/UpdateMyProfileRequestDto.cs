using System.Text.Json;
using System.Text.Json.Serialization;

namespace DER3.Api.DTOs
{
    public sealed class UpdateMyProfileRequestDto
    {
        public string? DisplayName { get; set; }

        public string? DisplayNameEn { get; set; }

        public string? PhotoURL { get; set; }

        [JsonExtensionData]
        public Dictionary<string, JsonElement>? UnknownFields { get; set; }
    }
}
