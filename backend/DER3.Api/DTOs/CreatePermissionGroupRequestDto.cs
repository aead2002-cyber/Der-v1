using System.Text.Json;
using System.Text.Json.Serialization;

namespace DER3.Api.DTOs
{
    public sealed class CreatePermissionGroupRequestDto
    {
        public string? Id { get; set; }
        public string? NameAr { get; set; }
        public string? NameEn { get; set; }
        public string? DescriptionAr { get; set; }
        public string? DescriptionEn { get; set; }
        public bool? IsSystem { get; set; }
        public List<string>? Permissions { get; set; }
        public string? CreatedAt { get; set; }
        public string? UpdatedAt { get; set; }

        [JsonExtensionData]
        public Dictionary<string, JsonElement>? UnknownFields { get; set; }
    }
}
