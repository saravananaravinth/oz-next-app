// oz-next-app/src/lib/runtime/index.ts
export {
  assertBrowserRuntime,
  currentLocationPath,
  isBrowser,
  isServer,
} from "@/lib/runtime/browser-runtime";
export {
  evaluateBrowserRuntimeSupport,
  evaluateCurrentBrowserSupport,
  evaluateUserAgentSupport,
  missingBrowserCapabilities,
  readBrowserCapabilitySnapshot,
  REQUIRED_BROWSER_CAPABILITIES,
  SUPPORTED_BROWSER_FALLBACK_PATH,
  SUPPORTED_BROWSER_MINIMUMS,
  type BrowserCapabilityName,
  type BrowserCapabilitySnapshot,
  type BrowserFamily,
  type BrowserRuntimeSupportAssessment,
  type BrowserSupportStatus,
  type BrowserVersion,
  type SupportedBrowserFamily,
  type UserAgentSupportAssessment,
} from "@/lib/runtime/browser-support";
