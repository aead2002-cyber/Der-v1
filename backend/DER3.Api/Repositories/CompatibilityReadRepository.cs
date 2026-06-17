using DER3.Api.Models;
using Microsoft.Data.SqlClient;

namespace DER3.Api.Repositories
{
    public interface ICompatibilityReadRepository
    {
        Task<IReadOnlyList<Dictionary<string, object?>>> GetAllAsync(EntityReadMap map, CancellationToken cancellationToken);
    }

    public sealed class CompatibilityReadRepository : ICompatibilityReadRepository
    {
        private readonly IConfiguration _configuration;

        public CompatibilityReadRepository(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        public async Task<IReadOnlyList<Dictionary<string, object?>>> GetAllAsync(EntityReadMap map, CancellationToken cancellationToken)
        {
            var connectionString = _configuration.GetConnectionString("DefaultConnection");
            if (string.IsNullOrWhiteSpace(connectionString))
            {
                throw new InvalidOperationException("DefaultConnection is not configured.");
            }

            var rows = new List<Dictionary<string, object?>>();

            await using var connection = new SqlConnection(connectionString);
            await connection.OpenAsync(cancellationToken);

            await using var command = connection.CreateCommand();
            command.CommandText = $"SELECT * FROM {map.TableName}";

            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                var row = new Dictionary<string, object?>(StringComparer.Ordinal);
                for (var i = 0; i < reader.FieldCount; i++)
                {
                    row[reader.GetName(i)] = await reader.IsDBNullAsync(i, cancellationToken)
                        ? null
                        : reader.GetValue(i);
                }

                rows.Add(row);
            }

            return rows;
        }
    }
}
