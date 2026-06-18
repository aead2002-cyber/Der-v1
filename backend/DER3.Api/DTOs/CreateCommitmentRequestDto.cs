using System.Text.Json;
using System.Text.Json.Serialization;

namespace DER3.Api.DTOs
{
    public sealed class CreateCommitmentRequestDto
    {
        public string? Id { get; set; }
        public string? NameAr { get; set; }
        public string? NameEn { get; set; }
        public string? DescriptionAr { get; set; }
        public string? DescriptionEn { get; set; }
        public DateTime? ExpiryDate { get; set; }
        public string? ResponsibleUser { get; set; }
        public string? Status { get; set; }
        public string? EvidenceTitle { get; set; }
        public string? EvidenceLink { get; set; }
        public DateTime? EvidenceUploadedAt { get; set; }
        public DateTime? CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }

        [JsonExtensionData]
        public Dictionary<string, JsonElement>? UnknownFields { get; set; }
    }
}
