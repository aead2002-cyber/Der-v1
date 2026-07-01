# Procedure Hierarchy Persistence Gap

## Current Behavior

Procedure hierarchy data is currently handled on the frontend only.
The UI stores `parentId`, `order`, and `weight` in localStorage through the procedure API overlay, then merges that overlay back into procedure reads so the tree view appears stable.

## Why This Is Risky

This means hierarchy is not a server-side source of truth.

- Different browsers or devices can show different hierarchy state.
- Clearing localStorage removes the hierarchy overlay.
- Backend consumers, exports, and future integrations cannot reliably read procedure hierarchy.
- The UI can appear correct even when the database does not actually persist the hierarchy.

## Required Database Columns

If hierarchy is persisted directly on `dbo.Procedure`, the minimal columns are:

- `parentId NVARCHAR(64) NULL`
- `[order] INT NULL`
- `weight INT NULL`

## Optional Constraints And Indexes

Recommended additions if the schema is updated:

- A self-reference foreign key from `parentId` to `dbo.Procedure(id)`
- An index on `parentId` for tree loading and sibling lookups

## Recommended Future Endpoint Approach

Option A:

- Extend `POST /api/procedures` and `PUT /api/procedures/{id}` to accept and persist hierarchy fields.

Option B:

- Add `PATCH /api/procedures/{id}/hierarchy` for hierarchy-only updates.

## Recommendation

Do not remove the localStorage overlay until backend persistence is implemented and tested end-to-end.
The overlay is currently a temporary compatibility layer, not a durable hierarchy store.
