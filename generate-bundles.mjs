// oz-next-app/generate-bundles.mjs

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmodSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { basename, extname, join, relative, resolve } from "node:path";
import process from "node:process";

const EXPECTED_REPOSITORY_NAME = "oz-next-app";
const DEFAULT_OUTPUT_DIRECTORY = "bundles";
const MANIFEST_FILE_NAME = "oz-next-app-bundles.manifest.json";
const HEADER_SCAN_LIMIT = 16;

const CONTENT_EXCLUDED_FILE_NAMES = new Set([
  "package-lock.json",
  "npm-shrinkwrap.json",
  "yarn.lock",
  "pnpm-lock.yaml",
]);

const BUNDLE_DEFINITIONS = Object.freeze([
  {
    output: "oz-next-app-app.md",
    title: "App Folder Bundle",
    treeRoot: "app",
    sourcePrefix: "src/app/",
    mode: "prefix",
  },
  {
    output: "oz-next-app-components.md",
    title: "Components Folder Bundle",
    treeRoot: "components",
    sourcePrefix: "src/components/",
    mode: "components",
  },
  {
    output: "oz-next-app-components-ui.md",
    title: "Shared UI Components Bundle",
    treeRoot: "components/ui",
    sourcePrefix: "src/components/ui/",
    mode: "prefix",
  },
  {
    output: "oz-next-app-features.md",
    title: "Features Folder Bundle",
    treeRoot: "features",
    sourcePrefix: "src/features/",
    mode: "prefix",
  },
  {
    output: "oz-next-app-lib.md",
    title: "Lib Folder Bundle",
    treeRoot: "lib",
    sourcePrefix: "src/lib/",
    mode: "prefix",
  },
  {
    output: "oz-next-app-server.md",
    title: "Server Folder Bundle",
    treeRoot: "server",
    sourcePrefix: "src/server/",
    mode: "prefix",
  },
  {
    output: "oz-next-app-shared.md",
    title: "Shared Folder Bundle",
    treeRoot: "shared",
    sourcePrefix: "src/shared/",
    mode: "prefix",
  },
  {
    output: "oz-next-app-types.md",
    title: "Types Folder Bundle",
    treeRoot: "types",
    sourcePrefix: "src/types/",
    mode: "prefix",
  },
  {
    output: "oz-next-app-root.md",
    title: "Root Files Bundle",
    treeRoot: EXPECTED_REPOSITORY_NAME,
    sourcePrefix: "",
    mode: "root",
  },
  {
    output: "oz-next-app-structure.md",
    title: "oz-next-app Structure",
    treeRoot: EXPECTED_REPOSITORY_NAME,
    sourcePrefix: "",
    mode: "structure",
  },
]);

const GENERATED_BUNDLE_FILE_NAMES = new Set([
  ...BUNDLE_DEFINITIONS.map((definition) => definition.output),
  MANIFEST_FILE_NAME,
]);

const GENERATED_LOCK_FILE_NAMES = new Set([
  "package-lock.json",
  "npm-shrinkwrap.json",
  "pnpm-lock.yaml",
  "yarn.lock",
]);

const BINARY_EXTENSIONS = new Set([
  ".7z",
  ".avif",
  ".bmp",
  ".bz2",
  ".class",
  ".dll",
  ".dmg",
  ".doc",
  ".docx",
  ".eot",
  ".exe",
  ".gif",
  ".gz",
  ".ico",
  ".jar",
  ".jpeg",
  ".jpg",
  ".mov",
  ".mp3",
  ".mp4",
  ".otf",
  ".pdf",
  ".png",
  ".so",
  ".tar",
  ".tif",
  ".tiff",
  ".ttf",
  ".wav",
  ".webm",
  ".webp",
  ".woff",
  ".woff2",
  ".xls",
  ".xlsx",
  ".zip",
]);

function parseArgs(argv) {
  const result = {
    outDir: DEFAULT_OUTPUT_DIRECTORY,
    expectedHead: null,
    relativePathMode: "generate",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === "--out") {
      const value = argv[index + 1];

      if (value === undefined || value.trim().length === 0) {
        throw new Error("--out requires a non-empty directory.");
      }

      result.outDir = value;
      index += 1;
      continue;
    }

    if (argument === "--expected-head") {
      const value = argv[index + 1];

      if (value === undefined || !/^[0-9a-f]{40}$/u.test(value)) {
        throw new Error(
          "--expected-head requires a full 40-character lowercase Git SHA.",
        );
      }

      result.expectedHead = value;
      index += 1;
      continue;
    }

    if (
      argument === "--fix-relative-paths" ||
      argument === "--check-relative-paths"
    ) {
      const requestedMode =
        argument === "--fix-relative-paths"
          ? "fix-relative-paths"
          : "check-relative-paths";

      if (result.relativePathMode !== "generate") {
        throw new Error(
          "--fix-relative-paths and --check-relative-paths are mutually exclusive.",
        );
      }

      result.relativePathMode = requestedMode;
      continue;
    }

    if (argument === "--help" || argument === "-h") {
      process.stdout.write(
        [
          "Usage:",
          "  node generate-bundles.mjs [options]",
          "",
          "Options:",
          "  --out <dir>",
          `      Output directory. Default: ${DEFAULT_OUTPUT_DIRECTORY}`,
          "",
          "  --expected-head <sha>",
          "      Fail unless HEAD equals the supplied full Git SHA.",
          "",
          "  --check-relative-paths",
          "      Read-only validation of canonical source path headers.",
          "      This mode is safe to run on a dirty working tree.",
          "",
          "  --fix-relative-paths",
          "      Preflight and repair supported source path headers in place.",
          "      Existing non-header edits, newline conventions, and file modes are preserved.",
          "      This mode is safe to run on a dirty working tree and does not generate bundles.",
          "",
          "  -h, --help",
          "      Show this help.",
          "",
          "Canonical bundle generation requires a clean tracked working tree. Repair/check modes do not.",
          "",
        ].join("\n"),
      );

      process.exit(0);
    }

    throw new Error(`Unsupported argument: ${argument}`);
  }

  return result;
}

function runGit(args, encoding = "utf8") {
  return execFileSync("git", args, {
    cwd: process.cwd(),
    encoding,
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 128 * 1024 * 1024,
  });
}

function assertRepositoryIdentity(expectedHead) {
  const repoRoot = runGit(["rev-parse", "--show-toplevel"]).trim();

  if (resolve(repoRoot) !== resolve(process.cwd())) {
    throw new Error(`Run this generator from the repository root: ${repoRoot}`);
  }

  const repoName = basename(repoRoot);

  if (repoName !== EXPECTED_REPOSITORY_NAME) {
    throw new Error(
      `Expected repository directory "${EXPECTED_REPOSITORY_NAME}", received "${repoName}".`,
    );
  }

  const head = runGit(["rev-parse", "HEAD"]).trim();

  if (!/^[0-9a-f]{40}$/u.test(head)) {
    throw new Error("Unable to resolve a valid Git HEAD.");
  }

  if (expectedHead !== null && expectedHead !== head) {
    throw new Error(
      `HEAD mismatch. Expected ${expectedHead}, received ${head}.`,
    );
  }

  const commitTimestamp = runGit(["show", "-s", "--format=%cI", "HEAD"]).trim();

  if (commitTimestamp.length === 0) {
    throw new Error("Unable to resolve the HEAD commit timestamp.");
  }

  return { repoRoot, head, commitTimestamp };
}

function assertCleanTrackedWorkingTree() {
  const status = runGit([
    "status",
    "--porcelain=v1",
    "--untracked-files=no",
  ]).trim();

  if (status.length > 0) {
    throw new Error(
      "Tracked working-tree changes are present. Commit or stash them before generating canonical bundles. " +
        "Use --check-relative-paths or --fix-relative-paths while reviewing local changes.",
    );
  }
}

function listTrackedFiles() {
  const output = execFileSync("git", ["ls-files", "-z"], {
    cwd: process.cwd(),
    encoding: "buffer",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 128 * 1024 * 1024,
  });

  return output
    .toString("utf8")
    .split("\0")
    .filter((value) => value.length > 0)
    .sort(comparePaths);
}

function comparePaths(left, right) {
  return left.localeCompare(right, "en", {
    numeric: true,
    sensitivity: "case",
  });
}

function normalizeRepositoryPath(path) {
  return path.replaceAll("\\", "/");
}

function assertCanonicalRepositoryRelativePath(path) {
  const normalized = normalizeRepositoryPath(path);

  if (normalized.length === 0 || normalized.startsWith("/")) {
    throw new Error(`Invalid repository-relative path: ${path}`);
  }

  const segments = normalized.split("/");

  if (
    segments.some(
      (segment) => segment.length === 0 || segment === "." || segment === "..",
    )
  ) {
    throw new Error(`Repository-relative path is not canonical: ${path}`);
  }

  return normalized;
}

function isGeneratedBundlePath(path) {
  const normalized = normalizeRepositoryPath(path);

  return (
    normalized === DEFAULT_OUTPUT_DIRECTORY ||
    normalized.startsWith(`${DEFAULT_OUTPUT_DIRECTORY}/`) ||
    GENERATED_BUNDLE_FILE_NAMES.has(basename(normalized))
  );
}

function isBinaryExtension(path) {
  return BINARY_EXTENSIONS.has(extname(path).toLowerCase());
}

function hasBinaryContent(path) {
  const data = readFileSync(path);
  const inspectionLength = Math.min(data.length, 16_384);

  for (let index = 0; index < inspectionLength; index += 1) {
    if (data[index] === 0) return true;
  }

  return false;
}

function relativePathExemptionReason(repositoryPath) {
  const normalized = normalizeRepositoryPath(repositoryPath);
  const fileName = basename(normalized);
  const extension = extname(normalized).toLowerCase();

  if (isGeneratedBundlePath(normalized)) return "generated-bundle-artifact";
  if (GENERATED_LOCK_FILE_NAMES.has(fileName)) return "generated-lock-file";
  if (isBinaryExtension(normalized)) return "binary-file";
  if (extension === ".json" || extension === ".webmanifest")
    return "strict-json";
  if (fileName === ".nvmrc" || fileName === ".node-version")
    return "toolchain-literal-file";
  if (fileName === "LICENSE" || fileName.startsWith("LICENSE."))
    return "license-text";

  return null;
}

function isHashCommentFile(path) {
  const fileName = basename(path);

  return (
    fileName === ".dockerignore" ||
    fileName === ".gitignore" ||
    fileName === ".gitattributes" ||
    fileName === ".prettierignore" ||
    fileName === ".eslintignore" ||
    fileName === ".npmignore" ||
    fileName === ".editorconfig" ||
    fileName === "Makefile" ||
    fileName.startsWith(".env") ||
    fileName.startsWith(".dev.vars") ||
    fileName.startsWith("Dockerfile") ||
    normalizedPublicHeadersPath(path) ||
    normalizedPublicRedirectsPath(path)
  );
}

function normalizedPublicHeadersPath(path) {
  return normalizeRepositoryPath(path) === "public/_headers";
}

function normalizedPublicRedirectsPath(path) {
  return normalizeRepositoryPath(path) === "public/_redirects";
}

function firstPhysicalLine(rawContent) {
  const content = rawContent.startsWith("\uFEFF")
    ? rawContent.slice(1)
    : rawContent;
  const match = /^(.*?)(?:\r\n|\n|\r|$)/u.exec(content);
  return match?.[1] ?? "";
}

function isNodeShebang(line) {
  return /^#!.*(?:^|[\s/])(?:node|nodejs|bun|deno)(?:[\s\0]|$)/u.test(line);
}

function isShellShebang(line) {
  return /^#!.*(?:^|[\s/])(?:sh|bash|dash|zsh|ksh)(?:[\s\0]|$)/u.test(line);
}

function headerPolicyFor(repositoryPath, rawContent) {
  const normalized = assertCanonicalRepositoryRelativePath(repositoryPath);
  const fileName = basename(normalized);
  const extension = extname(normalized).toLowerCase();
  const firstLine = firstPhysicalLine(rawContent);

  if (
    extension === ".ts" ||
    extension === ".tsx" ||
    extension === ".js" ||
    extension === ".jsx" ||
    extension === ".mjs" ||
    extension === ".cjs" ||
    extension === ".jsonc"
  ) {
    return {
      commentStyle: "slash",
      preamble: "interpreter-shebang",
    };
  }

  if (
    extension === ".sh" ||
    extension === ".bash" ||
    extension === ".zsh" ||
    extension === ".ksh" ||
    extension === ".ps1"
  ) {
    return {
      commentStyle: "hash",
      preamble: "interpreter-shebang",
    };
  }

  if (isNodeShebang(firstLine)) {
    return { commentStyle: "slash", preamble: "interpreter-shebang" };
  }

  if (isShellShebang(firstLine)) {
    return { commentStyle: "hash", preamble: "interpreter-shebang" };
  }

  if (fileName.startsWith("Dockerfile")) {
    return { commentStyle: "hash", preamble: "docker-directives" };
  }

  if (extension === ".svg" || extension === ".xml") {
    return { commentStyle: "html", preamble: "xml-declaration" };
  }

  if (extension === ".md" || extension === ".mdx" || extension === ".html") {
    return { commentStyle: "html", preamble: "ordinary" };
  }

  if (extension === ".css" || extension === ".scss" || extension === ".less") {
    return { commentStyle: "block", preamble: "ordinary" };
  }

  if (extension === ".sql") {
    return { commentStyle: "sql", preamble: "ordinary" };
  }

  if (
    extension === ".yml" ||
    extension === ".yaml" ||
    extension === ".toml" ||
    extension === ".graphql" ||
    extension === ".gql" ||
    extension === ".py" ||
    extension === ".rb" ||
    isHashCommentFile(normalized)
  ) {
    return { commentStyle: "hash", preamble: "ordinary" };
  }

  return null;
}

function canonicalHeaderFor(repositoryPath, commentStyle) {
  const canonicalPath = `${EXPECTED_REPOSITORY_NAME}/${assertCanonicalRepositoryRelativePath(
    repositoryPath,
  )}`;

  switch (commentStyle) {
    case "slash":
      return `// ${canonicalPath}`;
    case "hash":
      return `# ${canonicalPath}`;
    case "html":
      return `<!-- ${canonicalPath} -->`;
    case "block":
      return `/* ${canonicalPath} */`;
    case "sql":
      return `-- ${canonicalPath}`;
    default:
      throw new Error(
        `Unsupported relative-path comment style: ${commentStyle}`,
      );
  }
}

function splitDocument(rawContent) {
  const hasBom = rawContent.startsWith("\uFEFF");
  const content = hasBom ? rawContent.slice(1) : rawContent;
  const lines = [];
  let offset = 0;

  while (offset < content.length) {
    let end = offset;

    while (
      end < content.length &&
      content[end] !== "\n" &&
      content[end] !== "\r"
    ) {
      end += 1;
    }

    let eol = "";

    if (end < content.length) {
      if (content[end] === "\r" && content[end + 1] === "\n") {
        eol = "\r\n";
      } else {
        eol = content[end];
      }
    }

    lines.push({ text: content.slice(offset, end), eol });
    offset = end + eol.length;
  }

  return { hasBom, lines };
}

function renderDocument(document) {
  return `${document.hasBom ? "\uFEFF" : ""}${document.lines
    .map((line) => `${line.text}${line.eol}`)
    .join("")}`;
}

function preferredEol(lines) {
  return lines.find((line) => line.eol.length > 0)?.eol ?? "\n";
}

function insertLine(lines, index, text) {
  const updated = lines.map((line) => ({ ...line }));
  const eol = preferredEol(updated);

  if (updated.length === 0) {
    updated.push({ text, eol: "" });
    return updated;
  }

  if (index < updated.length) {
    updated.splice(index, 0, { text, eol });
    return updated;
  }

  const previous = updated.at(-1);

  if (previous === undefined) {
    throw new Error("Unable to resolve insertion location.");
  }

  if (previous.eol.length === 0) {
    previous.eol = eol;
    updated.push({ text, eol: "" });
  } else {
    updated.push({ text, eol: previous.eol });
  }

  return updated;
}

function unwrapPathHeader(line) {
  const patterns = [
    /^#!(oz-[A-Za-z0-9._-]+\/.+)$/u,
    /^\/\/\s+(.+)$/u,
    /^#\s+(.+)$/u,
    /^<!--\s+(.+?)\s+-->$/u,
    /^\/\*\s+(.+?)\s+\*\/$/u,
    /^--\s+(.+)$/u,
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(line);
    const payload = match?.[1]?.trim();

    if (payload !== undefined && payload.length > 0) return payload;
  }

  return null;
}

function classifyPathHeaderPayload(payload, repositoryPath) {
  const normalizedPath = normalizeRepositoryPath(repositoryPath);
  const canonical = `${EXPECTED_REPOSITORY_NAME}/${normalizedPath}`;

  if (payload === canonical) return "same-repository";
  if (payload === normalizedPath || payload === `./${normalizedPath}`)
    return "legacy-exact";
  if (payload.startsWith(`${EXPECTED_REPOSITORY_NAME}/`))
    return "same-repository-stale";
  if (/^oz-[A-Za-z0-9._-]+\//u.test(payload)) return "different-repository";

  return null;
}

function isDockerParserDirective(line) {
  return /^#\s*(?:syntax|escape|check)\s*=/iu.test(line);
}

function insertionIndexFor(policy, lines) {
  if (policy.preamble === "interpreter-shebang") {
    return lines[0]?.text.startsWith("#!") === true ? 1 : 0;
  }

  if (policy.preamble === "docker-directives") {
    let index = 0;

    while (index < lines.length && isDockerParserDirective(lines[index].text)) {
      index += 1;
    }

    return index;
  }

  if (policy.preamble === "xml-declaration") {
    return /^\s*<\?xml\b.*\?>\s*$/u.test(lines[0]?.text ?? "") ? 1 : 0;
  }

  return 0;
}

function analyzeRelativePathFile(repositoryPath) {
  const normalizedPath = assertCanonicalRepositoryRelativePath(repositoryPath);
  const exemptionReason = relativePathExemptionReason(normalizedPath);

  if (exemptionReason !== null) {
    return { kind: "exempt", path: normalizedPath, reason: exemptionReason };
  }

  let stat;

  try {
    stat = lstatSync(resolve(normalizedPath));
  } catch (error) {
    return {
      kind: "unsafe",
      path: normalizedPath,
      reason: "file-stat-failed",
      detail: error instanceof Error ? error.message : String(error),
    };
  }

  if (stat.isSymbolicLink()) {
    return {
      kind: "unsafe",
      path: normalizedPath,
      reason: "tracked-symlink",
      detail:
        "Tracked symlinks are not rewritten or bundled as source content.",
    };
  }

  if (!stat.isFile()) {
    return {
      kind: "unsafe",
      path: normalizedPath,
      reason: "not-regular-file",
      detail: "Expected a regular tracked file.",
    };
  }

  if (hasBinaryContent(normalizedPath)) {
    return { kind: "exempt", path: normalizedPath, reason: "binary-content" };
  }

  const rawContent = readFileSync(normalizedPath, "utf8");
  const policy = headerPolicyFor(normalizedPath, rawContent);

  if (policy === null) {
    return {
      kind: "unsafe",
      path: normalizedPath,
      reason: "unsupported-text-format",
      detail:
        "No semantics-preserving first-line comment syntax is configured for this tracked text file.",
    };
  }

  const expectedHeader = canonicalHeaderFor(
    normalizedPath,
    policy.commentStyle,
  );
  const document = splitDocument(rawContent);
  const scanLength = Math.min(document.lines.length, HEADER_SCAN_LIMIT);
  const sameRepositoryHeaderIndices = [];
  const differentRepositoryHeaders = [];

  for (let index = 0; index < scanLength; index += 1) {
    const payload = unwrapPathHeader(document.lines[index].text);

    if (payload === null) continue;

    const classification = classifyPathHeaderPayload(payload, normalizedPath);

    if (
      classification === "same-repository" ||
      classification === "same-repository-stale" ||
      classification === "legacy-exact"
    ) {
      sameRepositoryHeaderIndices.push(index);
    } else if (classification === "different-repository") {
      differentRepositoryHeaders.push({ index, payload });
    }
  }

  if (differentRepositoryHeaders.length > 0) {
    return {
      kind: "unsafe",
      path: normalizedPath,
      reason: "different-repository-header",
      detail: `Found ${differentRepositoryHeaders
        .map((entry) => JSON.stringify(entry.payload))
        .join(", ")} in the source preamble.`,
    };
  }

  const remainingLines = document.lines
    .filter((_line, index) => !sameRepositoryHeaderIndices.includes(index))
    .map((line) => ({ ...line }));
  const targetIndex = insertionIndexFor(policy, remainingLines);

  if (
    sameRepositoryHeaderIndices.length === 1 &&
    sameRepositoryHeaderIndices[0] === targetIndex &&
    document.lines[targetIndex]?.text === expectedHeader
  ) {
    return {
      kind: "ok",
      path: normalizedPath,
      expectedHeader,
      placement: policy.preamble,
    };
  }

  let repairedLines;

  if (
    sameRepositoryHeaderIndices.length === 1 &&
    sameRepositoryHeaderIndices[0] === targetIndex
  ) {
    repairedLines = document.lines.map((line) => ({ ...line }));
    repairedLines[targetIndex].text = expectedHeader;
  } else {
    repairedLines = insertLine(remainingLines, targetIndex, expectedHeader);
  }

  const repairedContent = renderDocument({
    hasBom: document.hasBom,
    lines: repairedLines,
  });

  if (repairedContent === rawContent) {
    return {
      kind: "ok",
      path: normalizedPath,
      expectedHeader,
      placement: policy.preamble,
    };
  }

  return {
    kind: "repair",
    path: normalizedPath,
    reason:
      sameRepositoryHeaderIndices.length === 0
        ? "missing-relative-path-header"
        : sameRepositoryHeaderIndices.length > 1
          ? "duplicate-relative-path-headers"
          : "legacy-or-misplaced-relative-path-header",
    expectedHeader,
    placement: policy.preamble,
    repairedContent,
    originalMode: stat.mode & 0o7777,
  };
}

function analyzeTrackedRelativePaths(trackedFiles) {
  return trackedFiles.map((path) => analyzeRelativePathFile(path));
}

function formatRelativePathFailures(results, operation) {
  const failures = results.filter(
    (result) => result.kind === "repair" || result.kind === "unsafe",
  );
  const displayed = failures.slice(0, 100);
  const lines = [
    `Relative-path ${operation} failed for ${failures.length} tracked file(s).`,
    "",
  ];

  for (const result of displayed) {
    lines.push(`- ${result.path}`);
    lines.push(`  status: ${result.kind}`);
    lines.push(`  reason: ${result.reason}`);

    if ("expectedHeader" in result)
      lines.push(`  expected: ${JSON.stringify(result.expectedHeader)}`);
    if ("placement" in result) lines.push(`  placement: ${result.placement}`);
    if ("detail" in result) lines.push(`  detail: ${result.detail}`);
  }

  if (failures.length > displayed.length) {
    lines.push(
      "",
      `...and ${failures.length - displayed.length} additional failure(s).`,
    );
  }

  return lines.join("\n");
}

function checkRelativePaths(trackedFiles) {
  const results = analyzeTrackedRelativePaths(trackedFiles);
  const failures = results.filter(
    (result) => result.kind === "repair" || result.kind === "unsafe",
  );

  if (failures.length > 0) {
    throw new Error(
      `${formatRelativePathFailures(results, "check")}\n\n` +
        "Run `node generate-bundles.mjs --fix-relative-paths` to repair supported files. " +
        "Unsafe or unsupported files must be resolved explicitly before retrying.",
    );
  }

  const enforced = results.filter((result) => result.kind === "ok").length;
  const exempt = results.filter((result) => result.kind === "exempt").length;

  process.stdout.write(
    `Relative-path check passed: ${enforced} enforced, ${exempt} exempt.\n`,
  );

  return { results, enforced, exempt };
}

function fixRelativePaths(trackedFiles) {
  const results = analyzeTrackedRelativePaths(trackedFiles);
  const unsafe = results.filter((result) => result.kind === "unsafe");

  if (unsafe.length > 0) {
    throw new Error(
      `${formatRelativePathFailures(results, "repair preflight")}\n\n` +
        "No files were written because repair preflight found unsafe or unsupported tracked files.",
    );
  }

  const repairs = results.filter((result) => result.kind === "repair");

  for (const repair of repairs) {
    writeFileSync(repair.path, repair.repairedContent, { encoding: "utf8" });
    chmodSync(repair.path, repair.originalMode);
  }

  process.stdout.write(
    [
      "",
      "Relative-path repair completed.",
      `Changed: ${repairs.length} file(s)`,
      `Unchanged: ${results.filter((result) => result.kind === "ok").length} file(s)`,
      `Exempt: ${results.filter((result) => result.kind === "exempt").length} file(s)`,
      "",
      repairs.length > 0
        ? "Review the preserved local edits plus header repairs, run --check-relative-paths, then run repository verification before committing."
        : "No changes were required; the repair operation is idempotent.",
      "",
    ].join("\n"),
  );
}

function isTextFile(path) {
  if (isBinaryExtension(path)) return false;

  const stat = lstatSync(resolve(path));

  if (stat.isSymbolicLink())
    throw new Error(`Refusing to bundle symlink content: ${path}`);
  if (!stat.isFile())
    throw new Error(`Expected a regular tracked file: ${path}`);

  return !hasBinaryContent(path);
}

function isSecretLikePath(path) {
  const normalized = normalizeRepositoryPath(path).toLowerCase();
  const fileName = basename(normalized);

  if (
    fileName === ".env" ||
    fileName.startsWith(".env.") ||
    fileName === ".dev.vars" ||
    fileName.startsWith(".dev.vars.")
  ) {
    return true;
  }

  if (fileName === ".npmrc" || fileName === ".pypirc") return true;

  if (
    fileName === "credentials" ||
    fileName.startsWith("credentials.") ||
    fileName === "secrets" ||
    fileName.startsWith("secrets.")
  ) {
    return true;
  }

  const extension = extname(fileName);

  return (
    extension === ".pem" ||
    extension === ".p12" ||
    extension === ".pfx" ||
    extension === ".key" ||
    extension === ".keystore" ||
    extension === ".jks"
  );
}

function isEligibleContentFile(path) {
  if (isGeneratedBundlePath(path)) return false;
  if (isSecretLikePath(path)) return false;
  if (CONTENT_EXCLUDED_FILE_NAMES.has(basename(path))) return false;
  return isTextFile(path);
}

function isRootBundleCandidate(path) {
  const normalized = normalizeRepositoryPath(path);

  if (normalized.startsWith(".github/workflows/")) return true;

  if (normalized.startsWith("src/")) {
    const srcRelative = normalized.slice("src/".length);
    return srcRelative.length > 0 && !srcRelative.includes("/");
  }

  return !normalized.includes("/");
}

function selectFiles(definition, trackedFiles) {
  if (definition.mode === "structure") {
    return trackedFiles
      .filter((path) => !isGeneratedBundlePath(path))
      .sort(comparePaths);
  }

  if (definition.mode === "root") {
    return trackedFiles
      .filter(isRootBundleCandidate)
      .filter(isEligibleContentFile)
      .sort(comparePaths);
  }

  if (definition.mode === "components") {
    return trackedFiles
      .filter((path) => path.startsWith("src/components/"))
      .filter((path) => !path.startsWith("src/components/ui/"))
      .filter(isEligibleContentFile)
      .sort(comparePaths);
  }

  if (definition.mode === "prefix") {
    return trackedFiles
      .filter((path) => path.startsWith(definition.sourcePrefix))
      .filter(isEligibleContentFile)
      .sort(comparePaths);
  }

  throw new Error(`Unsupported bundle mode: ${definition.mode}`);
}

function bundleRelativePath(definition, repositoryPath) {
  if (definition.mode === "root" || definition.mode === "structure")
    return repositoryPath;
  return repositoryPath.slice(definition.sourcePrefix.length);
}

function createTree(paths, rootLabel) {
  const root = { directories: new Map(), files: new Set() };

  for (const originalPath of paths) {
    const parts = normalizeRepositoryPath(originalPath)
      .split("/")
      .filter((part) => part.length > 0);

    if (parts.length === 0) continue;

    let node = root;

    for (let index = 0; index < parts.length; index += 1) {
      const part = parts[index];
      const isFile = index === parts.length - 1;

      if (isFile) {
        node.files.add(part);
        continue;
      }

      let child = node.directories.get(part);

      if (child === undefined) {
        child = { directories: new Map(), files: new Set() };
        node.directories.set(part, child);
      }

      node = child;
    }
  }

  const lines = [`${rootLabel}/`];

  function appendNode(node, prefix) {
    const directories = [...node.directories.entries()]
      .sort(([left], [right]) => comparePaths(left, right))
      .map(([name, child]) => ({ kind: "directory", name, child }));
    const files = [...node.files]
      .sort(comparePaths)
      .map((name) => ({ kind: "file", name, child: null }));
    const entries = [...directories, ...files];

    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index];
      const isLast = index === entries.length - 1;
      const branch = isLast ? "`-- " : "|-- ";
      const suffix = entry.kind === "directory" ? "/" : "";

      lines.push(`${prefix}${branch}${entry.name}${suffix}`);

      if (entry.kind === "directory") {
        appendNode(entry.child, `${prefix}${isLast ? "    " : "|   "}`);
      }
    }
  }

  appendNode(root, "");

  return lines.join("\n");
}

function languageFor(path) {
  const fileName = basename(path);
  const extension = extname(path).toLowerCase();

  if (fileName === "Dockerfile" || fileName.startsWith("Dockerfile."))
    return "dockerfile";
  if (fileName === ".gitignore" || fileName === ".dockerignore")
    return "gitignore";

  switch (extension) {
    case ".ts":
      return "ts";
    case ".tsx":
      return "tsx";
    case ".js":
    case ".mjs":
    case ".cjs":
      return "js";
    case ".jsx":
      return "jsx";
    case ".json":
      return "json";
    case ".jsonc":
      return "jsonc";
    case ".yml":
    case ".yaml":
      return "yaml";
    case ".md":
    case ".mdx":
      return "md";
    case ".css":
      return "css";
    case ".scss":
      return "scss";
    case ".html":
      return "html";
    case ".xml":
    case ".svg":
      return "xml";
    case ".toml":
      return "toml";
    case ".sh":
      return "bash";
    case ".sql":
      return "sql";
    case ".graphql":
    case ".gql":
      return "graphql";
    default:
      return "text";
  }
}

function normalizeBundleTextContent(content) {
  return content
    .replaceAll("\r\n", "\n")
    .replaceAll("\r", "\n")
    .replace(/\s+$/u, "");
}

function markdownFenceFor(content) {
  let longestRun = 0;
  let currentRun = 0;

  for (const character of content) {
    if (character === "`") {
      currentRun += 1;
      if (currentRun > longestRun) longestRun = currentRun;
    } else {
      currentRun = 0;
    }
  }

  return "`".repeat(Math.max(3, longestRun + 1));
}

function assertSourceHeaderBeforeBundling(repositoryPath) {
  const result = analyzeRelativePathFile(repositoryPath);

  if (result.kind === "ok" || result.kind === "exempt") return;

  throw new Error(
    `Repository file "${repositoryPath}" failed source-header validation before bundling: ` +
      `${result.reason}. Run --check-relative-paths for complete diagnostics.`,
  );
}

function renderFileSection(definition, repositoryPath) {
  assertSourceHeaderBeforeBundling(repositoryPath);

  const relativePath = bundleRelativePath(definition, repositoryPath);
  const content = normalizeBundleTextContent(
    readFileSync(repositoryPath, "utf8"),
  );
  const fence = markdownFenceFor(content);
  const language = languageFor(repositoryPath);

  return [
    `## ${definition.headingPrefix}${relativePath}`,
    "",
    `${fence}${language}`,
    content,
    fence,
  ].join("\n");
}

function renderContentBundle(definition, files) {
  const relativeFiles = files.map((path) =>
    bundleRelativePath(definition, path),
  );
  const tree = createTree(relativeFiles, definition.treeRoot);
  const parts = [`# ${definition.title}`, "", "```text", tree, "```"];

  for (const file of files) parts.push("", renderFileSection(definition, file));

  parts.push("");
  return parts.join("\n");
}

function renderStructureBundle(definition, files) {
  const tree = createTree(files, definition.treeRoot);
  return [`# ${definition.title}`, "", "```text", tree, "```", ""].join("\n");
}

function sha256(content) {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const { head, commitTimestamp } = assertRepositoryIdentity(args.expectedHead);
  const trackedFiles = listTrackedFiles();

  if (trackedFiles.length === 0)
    throw new Error("The repository contains no tracked files.");

  if (args.relativePathMode === "check-relative-paths") {
    checkRelativePaths(trackedFiles);
    return;
  }

  if (args.relativePathMode === "fix-relative-paths") {
    fixRelativePaths(trackedFiles);
    return;
  }

  assertCleanTrackedWorkingTree();
  const headerCheck = checkRelativePaths(trackedFiles);
  const outputDirectory = resolve(args.outDir);

  mkdirSync(outputDirectory, { recursive: true, mode: 0o755 });

  const bundleResults = [];

  for (const definition of BUNDLE_DEFINITIONS) {
    const files = selectFiles(definition, trackedFiles);

    if (files.length === 0) {
      throw new Error(`Bundle "${definition.output}" resolved no files.`);
    }

    const content =
      definition.mode === "structure"
        ? renderStructureBundle(definition, files)
        : renderContentBundle(definition, files);
    const outputPath = join(outputDirectory, definition.output);

    writeFileSync(outputPath, content, { encoding: "utf8", mode: 0o644 });

    bundleResults.push({
      bundle: definition.output,
      fileCount: files.length,
      bytes: Buffer.byteLength(content, "utf8"),
      sha256: sha256(content),
    });
  }

  const manifest = {
    schemaVersion: 2,
    repository: EXPECTED_REPOSITORY_NAME,
    head,
    commitTimestamp,
    trackedFileCount: trackedFiles.length,
    contentFileHeader: {
      required: true,
      format: "format-aware canonical repository-relative path comment",
      scope: "source-repository-files",
    },
    bundles: bundleResults,
  };
  const manifestContent = `${JSON.stringify(manifest, null, 2)}\n`;
  const manifestPath = join(outputDirectory, MANIFEST_FILE_NAME);

  writeFileSync(manifestPath, manifestContent, {
    encoding: "utf8",
    mode: 0o644,
  });

  process.stdout.write(
    [
      "",
      "oz-next-app bundle generation completed.",
      "",
      `Repository: ${EXPECTED_REPOSITORY_NAME}`,
      `HEAD:       ${head}`,
      `Commit:     ${commitTimestamp}`,
      `Tracked:    ${trackedFiles.length} files`,
      `Headers:    ${headerCheck.enforced} enforced, ${headerCheck.exempt} exempt`,
      "",
    ].join("\n"),
  );

  for (const result of bundleResults) {
    process.stdout.write(
      [
        `- ${result.bundle}`,
        `  files:  ${result.fileCount}`,
        `  bytes:  ${result.bytes}`,
        `  sha256: ${result.sha256}`,
        "",
      ].join("\n"),
    );
  }

  process.stdout.write(`Manifest: ${relative(process.cwd(), manifestPath)}\n`);
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);

  process.stderr.write(`Bundle generation failed: ${message}\n`);
  process.exitCode = 1;
}
