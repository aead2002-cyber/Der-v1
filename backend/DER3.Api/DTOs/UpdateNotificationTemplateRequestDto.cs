using System.Text.Json;
using System.Text.Json.Serialization;

namespace DER3.Api.DTOs
{
    public sealed class UpdateNotificationTemplateRequestDto
    {
        public JsonElement? Id { get; set; }
        public JsonElement? Name { get; set; }
        public JsonElement? Subject { get; set; }
        public JsonElement? Body { get; set; }
        public JsonElement? Type { get; set; }

        [JsonExtensionData]
        public Dictionary<string, JsonElement>? UnknownFields { get; set; }
    }
}
