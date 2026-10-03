<!-- oz-next-app/tools/fast-glob-compat/README.md -->

# ERP glob compatibility adapter

This private package replaces the registry `fast-glob` dependency with
`tinyglobby@0.2.17`. It removes the `micromatch` → `braces` chain affected by
[GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) without
relaxing `security:audit` or changing shadcn styling.

Reviewed consumers: `@next/eslint-plugin-next@16.3.7`, `shadcn@4.13.1`,
`ts-morph@26.0.0`, and `@ts-morph/common@0.27.0`. The consumer tests intentionally
fail after their versions change. Review their glob call sites, update the
compatibility fixtures, and then update these pins together.

## Supported contract

CommonJS returns a callable async function; ESM provides the same default.
Both expose `glob`/`async` and `sync`/`globSync`. Inputs are a non-empty string or
an array of non-empty strings; an empty array returns no matches.

Supported options are `cwd` (string), `absolute`, `onlyFiles`, `onlyDirectories`,
`ignore` (patterns), `dot`, and `deep`. `deep` is limited to file matching at
integer depths of at least one, or Infinity. Zero depth and directory matching
with a depth limit are rejected because the engines differ for those modes;
none of the reviewed consumers uses them. Unsupported options fail explicitly.
Streams, task generation, filesystem adapters, and path utilities are not exposed.

Automatic directory expansion is disabled, directory result separators are
normalized, and trailing `/**` patterns select descendants rather than the base
directory. Results are unique; enumeration order is unspecified.

Numeric and alphabetic brace ranges are converted to explicit alternatives
before matching; each range is limited to 1,000 values and the resulting pattern
must remain within the input length limit. This preserves multi-digit, padded,
descending, and stepped ranges without picomatch's numeric character-class loss.
Directory discovery supplements tinyglobby with Node's native globbing to include
symlinked directory entries and literal filesystem roots. Node >=24.16 is required
for native globbing to follow directory symlinks safely. Both engines apply the
same validated patterns and exclusions.

Patterns (including exclusions) exceeding 65,536 characters or 64 unescaped
nested brace levels throw a `RangeError` before filesystem discovery. Invalid
arguments throw synchronously, including for the async entry point. These
limits make excessive nested inputs fail in a controlled way.

## Verification and maintenance

Run `npm run test:tooling`, then `npm run verify` and `npm run build:cf`.
The tests cover exports, matching, input limits, real lint and ts-morph discovery,
offline CLI loading, consumer versions, and absence of vulnerable lock entries.
Before the first replacement, `OZ_GLOB_COMPARE_ORIGINALS=1` runs matching fixtures
against installed registry fast-glob 3.3.1 and 3.3.3 as well. This optional
comparison is unavailable once the vulnerable packages have been removed.

The root file dependency and `$fast-glob` override must remain together.
Use a clean `npm ci` to validate reproducibility; do not patch `node_modules` or
add audit exceptions. When compatible upstream consumers remove the vulnerable
chain, remove the adapter and override together and rerun the same acceptance
checks. This package is private and must not be published.
