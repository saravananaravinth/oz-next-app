#!oz-next-app/generate-bundles.mjs

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { lstatSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, extname, join, relative, resolve } from "node:path";
import process from "node:process";

const EXPECTED_REPOSITORY_NAME = "oz-next-app";

const GENERATOR_FILE_NAME = "generate-bundles.mjs";

const DEFAULT_OUTPUT_DIRECTORY = "bundles";

const MANIFEST_FILE_NAME = "oz-next-app-bundles.manifest.json";

const CONTENT_EXCLUDED_FILE_NAMES = new Set([
  "package-lock.json",
  "npm-shrinkwrap.json",
  "yarn.lock",
  "pnpm-lock.yaml",
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

function parseArgs(argv) {
  const result = {
    outDir: DEFAULT_OUTPUT_DIRECTORY,
    expectedHead: null,
    fixRelativePaths: false,
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

    if (argument === "--fix-relative-paths") {
      result.fixRelativePaths = true;
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
          "  --fix-relative-paths",
          "      Add or repair first-line repository-relative path headers",
          "      in supported tracked text files, then exit without bundling.",
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

  if (resolve(repoRoot) !== resolve(process.cwd())) {
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

  const trackedStatus = runGit([
    "status",
    "--porcelain=v1",
    "--untracked-files=no",
  ]).trim();

  if (trackedStatus.length > 0) {
    throw new Error(
      "Tracked working-tree changes are present. " +
        "Commit or stash them before running the bundle generator.",
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

function assertCanonicalRepositoryRelativePath(path) {
  const normalized = normalizeRepositoryPath(path);

  if (normalized.length === 0) {
    throw new Error("Repository-relative path must not be empty.");
  }

  if (normalized.startsWith("/")) {
    throw new Error(`Repository-relative path must not be absolute: ${path}`);
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

  const extension = extname(fileName).toLowerCase();

  return (
    extension === ".pem" ||
    extension === ".p12" ||
    extension === ".pfx" ||
    extension === ".key" ||
    extension === ".keystore" ||
    extension === ".jks"
  );
}

function isBinaryExtension(path) {
  return BINARY_EXTENSIONS.has(extname(path).toLowerCase());
}

function assertRegularTrackedFile(path) {
  const stat = lstatSync(resolve(path));

  if (stat.isSymbolicLink()) {
    throw new Error(`Refusing to process tracked symlink content: ${path}`);
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

function isTextFile(path) {
  if (isBinaryExtension(path)) {
    return false;
  }

  assertRegularTrackedFile(path);

  return !hasBinaryContent(path);
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
    fileName.startsWith("Dockerfile")
  );
}

function relativePathHeaderFor(repositoryPath) {
  const normalized = assertCanonicalRepositoryRelativePath(repositoryPath);

  const canonicalPath = `${EXPECTED_REPOSITORY_NAME}/${normalized}`;

  if (normalized === GENERATOR_FILE_NAME) {
    return `#!${canonicalPath}`;
  }

  const fileName = basename(normalized);
  const extension = extname(normalized).toLowerCase();

  if (
    extension === ".ts" ||
    extension === ".tsx" ||
    extension === ".js" ||
    extension === ".jsx" ||
    extension === ".mjs" ||
    extension === ".cjs" ||
    extension === ".jsonc"
  ) {
    return `// ${canonicalPath}`;
  }

  if (extension === ".md" || extension === ".mdx" || extension === ".html") {
    return `<!-- ${canonicalPath} -->`;
  }

  if (extension === ".css" || extension === ".scss" || extension === ".less") {
    return `/* ${canonicalPath} */`;
  }

  if (extension === ".sql") {
    return `-- ${canonicalPath}`;
  }

  if (
    extension === ".yml" ||
    extension === ".yaml" ||
    extension === ".toml" ||
    extension === ".graphql" ||
    extension === ".gql" ||
    extension === ".env" ||
    isHashCommentFile(fileName)
  ) {
    return `# ${canonicalPath}`;
  }

  return null;
}

function relativePathExemptionReason(repositoryPath) {
  const normalized = normalizeRepositoryPath(repositoryPath);

  const fileName = basename(normalized);
  const extension = extname(normalized).toLowerCase();

  if (isGeneratedBundlePath(normalized)) {
    return "generated-bundle-artifact";
  }

  if (CONTENT_EXCLUDED_FILE_NAMES.has(fileName)) {
    return "generated-lock-file";
  }

  if (isBinaryExtension(normalized)) {
    return "binary-file";
  }

  if (extension === ".json") {
    return "strict-json";
  }

  if (fileName === ".nvmrc" || fileName === ".node-version") {
    return "toolchain-literal-file";
  }

  if (fileName === "LICENSE" || fileName.startsWith("LICENSE.")) {
    return "license-text";
  }

  return null;
}

function normalizeTextContent(content) {
  return content.replaceAll("\r\n", "\n").replaceAll("\r", "\n");
}

function stripUtf8Bom(content) {
  return content.startsWith("\uFEFF") ? content.slice(1) : content;
}

function firstLineOf(content) {
  const normalized = stripUtf8Bom(normalizeTextContent(content));

  const lineBreak = normalized.indexOf("\n");

  return lineBreak === -1 ? normalized : normalized.slice(0, lineBreak);
}

function isRepositoryPathHeaderLike(line) {
  return /^(?:#!|\/\/|#|<!--|\/\*|--)\s*oz-[A-Za-z0-9._-]+\//u.test(line);
}

function buildRelativePathAudit(trackedFiles) {
  const violations = [];
  const exemptions = [];
  let enforcedFileCount = 0;

  for (const repositoryPath of trackedFiles) {
    const exemptionReason = relativePathExemptionReason(repositoryPath);

    if (exemptionReason !== null) {
      exemptions.push({
        path: repositoryPath,
        reason: exemptionReason,
      });
      continue;
    }

    if (!isTextFile(repositoryPath)) {
      exemptions.push({
        path: repositoryPath,
        reason: "binary-content",
      });
      continue;
    }

    const expectedHeader = relativePathHeaderFor(repositoryPath);

    if (expectedHeader === null) {
      violations.push({
        path: repositoryPath,
        reason: "unsupported-header-syntax",
        expected: null,
        actual: firstLineOf(readFileSync(repositoryPath, "utf8")),
      });
      continue;
    }

    enforcedFileCount += 1;

    const actualHeader = firstLineOf(readFileSync(repositoryPath, "utf8"));

    if (actualHeader !== expectedHeader) {
      violations.push({
        path: repositoryPath,
        reason: isRepositoryPathHeaderLike(actualHeader)
          ? "incorrect-relative-path-header"
          : "missing-relative-path-header",
        expected: expectedHeader,
        actual: actualHeader,
      });
    }
  }

  return {
    violations,
    exemptions,
    enforcedFileCount,
  };
}

function formatHeaderAuditFailure(audit) {
  const displayed = audit.violations.slice(0, 50);

  const lines = [
    "Repository relative-path header validation failed.",
    "",
    "Every supported tracked text file must contain its canonical",
    "repository-relative path on line 1 before bundle generation.",
    "",
  ];

  for (const violation of displayed) {
    lines.push(`- ${violation.path}`);
    lines.push(`  reason:   ${violation.reason}`);

    if (violation.expected !== null) {
      lines.push(`  expected: ${JSON.stringify(violation.expected)}`);
    }

    lines.push(`  actual:   ${JSON.stringify(violation.actual)}`);
  }

  if (audit.violations.length > displayed.length) {
    lines.push(
      "",
      `...and ${
        audit.violations.length - displayed.length
      } additional violation(s).`,
    );
  }

  lines.push(
    "",
    "Run:",
    "  node generate-bundles.mjs --fix-relative-paths",
    "",
    "Then review, format/test as applicable, and commit the source changes",
    "before generating canonical bundles.",
  );

  return lines.join("\n");
}

function replaceOrPrependRelativePathHeader(
  repositoryPath,
  rawContent,
  expectedHeader,
) {
  const content = stripUtf8Bom(normalizeTextContent(rawContent));

  const firstLine = firstLineOf(content);

  if (firstLine === expectedHeader) {
    return content;
  }

  if (firstLine.startsWith("#!") && !isRepositoryPathHeaderLike(firstLine)) {
    throw new Error(
      `Cannot automatically prepend a relative-path header to ` +
        `"${repositoryPath}" because it has an interpreter shebang ` +
        `on line 1: ${JSON.stringify(firstLine)}.`,
    );
  }

  if (isRepositoryPathHeaderLike(firstLine)) {
    const firstLineBreak = content.indexOf("\n");

    return firstLineBreak === -1
      ? `${expectedHeader}\n`
      : `${expectedHeader}${content.slice(firstLineBreak)}`;
  }

  return content.length === 0
    ? `${expectedHeader}\n`
    : `${expectedHeader}\n${content}`;
}

function fixRelativePathHeaders(trackedFiles) {
  const changedFiles = [];
  const exemptions = [];

  for (const repositoryPath of trackedFiles) {
    const exemptionReason = relativePathExemptionReason(repositoryPath);

    if (exemptionReason !== null) {
      exemptions.push({
        path: repositoryPath,
        reason: exemptionReason,
      });
      continue;
    }

    if (!isTextFile(repositoryPath)) {
      exemptions.push({
        path: repositoryPath,
        reason: "binary-content",
      });
      continue;
    }

    const expectedHeader = relativePathHeaderFor(repositoryPath);

    if (expectedHeader === null) {
      throw new Error(
        `No safe first-line relative-path header syntax is configured ` +
          `for tracked text file "${repositoryPath}".`,
      );
    }

    const rawContent = readFileSync(repositoryPath, "utf8");

    const updated = replaceOrPrependRelativePathHeader(
      repositoryPath,
      rawContent,
      expectedHeader,
    );

    if (updated !== rawContent) {
      writeFileSync(repositoryPath, updated, {
        encoding: "utf8",
      });

      changedFiles.push(repositoryPath);
    }
  }

  return {
    changedFiles,
    exemptions,
  };
}

function isContentExcludedByName(path) {
  return CONTENT_EXCLUDED_FILE_NAMES.has(basename(path));
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

  if (!isTextFile(path)) {
    return false;
  }

  return true;
}

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
  return normalizeTextContent(content).replace(/\s+$/u, "");
}

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

  return "`".repeat(Math.max(3, longestRun + 1));
}

function assertFileHeaderBeforeBundling(repositoryPath, content) {
  const exemptionReason = relativePathExemptionReason(repositoryPath);

  if (exemptionReason !== null) {
    return;
  }

  const expectedHeader = relativePathHeaderFor(repositoryPath);

  if (expectedHeader === null) {
    throw new Error(
      `No relative-path header policy exists for ` + `"${repositoryPath}".`,
    );
  }

  const actualHeader = firstLineOf(content);

  if (actualHeader !== expectedHeader) {
    throw new Error(
      `Repository file "${repositoryPath}" does not contain its ` +
        `canonical relative-path header on line 1. ` +
        `Expected ${JSON.stringify(expectedHeader)}, ` +
        `received ${JSON.stringify(actualHeader)}.`,
    );
  }
}

function renderFileSection(definition, repositoryPath) {
  assertRegularTrackedFile(repositoryPath);

  const relativePath = bundleRelativePath(definition, repositoryPath);

  const sourceContent = normalizeBundleTextContent(
    readFileSync(repositoryPath, "utf8"),
  );

  assertFileHeaderBeforeBundling(repositoryPath, sourceContent);

  const fence = markdownFenceFor(sourceContent);

  const language = languageFor(repositoryPath);

  return [
    `## File: ${relativePath}`,
    "",
    `${fence}${language}`,
    sourceContent,
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

function summarizeExemptions(exemptions) {
  const counts = new Map();

  for (const exemption of exemptions) {
    counts.set(exemption.reason, (counts.get(exemption.reason) ?? 0) + 1);
  }

  return Object.fromEntries(
    [...counts.entries()].sort(([left], [right]) => comparePaths(left, right)),
  );
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  const { head, commitTimestamp } = assertRepository(args.expectedHead);

  const trackedFiles = listTrackedFiles();

  if (trackedFiles.length === 0) {
    throw new Error("The repository contains no tracked files.");
  }

  if (args.fixRelativePaths) {
    const result = fixRelativePathHeaders(trackedFiles);

    process.stdout.write(
      [
        "",
        "Repository relative-path header migration completed.",
        "",
        `Changed: ${result.changedFiles.length} file(s)`,
        `Exempt:  ${result.exemptions.length} file(s)`,
        "",
      ].join("\n"),
    );

    for (const path of result.changedFiles) {
      process.stdout.write(`- ${path}\n`);
    }

    if (result.changedFiles.length > 0) {
      process.stdout.write(
        [
          "",
          "Review the changes, run repository verification,",
          "and commit them before generating canonical bundles.",
          "",
        ].join("\n"),
      );
    }

    return;
  }

  const headerAudit = buildRelativePathAudit(trackedFiles);

  if (headerAudit.violations.length > 0) {
    throw new Error(formatHeaderAuditFailure(headerAudit));
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

    bundleResults.push(writeBundle(outputDirectory, definition, files));
  }

  const manifest = {
    schemaVersion: 3,
    repository: EXPECTED_REPOSITORY_NAME,
    head,
    commitTimestamp,
    trackedFileCount: trackedFiles.length,
    relativePathHeaders: {
      sourceRepositoryEnforced: true,
      synthesizedIntoBundles: false,
      enforcedTrackedFileCount: headerAudit.enforcedFileCount,
      exemptTrackedFileCount: headerAudit.exemptions.length,
      exemptionsByReason: summarizeExemptions(headerAudit.exemptions),
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
      `Headers:    ${headerAudit.enforcedFileCount} enforced`,
      `Exempt:     ${headerAudit.exemptions.length}`,
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
