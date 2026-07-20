import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const SRC = path.join(ROOT, "src");
const EXTENSIONS = [".ts", ".tsx", ".d.ts", ".js", ".jsx", ".mjs", ".mts"];
const RUNTIME_IMPORT_PATTERN =
  /(?:^|\n)\s*(?!import\s+type\b|export\s+type\b)(?:import[\s\S]*?from\s*|export[\s\S]*?from\s*|import\s*\(\s*)(["'])([^"']+)\1/gu;

function walk(directory) {
  const result = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...walk(absolutePath));
    else if (EXTENSIONS.some((extension) => absolutePath.endsWith(extension)))
      result.push(absolutePath);
  }
  return result;
}

const files = walk(SRC);
const relativeByAbsolute = new Map(
  files.map((filePath) => [
    filePath,
    path.relative(ROOT, filePath).split(path.sep).join("/"),
  ]),
);
const absoluteSet = new Set(files);

function resolve(importer, specifier) {
  let base;
  if (specifier.startsWith("@/")) base = path.join(SRC, specifier.slice(2));
  else if (specifier.startsWith("."))
    base = path.resolve(path.dirname(importer), specifier);
  else return null;

  const candidates = [base];
  for (const extension of EXTENSIONS) candidates.push(`${base}${extension}`);
  for (const extension of EXTENSIONS)
    candidates.push(path.join(base, `index${extension}`));
  return candidates.find((candidate) => absoluteSet.has(candidate)) ?? null;
}

const graph = new Map();
for (const filePath of files) {
  const source = fs.readFileSync(filePath, "utf8");
  const dependencies = new Set();
  RUNTIME_IMPORT_PATTERN.lastIndex = 0;
  for (const match of source.matchAll(RUNTIME_IMPORT_PATTERN)) {
    const specifier = match[2];
    if (specifier === undefined) continue;
    const target = resolve(filePath, specifier);
    if (target !== null && target !== filePath) dependencies.add(target);
  }
  graph.set(filePath, dependencies);
}

const state = new Map();
const stack = [];
const cycles = new Map();

function visit(node) {
  const currentState = state.get(node) ?? 0;
  if (currentState === 2) return;
  if (currentState === 1) {
    const start = stack.indexOf(node);
    const cycle = [...stack.slice(start), node];
    const labels = cycle.map((item) => relativeByAbsolute.get(item) ?? item);
    const rotations = labels.slice(0, -1).map((_, index) => {
      const body = labels.slice(0, -1);
      const rotated = [...body.slice(index), ...body.slice(0, index)];
      return [...rotated, rotated[0]].join(" -> ");
    });
    const key = rotations.sort()[0];
    if (key !== undefined) cycles.set(key, labels.join(" -> "));
    return;
  }

  state.set(node, 1);
  stack.push(node);
  for (const dependency of graph.get(node) ?? []) visit(dependency);
  stack.pop();
  state.set(node, 2);
}

for (const filePath of files) visit(filePath);

if (cycles.size > 0) {
  console.error(
    `Dependency cycle verification failed with ${cycles.size} cycle(s):`,
  );
  for (const cycle of cycles.values()) console.error(`- ${cycle}`);
  process.exit(1);
}

console.log(
  `Dependency cycle verification passed for ${files.length} source files.`,
);
