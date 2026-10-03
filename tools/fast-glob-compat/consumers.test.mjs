// oz-next-app/tools/fast-glob-compat/consumers.test.mjs
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
  readFileSync,
  symlinkSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";

import { ESLint } from "eslint";

const require = createRequire(import.meta.url);
const root = resolve(import.meta.dirname, "../..");

test("all known consumers resolve the reviewed local adapter", () => {
  for (const [consumer, version] of [
    ["@next/eslint-plugin-next", "16.3.7"],
    ["shadcn", "4.13.1"],
    ["ts-morph", "26.0.0"],
  ]) {
    const manifest = JSON.parse(
      readFileSync(
        join(root, "node_modules", consumer, "package.json"),
        "utf8",
      ),
    );
    assert.equal(
      manifest.version,
      version,
      `${consumer} changed: review adapter compatibility`,
    );
    const consumerRequire = createRequire(require.resolve(consumer));
    const globRequire =
      consumer === "ts-morph"
        ? createRequire(consumerRequire.resolve("@ts-morph/common"))
        : consumerRequire;
    assert.equal(
      globRequire.resolve("fast-glob"),
      join(root, "tools/fast-glob-compat/index.cjs"),
    );
  }
  const common = JSON.parse(
    readFileSync(
      join(root, "node_modules/@ts-morph/common/package.json"),
      "utf8",
    ),
  );
  assert.equal(
    common.version,
    "0.27.0",
    "Review ts-morph common compatibility after upgrade",
  );
  const lock = JSON.parse(
    readFileSync(join(root, "package-lock.json"), "utf8"),
  );
  for (const [path, entry] of Object.entries(lock.packages)) {
    assert.ok(
      !/(?:^|\/)node_modules\/(?:braces|micromatch)$/u.test(path),
      path,
    );
    assert.ok(
      !entry.resolved?.startsWith("https://registry.npmjs.org/fast-glob/"),
      path,
    );
  }
});

test("Next lint discovers wildcard root directories and retains its link rule", async () => {
  const cwd = mkdtempSync(join(tmpdir(), "oz-next-lint-"));
  try {
    mkdirSync(join(cwd, "target/pages"), { recursive: true });
    mkdirSync(join(cwd, "packages"));
    symlinkSync("../target", join(cwd, "packages/site"), "dir");
    writeFileSync(
      join(cwd, "packages/site/pages/index.js"),
      "export default function Page() {}\n",
    );
    const plugin = require("@next/eslint-plugin-next");
    const eslint = new ESLint({
      cwd,
      overrideConfigFile: true,
      overrideConfig: [
        {
          files: ["**/*.js"],
          plugins: { "@next/next": plugin },
          settings: { next: { rootDir: join(cwd, "packages/*") } },
          languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
          rules: { "@next/next/no-html-link-for-pages": "error" },
        },
      ],
    });
    const [bad] = await eslint.lintText('const link = <a href="/">Home</a>;', {
      filePath: "example.js",
    });
    assert.equal(bad.errorCount, 1);
    assert.equal(bad.messages[0].ruleId, "@next/next/no-html-link-for-pages");
    const [good] = await eslint.lintText(
      'const link = <a href="https://example.com">External</a>;',
      { filePath: "example.js" },
    );
    assert.equal(good.errorCount, 0);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("ts-morph preserves absolute discovery and negative patterns", async () => {
  const cwd = mkdtempSync(join(tmpdir(), "oz-ts-morph-"));
  try {
    writeFileSync(join(cwd, "included.ts"), "export const included = true;\n");
    writeFileSync(join(cwd, "excluded.ts"), "export const excluded = true;\n");
    const { Project } = require("ts-morph");
    for (let index = 1; index <= 12; index++) {
      writeFileSync(join(cwd, `f${index}.ts`), "export const value = 1;\n");
    }
    const rangeProject = new Project({ skipAddingFilesFromTsConfig: true });
    assert.equal(
      rangeProject.addSourceFilesAtPaths(join(cwd, "f{1..12}.ts")).length,
      12,
    );
    const project = new Project({ skipAddingFilesFromTsConfig: true });
    const patterns = [
      join(cwd, "*.ts"),
      `!${join(cwd, "excluded.ts")}`,
      `!${join(cwd, "f*.ts")}`,
    ];
    assert.deepEqual(
      project.addSourceFilesAtPaths(patterns).map((file) => file.getFilePath()),
      [join(cwd, "included.ts")],
    );
    assert.deepEqual(await project.getFileSystem().glob(patterns), [
      join(cwd, "included.ts"),
    ]);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("shadcn CLI loads offline without changing project files", () => {
  const cwd = mkdtempSync(join(tmpdir(), "oz-shadcn-"));
  try {
    const result = spawnSync(
      process.execPath,
      [require.resolve("shadcn"), "--help"],
      {
        cwd,
        timeout: 10000,
        encoding: "utf8",
        env: {
          ...process.env,
          HTTP_PROXY: "http://127.0.0.1:1",
          HTTPS_PROXY: "http://127.0.0.1:1",
          NO_PROXY: "",
        },
      },
    );
    assert.equal(result.error, undefined);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Usage: shadcn/u);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});
