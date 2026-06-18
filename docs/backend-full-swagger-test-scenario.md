# Backend Full Swagger Test Scenario

This guide is for testing implemented backend controllers through Swagger only. Do not run these tests against production data. Use test data names and ids starting with `TEST_BACKEND_`.

## Test Preparation

1. If `dotnet build` fails because `DER3.Api.dll` is locked, stop the running `DER3.Api` process first.
   - PowerShell example: `Get-Process DER3.Api`
   - Stop only the local test API process, not a production process.
2. Build the backend:
   ```powershell
   dotnet build backend\DER3.Api\DER3.Api.csproj --no-restore /p:UseAppHost=false
   ```
3. Start the API:
   ```powershell
   dotnet run --project backend\DER3.Api\DER3.Api.csproj
   ```
4. Open Swagger:
   - `http://localhost:<api-port>/swagger`
5. Use fixed test ids so later requests can reference them:
   - `TEST_BACKEND_USER_001`
   - `TEST_BACKEND_TEAM_001`
   - `TEST_BACKEND_DEPT_001`
   - `TEST_BACKEND_PERMISSION_GROUP_001`
   - `TEST_BACKEND_LOOKUP_001`
   - `TEST_BACKEND_FRAMEWORK_001`
   - `TEST_BACKEND_CLASSIFICATION_001`
   - `TEST_BACKEND_POLICY_001`
   - `TEST_BACKEND_POLICY_ITEM_001`
   - `TEST_BACKEND_STANDARD_001`
   - `TEST_BACKEND_PROCEDURE_001`
   - `TEST_BACKEND_EVIDENCE_001`
   - `TEST_BACKEND_RISK_001`
   - `TEST_BACKEND_COMMITMENT_001`
   - `TEST_BACKEND_CHANGE_REQUEST_001`
   - `TEST_BACKEND_INCIDENT_001`
   - `TEST_BACKEND_INCIDENT_NOTE_001`
   - `TEST_BACKEND_INCIDENT_FEEDBACK_001`
   - `TEST_BACKEND_NOTIFICATION_001`
   - `TEST_BACKEND_NOTIFICATION_TEMPLATE_001`
   - `TEST_BACKEND_NOTIFICATION_LOG_001`
   - `TEST_BACKEND_AUDIT_LOG_001`

Expected write success response shape:
```json
{ "success": true, "item": { "...": "..." } }
```

Expected delete success response shape:
```json
{ "success": true }
```

Expected error response shape:
```json
{ "success": false, "error": "..." }
```

## Correct Testing Order

Use this order to avoid foreign-key and dependency issues:

1. Health
2. Database
3. Compatibility GET
4. Users
5. Files
6. Teams
7. Departments
8. PermissionGroups
9. LookupOptions
10. Frameworks
11. StandardClassifications
12. Policies
13. PolicyItems
14. Standards
15. Procedures
16. Evidence
17. Risks
18. Commitments
19. ChangeRequests
20. Incidents
21. IncidentNotes
22. IncidentFeedback
23. Notifications
24. NotificationTemplates
25. NotificationLogs
26. AuditLogs

## Health

### GET `/api/Health`

Expected response:
```json
{
  "status": "ok",
  "message": "DER3 API is running"
}
```

## Database

### GET `/api/Database/test`

Expected success response:
```json
{
  "status": "ok",
  "message": "SQL Server connection is working"
}
```

## Compatibility GET

Test compatibility routes before and after writes to confirm existing `GET /api/{entity}` behavior still works.

### GET `/api/users`

Expected response:
```json
[
  { "...": "..." }
]
```

Repeat compatibility reads after creating test rows:
- `GET /api/teams`
- `GET /api/departments`
- `GET /api/permissionGroups`
- `GET /api/lookupOptions`
- `GET /api/frameworks`
- `GET /api/standardClassifications`
- `GET /api/policies`
- `GET /api/policyItems`
- `GET /api/standards`
- `GET /api/procedures`
- `GET /api/evidence`
- `GET /api/risks`
- `GET /api/commitments`
- `GET /api/changeRequests`
- `GET /api/incidents`
- `GET /api/incidentNotes`
- `GET /api/incidentFeedback`
- `GET /api/notifications`
- `GET /api/notificationTemplates`
- `GET /api/notificationLogs`
- `GET /api/auditLogs`

## Users

### POST `/api/users`

Sample body:
```json
{
  "uid": "TEST_BACKEND_USER_001",
  "email": "TEST_BACKEND_USER_001@example.test",
  "displayName": "TEST_BACKEND_User Arabic",
  "displayNameEn": "TEST_BACKEND User",
  "role": "user",
  "groupId": null,
  "permissionOverrides": { "canTestBackend": true },
  "teams": ["TEST_BACKEND_TEAM_001"],
  "departments": ["TEST_BACKEND_DEPT_001"],
  "photoURL": null,
  "bypassOtp": true,
  "receiveSecurityIncidents": true,
  "password": "TEST_BACKEND_Pass123"
}
```

Expected success response: `{ "success": true, "user": { ... } }`.

Save: `user.uid` as `TEST_BACKEND_USER_001`.

Confirm the response does not include `passwordHash` or `passwordSalt`.

### PUT `/api/users/TEST_BACKEND_USER_001`

Sample body:
```json
{
  "email": "TEST_BACKEND_USER_001_updated@example.test",
  "displayName": "TEST_BACKEND_User Arabic Updated",
  "displayNameEn": "TEST_BACKEND User Updated",
  "role": "user",
  "groupId": null,
  "permissionOverrides": { "canTestBackend": true, "updated": true },
  "teams": ["TEST_BACKEND_TEAM_001"],
  "departments": ["TEST_BACKEND_DEPT_001"],
  "photoURL": null,
  "bypassOtp": true,
  "receiveSecurityIncidents": true
}
```

Expected success response: `{ "success": true, "user": { ... } }`.

### POST `/api/users/TEST_BACKEND_USER_001/password`

Sample body:
```json
{
  "password": "TEST_BACKEND_NewPass123"
}
```

Expected success response: `{ "success": true }`.

### Unknown Field Rejection Test

Send this to `PUT /api/users/TEST_BACKEND_USER_001`:
```json
{
  "email": "TEST_BACKEND_USER_001_updated@example.test",
  "displayName": "TEST_BACKEND User",
  "unexpectedField": true
}
```

Expected response: HTTP 400 with `{ "success": false, "error": "Payload contains unsupported fields" }`.

### DELETE `/api/users/TEST_BACKEND_USER_001`

Run during cleanup only.

Expected success response: `{ "success": true }`.

Expected 404 test: delete `TEST_BACKEND_USER_MISSING`.

Expected 409 FK conflict test: try deleting `TEST_BACKEND_USER_001` while records still reference it, if your database has user foreign keys.

## Files

### POST `/api/uploads`

Use Swagger file picker with a small PDF or image named `TEST_BACKEND_file.pdf`.

Expected success response:
```json
{
  "url": "/api/files/<file-id>",
  "name": "TEST_BACKEND_file.pdf",
  "size": 1234,
  "mimeType": "application/pdf"
}
```

Save: file id from `url`, for example `f_...`.

### GET `/api/files/{id}`

Use the saved file id.

Expected success response: file download or inline file response.

### DELETE `/api/files/{id}`

Run during cleanup or with a second uploaded test file.

Expected success response: `{ "success": true }`.

Expected 404 test: delete `TEST_BACKEND_FILE_MISSING`.

Expected 409 FK conflict test: if a table references a file id directly in your database, try deleting the referenced file before deleting the dependent record.

## Teams

### POST `/api/teams`

```json
{
  "id": "TEST_BACKEND_TEAM_001",
  "nameAr": "TEST_BACKEND فريق",
  "nameEn": "TEST_BACKEND Team",
  "descriptionAr": "TEST_BACKEND وصف الفريق",
  "descriptionEn": "TEST_BACKEND team description",
  "createdAt": "2026-06-17T08:00:00Z",
  "updatedAt": "2026-06-17T08:00:00Z"
}
```

Expected success response: `{ "success": true, "item": { ... } }`.

Save: `item.id`.

### PUT `/api/teams/TEST_BACKEND_TEAM_001`

```json
{
  "nameEn": "TEST_BACKEND Team Updated",
  "descriptionEn": "TEST_BACKEND updated team description",
  "updatedAt": "2026-06-17T09:00:00Z"
}
```

Expected success response: `{ "success": true, "item": { ... } }`.

### DELETE `/api/teams/TEST_BACKEND_TEAM_001`

Expected success response: `{ "success": true }`.

Expected 404 test: delete `TEST_BACKEND_TEAM_MISSING`.

Expected 409 FK conflict test: attempt delete while a user/procedure still references the team, if enforced by your database.

## Departments

### POST `/api/departments`

```json
{
  "id": "TEST_BACKEND_DEPT_001",
  "nameAr": "TEST_BACKEND قسم",
  "nameEn": "TEST_BACKEND Department",
  "descriptionAr": "TEST_BACKEND وصف القسم",
  "descriptionEn": "TEST_BACKEND department description",
  "createdAt": "2026-06-17T08:00:00Z",
  "updatedAt": "2026-06-17T08:00:00Z"
}
```

Expected success response: `{ "success": true, "item": { ... } }`.

Save: `item.id`.

### PUT `/api/departments/TEST_BACKEND_DEPT_001`

```json
{
  "nameEn": "TEST_BACKEND Department Updated",
  "descriptionEn": "TEST_BACKEND updated department description",
  "updatedAt": "2026-06-17T09:00:00Z"
}
```

Expected success response: `{ "success": true, "item": { ... } }`.

### DELETE `/api/departments/TEST_BACKEND_DEPT_001`

Expected success response: `{ "success": true }`.

Expected 404 test: delete `TEST_BACKEND_DEPT_MISSING`.

Expected 409 FK conflict test: attempt delete while a user still references the department, if enforced by your database.

## PermissionGroups

### POST `/api/permissionGroups`

```json
{
  "id": "TEST_BACKEND_PERMISSION_GROUP_001",
  "nameAr": "TEST_BACKEND مجموعة صلاحيات",
  "nameEn": "TEST_BACKEND Permission Group",
  "descriptionAr": "TEST_BACKEND وصف",
  "descriptionEn": "TEST_BACKEND permission group",
  "isSystem": false,
  "permissions": ["TEST_BACKEND_READ", "TEST_BACKEND_WRITE"],
  "createdAt": "2026-06-17T08:00:00Z",
  "updatedAt": "2026-06-17T08:00:00Z"
}
```

Expected success response: `{ "success": true, "item": { ... } }`.

Save: `item.id`.

### PUT `/api/permissionGroups/TEST_BACKEND_PERMISSION_GROUP_001`

```json
{
  "nameEn": "TEST_BACKEND Permission Group Updated",
  "permissions": ["TEST_BACKEND_READ", "TEST_BACKEND_WRITE", "TEST_BACKEND_UPDATE"],
  "updatedAt": "2026-06-17T09:00:00Z"
}
```

Expected success response: `{ "success": true, "item": { ... } }`.

### DELETE `/api/permissionGroups/TEST_BACKEND_PERMISSION_GROUP_001`

Expected success response: `{ "success": true }`.

Expected 404 test: delete `TEST_BACKEND_PERMISSION_GROUP_MISSING`.

Expected 409 FK conflict test: attempt delete while a user/group reference exists, if enforced by your database.

## LookupOptions

### POST `/api/lookupOptions`

```json
{
  "id": "TEST_BACKEND_LOOKUP_001",
  "category": "TEST_BACKEND_CATEGORY",
  "value": "TEST_BACKEND_VALUE",
  "labelAr": "TEST_BACKEND خيار",
  "labelEn": "TEST_BACKEND Option",
  "isActive": true,
  "descriptionAr": "TEST_BACKEND وصف",
  "descriptionEn": "TEST_BACKEND option description"
}
```

Expected success response: `{ "success": true, "item": { ... } }`.

Save: `item.id`.

### PUT `/api/lookupOptions/TEST_BACKEND_LOOKUP_001`

```json
{
  "labelEn": "TEST_BACKEND Option Updated",
  "isActive": false
}
```

Expected success response: `{ "success": true, "item": { ... } }`.

### DELETE `/api/lookupOptions/TEST_BACKEND_LOOKUP_001`

Expected success response: `{ "success": true }`.

Expected 404 test: delete `TEST_BACKEND_LOOKUP_MISSING`.

Expected 409 FK conflict test: attempt delete while dependent records reference the lookup option, if enforced by your database.

## Frameworks

### POST `/api/frameworks`

```json
{
  "id": "TEST_BACKEND_FRAMEWORK_001",
  "nameAr": "TEST_BACKEND إطار",
  "nameEn": "TEST_BACKEND Framework",
  "descriptionAr": "TEST_BACKEND وصف",
  "descriptionEn": "TEST_BACKEND framework description",
  "createdAt": "2026-06-17T08:00:00Z",
  "updatedAt": "2026-06-17T08:00:00Z"
}
```

Expected success response: `{ "success": true, "item": { ... } }`.

Save: `item.id`.

### PUT `/api/frameworks/TEST_BACKEND_FRAMEWORK_001`

```json
{
  "nameEn": "TEST_BACKEND Framework Updated",
  "updatedAt": "2026-06-17T09:00:00Z"
}
```

Expected success response: `{ "success": true, "item": { ... } }`.

### DELETE `/api/frameworks/TEST_BACKEND_FRAMEWORK_001`

Expected success response: `{ "success": true }`.

Expected 404 test: delete `TEST_BACKEND_FRAMEWORK_MISSING`.

Expected 409 FK conflict test: attempt delete while `TEST_BACKEND_POLICY_001` still references it.

## StandardClassifications

### POST `/api/standardClassifications`

```json
{
  "id": "TEST_BACKEND_CLASSIFICATION_001",
  "nameAr": "TEST_BACKEND تصنيف",
  "nameEn": "TEST_BACKEND Classification",
  "createdAt": "2026-06-17T08:00:00Z",
  "updatedAt": "2026-06-17T08:00:00Z"
}
```

Expected success response: `{ "success": true, "item": { ... } }`.

Save: `item.id`.

### PUT `/api/standardClassifications/TEST_BACKEND_CLASSIFICATION_001`

```json
{
  "nameEn": "TEST_BACKEND Classification Updated",
  "updatedAt": "2026-06-17T09:00:00Z"
}
```

Expected success response: `{ "success": true, "item": { ... } }`.

### DELETE `/api/standardClassifications/TEST_BACKEND_CLASSIFICATION_001`

Expected success response: `{ "success": true }`.

Expected 404 test: delete `TEST_BACKEND_CLASSIFICATION_MISSING`.

Expected 409 FK conflict test: attempt delete while a standard still references the classification, if enforced by your database.

## Policies

### POST `/api/policies`

```json
{
  "id": "TEST_BACKEND_POLICY_001",
  "nameAr": "TEST_BACKEND سياسة",
  "nameEn": "TEST_BACKEND Policy",
  "descriptionAr": "TEST_BACKEND وصف",
  "descriptionEn": "TEST_BACKEND policy description",
  "frameworkId": "TEST_BACKEND_FRAMEWORK_001",
  "createdAt": "2026-06-17T08:00:00Z",
  "updatedAt": "2026-06-17T08:00:00Z"
}
```

Expected success response: `{ "success": true, "item": { ... } }`.

Save: `item.id`.

### PUT `/api/policies/TEST_BACKEND_POLICY_001`

```json
{
  "nameEn": "TEST_BACKEND Policy Updated",
  "descriptionEn": "TEST_BACKEND updated policy description",
  "updatedAt": "2026-06-17T09:00:00Z"
}
```

Expected success response: `{ "success": true, "item": { ... } }`.

### DELETE `/api/policies/TEST_BACKEND_POLICY_001`

Expected success response: `{ "success": true }`.

Expected 404 test: delete `TEST_BACKEND_POLICY_MISSING`.

Expected 409 FK conflict test: attempt delete while `TEST_BACKEND_POLICY_ITEM_001`, `TEST_BACKEND_STANDARD_001`, or `TEST_BACKEND_PROCEDURE_001` still references it.

## PolicyItems

### POST `/api/policyItems`

```json
{
  "id": "TEST_BACKEND_POLICY_ITEM_001",
  "policyId": "TEST_BACKEND_POLICY_001",
  "parentId": null,
  "order": 1,
  "nameAr": "TEST_BACKEND بند سياسة",
  "nameEn": "TEST_BACKEND Policy Item",
  "descriptionAr": "TEST_BACKEND وصف",
  "descriptionEn": "TEST_BACKEND policy item description",
  "attachments": ["TEST_BACKEND_ATTACHMENT_001"],
  "createdAt": "2026-06-17T08:00:00Z",
  "updatedAt": "2026-06-17T08:00:00Z"
}
```

Expected success response: `{ "success": true, "item": { ... } }`.

Save: `item.id`.

### PUT `/api/policyItems/TEST_BACKEND_POLICY_ITEM_001`

```json
{
  "order": 2,
  "nameEn": "TEST_BACKEND Policy Item Updated",
  "attachments": ["TEST_BACKEND_ATTACHMENT_001", "TEST_BACKEND_ATTACHMENT_002"],
  "updatedAt": "2026-06-17T09:00:00Z"
}
```

Expected success response: `{ "success": true, "item": { ... } }`.

### DELETE `/api/policyItems/TEST_BACKEND_POLICY_ITEM_001`

Expected success response: `{ "success": true }`.

Expected 404 test: delete `TEST_BACKEND_POLICY_ITEM_MISSING`.

Expected 409 FK conflict test: attempt delete while `TEST_BACKEND_STANDARD_001` still references it.

## Standards

### POST `/api/standards`

```json
{
  "id": "TEST_BACKEND_STANDARD_001",
  "policyId": "TEST_BACKEND_POLICY_001",
  "policyItemId": "TEST_BACKEND_POLICY_ITEM_001",
  "policyItemIds": ["TEST_BACKEND_POLICY_ITEM_001"],
  "nameAr": "TEST_BACKEND معيار",
  "nameEn": "TEST_BACKEND Standard",
  "descriptionAr": "TEST_BACKEND وصف",
  "descriptionEn": "TEST_BACKEND standard description",
  "potentialRisksAr": "TEST_BACKEND مخاطر",
  "potentialRisksEn": "TEST_BACKEND risks",
  "classifications": ["TEST_BACKEND_CLASSIFICATION_001"],
  "attachments": ["TEST_BACKEND_ATTACHMENT_001"],
  "createdAt": "2026-06-17T08:00:00Z",
  "updatedAt": "2026-06-17T08:00:00Z"
}
```

Expected success response: `{ "success": true, "item": { ... } }`.

Save: `item.id`.

### PUT `/api/standards/TEST_BACKEND_STANDARD_001`

```json
{
  "nameEn": "TEST_BACKEND Standard Updated",
  "classifications": ["TEST_BACKEND_CLASSIFICATION_001"],
  "attachments": ["TEST_BACKEND_ATTACHMENT_001", "TEST_BACKEND_ATTACHMENT_002"],
  "updatedAt": "2026-06-17T09:00:00Z"
}
```

Expected success response: `{ "success": true, "item": { ... } }`.

### DELETE `/api/standards/TEST_BACKEND_STANDARD_001`

Expected success response: `{ "success": true }`.

Expected 404 test: delete `TEST_BACKEND_STANDARD_MISSING`.

Expected 409 FK conflict test: attempt delete while `TEST_BACKEND_PROCEDURE_001` still references it.

## Procedures

### POST `/api/procedures`

```json
{
  "id": "TEST_BACKEND_PROCEDURE_001",
  "standardId": "TEST_BACKEND_STANDARD_001",
  "policyId": "TEST_BACKEND_POLICY_001",
  "nameAr": "TEST_BACKEND إجراء",
  "nameEn": "TEST_BACKEND Procedure",
  "descriptionAr": "TEST_BACKEND وصف",
  "descriptionEn": "TEST_BACKEND procedure description",
  "status": "active",
  "importance": "high",
  "startDate": "2026-06-17T00:00:00Z",
  "endDate": "2026-12-31T00:00:00Z",
  "assignedTo": ["TEST_BACKEND_USER_001"],
  "assignedTeams": ["TEST_BACKEND_TEAM_001"],
  "isPeriodic": true,
  "frequency": "monthly",
  "attachments": ["TEST_BACKEND_ATTACHMENT_001"],
  "comments": [{ "text": "TEST_BACKEND initial comment" }],
  "createdAt": "2026-06-17T08:00:00Z",
  "updatedAt": "2026-06-17T08:00:00Z"
}
```

Expected success response: `{ "success": true, "item": { ... } }`.

Save: `item.id`.

### PUT `/api/procedures/TEST_BACKEND_PROCEDURE_001`

```json
{
  "nameEn": "TEST_BACKEND Procedure Updated",
  "assignedTo": ["TEST_BACKEND_USER_001"],
  "assignedTeams": ["TEST_BACKEND_TEAM_001"],
  "attachments": ["TEST_BACKEND_ATTACHMENT_001", "TEST_BACKEND_ATTACHMENT_002"],
  "comments": [{ "text": "TEST_BACKEND updated comment" }],
  "updatedAt": "2026-06-17T09:00:00Z"
}
```

Expected success response: `{ "success": true, "item": { ... } }`.

### DELETE `/api/procedures/TEST_BACKEND_PROCEDURE_001`

Expected success response: `{ "success": true }`.

Expected 404 test: delete `TEST_BACKEND_PROCEDURE_MISSING`.

Expected 409 FK conflict test: attempt delete while `TEST_BACKEND_EVIDENCE_001` or `TEST_BACKEND_RISK_001` still references it.

## Evidence

### POST `/api/evidence`

```json
{
  "id": "TEST_BACKEND_EVIDENCE_001",
  "procedureId": "TEST_BACKEND_PROCEDURE_001",
  "name": "TEST_BACKEND Evidence",
  "url": "/api/files/TEST_BACKEND_FILE_PLACEHOLDER",
  "type": "document",
  "uploadedBy": "TEST_BACKEND_USER_001",
  "uploadedAt": "2026-06-17T08:00:00Z",
  "description": "TEST_BACKEND evidence description"
}
```

Expected success response: `{ "success": true, "item": { ... } }`.

Save: `item.id`.

### PUT `/api/evidence/TEST_BACKEND_EVIDENCE_001`

```json
{
  "name": "TEST_BACKEND Evidence Updated",
  "description": "TEST_BACKEND updated evidence description",
  "uploadedAt": "2026-06-17T09:00:00Z"
}
```

Expected success response: `{ "success": true, "item": { ... } }`.

### DELETE `/api/evidence/TEST_BACKEND_EVIDENCE_001`

Expected success response: `{ "success": true }`.

Expected 404 test: delete `TEST_BACKEND_EVIDENCE_MISSING`.

Expected 409 FK conflict test: attempt delete while another table references the evidence row, if enforced by your database.

## Risks

### POST `/api/risks`

```json
{
  "id": "TEST_BACKEND_RISK_001",
  "nameAr": "TEST_BACKEND خطر",
  "nameEn": "TEST_BACKEND Risk",
  "descriptionAr": "TEST_BACKEND وصف",
  "descriptionEn": "TEST_BACKEND risk description",
  "likelihood": 3,
  "impact": 4,
  "procedureIds": ["TEST_BACKEND_PROCEDURE_001"],
  "createdAt": "2026-06-17T08:00:00Z",
  "updatedAt": "2026-06-17T08:00:00Z"
}
```

Expected success response: `{ "success": true, "item": { ... } }`.

Save: `item.id`.

### PUT `/api/risks/TEST_BACKEND_RISK_001`

```json
{
  "nameEn": "TEST_BACKEND Risk Updated",
  "likelihood": 4,
  "impact": 5,
  "procedureIds": ["TEST_BACKEND_PROCEDURE_001"],
  "updatedAt": "2026-06-17T09:00:00Z"
}
```

Expected success response: `{ "success": true, "item": { ... } }`.

### DELETE `/api/risks/TEST_BACKEND_RISK_001`

Expected success response: `{ "success": true }`.

Expected 404 test: delete `TEST_BACKEND_RISK_MISSING`.

Expected 409 FK conflict test: attempt delete while dependent rows reference the risk, if enforced by your database.

## Commitments

### POST `/api/commitments`

```json
{
  "id": "TEST_BACKEND_COMMITMENT_001",
  "nameAr": "TEST_BACKEND التزام",
  "nameEn": "TEST_BACKEND Commitment",
  "descriptionAr": "TEST_BACKEND وصف",
  "descriptionEn": "TEST_BACKEND commitment description",
  "expiryDate": "2026-12-31T00:00:00Z",
  "responsibleUser": "TEST_BACKEND_USER_001",
  "status": "open",
  "evidenceTitle": "TEST_BACKEND Evidence Title",
  "evidenceLink": "/api/files/TEST_BACKEND_FILE_PLACEHOLDER",
  "evidenceUploadedAt": "2026-06-17T08:00:00Z",
  "createdAt": "2026-06-17T08:00:00Z",
  "updatedAt": "2026-06-17T08:00:00Z"
}
```

Expected success response: `{ "success": true, "item": { ... } }`.

Save: `item.id`.

### PUT `/api/commitments/TEST_BACKEND_COMMITMENT_001`

```json
{
  "nameEn": "TEST_BACKEND Commitment Updated",
  "status": "in_progress",
  "updatedAt": "2026-06-17T09:00:00Z"
}
```

Expected success response: `{ "success": true, "item": { ... } }`.

### DELETE `/api/commitments/TEST_BACKEND_COMMITMENT_001`

Expected success response: `{ "success": true }`.

Expected 404 test: delete `TEST_BACKEND_COMMITMENT_MISSING`.

Expected 409 FK conflict test: attempt delete while dependent rows reference the commitment, if enforced by your database.

## ChangeRequests

### POST `/api/changeRequests`

```json
{
  "id": "TEST_BACKEND_CHANGE_REQUEST_001",
  "title": "TEST_BACKEND Change Request",
  "description": "TEST_BACKEND change request description",
  "type": "policy",
  "senderId": "TEST_BACKEND_USER_001",
  "senderName": "TEST_BACKEND User",
  "receiverId": "TEST_BACKEND_USER_001",
  "receiverName": "TEST_BACKEND Receiver",
  "status": "open",
  "attachments": ["TEST_BACKEND_ATTACHMENT_001"],
  "history": [{ "action": "created", "by": "TEST_BACKEND_USER_001" }],
  "createdAt": "2026-06-17T08:00:00Z",
  "updatedAt": "2026-06-17T08:00:00Z"
}
```

Expected success response: `{ "success": true, "item": { ... } }`.

Save: `item.id`.

### PUT `/api/changeRequests/TEST_BACKEND_CHANGE_REQUEST_001`

```json
{
  "title": "TEST_BACKEND Change Request Updated",
  "status": "approved",
  "attachments": ["TEST_BACKEND_ATTACHMENT_001", "TEST_BACKEND_ATTACHMENT_002"],
  "history": [{ "action": "approved", "by": "TEST_BACKEND_USER_001" }],
  "updatedAt": "2026-06-17T09:00:00Z"
}
```

Expected success response: `{ "success": true, "item": { ... } }`.

### DELETE `/api/changeRequests/TEST_BACKEND_CHANGE_REQUEST_001`

Expected success response: `{ "success": true }`.

Expected 404 test: delete `TEST_BACKEND_CHANGE_REQUEST_MISSING`.

Expected 409 FK conflict test: attempt delete while dependent rows reference the change request, if enforced by your database.

## Incidents

### POST `/api/incidents`

```json
{
  "id": "TEST_BACKEND_INCIDENT_001",
  "reporterEmail": "TEST_BACKEND_incident@example.test",
  "title": "TEST_BACKEND Incident",
  "description": "TEST_BACKEND incident description",
  "type": "security",
  "priority": "high",
  "status": "open",
  "reportedAt": "2026-06-17T08:00:00Z",
  "assignedTo": "TEST_BACKEND_USER_001",
  "updatedAt": "2026-06-17T08:00:00Z",
  "closedAt": null,
  "attachments": ["TEST_BACKEND_ATTACHMENT_001"]
}
```

Expected success response: `{ "success": true, "item": { ... } }`.

Save: `item.id`.

### PUT `/api/incidents/TEST_BACKEND_INCIDENT_001`

```json
{
  "title": "TEST_BACKEND Incident Updated",
  "status": "in_progress",
  "updatedAt": "2026-06-17T09:00:00Z",
  "attachments": ["TEST_BACKEND_ATTACHMENT_001", "TEST_BACKEND_ATTACHMENT_002"]
}
```

Expected success response: `{ "success": true, "item": { ... } }`.

### DELETE `/api/incidents/TEST_BACKEND_INCIDENT_001`

Expected success response: `{ "success": true }`.

Expected 404 test: delete `TEST_BACKEND_INCIDENT_MISSING`.

Expected 409 FK conflict test: attempt delete while `TEST_BACKEND_INCIDENT_NOTE_001` or `TEST_BACKEND_INCIDENT_FEEDBACK_001` still references it.

## IncidentNotes

### POST `/api/incidentNotes`

```json
{
  "id": "TEST_BACKEND_INCIDENT_NOTE_001",
  "incidentId": "TEST_BACKEND_INCIDENT_001",
  "authorId": "TEST_BACKEND_USER_001",
  "authorName": "TEST_BACKEND User",
  "content": "TEST_BACKEND incident note",
  "createdAt": "2026-06-17T08:00:00Z",
  "attachments": ["TEST_BACKEND_ATTACHMENT_001"]
}
```

Expected success response: `{ "success": true, "item": { ... } }`.

Save: `item.id`.

### PUT `/api/incidentNotes/TEST_BACKEND_INCIDENT_NOTE_001`

```json
{
  "content": "TEST_BACKEND incident note updated",
  "attachments": ["TEST_BACKEND_ATTACHMENT_001", "TEST_BACKEND_ATTACHMENT_002"]
}
```

Expected success response: `{ "success": true, "item": { ... } }`.

### DELETE `/api/incidentNotes/TEST_BACKEND_INCIDENT_NOTE_001`

Expected success response: `{ "success": true }`.

Expected 404 test: delete `TEST_BACKEND_INCIDENT_NOTE_MISSING`.

Expected 409 FK conflict test: attempt delete while dependent rows reference the note, if enforced by your database.

## IncidentFeedback

### POST `/api/incidentFeedback`

```json
{
  "id": "TEST_BACKEND_INCIDENT_FEEDBACK_001",
  "incidentId": "TEST_BACKEND_INCIDENT_001",
  "rating": 5,
  "comment": "TEST_BACKEND feedback",
  "submittedAt": "2026-06-17T08:00:00Z"
}
```

Expected success response: `{ "success": true, "item": { ... } }`.

Save: `item.id`.

### PUT `/api/incidentFeedback/TEST_BACKEND_INCIDENT_FEEDBACK_001`

```json
{
  "rating": 4,
  "comment": "TEST_BACKEND feedback updated"
}
```

Expected success response: `{ "success": true, "item": { ... } }`.

### DELETE `/api/incidentFeedback/TEST_BACKEND_INCIDENT_FEEDBACK_001`

Expected success response: `{ "success": true }`.

Expected 404 test: delete `TEST_BACKEND_INCIDENT_FEEDBACK_MISSING`.

Expected 409 FK conflict test: attempt delete while dependent rows reference the feedback, if enforced by your database.

## Notifications

### POST `/api/notifications`

```json
{
  "id": "TEST_BACKEND_NOTIFICATION_001",
  "userId": "TEST_BACKEND_USER_001",
  "titleAr": "TEST_BACKEND إشعار",
  "titleEn": "TEST_BACKEND Notification",
  "messageAr": "TEST_BACKEND رسالة",
  "messageEn": "TEST_BACKEND notification message",
  "type": "info",
  "link": "/test-backend",
  "isRead": false,
  "createdAt": "2026-06-17T08:00:00Z"
}
```

Expected success response: `{ "success": true, "item": { ... } }`.

Save: `item.id`.

### PUT `/api/notifications/TEST_BACKEND_NOTIFICATION_001`

```json
{
  "titleEn": "TEST_BACKEND Notification Updated",
  "messageEn": "TEST_BACKEND updated notification message",
  "isRead": true
}
```

Expected success response: `{ "success": true, "item": { ... } }`.

### DELETE `/api/notifications/TEST_BACKEND_NOTIFICATION_001`

Expected success response: `{ "success": true }`.

Expected 404 test: delete `TEST_BACKEND_NOTIFICATION_MISSING`.

Expected 409 FK conflict test: attempt delete while dependent rows reference the notification, if enforced by your database.

## NotificationTemplates

### POST `/api/notificationTemplates`

```json
{
  "id": "TEST_BACKEND_NOTIFICATION_TEMPLATE_001",
  "name": "TEST_BACKEND Notification Template",
  "subject": "TEST_BACKEND Subject",
  "body": "TEST_BACKEND template body",
  "type": "info"
}
```

Expected success response: `{ "success": true, "item": { ... } }`.

Save: `item.id`.

### PUT `/api/notificationTemplates/TEST_BACKEND_NOTIFICATION_TEMPLATE_001`

```json
{
  "name": "TEST_BACKEND Notification Template Updated",
  "subject": "TEST_BACKEND Subject Updated",
  "body": "TEST_BACKEND updated template body"
}
```

Expected success response: `{ "success": true, "item": { ... } }`.

### DELETE `/api/notificationTemplates/TEST_BACKEND_NOTIFICATION_TEMPLATE_001`

Expected success response: `{ "success": true }`.

Expected 404 test: delete `TEST_BACKEND_NOTIFICATION_TEMPLATE_MISSING`.

Expected 409 FK conflict test: attempt delete while dependent rows reference the template, if enforced by your database.

## NotificationLogs

### POST `/api/notificationLogs`

```json
{
  "id": "TEST_BACKEND_NOTIFICATION_LOG_001",
  "recipientId": "TEST_BACKEND_USER_001",
  "recipientEmail": "TEST_BACKEND_USER_001@example.test",
  "recipientName": "TEST_BACKEND User",
  "type": "info",
  "subject": "TEST_BACKEND Notification Log Subject",
  "body": "TEST_BACKEND notification log body",
  "status": "sent",
  "sentAt": "2026-06-17T08:00:00Z",
  "errorMessage": null
}
```

Expected success response: `{ "success": true, "item": { ... } }`.

Save: `item.id`.

### PUT `/api/notificationLogs/TEST_BACKEND_NOTIFICATION_LOG_001`

```json
{
  "status": "failed",
  "errorMessage": "TEST_BACKEND simulated failure",
  "sentAt": "2026-06-17T09:00:00Z"
}
```

Expected success response: `{ "success": true, "item": { ... } }`.

### DELETE `/api/notificationLogs/TEST_BACKEND_NOTIFICATION_LOG_001`

Expected success response: `{ "success": true }`.

Expected 404 test: delete `TEST_BACKEND_NOTIFICATION_LOG_MISSING`.

Expected 409 FK conflict test: attempt delete while dependent rows reference the log, if enforced by your database.

## AuditLogs

### POST `/api/auditLogs`

```json
{
  "id": "TEST_BACKEND_AUDIT_LOG_001",
  "userId": "TEST_BACKEND_USER_001",
  "userName": "TEST_BACKEND User",
  "action": "TEST_BACKEND_CREATE",
  "entityType": "TEST_BACKEND_ENTITY",
  "entityId": "TEST_BACKEND_ENTITY_001",
  "oldValue": null,
  "newValue": { "name": "TEST_BACKEND value" },
  "timestamp": "2026-06-17T08:00:00Z",
  "ip": "127.0.0.1",
  "userAgent": "Swagger TEST_BACKEND"
}
```

Expected success response: `{ "success": true, "item": { ... } }`.

Save: `item.id`.

### PUT `/api/auditLogs/TEST_BACKEND_AUDIT_LOG_001`

```json
{
  "action": "TEST_BACKEND_UPDATE",
  "newValue": { "name": "TEST_BACKEND updated value" },
  "timestamp": "2026-06-17T09:00:00Z"
}
```

Expected success response: `{ "success": true, "item": { ... } }`.

### DELETE `/api/auditLogs/TEST_BACKEND_AUDIT_LOG_001`

Expected success response: `{ "success": true }`.

Expected 404 test: delete `TEST_BACKEND_AUDIT_LOG_MISSING`.

Expected 409 FK conflict test: attempt delete while dependent rows reference the audit log, if enforced by your database.

## Common Negative Tests

### Missing Item 404

For every implemented `PUT /api/{entity}/{id}` and `DELETE /api/{entity}/{id}`, use a missing id like `TEST_BACKEND_MISSING`.

Expected response:
```json
{
  "success": false,
  "error": "<Entity> not found"
}
```

### Unknown Field Rejection

For DTO-backed POST or PUT endpoints, add an unsupported property:
```json
{
  "id": "TEST_BACKEND_UNKNOWN_FIELD_001",
  "unexpectedField": true
}
```

Expected response: HTTP 400 with `{ "success": false, "error": "Payload contains unsupported fields" }`.

### FK Conflict 409

When a parent row is referenced by a child row, attempt to delete the parent first.

Examples:
- Delete framework before policy.
- Delete policy before policy item, standard, or procedure.
- Delete policy item before standard.
- Delete standard before procedure.
- Delete procedure before evidence.
- Delete incident before incident note or feedback.

Expected response:
```json
{
  "success": false,
  "error": "Cannot delete ..."
}
```

Only expect 409 where your SQL Server schema has an enforced foreign key.

## Cleanup Order

Do not delete real production data. Delete only rows whose ids or names start with `TEST_BACKEND_`.

Use this child-to-parent cleanup order:

1. `DELETE /api/auditLogs/TEST_BACKEND_AUDIT_LOG_001`
2. `DELETE /api/notificationLogs/TEST_BACKEND_NOTIFICATION_LOG_001`
3. `DELETE /api/notificationTemplates/TEST_BACKEND_NOTIFICATION_TEMPLATE_001`
4. `DELETE /api/notifications/TEST_BACKEND_NOTIFICATION_001`
5. `DELETE /api/incidentFeedback/TEST_BACKEND_INCIDENT_FEEDBACK_001`
6. `DELETE /api/incidentNotes/TEST_BACKEND_INCIDENT_NOTE_001`
7. `DELETE /api/incidents/TEST_BACKEND_INCIDENT_001`
8. `DELETE /api/changeRequests/TEST_BACKEND_CHANGE_REQUEST_001`
9. `DELETE /api/commitments/TEST_BACKEND_COMMITMENT_001`
10. `DELETE /api/risks/TEST_BACKEND_RISK_001`
11. `DELETE /api/evidence/TEST_BACKEND_EVIDENCE_001`
12. `DELETE /api/procedures/TEST_BACKEND_PROCEDURE_001`
13. `DELETE /api/standards/TEST_BACKEND_STANDARD_001`
14. `DELETE /api/policyItems/TEST_BACKEND_POLICY_ITEM_001`
15. `DELETE /api/policies/TEST_BACKEND_POLICY_001`

16. `DELETE /api/standardClassifications/TEST_BACKEND_CLASSIFICATION_001`
17. `DELETE /api/frameworks/TEST_BACKEND_FRAMEWORK_001`
18. `DELETE /api/lookupOptions/TEST_BACKEND_LOOKUP_001`
19. `DELETE /api/permissionGroups/TEST_BACKEND_PERMISSION_GROUP_001`
20. `DELETE /api/departments/TEST_BACKEND_DEPT_001`
21. `DELETE /api/teams/TEST_BACKEND_TEAM_001`
22. `DELETE /api/files/{saved-file-id}`
23. `DELETE /api/users/TEST_BACKEND_USER_001`

After cleanup, run compatibility GET endpoints again and confirm the `TEST_BACKEND_` rows are gone.
