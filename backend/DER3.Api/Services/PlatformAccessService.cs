using System.Security.Claims;
using System.Text.Json;
using System.IdentityModel.Tokens.Jwt;

namespace DER3.Api.Services
{
    public interface IPlatformAccessService
    {
        IReadOnlyList<string> ResolvePlatforms(Dictionary<string, object?> user);

        IReadOnlyList<string> ResolvePlatforms(ClaimsPrincipal principal);

        Dictionary<string, object?> WithPlatforms(Dictionary<string, object?> user);

        bool HasDer3Access(ClaimsPrincipal principal);
    }

    public sealed class PlatformAccessService : IPlatformAccessService
    {
        private static readonly string[] DefaultDer3Platforms = ["DER3"];
        private static readonly HashSet<string> Der3Roles = new(StringComparer.OrdinalIgnoreCase)
        {
            "admin",
            "auditor",
            "user"
        };

        private static readonly Dictionary<string, string[]> TemporaryPlatformAccess = new(StringComparer.OrdinalIgnoreCase)
        {
            ["alhnoof@mcci.org.sa"] = ["DER3", "LEGAL"],
            ["ahmad_eid@mcci.org.sa"] = ["DER3"]
        };

        public IReadOnlyList<string> ResolvePlatforms(Dictionary<string, object?> user)
        {
            var explicitPlatforms = NormalizePlatforms(ReadValue(user, "platforms"));
            if (explicitPlatforms.Count > 0)
            {
                return explicitPlatforms;
            }

            var email = ReadString(user, "email");
            if (!string.IsNullOrWhiteSpace(email) && TemporaryPlatformAccess.TryGetValue(email, out var emailPlatforms))
            {
                return emailPlatforms;
            }

            var role = ReadString(user, "role");
            if (!string.IsNullOrWhiteSpace(role) && Der3Roles.Contains(role))
            {
                return DefaultDer3Platforms;
            }

            var groupId = ReadString(user, "groupId");
            if (!string.IsNullOrWhiteSpace(groupId))
            {
                return DefaultDer3Platforms;
            }

            return DefaultDer3Platforms;
        }

        public IReadOnlyList<string> ResolvePlatforms(ClaimsPrincipal principal)
        {
            var explicitPlatforms = NormalizePlatforms(ReadClaimValue(principal, "platforms"));
            if (explicitPlatforms.Count > 0)
            {
                return explicitPlatforms;
            }

            var email = principal.FindFirstValue(ClaimTypes.Email) ??
                principal.FindFirstValue(JwtRegisteredClaimNames.Email);

            if (!string.IsNullOrWhiteSpace(email) && TemporaryPlatformAccess.TryGetValue(email, out var emailPlatforms))
            {
                return emailPlatforms;
            }

            var role = principal.FindFirstValue(ClaimTypes.Role);
            if (!string.IsNullOrWhiteSpace(role) && Der3Roles.Contains(role))
            {
                return DefaultDer3Platforms;
            }

            return DefaultDer3Platforms;
        }

        public Dictionary<string, object?> WithPlatforms(Dictionary<string, object?> user)
        {
            var resolvedPlatforms = ResolvePlatforms(user);
            var copy = new Dictionary<string, object?>(user, StringComparer.OrdinalIgnoreCase)
            {
                ["platforms"] = resolvedPlatforms.ToArray()
            };

            return copy;
        }

        public bool HasDer3Access(ClaimsPrincipal principal) =>
            ResolvePlatforms(principal).Any(platform => platform.Equals("DER3", StringComparison.OrdinalIgnoreCase));

        private static object? ReadValue(Dictionary<string, object?> user, string key)
        {
            return user.TryGetValue(key, out var value) ? value : null;
        }

        private static string? ReadString(Dictionary<string, object?> user, string key)
        {
            var value = ReadValue(user, key);
            return value switch
            {
                null => null,
                string s => s,
                JsonElement element when element.ValueKind == JsonValueKind.String => element.GetString(),
                JsonElement element when element.ValueKind is JsonValueKind.Array or JsonValueKind.Object => element.GetRawText(),
                _ => value.ToString()
            };
        }

        private static object? ReadClaimValue(ClaimsPrincipal principal, string claimType)
        {
            var claim = principal.FindFirst(claimType);
            if (claim is not null)
            {
                return claim.Value;
            }

            var matchingClaims = principal.FindAll(claimType).Select(item => item.Value).ToArray();
            return matchingClaims.Length > 0 ? matchingClaims : null;
        }

        private static IReadOnlyList<string> NormalizePlatforms(object? value)
        {
            if (value is null)
            {
                return Array.Empty<string>();
            }

            if (value is string[] stringArray)
            {
                return stringArray.Where(item => !string.IsNullOrWhiteSpace(item))
                    .Select(item => item.Trim())
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .ToArray();
            }

            if (value is IEnumerable<string> stringEnumerable)
            {
                return stringEnumerable.Where(item => !string.IsNullOrWhiteSpace(item))
                    .Select(item => item.Trim())
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .ToArray();
            }

            if (value is JsonElement element)
            {
                return NormalizeJsonPlatforms(element);
            }

            if (value is string text)
            {
                var trimmed = text.Trim();
                if (string.IsNullOrWhiteSpace(trimmed))
                {
                    return Array.Empty<string>();
                }

                if (trimmed.StartsWith('['))
                {
                    try
                    {
                        var parsed = JsonSerializer.Deserialize<string[]>(trimmed);
                        return parsed is null
                            ? Array.Empty<string>()
                            : parsed.Where(item => !string.IsNullOrWhiteSpace(item))
                                .Select(item => item.Trim())
                                .Distinct(StringComparer.OrdinalIgnoreCase)
                                .ToArray();
                    }
                    catch (JsonException)
                    {
                        return Array.Empty<string>();
                    }
                }

                return trimmed
                    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .ToArray();
            }

            return Array.Empty<string>();
        }

        private static IReadOnlyList<string> NormalizeJsonPlatforms(JsonElement element)
        {
            if (element.ValueKind == JsonValueKind.Array)
            {
                return element.EnumerateArray()
                    .Where(item => item.ValueKind == JsonValueKind.String)
                    .Select(item => item.GetString())
                    .Where(item => !string.IsNullOrWhiteSpace(item))
                    .Select(item => item!.Trim())
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .ToArray();
            }

            if (element.ValueKind == JsonValueKind.String)
            {
                return NormalizePlatforms(element.GetString());
            }

            return Array.Empty<string>();
        }
    }
}
