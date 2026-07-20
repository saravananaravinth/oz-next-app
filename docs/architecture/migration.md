# Architecture migration

## Migration characteristics

This migration is path- and boundary-focused. It preserves route URLs, exported runtime behavior, API request/response contracts, cookie names, actor headers, query semantics, and Cloudflare deployment behavior while making ownership explicit.

## High-impact moves

- Keep `middleware.ts` as the OpenNext Cloudflare compatibility boundary; `proxy.ts` is Node-only and is not supported by the current adapter.
- App-specific shell and tenant components moved from global components into feature modules.
- Generic hooks moved to `src/shared/hooks`.
- Provider composition moved to the App Router private folder `src/app/_providers`.
- Public engagement implementations renamed by business capability and split into `api`, `contracts`, `ui`, and `server` folders.
- `features/erp/shared` flattened into `features/erp-core`.
- Root `lib` dumping-ground files moved into explicit capability folders.
- Compatibility facades `lib/api.ts`, `lib/api-server.ts`, and `lib/query.tsx` removed.
- Server transport files renamed to expose their edge and request-context responsibilities.

The complete old-to-new path mapping is recorded in `migration-map.json`.

## Rollout

1. Apply the migration as one atomic commit; partial path application is unsupported.
2. Run `npm ci` with npm 12.0.1 and the repository lockfile.
3. Run the verification commands listed in the root handoff report.
4. Deploy to a non-production Worker route and smoke test authentication, context switching, public forms, warranty uploads/downloads, and logout.
5. Promote the immutable Worker artifact after smoke verification.

## Rollback

Rollback by redeploying the previous immutable Worker version and reverting the migration commit. No backend or database migration is required because public routes and API contracts are unchanged.
