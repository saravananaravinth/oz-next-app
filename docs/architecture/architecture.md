# oz-next-app architecture

## Purpose

`oz-next-app` is the browser and server-rendered ERP presentation tier. It composes Next.js App Router routes, enforces secure server boundaries, and communicates only with the approved `oz-erp-edge` `/erp/**` surface. It does not own backend authorization, tenant isolation, transactions, durable idempotency, or audit truth.

## Canonical dependency direction

```text
app routes and boundaries
        ↓
feature modules
        ↓
components/common + components/ui
        ↓
lib capabilities + shared hooks

server-only feature code and app routes
        ↓
server adapters
        ↓
lib contracts/security/config
```

Imports must not point upward. Client modules must never import `src/server/**`, `*.server.ts`, or server action implementations.

## Repository layout

```text
src/
|-- app/                         # Route entries, layouts, loading/error boundaries, route handlers
|   `-- _providers/              # App-level provider composition excluded from routing
|-- components/
|   |-- ui/                      # shadcn/Radix primitives only
|   `-- common/                  # Reusable product-neutral compositions and guards
|-- features/
|   |-- app-shell/               # Authenticated ERP shell/navigation
|   |-- auth/                    # Authentication UI, browser API, contracts, server actions
|   |-- dashboard/               # Workspace dashboard
|   |-- engagement/              # Engagement domain workflows
|   |-- erp-core/                # Actor-scoped feature/query foundations
|   `-- tenant-context/          # Tenant/context selection UX
|-- lib/
|   |-- api/                     # Typed edge transport, envelopes, RFC 7807, API contracts
|   |-- auth/                    # Browser/shared auth helpers; no server cookie implementation
|   |-- env/                     # Zod-validated public environment
|   |-- observability/           # Redacted browser-safe logging
|   |-- query/                   # TanStack Query client and stable scoped keys
|   |-- runtime/                 # Browser/runtime guards
|   |-- security/                # Navigation, scanner routes, request identifiers
|   |-- types/                   # Framework-neutral utility types
|   `-- ui-preferences/          # Non-sensitive UI preference keys
|-- server/
|   |-- api/                     # Server-only edge callers and request-context headers
|   |-- auth/                    # HttpOnly cookie/token/session lifecycle
|   `-- security/                # Origin validation
|-- shared/hooks/                # Generic client hooks without domain dependencies
`-- types/                       # Ambient compatibility declarations only
```

## Route boundary

The root pre-request boundary remains in `middleware.ts` because OpenNext Cloudflare supports Edge Middleware but not the Node-only Next.js 16 `proxy.ts` runtime. Middleware remains a coarse security and UX gate only. Authoritative authentication and authorization remain in protected server layouts/actions and in `oz-erp-api`.

## API boundary

- Browser transport: `src/lib/api/browser-client.ts`.
- Server transport: `src/server/api/edge-api-client.ts`.
- Browser and server callers target the public Worker origin only.
- Approved routes are restricted to `/erp/**`; task and operational routes remain blocked.
- Responses are validated using `src/lib/api/contracts.ts`, success envelopes, and RFC 7807 parsing.
- Authenticated ERP data uses `cache: "no-store"` and actor-scoped query keys.

## Naming rules

- Route files retain Next.js names such as `page.tsx`, `layout.tsx`, `route.ts`, `error.tsx`, and `loading.tsx`.
- Domain files use descriptive suffixes: `.client.ts`, `.server.ts`, `.actions.ts`, `.policy.ts`, `.schema.ts`, `.service.ts`, and `.adapter.ts`.
- Generic names such as `client.ts`, `server.ts`, `schemas.ts`, `actions.ts`, and `access.ts` are prohibited inside domain modules.
- `index.ts` is permitted only as an intentional public module boundary.
