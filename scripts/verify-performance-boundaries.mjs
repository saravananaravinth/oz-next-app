// oz-next-app/scripts/verify-performance-boundaries.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const FILE = {
  rootProviders: "src/app/_providers/app-providers.tsx",
  authLayout: "src/app/(auth)/layout.tsx",
  protectedLayout: "src/app/(protected)/layout.tsx",
  extendedWarrantyPage: "src/app/(protected)/extended-warranty/page.tsx",
  extendedWarrantyWorkspace:
    "src/features/extended-warranty/ui/admin-workspace.tsx",
  extendedWarrantyDetail:
    "src/features/extended-warranty/ui/workspace-detail-sheet.tsx",
};

const MAX_EXTENDED_WARRANTY_WORKSPACE_LINES = 1_300;
const MAX_EXTENDED_WARRANTY_DETAIL_LINES = 900;

const errors = [];

function fail(message) {
  errors.push(message);
}

function read(relativePath) {
  const absolutePath = path.join(ROOT, relativePath);

  if (!fs.existsSync(absolutePath)) {
    fail(`Missing required file ${relativePath}.`);
    return "";
  }

  return fs.readFileSync(absolutePath, "utf8");
}

function lineCount(source) {
  if (source.length === 0) {
    return 0;
  }

  return source.split(/\r?\n/u).length;
}

function requireMatch(relativePath, source, pattern, description) {
  if (!pattern.test(source)) {
    fail(`${relativePath} must ${description}.`);
  }
}

function requireNoMatch(relativePath, source, pattern, description) {
  if (pattern.test(source)) {
    fail(`${relativePath} must not ${description}.`);
  }
}

const rootProviders = read(FILE.rootProviders);
const authLayout = read(FILE.authLayout);
const protectedLayout = read(FILE.protectedLayout);
const extendedWarrantyPage = read(FILE.extendedWarrantyPage);
const extendedWarrantyWorkspace = read(FILE.extendedWarrantyWorkspace);
const extendedWarrantyDetail = read(FILE.extendedWarrantyDetail);

/*
 * Global provider boundary
 *
 * Public routes must not inherit protected ERP-only query/tooltip runtime.
 */
requireNoMatch(
  FILE.rootProviders,
  rootProviders,
  /\bAppQueryProvider\b/u,
  "install AppQueryProvider globally",
);

requireNoMatch(
  FILE.rootProviders,
  rootProviders,
  /\bTooltipProvider\b/u,
  "install TooltipProvider globally",
);

requireNoMatch(
  FILE.rootProviders,
  rootProviders,
  /\bNuqsAdapter\b/u,
  "install NuqsAdapter globally",
);

/*
 * Auth and protected route boundaries
 */
requireMatch(
  FILE.authLayout,
  authLayout,
  /<AppQueryProvider(?:\s|>)/u,
  "install AppQueryProvider within the authentication route boundary",
);

requireMatch(
  FILE.protectedLayout,
  protectedLayout,
  /<AppQueryProvider(?:\s|>)/u,
  "install AppQueryProvider within the protected ERP route boundary",
);

requireMatch(
  FILE.protectedLayout,
  protectedLayout,
  /<TooltipProvider(?:\s|>)/u,
  "install TooltipProvider within the protected ERP route boundary",
);

/*
 * Extended Warranty client-island boundary
 *
 * The detail surface must remain lazy-loaded. The checks intentionally ignore
 * Prettier whitespace and line wrapping.
 */
requireMatch(
  FILE.extendedWarrantyWorkspace,
  extendedWarrantyWorkspace,
  /\bReact\.lazy\s*\(/u,
  "lazy-load the Extended Warranty detail surface with React.lazy",
);

requireMatch(
  FILE.extendedWarrantyWorkspace,
  extendedWarrantyWorkspace,
  /await\s+import\s*\(\s*["']@\/features\/extended-warranty\/ui\/workspace-detail-sheet["']\s*\)/u,
  'dynamically import "@/features/extended-warranty/ui/workspace-detail-sheet"',
);

requireNoMatch(
  FILE.extendedWarrantyWorkspace,
  extendedWarrantyWorkspace,
  /\bfrom\s*["']@\/features\/extended-warranty\/ui\/workspace-detail-sheet["']/u,
  "statically import the Extended Warranty detail sheet",
);

requireMatch(
  FILE.extendedWarrantyWorkspace,
  extendedWarrantyWorkspace,
  /<React\.Suspense(?:\s|>)/u,
  "keep the lazy detail surface behind React.Suspense",
);

requireMatch(
  FILE.extendedWarrantyWorkspace,
  extendedWarrantyWorkspace,
  /\bdetailPromise\b/u,
  "retain the deferred detailPromise boundary",
);

/*
 * Server-to-client deferred-detail contract
 */
requireMatch(
  FILE.extendedWarrantyPage,
  extendedWarrantyPage,
  /detailPromise\s*=\s*\{\s*detailPromise\s*\}/u,
  "pass the deferred detail promise into the workspace",
);

requireMatch(
  FILE.extendedWarrantyDetail,
  extendedWarrantyDetail,
  /\bReact\.use\s*\(\s*detailPromise\s*\)/u,
  "resolve the deferred detail promise with React.use",
);

/*
 * Client-island size budgets
 */
const workspaceLines = lineCount(extendedWarrantyWorkspace);
const detailLines = lineCount(extendedWarrantyDetail);

if (workspaceLines > MAX_EXTENDED_WARRANTY_WORKSPACE_LINES) {
  fail(
    `${FILE.extendedWarrantyWorkspace} is ${String(
      workspaceLines,
    )} lines; keep the base client island at or below ${String(
      MAX_EXTENDED_WARRANTY_WORKSPACE_LINES,
    )}.`,
  );
}

if (detailLines > MAX_EXTENDED_WARRANTY_DETAIL_LINES) {
  fail(
    `${FILE.extendedWarrantyDetail} is ${String(
      detailLines,
    )} lines; split the lazy detail island before it exceeds ${String(
      MAX_EXTENDED_WARRANTY_DETAIL_LINES,
    )}.`,
  );
}

if (errors.length > 0) {
  process.stderr.write(
    `Performance boundary verification failed with ${String(
      errors.length,
    )} issue(s):\n`,
  );

  for (const error of errors) {
    process.stderr.write(`- ${error}\n`);
  }

  process.exit(1);
}

process.stdout.write(
  `Performance boundary verification passed (workspace ${String(
    workspaceLines,
  )} lines, lazy detail ${String(detailLines)} lines).\n`,
);
