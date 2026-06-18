using System.Text.Json;
using DER3.Api.Models;
using DER3.Api.Repositories;

namespace DER3.Api.Services
{
    public interface ICompatibilityReadService
    {
        Task<IReadOnlyList<Dictionary<string, object?>>> GetAllAsync(string entity, CancellationToken cancellationToken);
    }

    public sealed class CompatibilityReadService : ICompatibilityReadService
    {
        private readonly ICompatibilityReadRepository _repository;

        public CompatibilityReadService(ICompatibilityReadRepository repository)
        {
            _repository = repository;
        }

        public async Task<IReadOnlyList<Dictionary<string, object?>>> GetAllAsync(string entity, CancellationToken cancellationToken)
        {
            if (!EntityReadMap.TryGet(entity, out var map))
            {
                throw new EntityNotSupportedException(entity);
            }

            var rows = await _repository.GetAllAsync(map, cancellationToken);

            foreach (var row in rows)
            {
                foreach (var excludedField in map.ExcludedFields)
                {
                    row.Remove(excludedField);
                }

                foreach (var jsonField in map.JsonFields)
                {
                    if (!row.TryGetValue(jsonField, out var value))
                    {
                        continue;
                    }

                    row[jsonField] = ParseJsonValue(value);
                }
            }

            return rows;
        }

        private static object? ParseJsonValue(object? value)
        {
            if (value is null || value is DBNull)
            {
                return Array.Empty<object>();
            }

            if (value is not string text || string.IsNullOrWhiteSpace(text))
            {
                return value;
            }

            try
            {
                return JsonSerializer.Deserialize<JsonElement>(text);
            }
            catch (JsonException)
            {
                return value;
            }
        }
    }

    public sealed class EntityNotSupportedException : Exception
    {
        public EntityNotSupportedException(string entity)
            : base($"Entity '{entity}' is not supported.")
        {
        }
    }
}
