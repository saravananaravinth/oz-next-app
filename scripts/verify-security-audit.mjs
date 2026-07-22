// oz-next-app/scripts/verify-security-audit.mjs
import { spawnSync } from "node:child_process";

const EXPECTED_ADVISORY_URL =
  "https://github.com/advisories/GHSA-frvp-7c67-39w9";
const EXPECTED_VULNERABILITIES = new Set([
  "@hono/node-server",
  "@modelcontextprotocol/sdk",
  "shadcn",
]);

function fail(message) {
  console.error(`Security audit policy failed: ${message}`);
  process.exitCode = 1;
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function runAudit() {
  const npmExecPath = process.env.npm_execpath;
  if (!npmExecPath) {
    fail("npm_execpath is unavailable; run this verifier through npm.");
    return null;
  }

  const result = spawnSync(
    process.execPath,
    [npmExecPath, "audit", "--audit-level=high", "--json"],
    {
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024,
    },
  );

  if (result.error) {
    fail(`npm audit could not start (${result.error.name}).`);
    return null;
  }

  let report;
  try {
    report = JSON.parse(result.stdout);
  } catch {
    fail("npm audit did not return valid JSON.");
    return null;
  }

  if (!isRecord(report) || isRecord(report.error)) {
    fail("npm audit returned an error response.");
    return null;
  }

  if (result.status !== 0) {
    fail("npm audit detected a high or critical vulnerability.");
    return null;
  }

  return report;
}

function verifyExpectedException(report) {
  const vulnerabilities = report.vulnerabilities;
  const counts = report.metadata?.vulnerabilities;

  if (!isRecord(vulnerabilities) || !isRecord(counts)) {
    fail("npm audit returned an unsupported report shape.");
    return;
  }

  const actualNames = Object.keys(vulnerabilities).sort();
  const expectedNames = [...EXPECTED_VULNERABILITIES].sort();
  if (JSON.stringify(actualNames) !== JSON.stringify(expectedNames)) {
    fail(
      "the dependency findings no longer match the documented Hono exception; review the audit and advisory register.",
    );
    return;
  }

  const hasExpectedAdvisory = Object.values(vulnerabilities).some((entry) =>
    Array.isArray(entry?.via)
      ? entry.via.some(
          (cause) => isRecord(cause) && cause.url === EXPECTED_ADVISORY_URL,
        )
      : false,
  );
  const allModerate = Object.values(vulnerabilities).every(
    (entry) => entry?.severity === "moderate",
  );
  const countsMatch =
    counts.info === 0 &&
    counts.low === 0 &&
    counts.moderate === 3 &&
    counts.high === 0 &&
    counts.critical === 0 &&
    counts.total === 3;

  if (!hasExpectedAdvisory || !allModerate || !countsMatch) {
    fail(
      "the advisory identity or severity counts changed; review the dependency graph before updating the exception.",
    );
    return;
  }

  console.log(
    "Security audit passed: zero high/critical findings; GHSA-frvp-7c67-39w9 is the only documented moderate dependency path.",
  );
}

const report = runAudit();
if (report) {
  verifyExpectedException(report);
}
