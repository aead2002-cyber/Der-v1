using System.Text.Json;
using System.Text.Json.Serialization;

namespace DER3.Api.DTOs
{
    public sealed class UpdateUserRequestDto
    {
        public string? Email { get; set; }

        public string? DisplayName { get; set; }

        public string? DisplayNameEn { get; set; }

        public string? Role { get; set; }

        public string? GroupId { get; set; }

        public JsonElement? PermissionOverrides { get; set; }

        public List<string>? Teams { get; set; }

        public List<string>? Departments { get; set; }

        public string? PhotoURL { get; set; }

        public bool? BypassOtp { get; set; }

        public bool? ReceiveSecurityIncidents { get; set; }

        [JsonExtensionData]
        public Dictionary<string, JsonElement>? UnknownFields { get; set; }
    }
}
