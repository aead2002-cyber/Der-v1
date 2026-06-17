using System.Text.Json;
using System.Text.Json.Serialization;

namespace DER3.Api.DTOs
{
    public sealed class CreateProcedureRequestDto
    {
        public string? Id { get; set; }
        public string? StandardId { get; set; }
        public string? PolicyId { get; set; }
        public string? NameAr { get; set; }
        public string? NameEn { get; set; }
        public string? DescriptionAr { get; set; }
        public string? DescriptionEn { get; set; }
        public string? Status { get; set; }
        public string? Importance { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public List<string>? AssignedTo { get; set; }
        public List<string>? AssignedTeams { get; set; }
        public bool? IsPeriodic { get; set; }
        public string? Frequency { get; set; }
        public List<string>? Attachments { get; set; }
        public JsonElement? Comments { get; set; }
        public DateTime? CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }

        [JsonExtensionData]
        public Dictionary<string, JsonElement>? UnknownFields { get; set; }
    }
}
