using System.Text.Json;
using System.Text.Json.Serialization;

namespace DER3.Api.DTOs
{
    public sealed class UpdateStandardRequestDto
    {
        public JsonElement? Id { get; set; }
        public JsonElement? PolicyId { get; set; }
        public JsonElement? PolicyItemId { get; set; }
        public JsonElement? PolicyItemIds { get; set; }
        public JsonElement? NameAr { get; set; }
        public JsonElement? NameEn { get; set; }
        public JsonElement? DescriptionAr { get; set; }
        public JsonElement? DescriptionEn { get; set; }
        public JsonElement? PotentialRisksAr { get; set; }
        public JsonElement? PotentialRisksEn { get; set; }
        public JsonElement? Classifications { get; set; }
        public JsonElement? Attachments { get; set; }
        public JsonElement? CreatedAt { get; set; }
        public JsonElement? UpdatedAt { get; set; }

        [JsonExtensionData]
        public Dictionary<string, JsonElement>? UnknownFields { get; set; }
    }
}
