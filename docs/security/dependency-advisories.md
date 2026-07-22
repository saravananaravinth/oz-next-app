# Dependency advisory register

This register records accepted dependency findings that remain after upgrading to the latest
mutually compatible stable dependency graph. High and critical findings are release blockers.

## GHSA-frvp-7c67-39w9

- **Status:** Temporarily accepted on 2026-07-22; review on every dependency update.
- **Severity:** Moderate.
- **Path:** `shadcn` -> `@modelcontextprotocol/sdk` -> `@hono/node-server`.
- **Affected behavior:** Encoded-backslash path traversal in Hono's Windows `serve-static` adapter.
- **ERP exposure:** Development dependency only. It is absent from `npm audit --omit=dev`, the
  OpenNext production bundle does not start this Hono static server, and supported development and
  CI environments are Linux.
- **Remediation:** Upgrade immediately when shadcn or its MCP dependency admits
  `@hono/node-server@2.0.5` or newer. Do not downgrade shadcn or use `npm audit fix --force`.
- **Compensating controls:** Keep the CLI out of production dependencies, do not expose its local
  MCP/static server, and retain both production and complete dependency audits in CI. The complete
  audit uses an exact allowlist and fails if this dependency path, advisory identity, or severity
  count changes, including when an upstream fix makes this exception stale.

Advisory: <https://github.com/advisories/GHSA-frvp-7c67-39w9>
