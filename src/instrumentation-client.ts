// oz-next-app/src/instrumentation-client.ts
import {
  evaluateCurrentBrowserSupport,
  SUPPORTED_BROWSER_FALLBACK_PATH,
} from "@/lib/runtime/browser-support";

const assessment = evaluateCurrentBrowserSupport();

document.documentElement.setAttribute(
  "data-browser-support",
  assessment.status,
);

if (
  assessment.status === "unsupported" &&
  window.location.pathname !== SUPPORTED_BROWSER_FALLBACK_PATH
) {
  window.location.replace(SUPPORTED_BROWSER_FALLBACK_PATH);
}
