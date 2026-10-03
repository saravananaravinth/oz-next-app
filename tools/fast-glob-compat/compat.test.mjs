// oz-next-app/tools/fast-glob-compat/compat.test.mjs
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import glob, {
  glob as namedGlob,
  globSync,
  sync,
  async as asyncGlob,
} from "./index.mjs";

const require = createRequire(import.meta.url);
const root = resolve(import.meta.dirname, "../..");
const adapter = require("./index.cjs");
const sorted = (paths) => [...paths].sort();

function fixture() {
  const cwd = mkdtempSync(join(tmpdir(), "oz-glob-"));
  for (const path of [
    "src/a.ts",
    "src/b.tsx",
    "src/nested/c.js",
    "src/nested/deeper/style.css",
    "src/.hidden.ts",
    "src/ignored/no.ts",
    "packages/a/package.json",
    "packages/b/package.json",
    "next.config.ts",
    "tsconfig.json",
    ".config.js",
  ]) {
    mkdirSync(dirname(join(cwd, path)), { recursive: true });
    writeFileSync(join(cwd, path), "export const value = 1;\n");
  }
  mkdirSync(join(cwd, "packages/empty"));
  for (let index = 1; index <= 12; index++) {
    writeFileSync(join(cwd, `f${index}.ts`), "export const value = 1;\n");
    writeFileSync(
      join(cwd, `p${String(index).padStart(2, "0")}.ts`),
      "export const value = 1;\n",
    );
  }
  return cwd;
}

test("CommonJS and ESM expose all observed callable aliases", () => {
  assert.equal(adapter, glob);
  assert.equal(namedGlob, glob);
  assert.equal(asyncGlob, glob);
  assert.equal(adapter.glob, glob);
  assert.equal(adapter.async, glob);
  assert.equal(adapter.sync, sync);
  assert.equal(adapter.globSync, globSync);
});

test("glob matching preserves consumer results and async/sync parity", async () => {
  const cwd = fixture();
  const cases = [
    ["src/a.ts", {}, ["src/a.ts"]],
    ["src", {}, []],
    ["packages/a", { onlyDirectories: true }, ["packages/a"]],
    [
      "packages/*",
      { onlyDirectories: true },
      ["packages/a", "packages/b", "packages/empty"],
    ],
    [
      "packages/**",
      { onlyDirectories: true },
      ["packages/a", "packages/b", "packages/empty"],
    ],
    ["src/**/*.{ts,tsx}", {}, ["src/a.ts", "src/b.tsx", "src/ignored/no.ts"]],
    [
      "src/**/*.{ts,tsx}",
      { ignore: ["**/ignored/**"] },
      ["src/a.ts", "src/b.tsx"],
    ],
    [["src/**/*.ts", "!**/ignored/**"], {}, ["src/a.ts"]],
    [["src/a.ts", "src/a.ts"], {}, ["src/a.ts"]],
    ["src/*.ts", { dot: true }, ["src/.hidden.ts", "src/a.ts"]],
    [".config.*", { dot: true }, [".config.js"]],
    [
      "**/package.json",
      { deep: 3 },
      ["packages/a/package.json", "packages/b/package.json"],
    ],
    [["**/*.css", "**/*.scss"], { deep: 5 }, ["src/nested/deeper/style.css"]],
    ["tsconfig.*", { deep: 1 }, ["tsconfig.json"]],
    ["src/a.ts", { absolute: true }, [join(cwd, "src/a.ts")]],
    [[], {}, []],
    ["missing/**/*.ts", {}, []],
  ];
  const frameworkPattern =
    "**/{next,vite,astro,app}.config.*|gatsby-config.*|composer.json|react-router.config.*";
  // This literal pipe pattern is supplied by shadcn; preserve its actual result.
  cases.push([frameworkPattern, { deep: 3 }, ["next.config.ts"]]);
  cases.push([
    "f{1..12}.ts",
    {},
    Array.from({ length: 12 }, (_, index) => `f${index + 1}.ts`),
  ]);
  cases.push(["f{5..1..2}.ts", {}, ["f1.ts", "f3.ts", "f5.ts"]]);
  cases.push([
    "p{01..12}.ts",
    {},
    Array.from(
      { length: 12 },
      (_, index) => `p${String(index + 1).padStart(2, "0")}.ts`,
    ),
  ]);
  cases.push([
    ["packages/**", "!packages/a/**"],
    { onlyDirectories: true },
    ["packages/b", "packages/empty"],
  ]);
  cases.push([
    "packages/**",
    { onlyDirectories: true, ignore: ["packages/a/**"] },
    ["packages/b", "packages/empty"],
  ]);
  const originals = process.env.OZ_GLOB_COMPARE_ORIGINALS
    ? [
        require(join(root, "node_modules/fast-glob")),
        require(join(root, "node_modules/shadcn/node_modules/fast-glob")),
      ]
    : [];
  try {
    for (const [patterns, options, expected] of cases) {
      const settings = { cwd, ...options };
      const actual = sorted(globSync(patterns, settings));
      assert.deepEqual(
        actual,
        sorted(expected),
        JSON.stringify({ patterns, options }),
      );
      assert.deepEqual(sorted(await glob(patterns, settings)), actual);
      for (const original of originals) {
        assert.deepEqual(sorted(original.sync(patterns, settings)), actual);
        assert.deepEqual(sorted(await original(patterns, settings)), actual);
      }
    }
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test("absolute filesystem root directory paths retain their separator", () => {
  assert.deepEqual(globSync("/", { onlyDirectories: true, absolute: true }), [
    "/",
  ]);
});

test("invalid patterns and unsupported options fail explicitly", () => {
  for (const patterns of [undefined, null, 1, "", ["ok", ""], [null]]) {
    assert.throws(() => globSync(patterns), TypeError);
    assert.throws(() => glob(patterns), TypeError);
  }
  for (const options of [
    null,
    [],
    { stream: true },
    { absolute: 1 },
    { cwd: 1 },
    { ignore: [null] },
    { deep: -1 },
    { deep: 0 },
    { deep: 2, onlyDirectories: true },
  ]) {
    assert.throws(() => globSync("*.ts", options), TypeError);
    assert.throws(() => glob("*.ts", options), TypeError);
  }
  assert.throws(() => globSync("x".repeat(65537)), RangeError);
  assert.throws(() => globSync("f{1..1000000000}.ts"), RangeError);
  assert.throws(
    () => globSync("*.ts", { ignore: ["{".repeat(65)] }),
    RangeError,
  );
});

test("nested and malformed brace patterns terminate in an isolated process", () => {
  const result = spawnSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `
    import assert from 'node:assert/strict';
    import glob from ${JSON.stringify(fileURLToPath(new URL("./index.mjs", import.meta.url)))};
    for (const p of ['{'.repeat(5000) + 'a,b' + '}'.repeat(5000), '{'.repeat(5000)]) {
      assert.throws(() => glob.sync(p), RangeError);
      assert.throws(() => glob(p), RangeError);
    }
  `,
    ],
    { timeout: 5000, encoding: "utf8" },
  );
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr);
});
