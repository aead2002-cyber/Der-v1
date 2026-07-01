using System.Text.Json;
using DER3.Api.DTOs;
using DER3.Api.Repositories;

namespace DER3.Api.Services
{
    public sealed record CommitmentWriteResult(bool Success, string? Error = null, Dictionary<string, object?>? Item = null);

    public interface ICommitmentService
    {
        Task<CommitmentWriteResult> CreateAsync(CreateCommitmentRequestDto request, CancellationToken cancellationToken);
        Task<CommitmentWriteResult> UpdateAsync(string id, UpdateCommitmentRequestDto request, CancellationToken cancellationToken);
        Task<CommitmentWriteResult> DeleteAsync(string id, string? deletedBy, CancellationToken cancellationToken);
    }

    public sealed class CommitmentService : ICommitmentService
    {
        private readonly ICommitmentRepository _commitmentRepository;

        public CommitmentService(ICommitmentRepository commitmentRepository)
        {
            _commitmentRepository = commitmentRepository;
        }

        public async Task<CommitmentWriteResult> CreateAsync(CreateCommitmentRequestDto request, CancellationToken cancellationToken)
        {
            if (IncidentService.HasUnknownFields(request.UnknownFields))
            {
                return new CommitmentWriteResult(false, "Payload contains unsupported fields");
            }

            if (string.IsNullOrWhiteSpace(request.NameAr) ||
                string.IsNullOrWhiteSpace(request.NameEn) ||
                string.IsNullOrWhiteSpace(request.Status))
            {
                return new CommitmentWriteResult(false, "nameAr, nameEn and status are required");
            }

            var now = DateTime.UtcNow;
            var commitment = new CommitmentRecord(
                string.IsNullOrWhiteSpace(request.Id) ? IncidentService.GenerateId() : request.Id.Trim(),
                request.NameAr.Trim(),
                request.NameEn.Trim(),
                IncidentService.NormalizeOptionalString(request.DescriptionAr),
                IncidentService.NormalizeOptionalString(request.DescriptionEn),
                request.ExpiryDate,
                IncidentService.NormalizeOptionalString(request.ResponsibleUser),
                request.Status.Trim(),
                IncidentService.NormalizeOptionalString(request.EvidenceTitle),
                IncidentService.NormalizeOptionalString(request.EvidenceLink),
                request.EvidenceUploadedAt,
                request.CreatedAt ?? now,
                request.UpdatedAt ?? now);

            var item = await _commitmentRepository.InsertAsync(commitment, cancellationToken);
            return new CommitmentWriteResult(true, Item: item);
        }

        public async Task<CommitmentWriteResult> UpdateAsync(string id, UpdateCommitmentRequestDto request, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(id))
            {
                return new CommitmentWriteResult(false, "Commitment id is required");
            }

            if (IncidentService.HasUnknownFields(request.UnknownFields))
            {
                return new CommitmentWriteResult(false, "Payload contains unsupported fields");
            }

            var trimmedId = id.Trim();
            var fields = new Dictionary<string, object?>(StringComparer.Ordinal);

            if (request.Id.HasValue)
            {
                var bodyId = IncidentService.ReadString(request.Id.Value, "id", required: false);
                if (!string.IsNullOrWhiteSpace(bodyId) && !string.Equals(bodyId, trimmedId, StringComparison.Ordinal))
                {
                    return new CommitmentWriteResult(false, "Route id and body id must match");
                }
            }

            AddStringField(fields, "nameAr", request.NameAr, required: true);
            AddStringField(fields, "nameEn", request.NameEn, required: true);
            AddStringField(fields, "descriptionAr", request.DescriptionAr, required: false);
            AddStringField(fields, "descriptionEn", request.DescriptionEn, required: false);
            AddDateField(fields, "expiryDate", request.ExpiryDate);
            AddStringField(fields, "responsibleUser", request.ResponsibleUser, required: false);
            AddStringField(fields, "status", request.Status, required: true);
            AddStringField(fields, "evidenceTitle", request.EvidenceTitle, required: false);
            AddStringField(fields, "evidenceLink", request.EvidenceLink, required: false);
            AddDateField(fields, "evidenceUploadedAt", request.EvidenceUploadedAt);
            AddDateField(fields, "createdAt", request.CreatedAt);
            AddDateField(fields, "updatedAt", request.UpdatedAt);

            if (!fields.ContainsKey("updatedAt"))
            {
                fields["updatedAt"] = DateTime.UtcNow;
            }

            var item = await _commitmentRepository.UpdateAsync(trimmedId, fields, cancellationToken);
            return item is null
                ? new CommitmentWriteResult(false, "Commitment not found")
                : new CommitmentWriteResult(true, Item: item);
        }

        public async Task<CommitmentWriteResult> DeleteAsync(string id, string? deletedBy, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(id))
            {
                return new CommitmentWriteResult(false, "Commitment id is required");
            }

            var deleted = await _commitmentRepository.DeleteAsync(id.Trim(), deletedBy, cancellationToken);
            return deleted ? new CommitmentWriteResult(true) : new CommitmentWriteResult(false, "Commitment not found");
        }

        private static void AddStringField(Dictionary<string, object?> fields, string name, JsonElement? value, bool required)
        {
            if (value.HasValue)
            {
                fields[name] = IncidentService.NormalizeOptionalString(IncidentService.ReadString(value.Value, name, required));
            }
        }

        private static void AddDateField(Dictionary<string, object?> fields, string name, JsonElement? value)
        {
            if (value.HasValue)
            {
                fields[name] = IncidentService.ReadDate(value.Value, name);
            }
        }
    }
}
