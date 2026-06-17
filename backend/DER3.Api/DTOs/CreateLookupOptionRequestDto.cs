using System.Text.Json;
using System.Text.Json.Serialization;

namespace DER3.Api.DTOs
{
    public sealed class CreateLookupOptionRequestDto
    {
        public string? Id { get; set; }
        public string? Category { get; set; }
        public string? Value { get; set; }
        public string? LabelAr { get; set; }
        public string? LabelEn { get; set; }
        public bool? IsActive { get; set; }
        public string? DescriptionAr { get; set; }
        public string? DescriptionEn { get; set; }

        [JsonExtensionData]
        public Dictionary<string, JsonElement>? UnknownFields { get; set; }
    }
}
