# Backend Permission Model Analysis

Scope: current backend data model, current React permission checks, and a recommendation for the next backend authorization layer. This is analysis only. No schema, JWT claim, or behavior changes are included here.

## 1) Current user-to-permission-group model

The current permission model is group-based with per-user overrides.

### User table shape

From `backend/DER3.Api/Repositories/UserRepository.cs`, `server.js`, and `src/types.ts`, the `[User]` row currently includes:

- `uid`
- `email`
- `displayName`
- `displayNameEn`
- `role`
- `groupId`
- `permissionOverrides`
- `teams`
- `departments`
- `photoURL`
- `bypassOtp`
- `receiveSecurityIncidents`
- `passwordHash`
- `passwordSalt`
- `createdAt`
- `updatedAt`

### How the user is linked to a permission group

- Primary link: `User.groupId -> PermissionGroup.id`
- Legacy fallback: the frontend still falls back to `User.role` when `groupId` is empty.
- The current backend auth flow does not yet resolve group permissions during token creation.

### Other user fields relevant to authorization

- `role`: legacy coarse role, kept for compatibility with existing seed users.
- `permissionOverrides`: per-user adjustments on top of the group.
  - `granted`: permission keys added for that user.
  - `revoked`: permission keys removed for that user.
- `teams`: array of strings.
- `departments`: array of strings.
- `bypassOtp`: security/authentication flag, not a permission.
- `receiveSecurityIncidents`: notification preference, not a permission.

### Important interpretation

`teams` and `departments` are currently organizational metadata, not a permission system. In the UI they are stored as string arrays of display values, not relational ids.

## 2) PermissionGroup table shape

The current `PermissionGroup` row includes:

- `id`
- `nameAr`
- `nameEn`
- `descriptionAr`
- `descriptionEn`
- `isSystem`
- `permissions`
- `createdAt`
- `updatedAt`

### PermissionGroup.permissions JSON shape

- Stored as JSON text in the database.
- Deserialized by the backend into `string[]`.
- Semantics: each string is a permission key such as `policies.view` or `users.create`.

The current backend repository reads/writes this field as a flat JSON array of strings, not a join table.

## 3) Current backend auth state

### AuthService

`AuthService` currently verifies email/password only. It returns:

- `Uid`
- `Email`
- `DisplayName`
- `Role`
- raw `User` dictionary

It does not yet compute group permissions, effective permissions, or permission overrides.

### JwtTokenService

Current JWT claims include:

- `sub`
- `jti`
- `ClaimTypes.NameIdentifier`
- `email` / `ClaimTypes.Email`
- `ClaimTypes.Name`
- `ClaimTypes.Role`

Missing today:

- `groupId`
- effective `permissions`
- `teams`
- `departments`
- `permissionOverrides`

### Practical consequence

The frontend permission model is richer than the JWT payload currently is. The backend can authenticate the user, but it cannot yet authorize against the group/override model from the token alone.

## 4) How the old React app checked permissions

The old React app uses a central registry plus two runtime gates:

- `ProtectedRoute` in `src/App.tsx` blocks pages by permission key.
- `Can` in `src/AuthContext.tsx` gates buttons/actions.

The effective permission algorithm is implemented in `src/services/mockService.ts`:

1. Resolve the user group from `user.groupId`.
2. If `groupId` is empty, fall back to `user.role`.
3. Load `PermissionGroup.permissions`.
4. Apply `permissionOverrides.granted`.
5. Remove `permissionOverrides.revoked`.

That is the current frontend truth for authorization behavior.

## 5) Existing frontend permission names

The canonical permission catalog lives in `src/permissions.ts`.

The following keys are already used by the current React code paths:

- `dashboard.view`
- `frameworks.view`, `frameworks.create`, `frameworks.edit`, `frameworks.delete`, `frameworks.import`, `frameworks.export`
- `policies.view`, `policies.create`, `policies.edit`, `policies.delete`, `policies.import`, `policies.export`
- `policies.policy_items.view`, `policies.policy_items.create`, `policies.policy_items.edit`, `policies.policy_items.delete`, `policies.policy_items.import`, `policies.policy_items.export`, `policies.policy_items.link_standards`
- `standards.view`, `standards.create`, `standards.edit`, `standards.delete`, `standards.import`, `standards.export`
- `standards.classifications.view`, `standards.classifications.create`, `standards.classifications.edit`, `standards.classifications.delete`
- `procedures.view`, `procedures.create`, `procedures.edit`, `procedures.delete`, `procedures.import`, `procedures.export`, `procedures.add_sub`, `procedures.manage_weight`
- `procedures.evidence.view`, `procedures.evidence.create`, `procedures.evidence.delete`
- `tasks.my_tasks.view`, `tasks.my_tasks.update_status`, `tasks.my_tasks.add_note`
- `commitments.view`, `commitments.create`, `commitments.edit`, `commitments.delete`, `commitments.export`
- `risks.view`, `risks.create`, `risks.edit`, `risks.delete`, `risks.export`
- `incidents.view`, `incidents.create`, `incidents.edit`, `incidents.delete`, `incidents.assign`, `incidents.resolve`, `incidents.manage_notes`, `incidents.export`
- `change_requests.view`, `change_requests.create`, `change_requests.edit`, `change_requests.delete`, `change_requests.approve`, `change_requests.reject`
- `reports.view`, `reports.export`
- `reports.audit_trail.view`, `reports.audit_trail.export`
- `users.view`, `users.create`, `users.edit`, `users.delete`
- `users.permission_groups.view`, `users.permission_groups.create`, `users.permission_groups.edit`, `users.permission_groups.delete`, `users.permission_groups.assign`
- `settings.general.view`, `settings.general.edit`
- `settings.email.view`, `settings.email.edit`, `settings.email.test`
- `settings.templates.view`, `settings.templates.create`, `settings.templates.edit`, `settings.templates.delete`
- `settings.lookups.view`, `settings.lookups.create`, `settings.lookups.edit`, `settings.lookups.delete`
- `settings.teams_departments.view`, `settings.teams_departments.create`, `settings.teams_departments.edit`, `settings.teams_departments.delete`
- `settings.compliance.view`, `settings.compliance.edit`
- `settings.notification_logs.view`

Observed gap:

- The current frontend route table does not yet assign a dedicated permission key to the main notifications page.

## 6) Recommended JWT claims for the next phase

For backend authorization, the token should eventually carry enough information to avoid repeated DB lookups on every request.

Recommended minimum claims:

- `sub` / `uid`
- `email`
- `name`
- `role`
- `groupId`
- `permissions` as the effective permission key array

Optional claims if row-level scoping is needed later:

- `teams`
- `departments`

Implementation note:

- If you put `permissions` in the token, you get stateless authorization.
- If permission changes must take effect immediately, use shorter token lifetime or a token-version invalidation strategy.

## 7) Recommended API protection strategy

Use the existing frontend permission catalog as the backend authorization model. The rule should be:

- `GET` list/detail endpoints -> `*.view`
- `POST` -> `*.create`
- `PUT`/`PATCH` -> `*.edit`
- `DELETE` -> `*.delete`

### Resource-by-resource mapping

| Backend area | Recommended permission |
| --- | --- |
| `/api/users` | `users.view` / `users.create` / `users.edit` / `users.delete` |
| `/api/files` | No dedicated frontend key exists today. Treat as admin-only for now, or introduce a future `files.*` permission. |
| `/api/policies` | `policies.view` / `policies.create` / `policies.edit` / `policies.delete` |
| `/api/policyItems` | `policies.policy_items.view` / `...create` / `...edit` / `...delete` |
| `/api/standards` | `standards.view` / `standards.create` / `standards.edit` / `standards.delete` |
| `/api/standardClassifications` | `standards.classifications.view` / `...create` / `...edit` / `...delete` |
| `/api/procedures` | `procedures.view` / `procedures.create` / `procedures.edit` / `procedures.delete` |
| `/api/evidence` | `procedures.evidence.view` / `procedures.evidence.create` / `procedures.evidence.delete` |
| `/api/risks` | `risks.view` / `risks.create` / `risks.edit` / `risks.delete` |
| `/api/commitments` | `commitments.view` / `commitments.create` / `commitments.edit` / `commitments.delete` |
| `/api/changeRequests` | `change_requests.view` / `change_requests.create` / `change_requests.edit` / `change_requests.delete` |
| `/api/incidents` | `incidents.view` / `incidents.create` / `incidents.edit` / `incidents.delete` |
| `/api/incidentNotes` | Prefer `incidents.manage_notes` or a future `incidents.notes.*` split. |
| `/api/incidentFeedback` | Prefer `incidents.view` or a future `incidents.feedback.*` split. |
| `/api/teams` | `settings.teams_departments.view` / `...create` / `...edit` / `...delete` |
| `/api/departments` | `settings.teams_departments.view` / `...create` / `...edit` / `...delete` |
| `/api/lookupOptions` | `settings.lookups.view` / `...create` / `...edit` / `...delete` |
| `/api/permissionGroups` | `users.permission_groups.view` / `...create` / `...edit` / `...delete` |
| `/api/frameworks` | `frameworks.view` / `frameworks.create` / `frameworks.edit` / `frameworks.delete` |
| `/api/auditLogs` | `reports.audit_trail.view` for read; writes should be admin-only or internal-service-only. |
| `/api/notifications` | No matching frontend key yet. Keep admin-only or system-only until a dedicated permission is introduced. |
| `/api/notificationTemplates` | `settings.templates.view` / `...create` / `...edit` / `...delete` |
| `/api/notificationLogs` | `settings.notification_logs.view` for read; writes should be admin-only or system-only. |
| `/api/database/test` | Admin-only. |
| `/api/email/test` | `settings.email.test`. |
| `/api/auth/me` | Authenticated only; no extra permission. |
| compatibility `GET /api/{entity}` | Same permission as the canonical GET endpoint for that entity. |

### Admin-only buckets

These are the endpoints that should probably be reserved for administrators or internal service accounts until a more detailed model is introduced:

- database test
- email test, unless `settings.email.test` is explicitly used
- audit log write operations
- notification log write operations
- generic notifications CRUD, unless a frontend permission set is added
- any cross-cutting maintenance endpoint that does not map cleanly to an existing UI permission

## 8) Risks and ambiguity

1. `role` still acts as a legacy fallback in the frontend. That is convenient, but it can hide whether the intended group assignment is actually present.
2. `PermissionGroup.permissions` is a free-form string array. Typos will silently become dead permissions unless the backend validates against a canonical list.
3. The JWT currently does not include group membership or effective permissions. Without adding those claims later, backend authorization will still need DB lookups on each request.
4. `teams` and `departments` are not authorization primitives today, but they may be needed later for row-level filtering.
5. Several backend resources do not yet have matching frontend permission keys, especially generic notifications and file CRUD.
6. `isSystem` exists on permission groups, but it is currently a data flag rather than a fully enforced authorization boundary.

## 9) Bottom line

The current model is:

- one user belongs to one permission group via `groupId`
- `role` is a legacy fallback
- permissions are a flat JSON array on `PermissionGroup`
- user-level exceptions live in `permissionOverrides`
- the frontend already gates UI by string permission keys

The cleanest next backend step is to mirror that exact permission key catalog in JWT or a request-time authorization service, then apply `view/create/edit/delete` consistently across the API surface.
