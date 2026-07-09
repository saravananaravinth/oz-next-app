// oz-next-app/open-next.config.ts
import { defineCloudflareConfig } from "@opennextjs/cloudflare";

/**
 * OpenNext Cloudflare adapter configuration for oz-next-app.
 *
 * Runtime topology:
 *   Browser -> oz-next-app OpenNext Worker -> oz-erp-edge Worker -> private oz-erp-api Cloud Run
 *
 * Keep this adapter config intentionally thin:
 * - Do not add ERP business logic here.
 * - Do not expose or reference Cloud Run URLs here.
 * - Do not configure R2, KV, D1, Queues, Durable Objects, or Analytics Engine here unless the
 *   corresponding Wrangler bindings and caching strategy are explicitly approved.
 * - Authenticated ERP data must remain no-store at the application API/client layer.
 *
 * The Worker entrypoint, static assets binding, image binding, public environment variables,
 * route, nodejs_compat, and self-reference service binding belong in wrangler.jsonc.
 */
export default defineCloudflareConfig();
