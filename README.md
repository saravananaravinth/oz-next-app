# oz-next-app

Enterprise frontend for the Ozotec ERP platform, built with Next.js, React, strict TypeScript, shadcn/ui, and OpenNext Cloudflare.

`oz-next-app` provides the authenticated ERP workspace and public engagement experiences while preserving the platform's security, tenant-isolation, and API-boundary requirements.

## Architecture

```text
Public engagement flows
Browser
  -> oz-erp-edge Cloudflare Worker
  -> private oz-erp-api Cloud Run service

Protected ERP flows
Browser
  -> oz-next-app Next.js server boundary
  -> ERP_EDGE Cloudflare service binding
  -> oz-erp-edge Cloudflare Worker
  -> private oz-erp-api Cloud Run service
```

The frontend must never call the private Cloud Run service directly.

Production origins:

- Application: `https://erp.ozotecev.com`
- Public ERP edge: `https://api.erp.ozotecev.com`

## Core principles

- Secure, server-managed authentication using `Secure`, `HttpOnly`, `SameSite` cookies.
- Bearer tokens are injected only by server-side API callers.
- Protected ERP requests are routed through the `ERP_EDGE` Cloudflare service binding.
- Browser API access is restricted to explicitly approved public routes.
- Tenant, actor, organisation, dealer, financier, and customer context is never trusted solely from UI state.
- Authenticated ERP data defaults to `no-store`.
- API requests and responses are validated with strict Zod schemas.
- API failures use sanitized RFC 7807 problem details.
- Side-effect mutations use stable idempotency keys.
- TypeScript, lint, formatting, tests, production build, and dependency audit are mandatory merge gates.

## Technology stack

- Next.js 16 App Router
- React 19
- TypeScript with strict ESM configuration
- Node.js 24
- npm 12.0.1
- Tailwind CSS 4
- shadcn/ui and Base UI primitives
- React Hook Form and Zod
- TanStack Query, Table, and Virtual where justified
- OpenNext Cloudflare
- Wrangler

No new package should be added without architecture and security review.

## Repository structure

```text
src/
├── app/                     App Router routes, layouts, loading and error boundaries
├── components/
│   ├── ui/                  shadcn/ui primitives
│   ├── common/              Shared application components
│   └── app-shell/           Authenticated shell and navigation
├── features/                Domain-oriented ERP and engagement modules
├── hooks/                   Shared React hooks
├── lib/
│   ├── api/                 Typed API contracts, clients, schemas and problem parsing
│   ├── auth/                Client-safe authentication helpers
│   ├── query/               TanStack Query configuration and keys
│   ├── security/            Redirect, masking and browser-safe security helpers
│   └── env.ts               Central Zod-validated public environment contract
├── server/                  Server-only API callers, actions and Cloudflare bindings
└── tests/                   Contract and regression tests

public/                      Static assets
wrangler.toml                OpenNext Cloudflare Worker configuration
open-next.config.ts          OpenNext build configuration
.github/workflows/deploy.yml Production verification, deployment and release workflow
```

## Prerequisites

Install the exact supported toolchain:

```bash
node --version
npm --version
```

Expected versions:

```text
Node.js: 24.x
npm:     12.0.1
```

The repository declares:

```json
"packageManager": "npm@12.0.1"
```

## Local setup

Clone the repository and install dependencies from the committed lockfile:

```bash
git clone <repository-url>
cd oz-next-app
npm ci
```

Create `.env.local`:

```dotenv
NODE_ENV=development
NEXT_PUBLIC_APP_ENV=local
NEXT_PUBLIC_APP_ORIGIN=http://localhost:3000
NEXT_PUBLIC_API_BASE_URL=http://localhost:8787
NEXT_PUBLIC_AUTH_CLIENT_ID=erp-web
NEXT_PUBLIC_APP_VERSION=0.1.0
```

The local `NEXT_PUBLIC_API_BASE_URL` must point to a local `oz-erp-edge` Worker instance. It must not point to the private API service.

Start the application:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Environment contract

| Variable                     |                      Required | Description                                                                  |
| ---------------------------- | ----------------------------: | ---------------------------------------------------------------------------- |
| `NODE_ENV`                   |      Yes in CI and production | Node execution environment.                                                  |
| `NEXT_PUBLIC_APP_ENV`        | Yes in staging and production | `local`, `development`, `staging`, `production`, or `test`.                  |
| `NEXT_PUBLIC_APP_ORIGIN`     | Yes in staging and production | Absolute application origin without a path, query, fragment, or credentials. |
| `NEXT_PUBLIC_API_BASE_URL`   | Yes in staging and production | Public `oz-erp-edge` origin. Cloud Run URLs are rejected.                    |
| `NEXT_PUBLIC_AUTH_CLIENT_ID` | Yes in staging and production | Public ERP web client identifier.                                            |
| `NEXT_PUBLIC_APP_VERSION`    | Yes in staging and production | Release version exposed to the frontend.                                     |

Production values:

```dotenv
NODE_ENV=production
NEXT_PUBLIC_APP_ENV=production
NEXT_PUBLIC_APP_ORIGIN=https://erp.ozotecev.com
NEXT_PUBLIC_API_BASE_URL=https://api.erp.ozotecev.com
NEXT_PUBLIC_AUTH_CLIENT_ID=erp-web
NEXT_PUBLIC_APP_VERSION=<major.minor.patch>
```

Only non-sensitive values may use the `NEXT_PUBLIC_*` prefix. Never expose credentials, private service URLs, JWTs, service-account data, database URLs, Redis URLs, provider secrets, or webhook secrets.

## API integration rules

### Browser requests

Browser code may call only explicitly approved public ERP routes through the public edge origin.

Cross-origin browser requests:

- use `credentials: "omit"`;
- never send authentication cookies;
- never receive or handle bearer tokens;
- use centralized typed API clients;
- validate request and response payloads with Zod.

### Protected requests

Protected ERP requests use this path:

```text
Client component
  -> server action or route handler
  -> server-only API client
  -> ERP_EDGE service binding
  -> oz-erp-edge
```

Protected frontend code must not use scattered raw `fetch` calls.

### API envelopes

Successful responses use the canonical envelope:

```json
{
  "success": true,
  "data": {},
  "request_id": "...",
  "timestamp": "...",
  "meta": {}
}
```

Errors use sanitized RFC 7807 problem details. UI messages may surface safe fields such as status, code, request ID, and field validation errors. Backend diagnostics, SQL errors, stack traces, credentials, and tokens must never be displayed or logged.

## Authentication and sessions

- `/erp/auth/me` is the source of truth for the authenticated identity and effective permissions.
- Access and refresh tokens are stored only in server-set `Secure`, `HttpOnly`, `SameSite` cookies.
- Tokens must never be stored in local storage, session storage, IndexedDB, URLs, logs, analytics, or client-visible errors.
- Refresh rotation, logout, and session revocation are server-only operations.
- The Active Sessions workspace is available at `/account/sessions`.
- Current-session revocation clears authentication cookies and authenticated client state.
- Frontend route guards are UX controls; backend authorization remains authoritative.

## Tenant and actor isolation

Every protected feature must be actor-aware.

Actor context headers are supplied only when explicitly selected and are always revalidated by the backend. Supported context includes tenant, organisation unit, dealer organisation unit, financier, and customer scope.

Query keys must contain every relevant actor and tenant dimension plus filters, cursor, and sort state. On context changes, affected queries must be precisely invalidated or cleared. Cached data must never be reused across actors or tenants.

## Data fetching and caching

Authenticated ERP data defaults to:

```ts
cache: "no-store";
```

Do not publicly cache authentication, permissions, finance, customer, inventory, payment, warranty, session, or task-driven state.

Use:

- cursor pagination for large collections;
- server-side filtering and deterministic sorting;
- batching instead of N+1 request patterns;
- exact TanStack Query keys and invalidation;
- retries only for safe reads and explicitly idempotent mutations.

## Forms and uploads

- Use React Hook Form with strict Zod schemas.
- Reject unknown fields.
- Validate route parameters, query parameters, headers, cookies, and form data.
- Validate uploads by size, MIME type, extension, actor permission, tenant purpose, and domain purpose.
- Treat filenames and user-provided content as untrusted.
- Avoid `dangerouslySetInnerHTML`; sanitize and isolate content when unavoidable.
- Mask personally identifiable information unless the actor has permission to reveal it.

## User experience standards

The interface follows a premium, calm ERP design language:

- Server Components by default.
- Client Components only for genuine interaction.
- Accessible semantic markup and keyboard navigation.
- Visible, consistent focus states.
- Full dark-mode support.
- Reduced-motion support.
- Subtle, interruptible animation.
- Virtualized large lists and tables where appropriate.
- Responsive layouts with stable alignment and generous whitespace.

## Commands

| Command                  | Purpose                                                          |
| ------------------------ | ---------------------------------------------------------------- |
| `npm run dev`            | Start the local Next.js development server.                      |
| `npm run typecheck`      | Generate Next.js route types and run strict TypeScript checking. |
| `npm run lint`           | Run ESLint with zero warnings allowed.                           |
| `npm run lint:fix`       | Apply safe ESLint fixes.                                         |
| `npm run format`         | Format supported files with Prettier.                            |
| `npm run format:check`   | Verify Prettier formatting.                                      |
| `npm run test`           | Run Node contract and regression tests.                          |
| `npm run deps:validate`  | Reject invalid or conflicting dependency peer trees.             |
| `npm run check`          | Run typecheck, lint, format check, and tests.                    |
| `npm run build`          | Create the Next.js production build.                             |
| `npm run build:cf`       | Create the OpenNext Cloudflare bundle.                           |
| `npm run preview`        | Build and preview the Cloudflare output locally.                 |
| `npm run audit:prod`     | Audit production dependencies at high severity.                  |
| `npm run security:audit` | Audit the complete dependency graph at high severity.            |
| `npm run verify`         | Run the complete local production verification gate.             |
| `npm run cf:typegen`     | Regenerate Cloudflare binding types.                             |

## Required verification

Before opening or merging a pull request:

```bash
npm run verify
```

The verification pipeline includes:

```text
Next.js route type generation
Strict TypeScript validation
ESLint with zero warnings
Prettier formatting validation
Contract and regression tests
Next.js production build
Production dependency audit
Complete dependency graph audit
```

Moderate findings that have no compatible upstream remediation must be documented in
[`docs/security/dependency-advisories.md`](docs/security/dependency-advisories.md) with exposure,
compensating controls, and a review condition. High and critical findings remain release blockers.

## Dependency updates

Dependency updates are reviewed and applied explicitly. Keep TypeScript below 7 until
`typescript-eslint` supports it, keep `@types/node` on major 24 while the runtime is Node 24, and
keep ESLint below 10 until Next's bundled plugins accept it.

Every dependency update must regenerate `package-lock.json` with Node 24/npm 12, retain only exact
version-pinned install-script approvals, and complete a clean `npm ci` without blocked scripts. Run
`npm run verify`, the OpenNext build, Wrangler type generation and startup analysis, and
`wrangler deploy --dry-run` before deployment.

For Cloudflare-specific changes, also run:

```bash
npm run build:cf
```

Changes to authentication, cookies, middleware, API clients, routes, actor context, caching, environment validation, Wrangler configuration, OpenNext configuration, or CI require explicit security and deployment review.

## Cloudflare deployment

The production application is deployed as an OpenNext Cloudflare Worker.

Required bindings and platform configuration include:

- `ASSETS` for OpenNext static assets;
- `IMAGES` for image optimization;
- `WORKER_SELF_REFERENCE` for OpenNext self-routing;
- `ERP_EDGE` bound to `oz-erp-edge` for protected server-side ERP calls;
- production route `erp.ozotecev.com/*`;
- production environment protection in GitHub Actions.

The production Worker must fail closed when the `ERP_EDGE` binding is unavailable. A public network fallback is not permitted in staging or production.

## CI/CD and releases

The production workflow is defined in `.github/workflows/deploy.yml`.

It runs on pushes to `main` and manual dispatches through the protected `production` GitHub environment.

The workflow:

1. validates required configuration and the Wrangler manifest;
2. pins Node.js 24 and npm 12.0.1;
3. validates `package.json` and `package-lock.json` consistency;
4. installs dependencies with `npm ci`;
5. runs typecheck, lint, format validation, tests, production build, and audit;
6. resolves a release version from Conventional Commits or a manual override;
7. builds and validates the OpenNext Cloudflare output;
8. performs a Wrangler dry run;
9. deploys the Worker;
10. performs production smoke checks;
11. creates a GitHub release named `oz-next-app vX.Y.Z`.

Required GitHub production secrets:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`

Secrets are scoped only to steps that require them.

### Conventional Commit release mapping

| Commit type                             | Release                                                |
| --------------------------------------- | ------------------------------------------------------ |
| `feat:`                                 | Minor                                                  |
| `fix:`, `perf:`, `security:`, `revert:` | Patch                                                  |
| `BREAKING CHANGE:` or `type!:`          | Major                                                  |
| No releasable commit                    | Verification only; deployment and release are skipped. |

Manual dispatch supports `auto`, `patch`, `minor`, `major`, and `none`.

## Security requirements

Never:

- call the private Cloud Run API from frontend code;
- expose tokens or secrets to client bundles;
- store authentication tokens in browser-managed storage;
- trust tenant or actor identifiers from the browser as authority;
- cache protected data publicly;
- log authentication headers, cookies, passwords, OTPs, JWTs, API keys, signatures, financial data, government identifiers, addresses, or raw PII;
- weaken TypeScript, lint, validation, tests, or security controls to make a build pass;
- run `npm audit fix --force`; inspect `npm audit fix --dry-run --json`, upgrade explicit
  top-level dependencies, regenerate the lockfile, and run the complete verification gate instead;
- introduce an open redirect;
- perform cookie-authenticated mutations without Origin and CSRF protection;
- add Cloudflare data products or new dependencies without approval.

Safe logs may include request ID, correlation ID, route, operation, status, latency, and a sanitized error code.

## Development conventions

- Prefer Server Components.
- Keep feature code under `src/features/<domain>/`.
- Keep shadcn primitives under `src/components/ui/`.
- Keep typed API clients under `src/lib/api/`.
- Keep sensitive callers and bindings under `src/server/` and mark them server-only.
- Compile reusable schemas, regular expressions, constants, and table definitions at module scope.
- Use strict Zod schemas for request and response boundaries.
- Use exact imports and maintain strict ESM compatibility.
- Do not suppress TypeScript errors with unsafe assertions.
- Use precise diffs and include regression tests for bug fixes.

## Troubleshooting

### A typed `<Link>` route is rejected

Regenerate Next.js route types:

```bash
rm -rf .next
npm exec -- next typegen
npm run typecheck
```

Restart the TypeScript server in the editor after regenerating route types.

### Contract tests resolve `src/src/...`

Tests located in `src/tests/` must resolve the repository root using two parent directories. Do not construct repository paths relative to `src/` and then prepend another `src/` segment.

### Production server API calls fail

Confirm that:

- `wrangler.toml` defines the `ERP_EDGE` service binding;
- the binding targets `oz-erp-edge`;
- the public API origin targets `https://api.erp.ozotecev.com`;
- no Cloud Run URL is configured;
- staging and production use HTTPS origins.

### OpenNext output contains `__name`

Confirm `wrangler.toml` contains:

```toml
keep_names = false
```

Then remove `.open-next`, rebuild, and rerun the Cloudflare validation.

## Contribution workflow

1. Create a focused branch from the current `main` branch.
2. Make the smallest complete change that satisfies the domain contract.
3. Add or update tests for changed behavior.
4. Run `npm run verify`.
5. Run `npm run build:cf` for platform or deployment changes.
6. Use a Conventional Commit message.
7. Open a pull request with security, API, cache, migration, and test impact documented.

## License

Proprietary and confidential. Copyright © Ozotec.

This repository is marked `UNLICENSED`. Redistribution, publication, or external use is prohibited unless explicitly authorized by Ozotec.
