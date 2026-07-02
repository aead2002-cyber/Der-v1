# Frontend Architecture Cleanup Summary

## Final Structure

The frontend now follows the target multi-platform shape:

- `src/app/` for application bootstrapping and routing
- `src/pages/` for standalone public/auth/root pages
- `src/shared/` for shared UI, layout, guards, theme, auth, config, and shared components
- `src/modules/der3/` for DER3 pages, components, services, routes, and platform config
- `src/modules/legal/` for Legal pages, components, services, routes, and platform config
- `src/services/` for global shared services only

## What Was Moved

- Public/auth/root pages were moved to `src/pages`
- DER3 pages were moved to `src/modules/der3/pages`
- DER3 components were moved to `src/modules/der3/components`
- DER3 services were moved to `src/modules/der3/services`
- Global shared components were moved to `src/shared/components`

## What Remains Intentionally

- `src/services/` remains for global shared services such as auth, public, reset-password, users, files, and API client helpers
- `src/components/ui/` remains as the legacy primitive UI layer
- `src/components/BrandMark.tsx` remains for now

## Validation Result

- `npm run lint` passed
- `npm run build` passed
- No stale imports were found for the moved pages, components, or services

## Important Unchanged Behavior

- Route paths were left unchanged
- API endpoint paths were left unchanged
- Procedure hierarchy behavior was left unchanged
- Incidents attachments, notes, and feedback behavior were left unchanged
- Layout auth, profile, and notifications behavior were left unchanged
- Public report anti-bot behavior was left unchanged
- Login and reset-password behavior were left unchanged

## Future Optional Cleanup

- Migrate or consolidate `src/components/ui/` later if the legacy primitive layer should be retired
- Retire `BrandMark.tsx` if it is confirmed unused
- Optionally clean up remaining Legal page wrapper duplication later
