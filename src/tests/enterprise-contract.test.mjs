// oz-next-app/src/tests/enterprise-contract.test.mjs
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const TEST_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(TEST_DIRECTORY, "../..");

async function source(relativePath) {
  return await readFile(resolve(PROJECT_ROOT, relativePath), "utf8");
}

test("browser ERP requests omit credentials and are public-route constrained", async () => {
  const [client, constants] = await Promise.all([
    source("src/lib/api/client.ts"),
    source("src/lib/constants.ts"),
  ]);

  assert.match(client, /credentials:\s*"omit"/u);
  assert.doesNotMatch(client, /credentials:\s*"include"/u);
  assert.match(client, /const auth = options\.auth \?\? false;/u);
  assert.match(constants, /BROWSER_API_ALLOWED_EXACT_PATHS/u);
  assert.match(constants, /"\/erp\/auth\/login\/otp\/request"/u);
  assert.match(constants, /"\/erp\/engagement\/public"/u);
  assert.doesNotMatch(
    constants,
    /BROWSER_API_ALLOWED_PREFIXES\s*=\s*\[\s*"\/erp"/u,
  );
});

test("operational backend routes are blocked at root and ERP prefixes", async () => {
  const constants = await source("src/lib/constants.ts");

  for (const path of [
    "/tasks",
    "/metrics",
    "/readyz",
    "/healthz",
    "/livez",
    "/version",
    "/erp/metrics",
    "/erp/readyz",
    "/erp/healthz",
    "/erp/livez",
    "/erp/version",
  ]) {
    assert.ok(constants.includes(`"${path}"`), `missing blocked path ${path}`);
  }
});

test("ordinary JSON request limits match the edge one-megabyte contract", async () => {
  const [browserClient, serverClient] = await Promise.all([
    source("src/lib/api/client.ts"),
    source("src/server/api/server-client.ts"),
  ]);

  assert.match(browserClient, /MAX_JSON_BODY_BYTES = 1 \* 1024 \* 1024/u);
  assert.match(serverClient, /MAX_JSON_BODY_BYTES = 1 \* 1024 \* 1024/u);
});

test("production server calls fail closed without the ERP_EDGE binding", async () => {
  const serverClient = await source("src/server/api/server-client.ts");

  assert.match(serverClient, /ALLOW_PUBLIC_EDGE_FALLBACK/u);
  assert.match(serverClient, /erp_edge_binding_unavailable/u);
  assert.match(serverClient, /API_CONFIG\.appEnv !== "production"/u);
  assert.match(serverClient, /API_CONFIG\.appEnv !== "staging"/u);
});

test("API errors retain Retry-After and exposed rate-limit metadata", async () => {
  const [envelope, problem] = await Promise.all([
    source("src/lib/api/envelope.ts"),
    source("src/lib/api/problem.ts"),
  ]);

  assert.match(envelope, /headers\.get\(HDR\.RETRY_AFTER\)/u);
  assert.match(envelope, /HDR\.RATE_LIMIT_REMAINING/u);
  assert.match(problem, /RateLimitMetadata/u);
});

test("auth sessions preserve pagination metadata and enforce same-origin mutation", async () => {
  const actions = await source("src/features/auth/server/auth-actions.ts");

  assert.match(actions, /serverEnvelopeFetch/u);
  assert.match(actions, /authSessionsMetaSchema/u);
  assert.match(actions, /assertSameOriginMutation\(API_CONFIG\.appOrigin\)/u);
  assert.match(actions, /revokeAuthSessionAction/u);
});

test("dealer dashboard uses explicit capabilities rather than a coarse manage flag", async () => {
  const [access, page, controls] = await Promise.all([
    source("src/features/engagement/dealer-dashboard/access.ts"),
    source(
      "src/features/engagement/dealer-dashboard/components/dealer-dashboard-page.tsx",
    ),
    source(
      "src/features/engagement/dealer-dashboard/components/dealer-dashboard-controls.tsx",
    ),
  ]);

  assert.match(access, /canCreateOwnerGuide/u);
  assert.match(access, /canDisableOwnerGuide/u);
  assert.match(access, /effectivePermissions/u);
  assert.doesNotMatch(page, /canManageOwnerGuides/u);
  assert.match(controls, /capabilities\.canSendOwnerGuideAppLink/u);
});

test("obsolete manual Owner Guide endpoint is not present", async () => {
  const endpoints = await source("src/lib/api/endpoints.ts");
  assert.doesNotMatch(endpoints, /manual-start/u);
  assert.doesNotMatch(endpoints, /manualOwnerGuideFlow/u);
});

test("public API configuration rejects direct Cloud Run origins", async () => {
  const env = await source("src/lib/env.ts");

  assert.match(env, /\.run\.app/u);
  assert.match(env, /NEXT_PUBLIC_API_BASE_URL/u);
  assert.match(env, /requiredInStrictEnvironment/u);
  assert.match(env, /"http:\/\/localhost:8787"/u);
  assert.doesNotMatch(env, /api\.ozotecev\.com/u);
});

test("browser mutation idempotency is validated and stabilized before retries", async () => {
  const client = await source("src/lib/api/client.ts");

  assert.match(client, /code: "invalid_idempotency_key"/u);
  assert.match(client, /const normalizedOptions: BrowserApiOptions<T>/u);
  assert.match(
    client,
    /idempotencyKey: normalizeIdempotencyKey\(options\.idempotencyKey\)/u,
  );
  assert.match(client, /execute\(path, normalizedOptions, false\)/u);
});

test("production environment and CI enforce the pinned secure deployment contract", async () => {
  const [env, workflow, packageJson] = await Promise.all([
    source("src/lib/env.ts"),
    source(".github/workflows/deploy.yml"),
    source("package.json"),
  ]);

  assert.match(env, /NEXT_PUBLIC_APP_ORIGIN\.startsWith\("https:\/\/"\)/u);
  assert.match(env, /NEXT_PUBLIC_API_BASE_URL\.startsWith\("https:\/\/"\)/u);
  assert.match(env, /NODE_ENV: process\.env\.NODE_ENV/u);
  assert.match(env, /nodeEnvironment === "production"/u);
  assert.match(env, /"NEXT_PUBLIC_APP_VERSION",/u);
  assert.match(workflow, /NPM_VERSION: "11\.16\.0"/u);
  assert.match(workflow, /run: npm run build\n/u);
  assert.match(workflow, /run: npm run build:cf/u);
  assert.match(
    workflow,
    /release_title="\$\{RELEASE_NAME\} v\$\{next_version\}"/u,
  );
  assert.match(workflow, /location_value=/u);
  assert.match(workflow, /"\$\{APP_ORIGIN\}\/login"/u);
  assert.match(packageJson, /"packageManager": "npm@11\.16\.0"/u);
});
