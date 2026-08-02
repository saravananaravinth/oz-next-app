// oz-next-app/src/features/auth/ui/login-start-form.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  useId,
  useRef,
  useState,
  type ReactElement,
  type SyntheticEvent,
} from "react";
import { Controller, useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { idempotencyKey as createIdempotencyKey } from "@/lib/security/request-identifiers";

import { useLoginStart } from "@/features/auth/hooks/use-login-start";
import {
  toUserFacingAuthError,
  type UserFacingAuthError,
} from "@/features/auth/api/auth.client";
import {
  loginStartFormSchema,
  type LoginStartFormValues,
  type LoginStartResult,
} from "@/features/auth/contracts/auth-form.schema";
import { AuthErrorAlert } from "@/features/auth/ui/auth-error-alert";

type LoginStartFormProps = Readonly<{
  initialIdentifier?: string;
  disabled?: boolean;
  onSuccess: (
    input: Readonly<{ identifier: string; response: LoginStartResult }>,
  ) => void;
}>;

type LoginStartIntent = Readonly<{
  identifier: string;
  idempotencyKey: string;
}>;

function describedBy(
  input: Readonly<{ helpId: string; errorId: string; hasError: boolean }>,
): string {
  return input.hasError ? `${input.helpId} ${input.errorId}` : input.helpId;
}

export function LoginStartForm({
  initialIdentifier,
  disabled: disabledProp = false,
  onSuccess,
}: LoginStartFormProps): ReactElement {
  const identifierFieldId = useId();
  const identifierHelpId = useId();
  const identifierErrorId = useId();
  const [formError, setFormError] = useState<UserFacingAuthError | null>(null);
  const submissionIntentRef = useRef<LoginStartIntent | null>(null);
  const submissionPendingRef = useRef(false);
  const mutation = useLoginStart();
  const defaultIdentifier = initialIdentifier?.trim() ?? "";

  const form = useForm<LoginStartFormValues>({
    resolver: zodResolver(loginStartFormSchema),
    defaultValues: {
      identifier: defaultIdentifier,
    },
    mode: "onBlur",
    reValidateMode: "onChange",
    shouldFocusError: true,
  });

  const identifierError = form.formState.errors.identifier?.message;
  const identifierHasError = identifierError !== undefined;
  const isBusy = form.formState.isSubmitting || mutation.isPending;
  const disabled = disabledProp || isBusy;

  async function onSubmit(values: LoginStartFormValues): Promise<void> {
    if (mutation.isPending || disabledProp || submissionPendingRef.current) {
      return;
    }

    submissionPendingRef.current = true;
    setFormError(null);

    try {
      const identifier = values.identifier.trim();
      const existingIntent = submissionIntentRef.current;
      const nextSubmissionIntent =
        existingIntent?.identifier === identifier
          ? existingIntent
          : {
              identifier,
              idempotencyKey: createIdempotencyKey("auth-login-start"),
            };

      submissionIntentRef.current = nextSubmissionIntent;

      const response = await mutation.mutateAsync({
        identifier,
        idempotencyKey: nextSubmissionIntent.idempotencyKey,
      });

      submissionIntentRef.current = null;
      onSuccess({ identifier, response });
    } catch (error) {
      const userFacingError = toUserFacingAuthError(error);

      setFormError(userFacingError);
    } finally {
      submissionPendingRef.current = false;
    }
  }

  function handleFormSubmit(event: SyntheticEvent<HTMLFormElement>): void {
    event.preventDefault();
    void form.handleSubmit(onSubmit)(event);
  }

  return (
    <form onSubmit={handleFormSubmit} noValidate aria-busy={isBusy}>
      <FieldGroup>
        {formError !== null ? <AuthErrorAlert error={formError} /> : null}

        <Field data-invalid={identifierHasError ? true : undefined}>
          <FieldLabel htmlFor={identifierFieldId}>
            Email or mobile number
          </FieldLabel>

          <Controller
            control={form.control}
            name="identifier"
            render={({ field }) => (
              <Input
                id={identifierFieldId}
                type="text"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                inputMode="text"
                enterKeyHint="send"
                spellCheck={false}
                placeholder="Email or phone"
                aria-invalid={identifierHasError ? true : undefined}
                aria-describedby={describedBy({
                  helpId: identifierHelpId,
                  errorId: identifierErrorId,
                  hasError: identifierHasError,
                })}
                disabled={disabled}
                name={field.name}
                ref={field.ref}
                value={field.value}
                onChange={(event) => {
                  submissionIntentRef.current = null;

                  if (formError !== null) {
                    setFormError(null);
                  }

                  field.onChange(event);
                }}
                onBlur={field.onBlur}
              />
            )}
          />

          <FieldDescription id={identifierHelpId}>
            Use the email address or mobile number registered in ERP.
          </FieldDescription>

          {identifierHasError ? (
            <FieldError id={identifierErrorId}>{identifierError}</FieldError>
          ) : null}
        </Field>

        <Button type="submit" disabled={disabled} className="w-full">
          {isBusy ? (
            <>
              <Spinner aria-hidden="true" className="size-4" />
              Sending code…
            </>
          ) : (
            "Continue"
          )}
        </Button>
      </FieldGroup>
    </form>
  );
}
