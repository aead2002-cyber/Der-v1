using System.Text.Json;
using DER3.Api.DTOs;
using DER3.Api.Repositories;

namespace DER3.Api.Services
{
    public sealed record TeamWriteResult(bool Success, string? Error = null, Dictionary<string, object?>? Item = null);

    public interface ITeamService
    {
        Task<TeamWriteResult> CreateAsync(CreateTeamRequestDto request, CancellationToken cancellationToken);
        Task<TeamWriteResult> UpdateAsync(string id, UpdateTeamRequestDto request, CancellationToken cancellationToken);
        Task<TeamWriteResult> DeleteAsync(string id, string? deletedBy, CancellationToken cancellationToken);
    }

    public sealed class TeamService : ITeamService
    {
        private readonly ITeamRepository _teamRepository;

        public TeamService(ITeamRepository teamRepository)
        {
            _teamRepository = teamRepository;
        }

        public async Task<TeamWriteResult> CreateAsync(CreateTeamRequestDto request, CancellationToken cancellationToken)
        {
            if (IncidentService.HasUnknownFields(request.UnknownFields))
            {
                return new TeamWriteResult(false, "Payload contains unsupported fields");
            }

            if (string.IsNullOrWhiteSpace(request.NameAr) || string.IsNullOrWhiteSpace(request.NameEn))
            {
                return new TeamWriteResult(false, "nameAr and nameEn are required");
            }

            var now = DateTime.UtcNow;
            var team = new TeamRecord(
                string.IsNullOrWhiteSpace(request.Id) ? IncidentService.GenerateId() : request.Id.Trim(),
                request.NameAr.Trim(),
                request.NameEn.Trim(),
                IncidentService.NormalizeOptionalString(request.DescriptionAr),
                IncidentService.NormalizeOptionalString(request.DescriptionEn),
                request.CreatedAt ?? now,
                request.UpdatedAt ?? now);

            var item = await _teamRepository.InsertAsync(team, cancellationToken);
            return new TeamWriteResult(true, Item: item);
        }

        public async Task<TeamWriteResult> UpdateAsync(string id, UpdateTeamRequestDto request, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(id))
            {
                return new TeamWriteResult(false, "Team id is required");
            }

            if (IncidentService.HasUnknownFields(request.UnknownFields))
            {
                return new TeamWriteResult(false, "Payload contains unsupported fields");
            }

            var trimmedId = id.Trim();
            var fields = new Dictionary<string, object?>(StringComparer.Ordinal);

            if (request.Id.HasValue)
            {
                var bodyId = IncidentService.ReadString(request.Id.Value, "id", required: false);
                if (!string.IsNullOrWhiteSpace(bodyId) && !string.Equals(bodyId, trimmedId, StringComparison.Ordinal))
                {
                    return new TeamWriteResult(false, "Route id and body id must match");
                }
            }

            AddStringField(fields, "nameAr", request.NameAr, required: true);
            AddStringField(fields, "nameEn", request.NameEn, required: true);
            AddStringField(fields, "descriptionAr", request.DescriptionAr, required: false);
            AddStringField(fields, "descriptionEn", request.DescriptionEn, required: false);
            AddDateField(fields, "createdAt", request.CreatedAt);
            AddDateField(fields, "updatedAt", request.UpdatedAt);

            if (!fields.ContainsKey("updatedAt"))
            {
                fields["updatedAt"] = DateTime.UtcNow;
            }

            var item = await _teamRepository.UpdateAsync(trimmedId, fields, cancellationToken);
            return item is null
                ? new TeamWriteResult(false, "Team not found")
                : new TeamWriteResult(true, Item: item);
        }

        public async Task<TeamWriteResult> DeleteAsync(string id, string? deletedBy, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(id))
            {
                return new TeamWriteResult(false, "Team id is required");
            }

            var deleted = await _teamRepository.DeleteAsync(id.Trim(), deletedBy, cancellationToken);
            return deleted ? new TeamWriteResult(true) : new TeamWriteResult(false, "Team not found");
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
