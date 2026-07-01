using DER3.Api.DTOs;
using DER3.Api.Repositories;

namespace DER3.Api.Services
{
    public sealed record IncidentFeedbackWriteResult(bool Success, string? Error = null, Dictionary<string, object?>? Item = null);

    public interface IIncidentFeedbackService
    {
        Task<IncidentFeedbackWriteResult> CreateAsync(CreateIncidentFeedbackRequestDto request, CancellationToken cancellationToken);
        Task<IncidentFeedbackWriteResult> UpdateAsync(string id, UpdateIncidentFeedbackRequestDto request, CancellationToken cancellationToken);
        Task<IncidentFeedbackWriteResult> DeleteAsync(string id, string? deletedBy, CancellationToken cancellationToken);
    }

    public sealed class IncidentFeedbackService : IIncidentFeedbackService
    {
        private readonly IIncidentFeedbackRepository _incidentFeedbackRepository;

        public IncidentFeedbackService(IIncidentFeedbackRepository incidentFeedbackRepository)
        {
            _incidentFeedbackRepository = incidentFeedbackRepository;
        }

        public async Task<IncidentFeedbackWriteResult> CreateAsync(CreateIncidentFeedbackRequestDto request, CancellationToken cancellationToken)
        {
            if (IncidentService.HasUnknownFields(request.UnknownFields))
            {
                return new IncidentFeedbackWriteResult(false, "Payload contains unsupported fields");
            }

            if (string.IsNullOrWhiteSpace(request.IncidentId))
            {
                return new IncidentFeedbackWriteResult(false, "incidentId is required");
            }

            var feedback = new IncidentFeedbackRecord(
                string.IsNullOrWhiteSpace(request.Id) ? IncidentService.GenerateId() : request.Id.Trim(),
                request.IncidentId.Trim(),
                request.Rating,
                IncidentService.NormalizeOptionalString(request.Comment),
                request.SubmittedAt ?? DateTime.UtcNow);

            var item = await _incidentFeedbackRepository.InsertAsync(feedback, cancellationToken);
            return new IncidentFeedbackWriteResult(true, Item: item);
        }

        public async Task<IncidentFeedbackWriteResult> UpdateAsync(string id, UpdateIncidentFeedbackRequestDto request, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(id))
            {
                return new IncidentFeedbackWriteResult(false, "Incident feedback id is required");
            }

            if (IncidentService.HasUnknownFields(request.UnknownFields))
            {
                return new IncidentFeedbackWriteResult(false, "Payload contains unsupported fields");
            }

            var trimmedId = id.Trim();
            var fields = new Dictionary<string, object?>(StringComparer.Ordinal);

            if (request.Id.HasValue)
            {
                var bodyId = IncidentService.ReadString(request.Id.Value, "id", required: false);
                if (!string.IsNullOrWhiteSpace(bodyId) && !string.Equals(bodyId, trimmedId, StringComparison.Ordinal))
                {
                    return new IncidentFeedbackWriteResult(false, "Route id and body id must match");
                }
            }

            if (request.IncidentId.HasValue)
            {
                fields["incidentId"] = IncidentService.NormalizeOptionalString(IncidentService.ReadString(request.IncidentId.Value, "incidentId", required: true));
            }

            if (request.Rating.HasValue)
            {
                fields["rating"] = IncidentService.ReadInt(request.Rating.Value, "rating");
            }

            if (request.Comment.HasValue)
            {
                fields["comment"] = IncidentService.NormalizeOptionalString(IncidentService.ReadString(request.Comment.Value, "comment", required: false));
            }

            if (request.SubmittedAt.HasValue)
            {
                fields["submittedAt"] = IncidentService.ReadDate(request.SubmittedAt.Value, "submittedAt");
            }

            var item = await _incidentFeedbackRepository.UpdateAsync(trimmedId, fields, cancellationToken);
            return item is null
                ? new IncidentFeedbackWriteResult(false, "Incident feedback not found")
                : new IncidentFeedbackWriteResult(true, Item: item);
        }

        public async Task<IncidentFeedbackWriteResult> DeleteAsync(string id, string? deletedBy, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(id))
            {
                return new IncidentFeedbackWriteResult(false, "Incident feedback id is required");
            }

            var deleted = await _incidentFeedbackRepository.DeleteAsync(id.Trim(), deletedBy, cancellationToken);
            return deleted
                ? new IncidentFeedbackWriteResult(true)
                : new IncidentFeedbackWriteResult(false, "Incident feedback not found");
        }
    }
}
