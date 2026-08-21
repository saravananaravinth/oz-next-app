// oz-next-app/src/lib/runtime/browser-support.ts
export const SUPPORTED_BROWSER_FALLBACK_PATH = "/unsupported-browser" as const;

export const SUPPORTED_BROWSER_MINIMUMS = {
  chrome: { major: 111, minor: 0 },
  edge: { major: 111, minor: 0 },
  firefox: { major: 111, minor: 0 },
  safari: { major: 16, minor: 4 },
} as const;

export type SupportedBrowserFamily = keyof typeof SUPPORTED_BROWSER_MINIMUMS;
export type BrowserFamily = SupportedBrowserFamily | "legacy-ie" | "unknown";
export type BrowserSupportStatus = "supported" | "unsupported" | "unknown";

export type BrowserVersion = Readonly<{
  major: number;
  minor: number;
}>;

export type UserAgentSupportAssessment = Readonly<{
  status: BrowserSupportStatus;
  family: BrowserFamily;
  version: BrowserVersion | null;
  reason:
    | "meets_minimum"
    | "below_minimum"
    | "legacy_browser"
    | "unknown_browser"
    | "invalid_user_agent";
}>;

export const REQUIRED_BROWSER_CAPABILITIES = [
  "fetch",
  "url",
  "abortController",
  "textEncoder",
  "structuredClone",
  "cryptoRandomUUID",
  "resizeObserver",
  "matchMedia",
  "cssSupports",
] as const;

export type BrowserCapabilityName =
  (typeof REQUIRED_BROWSER_CAPABILITIES)[number];

export type BrowserCapabilitySnapshot = Readonly<
  Record<BrowserCapabilityName, boolean>
>;

export type BrowserRuntimeSupportAssessment = Readonly<{
  status: "supported" | "unsupported";
  userAgent: UserAgentSupportAssessment;
  missingCapabilities: readonly BrowserCapabilityName[];
  reason:
    | "supported_browser"
    | "capability_compatible_unknown_browser"
    | "unsupported_browser_version"
    | "missing_required_capabilities";
}>;

const MAX_USER_AGENT_LENGTH = 1_024;
const ASCII_CONTROL_MAX_CODE_POINT = 0x1f;
const ASCII_DELETE_CODE_POINT = 0x7f;

const IOS_DEVICE_PATTERN = /(?:iphone|ipad|ipod)/iu;
const IOS_VERSION_PATTERN =
  /(?:cpu (?:iphone )?os|iphone os)\s+(\d+)(?:[._](\d+))?/iu;
const EDGE_VERSION_PATTERN = /(?:edg|edga)\/(\d+)(?:\.(\d+))?/iu;
const FIREFOX_VERSION_PATTERN = /firefox\/(\d+)(?:\.(\d+))?/iu;
const CHROME_VERSION_PATTERN = /(?:chrome|chromium)\/(\d+)(?:\.(\d+))?/iu;
const SAFARI_VERSION_PATTERN = /version\/(\d+)(?:\.(\d+))?.*safari\//iu;
const LEGACY_IE_PATTERN = /(?:msie\s|trident\/)/iu;

function hasControlCharacter(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const codePoint = value.charCodeAt(index);

    if (
      codePoint <= ASCII_CONTROL_MAX_CODE_POINT ||
      codePoint === ASCII_DELETE_CODE_POINT
    ) {
      return true;
    }
  }

  return false;
}

function parseVersionMatch(
  match: RegExpExecArray | null,
): BrowserVersion | null {
  if (match === null) {
    return null;
  }

  const majorText = match[1];
  const minorText = match[2];

  if (majorText === undefined) {
    return null;
  }

  const major = Number.parseInt(majorText, 10);
  const minor = minorText === undefined ? 0 : Number.parseInt(minorText, 10);

  if (!Number.isSafeInteger(major) || !Number.isSafeInteger(minor)) {
    return null;
  }

  return { major, minor };
}

function compareVersion(left: BrowserVersion, right: BrowserVersion): number {
  if (left.major !== right.major) {
    return left.major - right.major;
  }

  return left.minor - right.minor;
}

function assessKnownBrowser(
  family: SupportedBrowserFamily,
  version: BrowserVersion | null,
): UserAgentSupportAssessment {
  if (version === null) {
    return {
      status: "unknown",
      family,
      version: null,
      reason: "unknown_browser",
    };
  }

  const minimum = SUPPORTED_BROWSER_MINIMUMS[family];
  const supported = compareVersion(version, minimum) >= 0;

  return {
    status: supported ? "supported" : "unsupported",
    family,
    version,
    reason: supported ? "meets_minimum" : "below_minimum",
  };
}

export function evaluateUserAgentSupport(
  userAgent: string | null | undefined,
): UserAgentSupportAssessment {
  const normalized = userAgent?.trim() ?? "";

  if (
    normalized.length === 0 ||
    normalized.length > MAX_USER_AGENT_LENGTH ||
    hasControlCharacter(normalized)
  ) {
    return {
      status: "unknown",
      family: "unknown",
      version: null,
      reason: "invalid_user_agent",
    };
  }

  if (LEGACY_IE_PATTERN.test(normalized)) {
    return {
      status: "unsupported",
      family: "legacy-ie",
      version: null,
      reason: "legacy_browser",
    };
  }

  if (IOS_DEVICE_PATTERN.test(normalized)) {
    return assessKnownBrowser(
      "safari",
      parseVersionMatch(IOS_VERSION_PATTERN.exec(normalized)),
    );
  }

  const edgeVersion = parseVersionMatch(EDGE_VERSION_PATTERN.exec(normalized));

  if (edgeVersion !== null) {
    return assessKnownBrowser("edge", edgeVersion);
  }

  const firefoxVersion = parseVersionMatch(
    FIREFOX_VERSION_PATTERN.exec(normalized),
  );

  if (firefoxVersion !== null) {
    return assessKnownBrowser("firefox", firefoxVersion);
  }

  const chromeVersion = parseVersionMatch(
    CHROME_VERSION_PATTERN.exec(normalized),
  );

  if (chromeVersion !== null) {
    return assessKnownBrowser("chrome", chromeVersion);
  }

  const safariVersion = parseVersionMatch(
    SAFARI_VERSION_PATTERN.exec(normalized),
  );

  if (safariVersion !== null) {
    return assessKnownBrowser("safari", safariVersion);
  }

  return {
    status: "unknown",
    family: "unknown",
    version: null,
    reason: "unknown_browser",
  };
}

export function readBrowserCapabilitySnapshot(): BrowserCapabilitySnapshot {
  return {
    fetch: typeof globalThis.fetch === "function",
    url: typeof globalThis.URL === "function",
    abortController: typeof globalThis.AbortController === "function",
    textEncoder: typeof globalThis.TextEncoder === "function",
    structuredClone: typeof globalThis.structuredClone === "function",
    cryptoRandomUUID:
      typeof globalThis.crypto === "object" &&
      typeof globalThis.crypto.randomUUID === "function",
    resizeObserver: typeof globalThis.ResizeObserver === "function",
    matchMedia: typeof globalThis.matchMedia === "function",
    cssSupports:
      typeof globalThis.CSS === "object" &&
      typeof globalThis.CSS.supports === "function",
  };
}

export function missingBrowserCapabilities(
  snapshot: BrowserCapabilitySnapshot,
): readonly BrowserCapabilityName[] {
  return REQUIRED_BROWSER_CAPABILITIES.filter((name) => !snapshot[name]);
}

export function evaluateBrowserRuntimeSupport(
  userAgent: string | null | undefined,
  capabilities: BrowserCapabilitySnapshot,
): BrowserRuntimeSupportAssessment {
  const userAgentAssessment = evaluateUserAgentSupport(userAgent);

  if (userAgentAssessment.status === "unsupported") {
    return {
      status: "unsupported",
      userAgent: userAgentAssessment,
      missingCapabilities: [],
      reason: "unsupported_browser_version",
    };
  }

  const missingCapabilities = missingBrowserCapabilities(capabilities);

  if (missingCapabilities.length > 0) {
    return {
      status: "unsupported",
      userAgent: userAgentAssessment,
      missingCapabilities,
      reason: "missing_required_capabilities",
    };
  }

  return {
    status: "supported",
    userAgent: userAgentAssessment,
    missingCapabilities: [],
    reason:
      userAgentAssessment.status === "supported"
        ? "supported_browser"
        : "capability_compatible_unknown_browser",
  };
}

export function evaluateCurrentBrowserSupport(): BrowserRuntimeSupportAssessment {
  const userAgent =
    typeof globalThis.navigator === "object"
      ? globalThis.navigator.userAgent
      : null;

  return evaluateBrowserRuntimeSupport(
    userAgent,
    readBrowserCapabilitySnapshot(),
  );
}
