// oz-next-app/src/app/_providers/app-providers.tsx
"use client";

import * as React from "react";
import { ThemeProvider } from "next-themes";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { ErrorBoundary, type FallbackProps } from "react-error-boundary";

import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useToast } from "@/shared/hooks/use-toast";
import {
  isClientDevelopment,
  isClientProduction,
} from "@/lib/env/client-public-env";
import { AppQueryProvider } from "@/lib/query/index";
import { UI_STORAGE_KEYS } from "@/lib/ui-preferences";

export type ProvidersProps = Readonly<
  React.PropsWithChildren<{
    nonce?: string;
    forceDarkMode?: boolean;
    disableErrorReporting?: boolean;
  }>
>;

type ProviderOptionsInput = Readonly<{
  nonce: string | undefined;
  forceDarkMode: boolean | undefined;
  disableErrorReporting: boolean | undefined;
}>;

type ProviderOptions = Readonly<{
  forceDarkMode: boolean;
  disableErrorReporting: boolean;
  nonce?: string;
}>;

type NormalizedError = Readonly<{
  name: string;
  message: string;
  stack?: string;
}>;

type ClientDiagnosticExtra = Readonly<
  Record<string, string | number | boolean | null>
>;

type ErrorFallbackProps = FallbackProps &
  Readonly<{
    showDiagnostics: boolean;
  }>;

const MAX_NONCE_LENGTH = 512;
const MAX_MESSAGE_LENGTH = 2_048;
const MAX_NAME_LENGTH = 128;
const MAX_STACK_LENGTH = 12_000;
const MAX_COMPONENT_STACK_LENGTH = 12_000;

const NETWORK_OFFLINE_TOAST_ID = "network-offline-toast";
const DEFAULT_ERROR_NAME = "Error";
const DEFAULT_ERROR_MESSAGE = "Unexpected error.";
const SERIALIZATION_FAILURE_MESSAGE = "[Unserializable value]";
const NON_SERIALIZABLE_MESSAGE = "[Non-serializable value]";
const FUNCTION_VALUE_MESSAGE = "[Function]";
const SYMBOL_VALUE_MESSAGE = "[Symbol]";

const CSP_NONCE_PATTERN = /^[A-Za-z0-9+/_=-]{1,512}$/u;
const CONTROL_CHARS_GLOBAL_RE = /\p{Cc}/gu;
const WHITESPACE_RE = /\s+/gu;

const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu;
const JWT_RE =
  /\b[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/gu;
const BEARER_RE = /\bBearer\s+[A-Za-z0-9._~+/=-]{16,}\b/giu;
const LONG_NUMBER_RE = /\b\d{7,}\b/gu;
const SENSITIVE_QUERY_RE =
  /([?&](?:access_token|refresh_token|id_token|token|jwt|otp|code|password|email|phone|mobile|signature|secret)=)[^&#\s]+/giu;

const EXTENSION_NOISE_PATTERNS = [
  "could not establish connection",
  "receiving end does not exist",
  "extension context invalidated",
  "a listener indicated an asynchronous response",
] as const;

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readStringField(value: unknown, key: string): string | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const field = value[key];

  if (typeof field !== "string") {
    return undefined;
  }

  const trimmed = field.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function redactSensitiveText(value: string): string {
  return value
    .replace(SENSITIVE_QUERY_RE, "$1[REDACTED]")
    .replace(BEARER_RE, "Bearer [REDACTED]")
    .replace(JWT_RE, "[REDACTED_JWT]")
    .replace(EMAIL_RE, "[REDACTED_EMAIL]")
    .replace(LONG_NUMBER_RE, "[REDACTED_NUMBER]");
}

function truncateText(value: string, maxLength: number): string {
  const normalized = redactSensitiveText(value)
    .replace(CONTROL_CHARS_GLOBAL_RE, " ")
    .replace(WHITESPACE_RE, " ")
    .trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function primitiveToSafeString(
  value: string | number | boolean | bigint | symbol | null | undefined,
): string {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "bigint") {
    return value.toString();
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  if (typeof value === "symbol") {
    return value.description === undefined
      ? SYMBOL_VALUE_MESSAGE
      : `${SYMBOL_VALUE_MESSAGE}: ${value.description}`;
  }

  return value === null ? "null" : "undefined";
}

function unknownToString(value: unknown): string {
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint" ||
    typeof value === "symbol" ||
    value === null ||
    value === undefined
  ) {
    return truncateText(primitiveToSafeString(value), MAX_MESSAGE_LENGTH);
  }

  if (typeof value === "function") {
    return FUNCTION_VALUE_MESSAGE;
  }

  try {
    const serialized = JSON.stringify(value);

    return typeof serialized === "string"
      ? truncateText(serialized, MAX_MESSAGE_LENGTH)
      : NON_SERIALIZABLE_MESSAGE;
  } catch {
    return SERIALIZATION_FAILURE_MESSAGE;
  }
}

function normalizeError(error: unknown): NormalizedError {
  if (error instanceof Error) {
    return {
      name: truncateText(error.name || DEFAULT_ERROR_NAME, MAX_NAME_LENGTH),
      message: truncateText(
        error.message || DEFAULT_ERROR_MESSAGE,
        MAX_MESSAGE_LENGTH,
      ),
      ...(typeof error.stack === "string"
        ? { stack: truncateText(error.stack, MAX_STACK_LENGTH) }
        : {}),
    };
  }

  const name = readStringField(error, "name");
  const message = readStringField(error, "message");
  const stack = readStringField(error, "stack");

  return {
    name: truncateText(name ?? DEFAULT_ERROR_NAME, MAX_NAME_LENGTH),
    message: truncateText(
      message ?? unknownToString(error),
      MAX_MESSAGE_LENGTH,
    ),
    ...(stack !== undefined
      ? { stack: truncateText(stack, MAX_STACK_LENGTH) }
      : {}),
  };
}

function isAbortLikeError(error: unknown): boolean {
  if (typeof DOMException !== "undefined" && error instanceof DOMException) {
    return error.name === "AbortError" || error.name === "TimeoutError";
  }

  if (error instanceof Error) {
    return error.name === "AbortError" || error.name === "TimeoutError";
  }

  const name = readStringField(error, "name");
  return name === "AbortError" || name === "TimeoutError";
}

function isBrowserExtensionNoise(error: unknown): boolean {
  const message = normalizeError(error).message.toLowerCase();

  return EXTENSION_NOISE_PATTERNS.some((pattern) => message.includes(pattern));
}

function createTimestampErrorId(): string {
  return `err_${Date.now().toString(36)}`;
}

function createErrorId(): string {
  try {
    if (typeof globalThis.crypto.randomUUID === "function") {
      const randomId = globalThis.crypto.randomUUID();

      if (randomId.length > 0) {
        return randomId;
      }
    }
  } catch {
    return createTimestampErrorId();
  }

  return createTimestampErrorId();
}

function normalizeNonce(value: string | undefined): string | undefined {
  const normalized = value?.trim();

  if (normalized === undefined || normalized.length === 0) {
    return undefined;
  }

  if (
    normalized.length <= MAX_NONCE_LENGTH &&
    CSP_NONCE_PATTERN.test(normalized)
  ) {
    return normalized;
  }

  if (isClientDevelopment) {
    console.error("[Providers] invalid CSP nonce was ignored");
  }

  return undefined;
}

function normalizeProviderOptions(
  props: ProviderOptionsInput,
): ProviderOptions {
  const normalizedNonce = normalizeNonce(props.nonce);

  return {
    forceDarkMode: props.forceDarkMode === true,
    disableErrorReporting: props.disableErrorReporting === true,
    ...(normalizedNonce !== undefined ? { nonce: normalizedNonce } : {}),
  };
}

function logClientDiagnostic(
  source: string,
  error: unknown,
  extra?: ClientDiagnosticExtra,
): void {
  if (
    !isClientDevelopment ||
    isAbortLikeError(error) ||
    isBrowserExtensionNoise(error)
  ) {
    return;
  }

  console.error(`[Providers:${source}]`, normalizeError(error), extra);
}

function ErrorFallback({
  error,
  resetErrorBoundary,
  showDiagnostics,
}: ErrorFallbackProps): React.ReactElement {
  const [errorId] = React.useState(createErrorId);
  const printable = React.useMemo(() => normalizeError(error), [error]);

  const handleRetry = React.useCallback((): void => {
    resetErrorBoundary();
  }, [resetErrorBoundary]);

  const handleGoHome = React.useCallback((): void => {
    if (typeof window !== "undefined") {
      window.location.assign("/");
    }
  }, []);

  return (
    <main
      role="alert"
      aria-labelledby="app-error-title"
      aria-describedby="app-error-description"
      aria-live="assertive"
      className="flex min-h-dvh items-center justify-center bg-background px-4 py-8 sm:px-6 lg:px-8"
    >
      <section className="w-full max-w-xl rounded-3xl border border-border/70 bg-card/95 p-6 shadow-sm backdrop-blur sm:p-8">
        <div className="mx-auto mb-5 flex size-12 items-center justify-center rounded-2xl border bg-muted text-lg font-semibold text-muted-foreground">
          !
        </div>

        <h1
          id="app-error-title"
          className="text-center text-2xl font-semibold tracking-tight text-foreground"
        >
          Something went wrong
        </h1>

        <p
          id="app-error-description"
          className="mx-auto mt-3 max-w-md text-center text-sm leading-6 text-muted-foreground"
        >
          The app could not finish rendering this view. Retry the screen, or
          return home if the issue continues.
        </p>

        {showDiagnostics ? (
          <details className="mt-6 text-left text-xs">
            <summary className="cursor-pointer rounded-md px-1 py-1 font-medium text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
              Developer diagnostics
            </summary>

            <pre
              tabIndex={0}
              className="mt-3 max-h-72 overflow-auto rounded-2xl border bg-muted/60 p-4 text-[11px] leading-relaxed text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <code>
                Error ID: {errorId}
                {"\n\n"}
                {printable.name}: {printable.message}
                {"\n\n"}
                {printable.stack ?? "No stack trace available."}
              </code>
            </pre>
          </details>
        ) : null}

        <div className="mt-7 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
          <Button
            type="button"
            size="sm"
            className="w-full sm:w-auto"
            onClick={handleRetry}
          >
            Try again
          </Button>

          <Button
            type="button"
            size="sm"
            variant="outline"
            className="w-full sm:w-auto"
            onClick={handleGoHome}
          >
            Go home
          </Button>
        </div>

        {!showDiagnostics || isClientProduction ? (
          <p className="mt-5 text-center text-xs text-muted-foreground">
            Error ID: {errorId}
          </p>
        ) : null}
      </section>
    </main>
  );
}

function ClientRuntimeEffects({
  diagnosticsDisabled,
}: Readonly<{
  diagnosticsDisabled: boolean;
}>): null {
  const toast = useToast();
  const offlineToastVisibleRef = React.useRef(false);

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const showOfflineToast = (): void => {
      if (offlineToastVisibleRef.current) {
        return;
      }

      offlineToastVisibleRef.current = true;

      toast.error({
        id: NETWORK_OFFLINE_TOAST_ID,
        title: "Network offline",
        description: "Requests may fail until the connection is restored.",
        duration: 45_000,
        dismissible: true,
        closeButton: true,
      });
    };

    const onError = (event: ErrorEvent): void => {
      const eventError = event.error as unknown;
      const error: unknown =
        eventError ??
        new Error(
          truncateText(event.message || "Window error", MAX_MESSAGE_LENGTH),
        );

      if (isAbortLikeError(error) || isBrowserExtensionNoise(error)) {
        event.preventDefault();
        return;
      }

      if (!diagnosticsDisabled) {
        const filename =
          typeof event.filename === "string" && event.filename.trim().length > 0
            ? truncateText(event.filename, MAX_MESSAGE_LENGTH)
            : "unknown";

        logClientDiagnostic("window_error", error, {
          filename,
          lineno: event.lineno,
          colno: event.colno,
        });
      }
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent): void => {
      const reason = event.reason as unknown;

      if (isAbortLikeError(reason) || isBrowserExtensionNoise(reason)) {
        event.preventDefault();
        return;
      }

      if (!diagnosticsDisabled) {
        logClientDiagnostic("unhandled_rejection", reason);
      }
    };

    const onOffline = (): void => {
      showOfflineToast();
    };

    const onOnline = (): void => {
      if (!offlineToastVisibleRef.current) {
        return;
      }

      offlineToastVisibleRef.current = false;
      toast.dismiss(NETWORK_OFFLINE_TOAST_ID);

      toast.success({
        title: "Connection restored",
        description: "You can retry failed requests.",
      });
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      showOfflineToast();
    }

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
      toast.dismiss(NETWORK_OFFLINE_TOAST_ID);
      offlineToastVisibleRef.current = false;
    };
  }, [diagnosticsDisabled, toast]);

  return null;
}

export function Providers({
  children,
  nonce,
  forceDarkMode,
  disableErrorReporting,
}: ProvidersProps): React.ReactElement {
  const options = React.useMemo(
    () =>
      normalizeProviderOptions({
        nonce,
        forceDarkMode,
        disableErrorReporting,
      }),
    [nonce, forceDarkMode, disableErrorReporting],
  );

  const handleBoundaryError = React.useCallback(
    (error: unknown, info: React.ErrorInfo): void => {
      if (isAbortLikeError(error) || isBrowserExtensionNoise(error)) {
        return;
      }

      if (options.disableErrorReporting) {
        return;
      }

      const componentStack =
        typeof info.componentStack === "string"
          ? truncateText(info.componentStack, MAX_COMPONENT_STACK_LENGTH)
          : "unavailable";

      logClientDiagnostic("error_boundary", error, { componentStack });
    },
    [options.disableErrorReporting],
  );

  const renderFallback = React.useCallback(
    (fallbackProps: FallbackProps): React.ReactElement => (
      <ErrorFallback
        {...fallbackProps}
        showDiagnostics={isClientDevelopment && !options.disableErrorReporting}
      />
    ),
    [options.disableErrorReporting],
  );

  const themeProviderProps = React.useMemo<
    React.ComponentProps<typeof ThemeProvider>
  >(
    () => ({
      attribute: "class",
      storageKey: UI_STORAGE_KEYS.THEME,
      enableColorScheme: true,
      disableTransitionOnChange: true,
      defaultTheme: options.forceDarkMode ? "dark" : "system",
      enableSystem: !options.forceDarkMode,
      ...(options.forceDarkMode ? { forcedTheme: "dark" } : {}),
      ...(options.nonce !== undefined ? { nonce: options.nonce } : {}),
    }),
    [options.forceDarkMode, options.nonce],
  );

  return (
    <ErrorBoundary
      fallbackRender={renderFallback}
      onError={handleBoundaryError}
    >
      <NuqsAdapter>
        <ThemeProvider {...themeProviderProps}>
          <AppQueryProvider>
            <TooltipProvider delayDuration={250} skipDelayDuration={100}>
              <ClientRuntimeEffects
                diagnosticsDisabled={options.disableErrorReporting}
              />
              {children}
            </TooltipProvider>
          </AppQueryProvider>

          <Toaster
            theme={options.forceDarkMode ? "dark" : "system"}
            richColors
            expand={false}
            duration={3_800}
            closeButton
            gap={8}
            offset={8}
            position="top-right"
          />
        </ThemeProvider>
      </NuqsAdapter>
    </ErrorBoundary>
  );
}

export default Providers;
