// oz-next-app/scripts/verify-security-audit.mjs
import { spawnSync } from "node:child_process";

const AUDIT_SEVERITIES = ["info", "low", "moderate", "high", "critical"];

function fail(message) {
  console.error(`Security audit policy failed: ${message}`);
  process.exitCode = 1;
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCount(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

function runAudit() {
  const npmExecPath = process.env.npm_execpath;
  if (!npmExecPath) {
    fail("npm_execpath is unavailable; run this verifier through npm.");
    return null;
  }

  const result = spawnSync(
    process.execPath,
    [npmExecPath, "audit", "--audit-level=low", "--json"],
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
    const detail = result.stderr.trim();
    fail(
      detail.length === 0
        ? "npm audit did not return valid JSON."
        : `npm audit did not return valid JSON: ${detail}`,
    );
    return null;
  }

  if (!isRecord(report)) {
    fail("npm audit returned an unsupported report shape.");
    return null;
  }

  if (isRecord(report.error)) {
    const summary =
      typeof report.error.summary === "string"
        ? report.error.summary
        : "the registry returned an audit error";
    fail(`npm audit could not complete: ${summary}.`);
    return null;
  }

  return { report, status: result.status, signal: result.signal };
}

function verifyCleanReport({ report, status, signal }) {
  const vulnerabilities = report.vulnerabilities;
  const counts = report.metadata?.vulnerabilities;

  if (!isRecord(vulnerabilities) || !isRecord(counts)) {
    fail("npm audit returned an unsupported vulnerability report shape.");
    return;
  }

  if (
    !AUDIT_SEVERITIES.every((severity) => isCount(counts[severity])) ||
    !isCount(counts.total)
  ) {
    fail("npm audit returned invalid vulnerability counts.");
    return;
  }

  const calculatedTotal = AUDIT_SEVERITIES.reduce(
    (total, severity) => total + counts[severity],
    0,
  );
  if (calculatedTotal !== counts.total) {
    fail("npm audit returned inconsistent vulnerability counts.");
    return;
  }

  const affectedPackages = Object.keys(vulnerabilities).sort();
  if (counts.total > 0 || affectedPackages.length > 0) {
    const severitySummary = AUDIT_SEVERITIES.map(
      (severity) => `${severity}=${String(counts[severity])}`,
    ).join(", ");
    const packageSummary =
      affectedPackages.length === 0
        ? "none reported"
        : affectedPackages.join(", ");
    fail(
      `found ${String(counts.total)} known vulnerabilities (${severitySummary}). Affected packages: ${packageSummary}.`,
    );
    return;
  }

  if (status !== 0) {
    fail(
      signal === null
        ? `npm audit exited with status ${String(status)} without reporting vulnerabilities.`
        : `npm audit was terminated by signal ${signal}.`,
    );
    return;
  }

  console.log(
    "Security audit passed: zero known vulnerabilities across production and development dependencies.",
  );
}

const auditResult = runAudit();
if (auditResult) {
  verifyCleanReport(auditResult);
}
