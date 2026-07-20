// oz-next-app/src/lib/runtime/browser-runtime.ts
const MAX_BROWSER_PATH_LENGTH = 2_048;
const DELETE_CHARACTER_CODE = 127;

function hasControlCharacter(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);

    if (code < 32 || code === DELETE_CHARACTER_CODE) {
      return true;
    }
  }

  return false;
}

export function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

export function isServer(): boolean {
  return !isBrowser();
}

export function assertBrowserRuntime(): void {
  if (!isBrowser()) {
    throw new Error("browser_runtime_required");
  }
}

export function currentLocationPath(
  input?: Readonly<{ includeHash?: boolean }>,
): string {
  if (!isBrowser()) {
    return "/";
  }

  const includeHash = input?.includeHash === true;
  const value = `${window.location.pathname}${window.location.search}${
    includeHash ? window.location.hash : ""
  }`;

  if (
    !value.startsWith("/") ||
    value.startsWith("//") ||
    hasControlCharacter(value)
  ) {
    return "/";
  }

  return value.length > MAX_BROWSER_PATH_LENGTH
    ? value.slice(0, MAX_BROWSER_PATH_LENGTH)
    : value;
}
