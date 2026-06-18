using System.Text.Json;
using System.Text.Json.Serialization;

namespace DER3.Api.DTOs
{
    public sealed class UpdateStandardClassificationRequestDto
    {
        public JsonElement? Id { get; set; }
        public JsonElement? NameAr { get; set; }
        public JsonElement? NameEn { get; set; }
        public JsonElement? CreatedAt { get; set; }
        public JsonElement? UpdatedAt { get; set; }

        [JsonExtensionData]
        public Dictionary<string, JsonElement>? UnknownFields { get; set; }
    }
}
