// oz-next-app/src/features/auth/ui/otp-verify-form.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
  type SyntheticEvent,
} from "react";
import { Controller, useForm, useWatch } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/shared/hooks/use-toast";
import { idempotencyKey as createIdempotencyKey } from "@/lib/security/request-identifiers";

import { useLoginStart } from "@/features/auth/hooks/use-login-start";
import { useLoginVerify } from "@/features/auth/hooks/use-login-verify";
import {
  toLoginVerifyFailure,
  toUserFacingAuthError,
  type UserFacingAuthError,
} from "@/features/auth/api/auth.client";
import {
  otpVerifyFormSchema,
  type LoginStartResult,
  type OtpVerifyFormValues,
} from "@/features/auth/contracts/auth-form.schema";
import { AuthErrorAlert } from "@/features/auth/ui/auth-error-alert";

const DEFAULT_OTP_LENGTH = 6;
const MIN_OTP_LENGTH = 4;
const MAX_OTP_LENGTH = 8;
const OTP_DIGIT_PATTERN = /\D/gu;

type LoginResendIntent = Readonly<{
  identifier: string;
  idempotencyKey: string;
}>;

type OtpVerifyFormProps = Readonly<{
  identifier: string;
  challengeId: string;
  destinationLabel: string;
  expectedLength: number;
  attemptsRemaining: number;
  expiresAtMs: number;
  resendAvailableAtMs: number;
  nextPath: string;
  disabled?: boolean;
  onBack: () => void;
  onResendSuccess: (response: LoginStartResult) => void;
}>;

function clampOtpLength(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_OTP_LENGTH;
  }

  return Math.max(MIN_OTP_LENGTH, Math.min(Math.trunc(value), MAX_OTP_LENGTH));
}

function normalizeOtpCode(value: string, maxLength: number): string {
  return value.replace(OTP_DIGIT_PATTERN, "").slice(0, maxLength);
}

function otpLengthErrorMessage(expectedLength: number): string {
  return `Enter the ${String(expectedLength)}-digit verification code.`;
}

function normalizeAttemptsRemaining(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(99, Math.trunc(value)));
}

function secondsUntil(timestampMs: number): number {
  if (!Number.isFinite(timestampMs)) {
    return 0;
  }

  return Math.max(0, Math.ceil((timestampMs - Date.now()) / 1_000));
}

function formatCountdown(seconds: number): string {
  const boundedSeconds = Math.max(0, Math.trunc(seconds));
  const minutes = Math.floor(boundedSeconds / 60);
  const remainder = boundedSeconds % 60;

  if (minutes <= 0) {
    return `${String(remainder)}s`;
  }

  return `${String(minutes)}:${String(remainder).padStart(2, "0")}`;
}

function otpSlotClassName(length: number): string | undefined {
  if (length >= 7) {
    return "h-11 w-7 min-[360px]:w-8 min-[400px]:w-9 sm:size-12";
  }

  if (length === 6) {
    return "h-11 w-9 min-[360px]:w-10 sm:size-12";
  }

  return undefined;
}

function redirectToNextPath(nextPath: string): void {
  window.location.replace(nextPath);
}

function renderOtpSlots(length: number, invalid: boolean): ReactNode {
  const midpoint = length > 4 ? Math.ceil(length / 2) : length;
  const slotClassName = otpSlotClassName(length);
  const slots: ReactNode[] = [];

  for (let index = 0; index < length; index += 1) {
    if (index === midpoint && index < length) {
      slots.push(<InputOTPSeparator key="separator" />);
    }

    slots.push(
      <InputOTPSlot
        key={index}
        index={index}
        aria-invalid={invalid ? true : undefined}
        className={slotClassName}
      />,
    );
  }

  return <InputOTPGroup>{slots}</InputOTPGroup>;
}

function describedBy(
  input: Readonly<{ helpId: string; errorId: string; hasError: boolean }>,
): string {
  return input.hasError ? `${input.helpId} ${input.errorId}` : input.helpId;
}

export function OtpVerifyForm({
  challengeId,
  expectedLength,
  attemptsRemaining,
  expiresAtMs,
  resendAvailableAtMs,
  ...props
}: OtpVerifyFormProps): ReactElement {
  return (
    <OtpVerifyFormInner
      key={`${challengeId}:${String(expectedLength)}:${String(attemptsRemaining)}:${String(expiresAtMs)}:${String(resendAvailableAtMs)}`}
      challengeId={challengeId}
      expectedLength={expectedLength}
      attemptsRemaining={attemptsRemaining}
      expiresAtMs={expiresAtMs}
      resendAvailableAtMs={resendAvailableAtMs}
      {...props}
    />
  );
}

function OtpVerifyFormInner({
  identifier,
  challengeId,
  expectedLength: expectedLengthProp,
  attemptsRemaining: attemptsRemainingProp,
  expiresAtMs,
  resendAvailableAtMs,
  nextPath,
  disabled = false,
  onBack,
  onResendSuccess,
}: OtpVerifyFormProps): ReactElement {
  const otpFieldId = useId();
  const otpHelpId = useId();
  const otpErrorId = useId();
  const toast = useToast();
  const verifyMutation = useLoginVerify();
  const resendMutation = useLoginStart();
  const resendIntentRef = useRef<LoginResendIntent | null>(null);
  const operationRef = useRef<"verify" | "resend" | null>(null);
  const expectedLength = clampOtpLength(expectedLengthProp);
  const [formError, setFormError] = useState<UserFacingAuthError | null>(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState(() =>
    normalizeAttemptsRemaining(attemptsRemainingProp),
  );
  const [expirySeconds, setExpirySeconds] = useState(() =>
    secondsUntil(expiresAtMs),
  );
  const [resendSeconds, setResendSeconds] = useState(() =>
    secondsUntil(resendAvailableAtMs),
  );

  const form = useForm<OtpVerifyFormValues>({
    resolver: zodResolver(otpVerifyFormSchema),
    defaultValues: {
      code: "",
    },
    mode: "onSubmit",
    reValidateMode: "onChange",
    shouldFocusError: true,
  });

  const watchedCode = useWatch({
    control: form.control,
    name: "code",
    defaultValue: "",
  });

  const otpError = form.formState.errors.code?.message;
  const otpHasError = otpError !== undefined;
  const expired = expirySeconds <= 0;
  const attemptsExhausted = attemptsRemaining <= 0;
  const verifyBusy = form.formState.isSubmitting || verifyMutation.isPending;
  const resendBusy = resendMutation.isPending;
  const interactionBusy = verifyBusy || resendBusy;
  const canResend = resendSeconds <= 0 && !interactionBusy && !disabled;
  const formDisabled =
    disabled || interactionBusy || expired || attemptsExhausted;
  const submitDisabled = formDisabled || watchedCode.length !== expectedLength;
  const backDisabled = disabled || interactionBusy;

  const helpText = (() => {
    if (expired) {
      return "This code has expired. Request a new code to continue.";
    }

    if (attemptsExhausted) {
      return "No verification attempts remain. Request a new code to continue.";
    }

    return `Code expires in ${formatCountdown(expirySeconds)}. ${String(attemptsRemaining)} attempt${attemptsRemaining === 1 ? "" : "s"} remaining.`;
  })();

  useEffect(() => {
    let timeoutId: number | null = null;

    function updateCountdowns(): void {
      const nextExpirySeconds = secondsUntil(expiresAtMs);
      const nextResendSeconds = secondsUntil(resendAvailableAtMs);

      setExpirySeconds((current) =>
        current === nextExpirySeconds ? current : nextExpirySeconds,
      );
      setResendSeconds((current) =>
        current === nextResendSeconds ? current : nextResendSeconds,
      );

      if (nextExpirySeconds > 0 || nextResendSeconds > 0) {
        timeoutId = window.setTimeout(updateCountdowns, 1_000);
      }
    }

    const initialExpirySeconds = secondsUntil(expiresAtMs);
    const initialResendSeconds = secondsUntil(resendAvailableAtMs);

    if (initialExpirySeconds > 0 || initialResendSeconds > 0) {
      timeoutId = window.setTimeout(updateCountdowns, 1_000);
    }

    return () => {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [expiresAtMs, resendAvailableAtMs]);

  async function onSubmit(values: OtpVerifyFormValues): Promise<void> {
    if (formDisabled || operationRef.current !== null) {
      return;
    }

    const code = normalizeOtpCode(values.code, expectedLength);

    if (code.length !== expectedLength) {
      form.setError("code", {
        type: "manual",
        message: otpLengthErrorMessage(expectedLength),
      });
      return;
    }

    operationRef.current = "verify";
    setFormError(null);

    try {
      await verifyMutation.mutateAsync({
        identifier,
        challengeId,
        code,
      });

      redirectToNextPath(nextPath);
    } catch (error) {
      const failure = toLoginVerifyFailure(error);

      if (failure.kind === "invalid_code") {
        const nextAttemptsRemaining =
          failure.attemptsRemaining === null
            ? null
            : normalizeAttemptsRemaining(failure.attemptsRemaining);

        if (nextAttemptsRemaining !== null) {
          setAttemptsRemaining(nextAttemptsRemaining);
        }

        form.setError("code", {
          type: "server",
          message:
            nextAttemptsRemaining === 0
              ? "Incorrect code. No attempts remain; request a new code."
              : nextAttemptsRemaining !== null
                ? `Incorrect code. ${String(nextAttemptsRemaining)} attempt${nextAttemptsRemaining === 1 ? "" : "s"} remaining.`
                : "Incorrect code. Try again.",
        });
        form.setValue("code", "", {
          shouldDirty: true,
          shouldTouch: true,
          shouldValidate: false,
        });
        setFormError(null);
        return;
      }

      setFormError(toUserFacingAuthError(error));
    } finally {
      operationRef.current = null;
    }
  }

  async function onResend(): Promise<void> {
    if (!canResend || operationRef.current !== null) {
      return;
    }

    operationRef.current = "resend";
    setFormError(null);

    try {
      const existingIntent = resendIntentRef.current;
      const resendIntent =
        existingIntent?.identifier === identifier
          ? existingIntent
          : {
              identifier,
              idempotencyKey: createIdempotencyKey("auth-login-resend"),
            };

      resendIntentRef.current = resendIntent;

      const response = await resendMutation.mutateAsync({
        identifier,
        idempotencyKey: resendIntent.idempotencyKey,
      });

      resendIntentRef.current = null;
      form.reset({ code: "" });
      onResendSuccess(response);

      toast.success({
        title: "New code sent",
        description: "Use the latest verification code.",
        replace: true,
      });
    } catch (error) {
      const userFacingError = toUserFacingAuthError(error);

      setFormError(userFacingError);
    } finally {
      operationRef.current = null;
    }
  }

  function handleFormSubmit(event: SyntheticEvent<HTMLFormElement>): void {
    event.preventDefault();
    void form.handleSubmit(onSubmit)(event);
  }

  return (
    <form onSubmit={handleFormSubmit} noValidate aria-busy={interactionBusy}>
      <FieldGroup>
        {formError !== null ? <AuthErrorAlert error={formError} /> : null}

        <Field data-invalid={otpHasError ? true : undefined}>
          <FieldLabel htmlFor={otpFieldId}>Verification code</FieldLabel>

          <Controller
            control={form.control}
            name="code"
            render={({ field }) => (
              <InputOTP
                id={otpFieldId}
                name={field.name}
                ref={field.ref}
                maxLength={expectedLength}
                value={field.value}
                onChange={(value) => {
                  if (formError !== null) {
                    setFormError(null);
                  }

                  field.onChange(normalizeOtpCode(value, expectedLength));
                }}
                onBlur={field.onBlur}
                disabled={formDisabled}
                aria-invalid={otpHasError ? true : undefined}
                aria-describedby={describedBy({
                  helpId: otpHelpId,
                  errorId: otpErrorId,
                  hasError: otpHasError,
                })}
                containerClassName="min-w-0 max-w-full"
                autoComplete="one-time-code"
                inputMode="numeric"
                autoFocus
              >
                {renderOtpSlots(expectedLength, otpHasError)}
              </InputOTP>
            )}
          />

          <FieldDescription id={otpHelpId}>{helpText}</FieldDescription>

          <span className="sr-only" role="status" aria-atomic="true">
            {expired
              ? "The verification code has expired. Request a new code to continue."
              : ""}
          </span>

          {otpHasError ? (
            <FieldError id={otpErrorId}>{otpError}</FieldError>
          ) : null}
        </Field>

        <Button type="submit" disabled={submitDisabled} className="w-full">
          {verifyBusy ? (
            <>
              <Spinner aria-hidden="true" className="size-4" />
              Verifying…
            </>
          ) : (
            "Verify and sign in"
          )}
        </Button>

        <div className="grid gap-2 sm:grid-cols-2">
          <Button
            type="button"
            variant="outline"
            onClick={onResend}
            disabled={!canResend}
          >
            {resendBusy ? (
              <>
                <Spinner aria-hidden="true" className="size-4" />
                Sending…
              </>
            ) : canResend ? (
              "Resend code"
            ) : (
              `Resend in ${formatCountdown(resendSeconds)}`
            )}
          </Button>

          <Button
            type="button"
            variant="link"
            onClick={onBack}
            disabled={backDisabled}
            className="justify-self-center"
          >
            Change account
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
