// oz-next-app/src/features/auth/components/login-client.tsx
"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import type { LoginStartResult } from "../schemas/auth-form-schemas";
import { loginNoticeFromReason, safeNextPath } from "../utils/auth-redirect";
import { maskIdentifier } from "../utils/mask-identifier";
import { LoginBrandMark } from "./login-brand-mark";
import { LoginStartForm } from "./login-start-form";
import { OtpVerifyForm } from "./otp-verify-form";
import { SessionExpiredCard } from "./session-expired-card";

type LoginStep = "start" | "verify";

type VerifyState = Readonly<{
  identifier: string;
  challengeId: string;
  destinationLabel: string;
  expectedLength: number;
  attemptsRemaining: number;
  expiresAtMs: number;
  resendAvailableAtMs: number;
}>;

type LoginState =
  | Readonly<{
      step: "start";
      identifier: string;
    }>
  | Readonly<{
      step: "verify";
      verification: VerifyState;
    }>;

const INITIAL_STATE: LoginState = {
  step: "start",
  identifier: "",
};

const DEFAULT_OTP_EXPIRES_IN_SECONDS = 5 * 60;
const MAX_OTP_EXPIRES_IN_SECONDS = 86_400;
const RESEND_COOLDOWN_SECONDS = 60;

const MAX_DESTINATION_LABEL_LENGTH = 180;
const MIN_PHONE_DIGITS = 10;
const MAX_PHONE_DIGITS = 15;
const IT_SUPPORT_EMAIL = "it@ozotecev.com";
const IT_SUPPORT_MAILTO = `mailto:${IT_SUPPORT_EMAIL}` as const;

const CONTROL_CHARACTER_REPLACEMENT = " ";
const DELETE_CONTROL_CHARACTER_CODE = 127;
const WHITESPACE_PATTERN = /\s+/gu;
const SAFE_EMAIL_LOCAL_PATTERN = /[^a-z0-9._-]/gu;
const NON_DIGIT_PATTERN = /\D/gu;

function isUnsafeControlCode(code: number): boolean {
  return code <= 31 || code === DELETE_CONTROL_CHARACTER_CODE;
}

function replaceControlCharacters(value: string): string {
  let output = "";
  let changed = false;

  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);

    if (isUnsafeControlCode(code)) {
      output += CONTROL_CHARACTER_REPLACEMENT;
      changed = true;
      continue;
    }

    output += value.charAt(index);
  }

  return changed ? output : value;
}

function loginTitle(step: LoginStep): string {
  return step === "verify" ? "Verify your code" : "Sign in";
}

function loginDescription(state: LoginState): string {
  if (state.step === "start") {
    return "Receive OTP via registered email or mobile.";
  }

  return `Enter the code sent to ${state.verification.destinationLabel}.`;
}

function normalizeAttemptsRemaining(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.trunc(value));
}

function normalizeDisplayText(value: string | null | undefined): string | null {
  const normalized =
    value === undefined || value === null
      ? undefined
      : replaceControlCharacters(value).replace(WHITESPACE_PATTERN, " ").trim();

  if (normalized === undefined || normalized.length === 0) {
    return null;
  }

  if (normalized.length <= MAX_DESTINATION_LABEL_LENGTH) {
    return normalized;
  }

  return `${normalized.slice(0, MAX_DESTINATION_LABEL_LENGTH - 1).trimEnd()}…`;
}

function boundedExpiryFromTtlSeconds(value: number, nowMs: number): number {
  if (!Number.isFinite(value)) {
    return nowMs + DEFAULT_OTP_EXPIRES_IN_SECONDS * 1_000;
  }

  const boundedSeconds = Math.min(
    Math.max(0, Math.trunc(value)),
    MAX_OTP_EXPIRES_IN_SECONDS,
  );

  return nowMs + boundedSeconds * 1_000;
}

function resolveOtpExpiresAtMs(
  response: LoginStartResult,
  nowMs: number,
): number {
  return boundedExpiryFromTtlSeconds(response.expires_in, nowMs);
}

function splitEmail(
  value: string,
): Readonly<{ local: string; domain: string }> | null {
  const normalized = value.trim().toLowerCase();

  if (normalized.length > MAX_DESTINATION_LABEL_LENGTH) {
    return null;
  }

  const atIndex = normalized.lastIndexOf("@");

  if (atIndex <= 0 || atIndex >= normalized.length - 1) {
    return null;
  }

  return {
    local: normalized.slice(0, atIndex),
    domain: normalized.slice(atIndex + 1),
  };
}

function maskEmailForVerification(value: string): string | null {
  const email = splitEmail(value);

  if (email === null) {
    return null;
  }

  const local = email.local.replace(SAFE_EMAIL_LOCAL_PATTERN, "");

  if (local.length === 0) {
    return null;
  }

  if (local.length <= 3) {
    const first = local[0] ?? "";
    const last =
      local.length > 1 ? (email.local[email.local.length - 1] ?? "") : "";

    return `${first}**${last}@${email.domain}`;
  }

  return `${local.slice(0, 2)}***${local.slice(-1)}@${email.domain}`;
}

function maskPhoneForVerification(value: string): string | null {
  const digits = value.replace(NON_DIGIT_PATTERN, "");

  if (digits.length < MIN_PHONE_DIGITS || digits.length > MAX_PHONE_DIGITS) {
    return null;
  }

  return `•••• ${digits.slice(-4)}`;
}

function fallbackDestinationLabel(identifier: string): string {
  return (
    maskEmailForVerification(identifier) ??
    maskPhoneForVerification(identifier) ??
    maskIdentifier(identifier)
  );
}

function resolveDestinationLabel(
  identifier: string,
  response: LoginStartResult,
): string {
  return (
    normalizeDisplayText(response.destination?.value_masked) ??
    fallbackDestinationLabel(identifier)
  );
}

function resolveExpectedLength(response: LoginStartResult): number {
  if (!Number.isFinite(response.length)) {
    return 6;
  }

  return Math.max(4, Math.min(8, Math.trunc(response.length)));
}

function buildVerifyState(
  identifier: string,
  response: LoginStartResult,
): VerifyState {
  const nowMs = Date.now();

  return {
    identifier,
    challengeId: response.challenge_id,
    destinationLabel: resolveDestinationLabel(identifier, response),
    expectedLength: resolveExpectedLength(response),
    attemptsRemaining: normalizeAttemptsRemaining(response.attempts_remaining),
    expiresAtMs: resolveOtpExpiresAtMs(response, nowMs),
    resendAvailableAtMs: nowMs + RESEND_COOLDOWN_SECONDS * 1_000,
  };
}

export function LoginClient() {
  const searchParams = useSearchParams();
  const [state, setState] = useState<LoginState>(INITIAL_STATE);

  const nextPath = useMemo(
    () => safeNextPath(searchParams.get("next")),
    [searchParams],
  );
  const notice = useMemo(
    () => loginNoticeFromReason(searchParams.get("reason")),
    [searchParams],
  );
  const step = state.step;
  const title = loginTitle(step);
  const description = loginDescription(state);

  const handleStartSuccess = useCallback(
    (input: Readonly<{ identifier: string; response: LoginStartResult }>) => {
      setState({
        step: "verify",
        verification: buildVerifyState(input.identifier, input.response),
      });
    },
    [],
  );

  const handleBack = useCallback(() => {
    setState((current) => ({
      step: "start",
      identifier:
        current.step === "verify"
          ? current.verification.identifier
          : current.identifier,
    }));
  }, []);

  const handleResendSuccess = useCallback((response: LoginStartResult) => {
    setState((current) => {
      if (current.step !== "verify") {
        return current;
      }

      return {
        step: "verify",
        verification: buildVerifyState(
          current.verification.identifier,
          response,
        ),
      };
    });
  }, []);

  return (
    <Card aria-labelledby="login-card-title">
      <CardHeader className="items-center gap-5 text-center">
        <LoginBrandMark />

        <div className="grid gap-2">
          <CardTitle id="login-card-title" className="text-page-title">
            {title}
          </CardTitle>
          <CardDescription className="text-body-sm text-muted-readable">
            {description}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="grid gap-5">
        {notice !== null ? <SessionExpiredCard notice={notice} /> : null}

        {state.step === "start" ? (
          <LoginStartForm
            initialIdentifier={state.identifier}
            onSuccess={handleStartSuccess}
          />
        ) : (
          <OtpVerifyForm
            identifier={state.verification.identifier}
            challengeId={state.verification.challengeId}
            destinationLabel={state.verification.destinationLabel}
            expectedLength={state.verification.expectedLength}
            attemptsRemaining={state.verification.attemptsRemaining}
            expiresAtMs={state.verification.expiresAtMs}
            resendAvailableAtMs={state.verification.resendAvailableAtMs}
            nextPath={nextPath}
            onBack={handleBack}
            onResendSuccess={handleResendSuccess}
          />
        )}
      </CardContent>

      <CardFooter className="justify-center text-center text-caption text-muted-readable">
        <p>
          Need help?{" "}
          <a
            href={IT_SUPPORT_MAILTO}
            className="underline underline-offset-4 hover:text-foreground"
          >
            Contact IT support
          </a>
          .
        </p>
      </CardFooter>
    </Card>
  );
}
