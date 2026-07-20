# Dependency rules

## App Router

`src/app/**` may compose feature public APIs, reusable components, and server-only adapters. Domain logic must not be implemented in route files, layouts, loading states, or error boundaries.

## Features

A feature owns its contracts, UI, browser data access, policies, and server actions/services. Features may depend on `erp-core`, `lib`, `shared/hooks`, and reusable components. Features must not import from `src/app/**`.

## Components

`components/ui` contains product-neutral primitives and may depend only on external packages and low-level `lib` utilities. `components/common` may compose UI primitives but must not depend on routes or server code.

## Shared hooks and lib

`shared/hooks` and `lib` are lower-level capabilities. They must not import feature, route, or server modules. `lib` must remain safe for its declared runtime; server secrets and cookies belong in `src/server/**`.

## Server

`src/server/**` is server-only. Sensitive modules include `server-only` and must never be imported by a client module. Server callers inject authorization from HttpOnly cookies, validate actor context, use bounded timeouts, and call only the edge gateway.

## Enforcement

`npm run architecture:check` validates canonical paths, stale aliases, import resolution, client/server separation, raw fetch placement, environment access, and core toolchain contracts.

`npm run cycles:check` rejects runtime dependency cycles.
