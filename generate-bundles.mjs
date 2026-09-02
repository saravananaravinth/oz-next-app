#!oz-next-app/generate-bundles.mjs

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { lstatSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, extname, join, relative, resolve } from "node:path";
import process from "node:process";

const EXPECTED_REPOSITORY_NAME = "oz-next-app";

const DEFAULT_OUTPUT_DIRECTORY = "bundles";

const MANIFEST_FILE_NAME = "oz-next-app-bundles.manifest.json";

/**
 * These are generated artifacts and must never become inputs to another
 * generated bundle.
 */
const GENERATED_BUNDLE_FILE_NAMES = new Set([
  "oz-next-app-app.md",
  "oz-next-app-components.md",
  "oz-next-app-components-ui.md",
  "oz-next-app-features.md",
  "oz-next-app-lib.md",
  "oz-next-app-root.md",
  "oz-next-app-server.md",
  "oz-next-app-shared.md",
  "oz-next-app-structure.md",
  "oz-next-app-types.md",
  MANIFEST_FILE_NAME,
]);

/**
 * Large/generated dependency resolution files are intentionally omitted from
 * content bundles.
 *
 * They remain visible in oz-next-app-structure.md when tracked.
 */
const CONTENT_EXCLUDED_FILE_NAMES = new Set([
  "package-lock.json",
  "npm-shrinkwrap.json",
  "yarn.lock",
  "pnpm-lock.yaml",
]);

/**
 * Binary formats must not be embedded into Markdown code blocks.
 */
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

/**
 * Bundle contracts.
 *
 * Prefix bundles dynamically consume every eligible tracked file under their
 * corresponding source subtree.
 *
 * Important:
 *   src/components/ui/** has its own bundle and is intentionally excluded
 *   from oz-next-app-components.md to avoid duplicated source content.
 */
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

function parseArgs(argv) {
  const result = {
    outDir: DEFAULT_OUTPUT_DIRECTORY,
    expectedHead: null,
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
          "--expected-head requires a full " +
            "40-character lowercase Git SHA.",
        );
      }

      result.expectedHead = value;
      index += 1;
      continue;
    }

    if (argument === "--help" || argument === "-h") {
      process.stdout.write(
        [
          "Usage:",
          "  node generate-oz-next-app-bundles.mjs [options]",
          "",
          "Options:",
          "  --out <dir>",
          "      Output directory. Default: bundles",
          "",
          "  --expected-head <sha>",
          "      Fail unless HEAD equals the supplied full Git SHA.",
          "",
          "  -h, --help",
          "      Show this help.",
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

function assertRepository(expectedHead) {
  const repoRoot = runGit(["rev-parse", "--show-toplevel"]).trim();

  const resolvedRepoRoot = resolve(repoRoot);

  const resolvedWorkingDirectory = resolve(process.cwd());

  if (resolvedRepoRoot !== resolvedWorkingDirectory) {
    throw new Error("Run the generator from the repository root: " + repoRoot);
  }

  const repoName = basename(repoRoot);

  if (repoName !== EXPECTED_REPOSITORY_NAME) {
    throw new Error(
      `Expected repository directory ` +
        `"${EXPECTED_REPOSITORY_NAME}", ` +
        `received "${repoName}".`,
    );
  }

  const head = runGit(["rev-parse", "HEAD"]).trim();

  if (!/^[0-9a-f]{40}$/u.test(head)) {
    throw new Error("Unable to resolve a valid Git HEAD.");
  }

  if (expectedHead !== null && expectedHead !== head) {
    throw new Error(
      `HEAD mismatch. Expected ${expectedHead}, ` + `received ${head}.`,
    );
  }

  /**
   * Ignore untracked files intentionally.
   *
   * The generator itself may be kept locally without being committed.
   * Since source discovery uses git ls-files, untracked files can never leak
   * into generated bundles.
   *
   * Tracked modifications are rejected because canonical bundles should map
   * to a reproducible Git revision.
   */
  const trackedStatus = runGit([
    "status",
    "--porcelain=v1",
    "--untracked-files=no",
  ]).trim();

  if (trackedStatus.length > 0) {
    throw new Error(
      "Tracked working-tree changes are present. " +
        "Commit or stash them before generating canonical bundles.",
    );
  }

  const commitTimestamp = runGit(["show", "-s", "--format=%cI", "HEAD"]).trim();

  if (commitTimestamp.length === 0) {
    throw new Error("Unable to resolve the HEAD commit timestamp.");
  }

  return {
    repoRoot,
    head,
    commitTimestamp,
  };
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
    .filter((path) => path.length > 0)
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

function isGeneratedBundlePath(path) {
  const normalized = normalizeRepositoryPath(path);

  if (normalized === "bundles") {
    return true;
  }

  if (normalized.startsWith("bundles/")) {
    return true;
  }

  return GENERATED_BUNDLE_FILE_NAMES.has(basename(normalized));
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

  if (fileName === ".npmrc" || fileName === ".pypirc") {
    return true;
  }

  if (
    fileName === "credentials" ||
    fileName.startsWith("credentials.") ||
    fileName === "secrets" ||
    fileName.startsWith("secrets.")
  ) {
    return true;
  }

  const extension = extname(fileName);

  if (
    extension === ".pem" ||
    extension === ".p12" ||
    extension === ".pfx" ||
    extension === ".key" ||
    extension === ".keystore" ||
    extension === ".jks"
  ) {
    return true;
  }

  return false;
}

function isBinaryExtension(path) {
  return BINARY_EXTENSIONS.has(extname(path).toLowerCase());
}

function isContentExcludedByName(path) {
  return CONTENT_EXCLUDED_FILE_NAMES.has(basename(path));
}

function assertRegularContentFile(path) {
  const absolutePath = resolve(path);

  const stat = lstatSync(absolutePath);

  if (stat.isSymbolicLink()) {
    throw new Error(`Refusing to bundle symlink content: ${path}`);
  }

  if (!stat.isFile()) {
    throw new Error(`Expected a regular tracked file: ${path}`);
  }
}

function hasBinaryContent(path) {
  const data = readFileSync(path);

  const inspectionLength = Math.min(data.length, 16_384);

  for (let index = 0; index < inspectionLength; index += 1) {
    if (data[index] === 0) {
      return true;
    }
  }

  return false;
}

function isEligibleContentFile(path) {
  if (isGeneratedBundlePath(path)) {
    return false;
  }

  if (isSecretLikePath(path)) {
    return false;
  }

  if (isContentExcludedByName(path)) {
    return false;
  }

  if (isBinaryExtension(path)) {
    return false;
  }

  assertRegularContentFile(path);

  return !hasBinaryContent(path);
}

/**
 * Root bundle contract.
 *
 * Automatically includes:
 *
 *   1. eligible tracked files directly in repository root;
 *   2. eligible files in .github/workflows/**;
 *   3. eligible files directly inside src/.
 *
 * This means future files such as:
 *
 *   open-next.config.ts
 *   new-build-config.mjs
 *   .github/workflows/security.yml
 *   src/instrumentation.ts
 *
 * are automatically picked up without modifying this generator.
 *
 * It does NOT recursively absorb docs/, scripts/, public/, src/features/,
 * etc. Those belong to the structure bundle or their dedicated bundles.
 */
function isRootBundleCandidate(path) {
  const normalized = normalizeRepositoryPath(path);

  if (normalized.startsWith(".github/workflows/")) {
    return true;
  }

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
  if (definition.mode === "root" || definition.mode === "structure") {
    return repositoryPath;
  }

  return repositoryPath.slice(definition.sourcePrefix.length);
}

function createTree(paths, rootLabel) {
  const root = {
    directories: new Map(),
    files: new Set(),
  };

  for (const originalPath of paths) {
    const normalized = normalizeRepositoryPath(originalPath);

    const parts = normalized.split("/").filter((part) => part.length > 0);

    if (parts.length === 0) {
      continue;
    }

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
        child = {
          directories: new Map(),
          files: new Set(),
        };

        node.directories.set(part, child);
      }

      node = child;
    }
  }

  const lines = [`${rootLabel}/`];

  function appendNode(node, prefix) {
    const directories = [...node.directories.entries()]
      .sort(([left], [right]) => comparePaths(left, right))
      .map(([name, child]) => ({
        kind: "directory",
        name,
        child,
      }));

    const files = [...node.files].sort(comparePaths).map((name) => ({
      kind: "file",
      name,
      child: null,
    }));

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

  if (fileName === "Dockerfile" || fileName.startsWith("Dockerfile.")) {
    return "dockerfile";
  }

  if (fileName === ".gitignore") {
    return "gitignore";
  }

  if (fileName === ".dockerignore") {
    return "dockerignore";
  }

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

function normalizeTextContent(content) {
  return content
    .replaceAll("\r\n", "\n")
    .replaceAll("\r", "\n")
    .replace(/\s+$/u, "");
}

/**
 * Select a Markdown fence longer than any backtick run already present in
 * the source file.
 *
 * This prevents Markdown source, documentation examples, or embedded code
 * fences from corrupting the generated bundle structure.
 */
function markdownFenceFor(content) {
  let longestRun = 0;
  let currentRun = 0;

  for (const character of content) {
    if (character === "`") {
      currentRun += 1;

      if (currentRun > longestRun) {
        longestRun = currentRun;
      }
    } else {
      currentRun = 0;
    }
  }

  const fenceLength = Math.max(3, longestRun + 1);

  return "`".repeat(fenceLength);
}

function renderFileSection(definition, repositoryPath) {
  assertRegularContentFile(repositoryPath);

  const relativePath = bundleRelativePath(definition, repositoryPath);

  const content = normalizeTextContent(readFileSync(repositoryPath, "utf8"));

  const fence = markdownFenceFor(content);

  const language = languageFor(repositoryPath);

  return [
    `## File: ${relativePath}`,
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

  for (const file of files) {
    parts.push("", renderFileSection(definition, file));
  }

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

function writeBundle(outputDirectory, definition, files) {
  const content =
    definition.mode === "structure"
      ? renderStructureBundle(definition, files)
      : renderContentBundle(definition, files);

  const outputPath = join(outputDirectory, definition.output);

  writeFileSync(outputPath, content, {
    encoding: "utf8",
    mode: 0o644,
  });

  return {
    bundle: definition.output,

    fileCount: files.length,

    bytes: Buffer.byteLength(content, "utf8"),

    sha256: sha256(content),
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  const { head, commitTimestamp } = assertRepository(args.expectedHead);

  const trackedFiles = listTrackedFiles();

  if (trackedFiles.length === 0) {
    throw new Error("The repository contains no tracked files.");
  }

  const outputDirectory = resolve(args.outDir);

  mkdirSync(outputDirectory, {
    recursive: true,
    mode: 0o755,
  });

  const bundleResults = [];

  for (const definition of BUNDLE_DEFINITIONS) {
    const files = selectFiles(definition, trackedFiles);

    if (files.length === 0) {
      throw new Error(`Bundle "${definition.output}" resolved no files.`);
    }

    const result = writeBundle(outputDirectory, definition, files);

    bundleResults.push(result);
  }

  const manifest = {
    schemaVersion: 1,
    repository: EXPECTED_REPOSITORY_NAME,
    head,
    commitTimestamp,
    trackedFileCount: trackedFiles.length,
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
