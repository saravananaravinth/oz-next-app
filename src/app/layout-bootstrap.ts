// oz-next-app/src/app/layout-bootstrap.ts
import {
  LEGACY_UI_STORAGE_KEYS,
  UI_STORAGE_KEYS,
} from "@/lib/ui-preferences/storage-keys";

const ALLOWED_ACCENTS = [
  "default",
  "red",
  "orange",
  "green",
  "blue",
  "yellow",
  "violet",
  "corporate",
] as const;

const DEFAULT_ACCENT = "default" as const;

const INLINE_JSON_ESCAPE_LOOKUP: Readonly<Record<string, string>> = {
  "<": "\\u003c",
  ">": "\\u003e",
  "&": "\\u0026",
  "\u2028": "\\u2028",
  "\u2029": "\\u2029",
};

const INLINE_JSON_ESCAPE_REGEX = /[<>&\u2028\u2029]/gu;
const STORAGE_KEY_REGEX = /^[A-Za-z0-9:._-]+$/u;

const MAX_STORAGE_KEY_LENGTH = 128;
const MAX_ALLOWED_ACCENTS = 32;

type UiAccent = (typeof ALLOWED_ACCENTS)[number];

type LayoutBootstrapStorageConfig = Readonly<{
  themeKey: string;
  legacyThemeKey: string;
  accentKey: string;
  allowedAccents: readonly UiAccent[];
  defaultAccent: UiAccent;
}>;

function isAllowedAccent(value: string): value is UiAccent {
  return ALLOWED_ACCENTS.some((accent) => accent === value);
}

function assertStorageKey(name: string, value: string): string {
  const normalized = value.trim();

  if (
    normalized.length === 0 ||
    normalized.length > MAX_STORAGE_KEY_LENGTH ||
    !STORAGE_KEY_REGEX.test(normalized)
  ) {
    throw new Error(`${name}_storage_key_invalid`);
  }

  return normalized;
}

function normalizeAllowedAccents(
  values: readonly UiAccent[],
): readonly UiAccent[] {
  const unique: UiAccent[] = [];

  for (const value of values) {
    if (unique.length >= MAX_ALLOWED_ACCENTS) {
      break;
    }

    if (isAllowedAccent(value) && !unique.includes(value)) {
      unique.push(value);
    }
  }

  return unique.length > 0 ? unique : [DEFAULT_ACCENT];
}

function createBootstrapStorageConfig(): LayoutBootstrapStorageConfig {
  const allowedAccents = normalizeAllowedAccents(ALLOWED_ACCENTS);

  return {
    themeKey: assertStorageKey("theme", UI_STORAGE_KEYS.THEME),
    legacyThemeKey: assertStorageKey(
      "legacy_theme",
      LEGACY_UI_STORAGE_KEYS.THEME,
    ),
    accentKey: assertStorageKey("accent", UI_STORAGE_KEYS.UI_ACCENT),
    allowedAccents,
    defaultAccent: allowedAccents.includes(DEFAULT_ACCENT)
      ? DEFAULT_ACCENT
      : (allowedAccents[0] ?? DEFAULT_ACCENT),
  };
}

const BOOTSTRAP_STORAGE_CONFIG = createBootstrapStorageConfig();

function serializeInlineJson(value: LayoutBootstrapStorageConfig): string {
  return JSON.stringify(value).replace(
    INLINE_JSON_ESCAPE_REGEX,
    (character) => {
      return INLINE_JSON_ESCAPE_LOOKUP[character] ?? character;
    },
  );
}

export function createThemeBootstrapScript(
  config: LayoutBootstrapStorageConfig = BOOTSTRAP_STORAGE_CONFIG,
): string {
  const serializedConfig = serializeInlineJson(config);

  return `(function () {
  "use strict";

  try {
    var config = ${serializedConfig};
    var root = document.documentElement;
    var validThemes = { light: true, dark: true, system: true };
    var validAccents = Object.create(null);

    for (var i = 0; i < config.allowedAccents.length; i += 1) {
      validAccents[config.allowedAccents[i]] = true;
    }

    function readStorage(key) {
      try {
        var value = window.localStorage.getItem(key);
        return typeof value === "string" ? value : null;
      } catch (_error) {
        return null;
      }
    }

    function writeStorage(key, value) {
      try {
        window.localStorage.setItem(key, value);
      } catch (_error) {}
    }

    function normalizeTheme(value) {
      return value && validThemes[value] === true ? value : null;
    }

    function normalizeAccent(value) {
      return value && validAccents[value] === true ? value : config.defaultAccent;
    }

    var theme = normalizeTheme(readStorage(config.themeKey));
    var legacyTheme = normalizeTheme(readStorage(config.legacyThemeKey));

    if (theme === null && legacyTheme !== null) {
      theme = legacyTheme;
      writeStorage(config.themeKey, legacyTheme);
    }

    var prefersDark = false;

    try {
      prefersDark = !!(
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches
      );
    } catch (_error) {}

    var effectiveTheme = theme === null ? "system" : theme;
    var isDark = effectiveTheme === "dark" || (effectiveTheme === "system" && prefersDark);

    root.classList.toggle("dark", isDark);
    root.style.colorScheme = isDark ? "dark" : "light";
    root.setAttribute("data-accent", normalizeAccent(readStorage(config.accentKey)));
  } catch (_error) {
    try {
      document.documentElement.style.colorScheme = "light dark";
    } catch (_nestedError) {}
  }
})();`;
}

export const THEME_BOOTSTRAP_SCRIPT = createThemeBootstrapScript();

export const DISPLAY_SCALE_ZOOM_BOOTSTRAP_SCRIPT = `(function () {
  "use strict";

  try {
    var root = document.documentElement;
    var raf = null;

    root.setAttribute("data-ozo-boot", "pending");

    function ready() {
      try {
        root.setAttribute("data-ozo-boot", "ready");
      } catch (_error) {}
    }

    function clamp(value, min, max) {
      return Math.min(max, Math.max(min, value));
    }

    function quantizeQuarter(value) {
      return Math.round(value * 4) / 4;
    }

    function getVisualViewport() {
      return window.visualViewport ? window.visualViewport : null;
    }

    try {
      root.style.setProperty("--ozo-ui-scale", "1.0000");
      root.setAttribute("data-ozo-ui-scale-on", "0");
    } catch (_error) {}

    var userAgent = navigator.userAgent || "";
    var userAgentData = navigator.userAgentData ? navigator.userAgentData : null;
    var platform = userAgentData && userAgentData.platform ? userAgentData.platform : "";
    var platformSource = platform || userAgent;

    var isWindows = /\\bWindows\\b/i.test(platformSource);
    var isMac = /\\bMac\\b|\\bMacintosh\\b/i.test(platformSource);
    var isAndroid = /\\bAndroid\\b/i.test(userAgent);
    var isIos = /\\biPhone\\b|\\biPad\\b|\\biPod\\b/i.test(userAgent);

    var hasFinePointer = true;
    var hasHover = true;

    try {
      hasFinePointer = window.matchMedia("(pointer: fine)").matches;
    } catch (_error) {}

    try {
      hasHover = window.matchMedia("(hover: hover)").matches;
    } catch (_error) {}

    if (!hasFinePointer || !hasHover || window.innerWidth < 900) {
      ready();
      return;
    }

    var maxTouchPoints =
      typeof navigator.maxTouchPoints === "number" ? navigator.maxTouchPoints : 0;

    if (isAndroid || isIos || (maxTouchPoints > 1 && isMac && !isWindows) || !isWindows) {
      ready();
      return;
    }

    function isWithin1080p() {
      var visualViewport = getVisualViewport();
      var width =
        visualViewport && typeof visualViewport.width === "number" && visualViewport.width > 0
          ? visualViewport.width
          : window.innerWidth;
      var height =
        visualViewport && typeof visualViewport.height === "number" && visualViewport.height > 0
          ? visualViewport.height
          : window.innerHeight;

      return (width <= 1920 && height <= 1080) || height <= 1080;
    }

    function compute() {
      if (!isWithin1080p()) {
        root.setAttribute("data-ozo-zoom-guard", "off");
        root.setAttribute("data-ozo-os-pct", "100");
        root.setAttribute("data-ozo-zoom-recommended", "100");
        ready();
        return;
      }

      var devicePixelRatio =
        typeof window.devicePixelRatio === "number" && window.devicePixelRatio > 0
          ? window.devicePixelRatio
          : 1;
      var visualViewport = getVisualViewport();
      var pageScale =
        visualViewport && typeof visualViewport.scale === "number" && visualViewport.scale > 0
          ? visualViewport.scale
          : 1;
      var effectiveDpr = devicePixelRatio / pageScale;

      var quantizedDpr = quantizeQuarter(effectiveDpr);
      var isCloseToQuarter = Math.abs(effectiveDpr - quantizedDpr) <= 0.04;
      var osScale =
        quantizedDpr >= 1 && quantizedDpr <= 3 && isCloseToQuarter ? quantizedDpr : 1;

      if (isMac && osScale >= 1.75) {
        osScale = 1;
      }

      var osPercent = Math.round(osScale * 100);
      var zoomDelta = Math.max(0, osPercent - 100);
      var recommendedZoomPercent = clamp(100 - zoomDelta, 75, 100);

      root.setAttribute("data-ozo-zoom-guard", "on");
      root.setAttribute("data-ozo-os-pct", String(osPercent));
      root.setAttribute("data-ozo-zoom-recommended", String(recommendedZoomPercent));
      root.setAttribute("data-ozo-dpr", devicePixelRatio.toFixed(3));
      root.setAttribute("data-ozo-page-scale", pageScale.toFixed(3));
      root.setAttribute("data-ozo-effective-dpr", effectiveDpr.toFixed(3));

      ready();
    }

    function schedule() {
      if (document.visibilityState === "hidden" || raf !== null) return;

      raf = window.requestAnimationFrame(function () {
        raf = null;
        compute();
      });
    }

    compute();

    window.addEventListener("resize", schedule, { passive: true });

    var visualViewport = getVisualViewport();

    if (visualViewport) {
      visualViewport.addEventListener("resize", schedule, { passive: true });
    }

    try {
      var currentDpr =
        typeof window.devicePixelRatio === "number" && window.devicePixelRatio > 0
          ? window.devicePixelRatio
          : 1;
      var mediaQueryList = window.matchMedia("(resolution: " + currentDpr + "dppx)");

      mediaQueryList.addEventListener("change", schedule);
    } catch (_error) {}
  } catch (_error) {
    try {
      document.documentElement.setAttribute("data-ozo-boot", "ready");
    } catch (_nestedError) {}
  }
})();`;
