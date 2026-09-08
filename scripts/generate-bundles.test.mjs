// oz-next-app/scripts/generate-bundles.test.mjs

import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";

const REPOSITORY_NAME = "oz-next-app";
const GENERATOR_SOURCE_PATH = join(process.cwd(), "generate-bundles.mjs");

function write(repositoryRoot, path, content, mode = 0o644) {
  const absolutePath = join(repositoryRoot, path);
  mkdirSync(join(absolutePath, ".."), { recursive: true });
  writeFileSync(absolutePath, content, { encoding: "utf8", mode });
  chmodSync(absolutePath, mode);
}

function git(repositoryRoot, args) {
  return execFileSync("git", args, {
    cwd: repositoryRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function runGenerator(repositoryRoot, args = []) {
  return spawnSync(process.execPath, ["generate-bundles.mjs", ...args], {
    cwd: repositoryRoot,
    encoding: "utf8",
  });
}

function commitAll(repositoryRoot, message) {
  git(repositoryRoot, ["add", "-A"]);
  git(repositoryRoot, ["commit", "-m", message]);
}

function createRepository(options = {}) {
  const parent = mkdtempSync(join(tmpdir(), "oz-next-app-bundle-test-"));
  const repositoryRoot = join(parent, REPOSITORY_NAME);
  mkdirSync(repositoryRoot, { recursive: true });

  let generator = readFileSync(GENERATOR_SOURCE_PATH, "utf8");
  if (options.legacyGeneratorShebang === true) {
    generator = generator.replace(
      /^\/\/ oz-next-app\/generate-bundles\.mjs/u,
      "#!oz-next-app/generate-bundles.mjs",
    );
  }
  write(repositoryRoot, "generate-bundles.mjs", generator);

  write(
    repositoryRoot,
    "README.md",
    "<!-- oz-next-app/README.md -->\n# Fixture\n",
  );
  write(repositoryRoot, "package.json", '{"name":"fixture"}\n');
  write(
    repositoryRoot,
    "src/app/page.tsx",
    "export default function Page() { return null; }\n",
  );
  write(
    repositoryRoot,
    "src/components/common/card.tsx",
    "export function Card() { return null; }\n",
  );
  write(
    repositoryRoot,
    "src/components/ui/button.tsx",
    "export function Button() { return null; }\n",
  );
  write(
    repositoryRoot,
    "src/features/example/feature.ts",
    "export const feature = true;\n",
  );
  write(repositoryRoot, "src/lib/lib.ts", "export const lib = true;\n");
  write(
    repositoryRoot,
    "src/server/server.ts",
    "export const server = true;\n",
  );
  write(
    repositoryRoot,
    "src/shared/shared.ts",
    "export const shared = true;\n",
  );
  write(
    repositoryRoot,
    "src/types/types.ts",
    "export type Example = string;\n",
  );
  write(
    repositoryRoot,
    "middleware.ts",
    "// middleware.ts\nexport function middleware() {}\n",
  );

  git(repositoryRoot, ["init", "-q"]);
  git(repositoryRoot, ["config", "user.email", "bundle-tests@example.invalid"]);
  git(repositoryRoot, ["config", "user.name", "Bundle Tests"]);
  commitAll(repositoryRoot, "fixture");

  return {
    repositoryRoot,
    cleanup: () => rmSync(parent, { recursive: true, force: true }),
  };
}

function readBundleDirectory(repositoryRoot) {
  const directory = join(repositoryRoot, "bundles");
  return Object.fromEntries(
    readdirSync(directory)
      .sort()
      .map((name) => [name, readFileSync(join(directory, name))]),
  );
}

function assertOnlyCrlf(value) {
  assert.match(value, /\r\n/u);
  assert.equal(value.replaceAll("\r\n", "").includes("\n"), false);
  assert.equal(value.replaceAll("\r\n", "").includes("\r"), false);
}

test("repairs source headers without disturbing required preambles or local edits", () => {
  const fixture = createRepository({ legacyGeneratorShebang: true });

  try {
    const { repositoryRoot } = fixture;
    write(
      repositoryRoot,
      "docker/scanner/entrypoint.sh",
      "#!/bin/sh\necho scanner\n",
      0o755,
    );
    write(
      repositoryRoot,
      "scripts/cli.mjs",
      '#!/usr/bin/env node\nconsole.log("cli");\n',
      0o755,
    );
    write(
      repositoryRoot,
      "Dockerfile",
      "# syntax=docker/dockerfile:1\n# check=error=true\n\nFROM node:24\n",
    );
    write(
      repositoryRoot,
      "public/logo.svg",
      '<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg"/>\n',
    );
    write(repositoryRoot, "public/_headers", "/*\n  X-Frame-Options: DENY\n");
    write(
      repositoryRoot,
      "src/features/example/crlf.ts",
      "export const crlf = true;\r\nexport const retained = true;\r\n",
    );
    write(
      repositoryRoot,
      "src/shared/already-canonical.ts",
      "// oz-next-app/src/shared/already-canonical.ts\nexport const stable = true;\n",
    );
    commitAll(repositoryRoot, "preamble fixtures");

    writeFileSync(
      join(repositoryRoot, "src/shared/already-canonical.ts"),
      "// oz-next-app/src/shared/already-canonical.ts\n" +
        "export const stable = true;\n" +
        'export const userEdit = "preserve-me";\n',
      "utf8",
    );

    const shellModeBefore =
      statSync(join(repositoryRoot, "docker/scanner/entrypoint.sh")).mode &
      0o777;
    const jsModeBefore =
      statSync(join(repositoryRoot, "scripts/cli.mjs")).mode & 0o777;

    const repair = runGenerator(repositoryRoot, ["--fix-relative-paths"]);
    assert.equal(repair.status, 0, repair.stderr);

    assert.deepEqual(
      readFileSync(join(repositoryRoot, "docker/scanner/entrypoint.sh"), "utf8")
        .split(/\r?\n/u)
        .slice(0, 3),
      [
        "#!/bin/sh",
        "# oz-next-app/docker/scanner/entrypoint.sh",
        "echo scanner",
      ],
    );
    assert.deepEqual(
      readFileSync(join(repositoryRoot, "scripts/cli.mjs"), "utf8")
        .split(/\r?\n/u)
        .slice(0, 3),
      [
        "#!/usr/bin/env node",
        "// oz-next-app/scripts/cli.mjs",
        'console.log("cli");',
      ],
    );
    assert.equal(
      statSync(join(repositoryRoot, "docker/scanner/entrypoint.sh")).mode &
        0o777,
      shellModeBefore,
    );
    assert.equal(
      statSync(join(repositoryRoot, "scripts/cli.mjs")).mode & 0o777,
      jsModeBefore,
    );

    assert.deepEqual(
      readFileSync(join(repositoryRoot, "Dockerfile"), "utf8")
        .split(/\r?\n/u)
        .slice(0, 5),
      [
        "# syntax=docker/dockerfile:1",
        "# check=error=true",
        "# oz-next-app/Dockerfile",
        "",
        "FROM node:24",
      ],
    );
    assert.deepEqual(
      readFileSync(join(repositoryRoot, "public/logo.svg"), "utf8")
        .split(/\r?\n/u)
        .slice(0, 3),
      [
        '<?xml version="1.0" encoding="UTF-8"?>',
        "<!-- oz-next-app/public/logo.svg -->",
        '<svg xmlns="http://www.w3.org/2000/svg"/>',
      ],
    );
    assert.equal(
      readFileSync(join(repositoryRoot, "public/_headers"), "utf8").split(
        /\r?\n/u,
      )[0],
      "# oz-next-app/public/_headers",
    );
    assert.equal(
      readFileSync(join(repositoryRoot, "middleware.ts"), "utf8").split(
        /\r?\n/u,
      )[0],
      "// oz-next-app/middleware.ts",
    );
    assert.equal(
      readFileSync(join(repositoryRoot, "generate-bundles.mjs"), "utf8").split(
        /\r?\n/u,
      )[0],
      "// oz-next-app/generate-bundles.mjs",
    );
    assertOnlyCrlf(
      readFileSync(
        join(repositoryRoot, "src/features/example/crlf.ts"),
        "utf8",
      ),
    );
    assert.match(
      readFileSync(
        join(repositoryRoot, "src/shared/already-canonical.ts"),
        "utf8",
      ),
      /userEdit = "preserve-me"/u,
    );

    const afterFirstRepair = new Map(
      [
        "generate-bundles.mjs",
        "Dockerfile",
        "docker/scanner/entrypoint.sh",
        "scripts/cli.mjs",
        "public/logo.svg",
        "public/_headers",
        "middleware.ts",
        "src/features/example/crlf.ts",
        "src/shared/already-canonical.ts",
      ].map((path) => [path, readFileSync(join(repositoryRoot, path))]),
    );

    const secondRepair = runGenerator(repositoryRoot, ["--fix-relative-paths"]);
    assert.equal(secondRepair.status, 0, secondRepair.stderr);
    assert.match(secondRepair.stdout, /Changed: 0 file\(s\)/u);

    for (const [path, expected] of afterFirstRepair) {
      assert.deepEqual(readFileSync(join(repositoryRoot, path)), expected);
    }

    const dirtyCheck = runGenerator(repositoryRoot, ["--check-relative-paths"]);
    assert.equal(dirtyCheck.status, 0, dirtyCheck.stderr);

    const dirtyGeneration = runGenerator(repositoryRoot);
    assert.notEqual(dirtyGeneration.status, 0);
    assert.match(
      dirtyGeneration.stderr,
      /Tracked working-tree changes are present/u,
    );

    commitAll(repositoryRoot, "repaired headers");

    const sourcePreamblesBefore = new Map(
      [
        "Dockerfile",
        "docker/scanner/entrypoint.sh",
        "scripts/cli.mjs",
        "public/logo.svg",
      ].map((path) => [path, readFileSync(join(repositoryRoot, path))]),
    );

    const firstGeneration = runGenerator(repositoryRoot);
    assert.equal(firstGeneration.status, 0, firstGeneration.stderr);
    const firstBundles = readBundleDirectory(repositoryRoot);

    const secondGeneration = runGenerator(repositoryRoot);
    assert.equal(secondGeneration.status, 0, secondGeneration.stderr);
    const secondBundles = readBundleDirectory(repositoryRoot);
    assert.deepEqual(secondBundles, firstBundles);

    for (const [path, expected] of sourcePreamblesBefore) {
      assert.deepEqual(readFileSync(join(repositoryRoot, path)), expected);
    }

    const manifest = JSON.parse(
      readFileSync(
        join(repositoryRoot, "bundles/oz-next-app-bundles.manifest.json"),
        "utf8",
      ),
    );
    assert.equal(manifest.schemaVersion, 2);
    assert.equal(manifest.contentFileHeader.required, true);
    assert.equal(manifest.contentFileHeader.scope, "source-repository-files");
    assert.ok(
      manifest.bundles.every((bundle) => /^[0-9a-f]{64}$/u.test(bundle.sha256)),
    );

    const wrongHead = runGenerator(repositoryRoot, [
      "--expected-head",
      "0".repeat(40),
    ]);
    assert.notEqual(wrongHead.status, 0);
    assert.match(wrongHead.stderr, /HEAD mismatch/u);
  } finally {
    fixture.cleanup();
  }
});

for (const staged of [false, true]) {
  test(`repair and check tolerate ${staged ? "staged" : "unstaged"} deletions`, () => {
    const fixture = createRepository();

    try {
      const { repositoryRoot } = fixture;
      const deletedPath = "src/features/example/feature.ts";
      rmSync(join(repositoryRoot, deletedPath));
      if (staged) git(repositoryRoot, ["add", "--", deletedPath]);

      const repair = runGenerator(repositoryRoot, ["--fix-relative-paths"]);
      assert.equal(repair.status, 0, repair.stderr);
      assert.ok(
        repair.stdout.includes(`Skipped (missing): ${staged ? 0 : 1} file(s)`),
      );
      assert.equal(existsSync(join(repositoryRoot, deletedPath)), false);
      assert.equal(
        readFileSync(join(repositoryRoot, "src/lib/lib.ts"), "utf8"),
        "// oz-next-app/src/lib/lib.ts\nexport const lib = true;\n",
      );

      const check = runGenerator(repositoryRoot, ["--check-relative-paths"]);
      assert.equal(check.status, 0, check.stderr);
      assert.ok(check.stdout.includes(`${staged ? 0 : 1} skipped (missing)`));
      assert.equal(existsSync(join(repositoryRoot, deletedPath)), false);

      // Commit only repairs so the deletion is the sole remaining change.
      const remainingFiles = git(repositoryRoot, ["ls-files", "-z"])
        .split("\0")
        .filter((path) => path && path !== deletedPath);
      git(repositoryRoot, ["add", "--", ...remainingFiles]);
      git(repositoryRoot, [
        "commit",
        "--only",
        "-m",
        "repair headers",
        "--",
        ...remainingFiles,
      ]);
      const generation = runGenerator(repositoryRoot);
      assert.notEqual(generation.status, 0);
      assert.match(
        generation.stderr,
        /Tracked working-tree changes are present/u,
      );
    } finally {
      fixture.cleanup();
    }
  });
}

test("repair preflight performs zero writes when an unsupported tracked text format and deletion exist", () => {
  const fixture = createRepository();

  try {
    const { repositoryRoot } = fixture;
    write(
      repositoryRoot,
      "src/features/example/needs-header.ts",
      "export const repairable = true;\n",
    );
    write(
      repositoryRoot,
      "src/features/example/unsafe.xyz",
      "opaque application-specific text\n",
    );
    commitAll(repositoryRoot, "unsafe fixture");
    const deletedPath = join(repositoryRoot, "src/features/example/feature.ts");
    rmSync(deletedPath);

    const repairableBefore = readFileSync(
      join(repositoryRoot, "src/features/example/needs-header.ts"),
    );
    const unsafeBefore = readFileSync(
      join(repositoryRoot, "src/features/example/unsafe.xyz"),
    );

    const result = runGenerator(repositoryRoot, ["--fix-relative-paths"]);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /No files were written/u);
    assert.match(result.stderr, /unsupported-text-format/u);
    assert.doesNotMatch(result.stderr, /file-stat-failed/u);
    assert.equal(existsSync(deletedPath), false);
    assert.deepEqual(
      readFileSync(
        join(repositoryRoot, "src/features/example/needs-header.ts"),
      ),
      repairableBefore,
    );
    assert.deepEqual(
      readFileSync(join(repositoryRoot, "src/features/example/unsafe.xyz")),
      unsafeBefore,
    );
  } finally {
    fixture.cleanup();
  }
});
