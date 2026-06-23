using System.Text.Json;
using System.Text.Json.Serialization;

namespace DER3.Api.DTOs
{
    public sealed class VerifyResetTokenRequestDto
    {
        public string? Token { get; set; }

        [JsonExtensionData]
        public Dictionary<string, JsonElement>? UnknownFields { get; set; }
    }
}
