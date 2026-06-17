namespace DER3.Api.Models
{
    public sealed record EntityReadMap(
        string Entity,
        string TableName,
        IReadOnlySet<string> JsonFields,
        IReadOnlySet<string> ExcludedFields)
    {
        private static readonly IReadOnlySet<string> EmptyFields = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        private static readonly Dictionary<string, EntityReadMap> Maps = new(StringComparer.Ordinal)
        {
            ["users"] = new("users", "[User]", Set("teams", "departments", "permissionOverrides"), Set("passwordHash", "passwordSalt")),
            ["permissionGroups"] = new("permissionGroups", "PermissionGroup", Set("permissions"), EmptyFields),
            ["policies"] = new("policies", "Policy", EmptyFields, EmptyFields),
            ["policyItems"] = new("policyItems", "PolicyItem", Set("attachments"), EmptyFields),
            ["standards"] = new("standards", "Standard", Set("classifications", "attachments", "policyItemIds"), EmptyFields),
            ["procedures"] = new("procedures", "[Procedure]", Set("assignedTo", "assignedTeams", "attachments", "comments"), EmptyFields),
            ["auditLogs"] = new("auditLogs", "AuditLog", EmptyFields, EmptyFields),
            ["changeRequests"] = new("changeRequests", "ChangeRequest", Set("attachments", "history"), EmptyFields),
            ["lookupOptions"] = new("lookupOptions", "LookupOption", EmptyFields, EmptyFields),
            ["evidence"] = new("evidence", "Evidence", EmptyFields, EmptyFields),
            ["frameworks"] = new("frameworks", "Framework", EmptyFields, EmptyFields),
            ["standardClassifications"] = new("standardClassifications", "StandardClassification", EmptyFields, EmptyFields),
            ["teams"] = new("teams", "Team", EmptyFields, EmptyFields),
            ["departments"] = new("departments", "Department", EmptyFields, EmptyFields),
            ["commitments"] = new("commitments", "Commitment", EmptyFields, EmptyFields),
            ["notificationTemplates"] = new("notificationTemplates", "NotificationTemplate", EmptyFields, EmptyFields),
            ["notificationLogs"] = new("notificationLogs", "NotificationLog", EmptyFields, EmptyFields),
            ["incidents"] = new("incidents", "SecurityIncident", Set("attachments"), EmptyFields),
            ["incidentNotes"] = new("incidentNotes", "IncidentNote", Set("attachments"), EmptyFields),
            ["incidentFeedback"] = new("incidentFeedback", "IncidentFeedback", EmptyFields, EmptyFields),
            ["notifications"] = new("notifications", "Notification", EmptyFields, EmptyFields),
            ["risks"] = new("risks", "Risk", Set("procedureIds"), EmptyFields)
        };

        public static bool TryGet(string entity, out EntityReadMap map) =>
            Maps.TryGetValue(entity, out map!);

        private static IReadOnlySet<string> Set(params string[] fields) =>
            new HashSet<string>(fields, StringComparer.OrdinalIgnoreCase);
    }
}
