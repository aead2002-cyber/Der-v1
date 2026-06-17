using System.Text.Json;
using System.Text.Json.Serialization;

namespace DER3.Api.DTOs
{
    public sealed class CreatePolicyRequestDto
    {
        public string? Id { get; set; }

        public string? NameAr { get; set; }

        public string? NameEn { get; set; }

        public string? DescriptionAr { get; set; }

        public string? DescriptionEn { get; set; }

        public string? FrameworkId { get; set; }

        public DateTime? CreatedAt { get; set; }

        public DateTime? UpdatedAt { get; set; }

        [JsonExtensionData]
        public Dictionary<string, JsonElement>? UnknownFields { get; set; }
    }
}
