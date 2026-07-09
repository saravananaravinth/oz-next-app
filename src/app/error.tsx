// oz-next-app/src/app/error.tsx
"use client";

import Link from "next/link";
import { AlertTriangle, Home, LoaderCircle, RefreshCw } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useTransition,
  type ReactElement,
} from "react";

import { Button } from "@/components/ui/button";
import { isDevelopment } from "@/lib/env";

type AppErrorBoundaryProps = Readonly<{
  error: Error & {
    readonly digest?: string;
  };
  reset: () => void;
}>;

type SafeClientDiagnostic = Readonly<{
  name: string;
  message: string;
  digest?: string;
  stackHead?: string;
}>;

const ERROR_BOUNDARY_LOG_LABEL = "[oz-next-app:error-boundary]";

const DEFAULT_ERROR_NAME = "Error";
const DEFAULT_ERROR_MESSAGE = "Unexpected render error.";

const MAX_ERROR_NAME_LENGTH = 128;
const MAX_ERROR_MESSAGE_LENGTH = 512;
const MAX_ERROR_STACK_HEAD_LENGTH = 1_500;
const MAX_ERROR_REFERENCE_LENGTH = 160;

const ASCII_CONTROL_MAX_CODE_POINT = 0x1f;
const ASCII_DELETE_CODE_POINT = 0x7f;

const WHITESPACE_PATTERN = /\s+/gu;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu;
const JWT_PATTERN =
  /\b[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/gu;
const BEARER_PATTERN = /\bBearer\s+[A-Za-z0-9._~+/=-]{16,}\b/giu;
const LONG_NUMBER_PATTERN = /\b\d{7,}\b/gu;
const SENSITIVE_QUERY_PATTERN =
  /([?&](?:access_token|refresh_token|id_token|token|jwt|otp|code|password|email|phone|mobile|signature|secret)=)[^&#\s]+/giu;
const SAFE_ERROR_REFERENCE_PATTERN = /^[A-Za-z0-9_.:/@-]+$/u;

function replaceControlCharacters(value: string): string {
  let output = "";
  let changed = false;

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index] ?? "";
    const codePoint = value.charCodeAt(index);

    if (
      codePoint <= ASCII_CONTROL_MAX_CODE_POINT ||
      codePoint === ASCII_DELETE_CODE_POINT
    ) {
      output += " ";
      changed = true;
      continue;
    }

    output += char;
  }

  return changed ? output : value;
}

function redactSensitiveText(value: string): string {
  return value
    .replace(BEARER_PATTERN, "Bearer [REDACTED]")
    .replace(JWT_PATTERN, "[REDACTED_JWT]")
    .replace(EMAIL_PATTERN, "[REDACTED_EMAIL]")
    .replace(LONG_NUMBER_PATTERN, "[REDACTED_NUMBER]")
    .replace(SENSITIVE_QUERY_PATTERN, "$1[REDACTED]");
}

function truncateSafeDiagnostic(value: string, maxLength: number): string {
  const normalized = replaceControlCharacters(redactSensitiveText(value))
    .replace(WHITESPACE_PATTERN, " ")
    .trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function safeErrorReference(value: string | undefined): string | null {
  const normalized = value?.trim() ?? "";

  if (
    normalized.length > 0 &&
    normalized.length <= MAX_ERROR_REFERENCE_LENGTH &&
    SAFE_ERROR_REFERENCE_PATTERN.test(normalized)
  ) {
    return normalized;
  }

  return null;
}

function safeErrorName(error: Error): string {
  const normalized = truncateSafeDiagnostic(error.name, MAX_ERROR_NAME_LENGTH);

  return normalized.length > 0 ? normalized : DEFAULT_ERROR_NAME;
}

function safeErrorMessage(error: Error): string {
  const normalized = truncateSafeDiagnostic(
    error.message,
    MAX_ERROR_MESSAGE_LENGTH,
  );

  return normalized.length > 0 ? normalized : DEFAULT_ERROR_MESSAGE;
}

function safeErrorStackHead(error: Error): string | undefined {
  if (typeof error.stack !== "string" || error.stack.trim().length === 0) {
    return undefined;
  }

  return truncateSafeDiagnostic(error.stack, MAX_ERROR_STACK_HEAD_LENGTH);
}

function buildSafeClientDiagnostic(
  error: AppErrorBoundaryProps["error"],
  digest: string | null,
): SafeClientDiagnostic {
  const stackHead = safeErrorStackHead(error);

  return {
    name: safeErrorName(error),
    message: safeErrorMessage(error),
    ...(digest !== null ? { digest } : {}),
    ...(stackHead !== undefined ? { stackHead } : {}),
  };
}

export default function RootError({
  error,
  reset,
}: AppErrorBoundaryProps): ReactElement {
  const titleId = useId();
  const descriptionId = useId();
  const referenceId = useId();
  const [isResetPending, startResetTransition] = useTransition();

  const errorReference = useMemo(
    () => safeErrorReference(error.digest),
    [error.digest],
  );

  const handleReset = useCallback((): void => {
    startResetTransition(() => {
      reset();
    });
  }, [reset]);

  useEffect(() => {
    if (!isDevelopment) {
      return;
    }

    console.error(
      ERROR_BOUNDARY_LOG_LABEL,
      buildSafeClientDiagnostic(error, errorReference),
    );
  }, [error, errorReference]);

  return (
    <main
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      className="flex min-h-svh items-center justify-center bg-background px-4 py-10 text-foreground sm:px-6 lg:px-8"
    >
      <section
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="w-full max-w-xl rounded-3xl border border-border bg-card/95 p-6 text-center shadow-sm shadow-foreground/5 backdrop-blur sm:p-8"
      >
        <div
          aria-hidden="true"
          className="mx-auto flex size-12 items-center justify-center rounded-2xl border border-destructive/20 bg-destructive/10 text-destructive"
        >
          <AlertTriangle className="size-6" strokeWidth={2} />
        </div>

        <div className="mt-6 grid gap-3">
          <p className="text-overline text-muted-readable">
            Application boundary
          </p>

          <h1 id={titleId} className="text-page-title text-foreground">
            Something went wrong.
          </h1>

          <p
            id={descriptionId}
            className="text-body-sm text-muted-readable text-pretty"
          >
            The workspace could not render this view safely. Retry the request,
            or return to the dashboard if the problem continues.
          </p>
        </div>

        {errorReference !== null ? (
          <div
            aria-labelledby={referenceId}
            className="mt-6 rounded-2xl border border-border bg-muted/40 px-4 py-3 text-left"
          >
            <p id={referenceId} className="text-overline text-muted-readable">
              Error reference
            </p>

            <code className="mt-1 block break-all text-caption text-foreground text-tabular">
              {errorReference}
            </code>
          </div>
        ) : null}

        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
          <Button asChild variant="outline">
            <Link href="/dashboard" prefetch={false}>
              <Home aria-hidden="true" className="size-4" />
              Go to dashboard
            </Link>
          </Button>

          <Button
            type="button"
            onClick={handleReset}
            disabled={isResetPending}
            aria-busy={isResetPending}
          >
            {isResetPending ? (
              <LoaderCircle
                aria-hidden="true"
                className="size-4 animate-spin motion-reduce:animate-none"
              />
            ) : (
              <RefreshCw aria-hidden="true" className="size-4" />
            )}
            Try again
          </Button>
        </div>
      </section>
    </main>
  );
}
