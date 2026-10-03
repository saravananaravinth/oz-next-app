// oz-next-app/tools/fast-glob-compat/index.cjs
const tinyglobby = require("tinyglobby");
const fs = require("node:fs");
const path = require("node:path");

const booleanOptions = new Set([
  "absolute",
  "onlyFiles",
  "onlyDirectories",
  "dot",
]);
const supportedOptions = new Set([...booleanOptions, "cwd", "ignore", "deep"]);

function validatePatterns(input) {
  const patterns = Array.isArray(input) ? input : [input];
  for (const pattern of patterns) {
    if (typeof pattern !== "string" || pattern.length === 0) {
      throw new TypeError(
        "Patterns must be a non-empty string or string array",
      );
    }
    if (pattern.length > 65536) {
      throw new RangeError("Glob pattern exceeds 65536 characters");
    }
    let depth = 0;
    for (let index = 0; index < pattern.length; index++) {
      if (pattern[index] === "\\") {
        index++;
      } else if (pattern[index] === "{") {
        if (++depth > 64) {
          throw new RangeError("Glob pattern exceeds 64 nested brace levels");
        }
      } else if (pattern[index] === "}") {
        depth = Math.max(0, depth - 1);
      }
    }
  }
  return patterns;
}

function normalizeOptions(options = {}) {
  if (
    options === null ||
    typeof options !== "object" ||
    Array.isArray(options)
  ) {
    throw new TypeError("Glob options must be an object");
  }
  for (const key of Reflect.ownKeys(options)) {
    if (!supportedOptions.has(key)) {
      throw new TypeError(`Unsupported fast-glob option: ${String(key)}`);
    }
    const value = options[key];
    if (value === undefined) continue;
    if (booleanOptions.has(key) && typeof value !== "boolean") {
      throw new TypeError(`${key} must be a boolean`);
    }
    if (key === "cwd" && typeof value !== "string") {
      throw new TypeError("cwd must be a string");
    }
    if (
      key === "deep" &&
      value !== Infinity &&
      (!Number.isInteger(value) || value < 0)
    ) {
      throw new TypeError("deep must be a non-negative integer or Infinity");
    }
    if (key === "ignore") validatePatterns(value);
  }
  if (
    options.deep !== undefined &&
    (options.deep === 0 ||
      options.onlyDirectories ||
      options.onlyFiles === false)
  ) {
    throw new TypeError(
      "deep is supported only for file matching at depth >= 1",
    );
  }
  return { ...options, expandDirectories: false };
}

function matchingPatterns(patterns) {
  // fast-glob's trailing globstar selects descendants, not the base directory.
  return patterns.map((input) => {
    const pattern = expandRanges(input);
    return !pattern.startsWith("!") && pattern.endsWith("/**")
      ? `${pattern}/*`
      : pattern;
  });
}

function expandRanges(pattern) {
  const expanded = pattern.replace(
    /\{(-?\d+|[a-zA-Z])\.\.(-?\d+|[a-zA-Z])(?:\.\.(-?\d+))?\}/gu,
    (match, first, last, increment, offset) => {
      let escapes = 0;
      for (
        let index = offset - 1;
        index >= 0 && pattern[index] === "\\";
        index--
      )
        escapes++;
      if (escapes % 2) return match;
      const numeric = /^-?\d+$/u.test(first) && /^-?\d+$/u.test(last);
      if (!numeric && (first.length !== 1 || last.length !== 1)) return match;
      const start = numeric ? Number(first) : first.charCodeAt(0);
      const end = numeric ? Number(last) : last.charCodeAt(0);
      const step = Math.abs(Number(increment ?? 1)) || 1;
      const count = Math.floor(Math.abs(end - start) / step) + 1;
      if (![start, end, step].every(Number.isSafeInteger) || count > 1000) {
        throw new RangeError(
          "Brace ranges must contain at most 1000 safe integer values",
        );
      }
      const padded = numeric && (/^-?0\d/u.test(first) || /^-?0\d/u.test(last));
      const width = Math.max(first.length, last.length);
      const values = Array.from({ length: count }, (_, index) => {
        const value = start + index * step * (start <= end ? 1 : -1);
        if (!numeric) return String.fromCharCode(value);
        if (!padded) return String(value);
        return value < 0
          ? `-${String(-value).padStart(width - 1, "0")}`
          : String(value).padStart(width, "0");
      });
      return values.length === 1 ? values[0] : `{${values.join(",")}}`;
    },
  );
  validatePatterns(expanded);
  return expanded;
}

function directoryMatches(patterns, options) {
  if (!options.onlyDirectories && options.onlyFiles !== false) return [];
  const positive = patterns.filter((pattern) => !pattern.startsWith("!"));
  if (positive.length === 0) return [];
  const excluded = [
    ...patterns
      .filter((pattern) => pattern.startsWith("!"))
      .map((pattern) => pattern.slice(1)),
    ...options.ignore,
  ].flatMap((pattern) =>
    pattern.endsWith("/**") ? [pattern, pattern.slice(0, -3)] : [pattern],
  );
  const cwd = options.cwd ?? process.cwd();
  // Native discovery includes linked directory entries omitted by fdir.
  return fs
    .globSync(positive, { cwd, exclude: excluded, followSymlinks: true })
    .filter((entry) =>
      fs
        .statSync(path.resolve(cwd, entry), { throwIfNoEntry: false })
        ?.isDirectory(),
    )
    .map((entry) => (options.absolute ? path.resolve(cwd, entry) : entry));
}

function query(patterns, options) {
  return {
    patterns: matchingPatterns(patterns),
    options: {
      ...options,
      ignore:
        options.ignore === undefined
          ? []
          : validatePatterns(options.ignore).map(expandRanges),
    },
  };
}

function crawlerPatterns(patterns) {
  // tinyglobby normalizes these literal roots to an empty matching expression.
  return patterns.filter(
    (pattern) =>
      pattern !== "." && pattern !== "/" && !/^[a-z]:\/$/iu.test(pattern),
  );
}

function normalizeResults(paths) {
  return [
    ...new Set(
      paths.map((path) =>
        path === "/" || /^[a-z]:\/$/iu.test(path)
          ? path
          : path.replace(/\/$/u, ""),
      ),
    ),
  ];
}

// Validate before returning the promise, matching fast-glob's input errors.
function glob(patterns, options) {
  const input = validatePatterns(patterns);
  const normalized = normalizeOptions(options);
  const prepared = query(input, normalized);
  return input.length === 0
    ? Promise.resolve([])
    : tinyglobby
        .glob(crawlerPatterns(prepared.patterns), prepared.options)
        .then((paths) =>
          normalizeResults([
            ...paths,
            ...directoryMatches(prepared.patterns, prepared.options),
          ]),
        );
}

function globSync(patterns, options) {
  const input = validatePatterns(patterns);
  const normalized = normalizeOptions(options);
  const prepared = query(input, normalized);
  return input.length === 0
    ? []
    : normalizeResults([
        ...tinyglobby.globSync(
          crawlerPatterns(prepared.patterns),
          prepared.options,
        ),
        ...directoryMatches(prepared.patterns, prepared.options),
      ]);
}

glob.glob = glob;
glob.async = glob;
glob.sync = globSync;
glob.globSync = globSync;
module.exports = glob;
