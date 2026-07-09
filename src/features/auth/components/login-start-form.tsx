// oz-next-app/src/features/auth/components/login-start-form.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useId, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/hooks/use-toast";

import { useLoginStart } from "../hooks/use-login-start";
import {
  toUserFacingAuthError,
  type UserFacingAuthError,
} from "../mutations/auth-mutations";
import {
  loginStartFormSchema,
  type LoginStartFormValues,
  type LoginStartResult,
} from "../schemas/auth-form-schemas";
import { AuthErrorAlert } from "./auth-error-alert";

type LoginStartFormProps = Readonly<{
  initialIdentifier?: string;
  disabled?: boolean;
  onSuccess: (
    input: Readonly<{ identifier: string; response: LoginStartResult }>,
  ) => void;
}>;

function describedBy(
  input: Readonly<{ helpId: string; errorId: string; hasError: boolean }>,
): string {
  return input.hasError ? `${input.helpId} ${input.errorId}` : input.helpId;
}

export function LoginStartForm(props: LoginStartFormProps) {
  const identifierFieldId = useId();
  const identifierHelpId = useId();
  const identifierErrorId = useId();
  const toast = useToast();
  const [formError, setFormError] = useState<UserFacingAuthError | null>(null);
  const mutation = useLoginStart();
  const defaultIdentifier = useMemo(
    () => props.initialIdentifier?.trim() ?? "",
    [props.initialIdentifier],
  );

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
  const disabled = props.disabled === true || isBusy;

  async function onSubmit(values: LoginStartFormValues): Promise<void> {
    if (mutation.isPending || props.disabled === true) {
      return;
    }

    setFormError(null);

    try {
      const identifier = values.identifier.trim();
      const response = await mutation.mutateAsync({ identifier });

      toast.success({
        title: "Verification code sent",
        description: "Enter the code to continue.",
        replace: true,
      });

      props.onSuccess({ identifier, response });
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

        <Field data-invalid={identifierHasError ? true : undefined}>
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
              Sending code
            </>
          ) : (
            "Continue"
          )}
        </Button>
      </FieldGroup>
    </form>
  );
}
