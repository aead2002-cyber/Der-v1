using System.Text.Json;
using System.Text.Json.Serialization;

namespace DER3.Api.DTOs
{
    public sealed class UpdateLookupOptionRequestDto
    {
        public JsonElement? Id { get; set; }
        public JsonElement? Category { get; set; }
        public JsonElement? Value { get; set; }
        public JsonElement? LabelAr { get; set; }
        public JsonElement? LabelEn { get; set; }
        public JsonElement? IsActive { get; set; }
        public JsonElement? DescriptionAr { get; set; }
        public JsonElement? DescriptionEn { get; set; }

        [JsonExtensionData]
        public Dictionary<string, JsonElement>? UnknownFields { get; set; }
    }
}
