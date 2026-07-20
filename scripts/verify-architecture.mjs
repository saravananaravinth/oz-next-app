import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const SOURCE_EXTENSIONS = [
  ".ts",
  ".tsx",
  ".d.ts",
  ".js",
  ".jsx",
  ".mjs",
  ".mts",
  ".json",
  ".css",
];
const CODE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".d.ts",
  ".js",
  ".jsx",
  ".mjs",
  ".mts",
]);
const IMPORT_PATTERN =
  /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)(["'])([^"']+)\1/gu;

const requiredPaths = [
  "middleware.ts",
  "src/app/layout.tsx",
  "src/app/_providers/app-providers.tsx",
  "src/components/ui",
  "src/components/common",
  "src/features/app-shell",
  "src/features/auth",
  "src/features/engagement",
  "src/features/erp-core",
  "src/features/tenant-context",
  "src/lib/api/browser-client.ts",
  "src/lib/api/contracts.ts",
  "src/lib/api/http-contract.ts",
  "src/lib/auth",
  "src/lib/env/public-env.ts",
  "src/lib/observability/logger.ts",
  "src/lib/query",
  "src/lib/runtime/browser-runtime.ts",
  "src/lib/security/navigation.ts",
  "src/server/api/edge-api-client.ts",
  "src/server/api/request-context-headers.ts",
  "src/server/auth",
  "src/server/auth/session-cookie-policy.ts",
  "src/shared/hooks",
];

const forbiddenPaths = [
  "proxy.ts",
  "src/providers",
  "src/hooks",
  "src/components/app-shell",
  "src/components/content",
  "src/components/feedback",
  "src/components/guards",
  "src/components/tenant",
  "src/features/erp",
  "src/features/engagement/public-dealer-leads",
  "src/features/engagement/public-dealership",
  "src/features/engagement/public-location",
  "src/features/engagement/public-service-feedback",
  "src/features/engagement/public-warranty",
  "src/lib/api.ts",
  "src/lib/api-server.ts",
  "src/lib/query.tsx",
  "src/lib/constants.ts",
  "src/lib/env.ts",
  "src/lib/errors.ts",
  "src/lib/logger.ts",
  "src/lib/runtime-web.ts",
  "src/lib/scanner-routes.ts",
  "src/lib/security.ts",
  "src/lib/types.ts",
  "src/lib/uuid.ts",
  "src/lib/auth/session-cookies.ts",
  "src/server/fetch.ts",
  "src/server/api/request-context.ts",
  "src/server/api/server-client.ts",
];

const errors = [];

function exists(relativePath) {
  return fs.existsSync(path.join(ROOT, relativePath));
}

function fail(message) {
  errors.push(message);
}

for (const requiredPath of requiredPaths) {
  if (!exists(requiredPath)) {
    fail(`Missing canonical architecture path: ${requiredPath}`);
  }
}

for (const forbiddenPath of forbiddenPaths) {
  if (exists(forbiddenPath)) {
    fail(`Legacy architecture path must not exist: ${forbiddenPath}`);
  }
}

const packageJson = JSON.parse(
  fs.readFileSync(path.join(ROOT, "package.json"), "utf8"),
);
if (packageJson.packageManager !== "npm@12.0.1") {
  fail("packageManager must be pinned to npm@12.0.1.");
}
if (packageJson.engines?.node !== ">=24.15.0 <25.0.0") {
  fail("Node.js engine must remain >=24.15.0 <25.0.0.");
}
if (packageJson.engines?.npm !== ">=12.0.1 <13.0.0") {
  fail("npm engine must remain >=12.0.1 <13.0.0.");
}
for (const scriptName of [
  "architecture:check",
  "cycles:check",
  "typecheck",
  "lint",
  "format:check",
  "test",
  "build",
  "build:cf",
]) {
  if (typeof packageJson.scripts?.[scriptName] !== "string") {
    fail(`Missing package script: ${scriptName}`);
  }
}

const tsconfig = JSON.parse(
  fs.readFileSync(path.join(ROOT, "tsconfig.json"), "utf8"),
);
const includes = Array.isArray(tsconfig.include) ? tsconfig.include : [];
if (!includes.includes("middleware.ts")) {
  fail("tsconfig.json must include middleware.ts for OpenNext Cloudflare.");
}
if (includes.includes("proxy.ts")) {
  fail("tsconfig.json must not include unsupported proxy.ts.");
}

const componentsJson = JSON.parse(
  fs.readFileSync(path.join(ROOT, "components.json"), "utf8"),
);
if (componentsJson.aliases?.hooks !== "@/shared/hooks") {
  fail("components.json hooks alias must be @/shared/hooks.");
}
if (componentsJson.aliases?.ui !== "@/components/ui") {
  fail("components.json ui alias must remain @/components/ui.");
}

function walk(directory) {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (
      ["node_modules", ".next", ".open-next", ".wrangler", ".git"].includes(
        entry.name,
      )
    ) {
      continue;
    }
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walk(absolutePath));
    else files.push(absolutePath);
  }
  return files;
}

const allFiles = walk(ROOT);
const relativeFiles = new Set(
  allFiles.map((filePath) =>
    path.relative(ROOT, filePath).split(path.sep).join("/"),
  ),
);
const codeFiles = allFiles.filter(
  (filePath) =>
    CODE_EXTENSIONS.has(path.extname(filePath)) || filePath.endsWith(".d.ts"),
);
const applicationCodeFiles = codeFiles.filter((filePath) => {
  const relativePath = path.relative(ROOT, filePath).split(path.sep).join("/");
  return (
    relativePath.startsWith("src/") ||
    relativePath === "middleware.ts" ||
    relativePath === "next.config.ts"
  );
});

function normalizePosix(value) {
  const normalized = path.posix.normalize(value);
  return normalized.startsWith("./") ? normalized.slice(2) : normalized;
}

function resolveInternal(importerRelativePath, specifier) {
  let base;
  if (specifier.startsWith("@/")) {
    base = `src/${specifier.slice(2)}`;
  } else if (specifier.startsWith(".")) {
    base = normalizePosix(
      path.posix.join(path.posix.dirname(importerRelativePath), specifier),
    );
  } else {
    return null;
  }

  const candidates = [base];
  if (!SOURCE_EXTENSIONS.some((extension) => base.endsWith(extension))) {
    for (const extension of SOURCE_EXTENSIONS)
      candidates.push(`${base}${extension}`);
    for (const extension of SOURCE_EXTENSIONS)
      candidates.push(`${base}/index${extension}`);
  }
  return candidates.find((candidate) => relativeFiles.has(candidate)) ?? null;
}

function isClientModule(source) {
  return /^\s*(?:\/\/[^\n]*\n|\/\*[\s\S]*?\*\/\s*)*["']use client["'];/u.test(
    source,
  );
}

function checkLayerBoundary(importer, specifier) {
  if (
    importer.startsWith("src/components/ui/") &&
    /^(?:@\/)?(?:src\/)?(?:app|features|server)\//u.test(specifier)
  ) {
    fail(
      `${importer} must not import application, feature, or server modules: ${specifier}`,
    );
  }
  if (
    importer.startsWith("src/components/common/") &&
    /^(?:@\/)?(?:src\/)?(?:app|server)\//u.test(specifier)
  ) {
    fail(`${importer} must not import app or server modules: ${specifier}`);
  }
  if (
    importer.startsWith("src/shared/") &&
    /^(?:@\/)?(?:src\/)?(?:app|features|server)\//u.test(specifier)
  ) {
    fail(
      `${importer} must not depend on app, feature, or server modules: ${specifier}`,
    );
  }
  if (
    importer.startsWith("src/lib/") &&
    /^(?:@\/)?(?:src\/)?(?:app|features|components|server)\//u.test(specifier)
  ) {
    fail(
      `${importer} must remain framework/domain infrastructure and cannot import ${specifier}`,
    );
  }
  if (
    importer.startsWith("src/server/") &&
    /^(?:@\/)?(?:src\/)?(?:app|components)\//u.test(specifier)
  ) {
    fail(`${importer} must not import route or UI modules: ${specifier}`);
  }
  if (
    importer.startsWith("src/features/") &&
    /^(?:@\/)?(?:src\/)?app\//u.test(specifier)
  ) {
    fail(`${importer} must not import App Router modules: ${specifier}`);
  }
}

for (const absolutePath of applicationCodeFiles) {
  const relativePath = path
    .relative(ROOT, absolutePath)
    .split(path.sep)
    .join("/");
  const source = fs.readFileSync(absolutePath, "utf8");
  const clientModule = isClientModule(source);

  if (
    source.includes("process.env") &&
    !relativePath.startsWith("src/lib/env/") &&
    relativePath !== "next.config.ts"
  ) {
    fail(
      `${relativePath} reads process.env outside src/lib/env/** or next.config.ts.`,
    );
  }

  const rawFetchAllowed = new Set([
    "src/lib/api/browser-client.ts",
    "src/lib/api/same-origin-client.ts",
    "src/server/api/edge-api-client.ts",
  ]);
  if (
    /\b(?:fetch|globalThis\.fetch)\s*\(/u.test(source) &&
    !rawFetchAllowed.has(relativePath)
  ) {
    fail(
      `${relativePath} contains a raw fetch call outside an approved transport adapter.`,
    );
  }

  IMPORT_PATTERN.lastIndex = 0;
  for (const match of source.matchAll(IMPORT_PATTERN)) {
    const specifier = match[2];
    if (specifier === undefined) continue;
    const resolved = resolveInternal(relativePath, specifier);
    if (
      (specifier.startsWith("@/") || specifier.startsWith(".")) &&
      resolved === null
    ) {
      fail(`${relativePath} has an unresolved internal import: ${specifier}`);
      continue;
    }
    if (clientModule && resolved !== null) {
      if (
        resolved.startsWith("src/server/") ||
        /\.server\.(?:ts|tsx)$/u.test(resolved)
      ) {
        fail(
          `${relativePath} is a client module importing server-only code: ${specifier}`,
        );
      }
    }
    checkLayerBoundary(relativePath, specifier);
  }
}

const legacyReferencePatterns = [
  "@/providers",
  "@/hooks",
  "@/components/app-shell",
  "@/components/content",
  "@/components/feedback",
  "@/components/guards",
  "@/components/tenant",
  "@/features/erp/shared",
  "@/features/engagement/public-",
  "@/lib/api-server",
  "@/lib/constants",
  "@/lib/errors",
  "@/lib/logger",
  "@/lib/runtime-web",
  "@/lib/scanner-routes",
  "@/lib/uuid",
  "@/server/fetch",
  "@/server/api/request-context",
  "@/server/api/server-client",
];
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

for (const absolutePath of applicationCodeFiles) {
  const relativePath = path
    .relative(ROOT, absolutePath)
    .split(path.sep)
    .join("/");
  const source = fs.readFileSync(absolutePath, "utf8");
  for (const pattern of legacyReferencePatterns) {
    const matcher = new RegExp(`${escapeRegExp(pattern)}(?=["'/]|$)`, "u");
    if (matcher.test(source))
      fail(`${relativePath} still references legacy alias ${pattern}.`);
  }
}

if (errors.length > 0) {
  console.error(
    `Architecture verification failed with ${errors.length} issue(s):`,
  );
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `Architecture verification passed for ${applicationCodeFiles.length} application code files.`,
);
