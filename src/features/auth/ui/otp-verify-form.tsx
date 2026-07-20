// oz-next-app/src/features/auth/ui/otp-verify-form.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Controller, useForm, useWatch } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
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

  return Math.max(0, Math.trunc(value));
}

function secondsUntil(timestampMs: number): number {
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

function redirectToNextPath(nextPath: string): void {
  window.location.assign(nextPath);
}

function renderOtpSlots(length: number): ReactNode {
  const midpoint = length > 4 ? Math.ceil(length / 2) : length;
  const slots: ReactNode[] = [];

  for (let index = 0; index < length; index += 1) {
    if (index === midpoint && index < length) {
      slots.push(<InputOTPSeparator key="separator" />);
    }

    slots.push(<InputOTPSlot key={index} index={index} />);
  }

  return <InputOTPGroup>{slots}</InputOTPGroup>;
}

function describedBy(
  input: Readonly<{ helpId: string; errorId: string; hasError: boolean }>,
): string {
  return input.hasError ? `${input.helpId} ${input.errorId}` : input.helpId;
}

export function OtpVerifyForm(props: OtpVerifyFormProps) {
  return <OtpVerifyFormInner key={props.challengeId} {...props} />;
}

function OtpVerifyFormInner(props: OtpVerifyFormProps) {
  const otpFieldId = useId();
  const otpHelpId = useId();
  const otpErrorId = useId();
  const toast = useToast();
  const verifyMutation = useLoginVerify();
  const resendMutation = useLoginStart();
  const resendIntentRef = useRef<LoginResendIntent | null>(null);
  const expectedLength = clampOtpLength(props.expectedLength);
  const attemptsRemaining = normalizeAttemptsRemaining(props.attemptsRemaining);
  const [formError, setFormError] = useState<UserFacingAuthError | null>(null);
  const [expirySeconds, setExpirySeconds] = useState(() =>
    secondsUntil(props.expiresAtMs),
  );
  const [resendSeconds, setResendSeconds] = useState(() =>
    secondsUntil(props.resendAvailableAtMs),
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
  const canResend = resendSeconds <= 0 && !resendMutation.isPending;
  const isBusy = form.formState.isSubmitting || verifyMutation.isPending;
  const formDisabled = props.disabled === true || isBusy || expired;
  const submitDisabled = formDisabled || watchedCode.length !== expectedLength;

  const helpText = useMemo(() => {
    if (expired) {
      return "This code has expired. Request a new code to continue.";
    }

    const attemptText =
      attemptsRemaining > 0
        ? ` ${String(attemptsRemaining)} attempt${attemptsRemaining === 1 ? "" : "s"} remaining.`
        : "";

    return `Code expires in ${formatCountdown(expirySeconds)}.${attemptText}`;
  }, [attemptsRemaining, expired, expirySeconds]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setExpirySeconds(secondsUntil(props.expiresAtMs));
      setResendSeconds(secondsUntil(props.resendAvailableAtMs));
    }, 1_000);

    return () => {
      window.clearInterval(interval);
    };
  }, [props.expiresAtMs, props.resendAvailableAtMs]);

  async function onSubmit(values: OtpVerifyFormValues): Promise<void> {
    if (formDisabled) {
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

    setFormError(null);

    try {
      await verifyMutation.mutateAsync({
        identifier: props.identifier,
        challengeId: props.challengeId,
        code,
      });

      toast.success({
        title: "Signed in",
        description: "Opening your workspace.",
        replace: true,
      });

      redirectToNextPath(props.nextPath);
    } catch (error) {
      const failure = toLoginVerifyFailure(error);
      const userFacingError = toUserFacingAuthError(error);

      if (failure.kind === "invalid_code") {
        form.setError("code", {
          type: "server",
          message:
            failure.attemptsRemaining !== null
              ? `Incorrect code. ${String(failure.attemptsRemaining)} attempt${failure.attemptsRemaining === 1 ? "" : "s"} remaining.`
              : "Incorrect code. Try again.",
        });
      }

      setFormError(userFacingError);
      toast.error({
        title: userFacingError.title,
        description: userFacingError.description,
        replace: true,
      });
    }
  }

  async function onResend(): Promise<void> {
    if (!canResend || props.disabled === true) {
      return;
    }

    setFormError(null);

    try {
      const existingIntent = resendIntentRef.current;
      const resendIntent =
        existingIntent?.identifier === props.identifier
          ? existingIntent
          : {
              identifier: props.identifier,
              idempotencyKey: createIdempotencyKey("auth-login-resend"),
            };

      resendIntentRef.current = resendIntent;

      const response = await resendMutation.mutateAsync({
        identifier: props.identifier,
        idempotencyKey: resendIntent.idempotencyKey,
      });

      resendIntentRef.current = null;
      form.reset({ code: "" });
      props.onResendSuccess(response);

      toast.success({
        title: "New code sent",
        description: "Use the latest verification code.",
        replace: true,
      });
    } catch (error) {
      const userFacingError = toUserFacingAuthError(error);

      setFormError(userFacingError);
      toast.error({
        title: userFacingError.title,
        description: userFacingError.description,
        replace: true,
      });
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        {formError !== null ? <AuthErrorAlert error={formError} /> : null}

        <Field data-invalid={otpHasError ? true : undefined}>
          <Controller
            control={form.control}
            name="code"
            render={({ field }) => (
              <InputOTP
                id={otpFieldId}
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
                autoFocus
              >
                {renderOtpSlots(expectedLength)}
              </InputOTP>
            )}
          />

          <FieldDescription id={otpHelpId}>{helpText}</FieldDescription>

          {otpHasError ? (
            <FieldError id={otpErrorId}>{otpError}</FieldError>
          ) : null}
        </Field>

        <Button type="submit" disabled={submitDisabled} className="w-full">
          {isBusy ? (
            <>
              <Spinner aria-hidden="true" className="size-4" />
              Verifying
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
            disabled={!canResend || resendMutation.isPending}
          >
            {resendMutation.isPending ? (
              <>
                <Spinner aria-hidden="true" className="size-4" />
                Sending
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
            onClick={props.onBack}
            disabled={formDisabled}
            className="justify-self-center"
          >
            Change account
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
