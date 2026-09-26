// oz-next-app/src/features/payments/ui/payment-account-dialog.tsx
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  Plus,
  RotateCw,
} from "lucide-react";
import {
  Controller,
  useForm,
  useWatch,
  type UseFormRegisterReturn,
} from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/shared/hooks";

import {
  configurePaymentAccountAction,
  rotatePaymentCredentialsAction,
} from "@/features/payments/actions/payments.actions";
import type { PaymentProviderAccount } from "@/features/payments/contracts/payments.schema";

const FIELD_CLASS_NAME =
  "grid min-w-0 content-start grid-rows-[auto_2.75rem_minmax(1.25rem,auto)] gap-2";
const CONTROL_CLASS_NAME = "h-11 w-full";
const FIELD_HELP_CLASS_NAME =
  "min-h-5 text-caption leading-5 text-muted-readable";

const paymentCredentialFormSchema = z
  .object({
    environment: z.enum(["TEST", "LIVE"]),
    accountReference: z.string().trim().max(256),
    clientKeyId: z.string().trim().min(1).max(256),
    apiSecret: z.string().trim().min(1).max(16_384),
    webhookSecret: z.string().trim().min(1).max(16_384),
    isDefault: z.boolean(),
  })
  .strict()
  .superRefine((value, context) => {
    const expectedPrefix =
      value.environment === "LIVE" ? "rzp_live_" : "rzp_test_";

    if (!value.clientKeyId.startsWith(expectedPrefix)) {
      context.addIssue({
        code: "custom",
        path: ["clientKeyId"],
        message: `${value.environment} credentials must use a ${expectedPrefix} key ID.`,
      });
    }
  });

type PaymentCredentialForm = z.infer<typeof paymentCredentialFormSchema>;

type PaymentAccountDialogProps = Readonly<{
  account?: PaymentProviderAccount;
  trigger?: React.ReactNode;
}>;

type SecretFieldProps = Readonly<{
  id: string;
  label: string;
  error: string | undefined;
  description: string;
  descriptionId: string;
  disabled: boolean;
  visible: boolean;
  onVisibleChange: (visible: boolean) => void;
  registration: UseFormRegisterReturn;
}>;

function failureDescription(
  result: Readonly<{ message: string; requestId?: string }>,
): string {
  return result.requestId === undefined
    ? result.message
    : `${result.message} Reference: ${result.requestId}`;
}

function SecretField({
  id,
  label,
  error,
  description,
  descriptionId,
  disabled,
  visible,
  onVisibleChange,
  registration,
}: SecretFieldProps): React.ReactElement {
  const errorId = `${id}-error`;
  const describedBy =
    error === undefined ? descriptionId : `${descriptionId} ${errorId}`;

  return (
    <div className={FIELD_CLASS_NAME}>
      <Label htmlFor={id}>{label}</Label>

      <InputGroup className={CONTROL_CLASS_NAME}>
        <InputGroupInput
          id={id}
          type={visible ? "text" : "password"}
          autoComplete="new-password"
          spellCheck={false}
          autoCapitalize="none"
          autoCorrect="off"
          aria-invalid={error === undefined ? undefined : true}
          aria-describedby={describedBy}
          disabled={disabled}
          {...registration}
        />

        <InputGroupAddon align="inline-end">
          <InputGroupButton
            type="button"
            size="icon-xs"
            aria-label={visible ? `Hide ${label}` : `Show ${label}`}
            aria-pressed={visible}
            disabled={disabled}
            onClick={() => {
              onVisibleChange(!visible);
            }}
          >
            {visible ? (
              <EyeOff aria-hidden="true" className="size-4" />
            ) : (
              <Eye aria-hidden="true" className="size-4" />
            )}
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>

      <p id={descriptionId} className={FIELD_HELP_CLASS_NAME}>
        {description}
      </p>

      {error === undefined ? null : (
        <p id={errorId} role="alert" className="text-caption text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

export function PaymentAccountDialog({
  account,
  trigger,
}: PaymentAccountDialogProps): React.ReactElement {
  const rotate = account !== undefined;
  const [open, setOpen] = React.useState(false);
  const [apiSecretVisible, setApiSecretVisible] = React.useState(false);
  const [webhookSecretVisible, setWebhookSecretVisible] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  const form = useForm<PaymentCredentialForm>({
    resolver: zodResolver(paymentCredentialFormSchema),
    defaultValues: {
      environment: account?.environment ?? "TEST",
      accountReference: account?.accountReference ?? "",
      clientKeyId: account?.clientKeyId ?? "",
      apiSecret: "",
      webhookSecret: "",
      isDefault: account?.isDefault ?? true,
    },
    mode: "onBlur",
  });

  const environment = useWatch({
    control: form.control,
    name: "environment",
  });
  const environmentError = form.formState.errors.environment?.message;
  const clientKeyIdError = form.formState.errors.clientKeyId?.message;
  const apiSecretError = form.formState.errors.apiSecret?.message;
  const webhookSecretError = form.formState.errors.webhookSecret?.message;

  function resetDialogState(): void {
    form.reset({
      environment: account?.environment ?? "TEST",
      accountReference: account?.accountReference ?? "",
      clientKeyId: account?.clientKeyId ?? "",
      apiSecret: "",
      webhookSecret: "",
      isDefault: account?.isDefault ?? true,
    });
    setApiSecretVisible(false);
    setWebhookSecretVisible(false);
  }

  function handleOpenChange(nextOpen: boolean): void {
    resetDialogState();
    setOpen(nextOpen);
  }

  function submit(values: PaymentCredentialForm): void {
    startTransition(() => {
      const request = rotate
        ? rotatePaymentCredentialsAction({
            providerAccountId: account.providerAccountId,
            providerCode: account.providerCode,
            environment: values.environment,
            clientKeyId: values.clientKeyId,
            apiSecret: values.apiSecret,
            webhookSecret: values.webhookSecret,
            rowVersion: account.rowVersion,
          })
        : configurePaymentAccountAction({
            providerCode: "RAZORPAY",
            environment: values.environment,
            accountReference:
              values.accountReference.trim().length === 0
                ? null
                : values.accountReference.trim(),
            clientKeyId: values.clientKeyId,
            apiSecret: values.apiSecret,
            webhookSecret: values.webhookSecret,
            isDefault: values.isDefault,
          });

      void request.then((result) => {
        if (!result.ok) {
          toast.error({
            title: rotate
              ? "Credentials could not be rotated"
              : "Razorpay could not be configured",
            description: failureDescription(result),
            replace: true,
          });
          return;
        }

        toast.success({
          title: rotate ? "Credentials rotated" : "Razorpay connected",
          description: rotate
            ? "The new API and webhook credentials are now active."
            : "The Razorpay account was verified and connected to this tenant.",
          replace: true,
        });
        handleOpenChange(false);
      });
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus aria-hidden="true" className="size-4" />
            Add payment gateway
          </Button>
        )}
      </DialogTrigger>

      <DialogContent height="default" className="sm:max-w-2xl">
        <DialogHeader className="pr-10">
          <DialogTitle>
            {rotate ? "Rotate Razorpay credentials" : "Configure Razorpay"}
          </DialogTitle>
          <DialogDescription>
            Credentials are verified server-side and encrypted before
            persistence. Stored secrets are never returned to the browser.
          </DialogDescription>
        </DialogHeader>

        <form
          className="contents"
          onSubmit={form.handleSubmit(submit)}
          autoComplete="off"
          noValidate
        >
          <DialogBody className="py-4 sm:py-5">
            <div className="grid gap-5">
              <div className="grid items-start gap-x-4 gap-y-5 sm:grid-cols-2">
                <div className={FIELD_CLASS_NAME}>
                  <Label htmlFor="payment-environment">Environment</Label>

                  <Controller
                    control={form.control}
                    name="environment"
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={pending}
                      >
                        <SelectTrigger
                          id="payment-environment"
                          className={CONTROL_CLASS_NAME}
                          aria-invalid={
                            environmentError === undefined ? undefined : true
                          }
                          aria-describedby="payment-environment-help"
                        >
                          <SelectValue placeholder="Select environment" />
                        </SelectTrigger>

                        <SelectContent>
                          <SelectItem value="TEST">Test</SelectItem>
                          <SelectItem value="LIVE">Live</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />

                  <p
                    id="payment-environment-help"
                    className={FIELD_HELP_CLASS_NAME}
                  >
                    Must match the Razorpay key prefix.
                  </p>

                  {environmentError === undefined ? null : (
                    <p role="alert" className="text-caption text-destructive">
                      {environmentError}
                    </p>
                  )}
                </div>

                {rotate ? (
                  <div className={FIELD_CLASS_NAME}>
                    <Label htmlFor="payment-key-id">Key ID</Label>

                    <Input
                      id="payment-key-id"
                      className={CONTROL_CLASS_NAME}
                      spellCheck={false}
                      autoCapitalize="none"
                      autoCorrect="off"
                      placeholder={
                        environment === "LIVE" ? "rzp_live_..." : "rzp_test_..."
                      }
                      aria-invalid={
                        clientKeyIdError === undefined ? undefined : true
                      }
                      aria-describedby="payment-key-id-help"
                      disabled={pending}
                      {...form.register("clientKeyId")}
                    />

                    <p
                      id="payment-key-id-help"
                      className={FIELD_HELP_CLASS_NAME}
                    >
                      Must match the selected environment.
                    </p>

                    {clientKeyIdError === undefined ? null : (
                      <p role="alert" className="text-caption text-destructive">
                        {clientKeyIdError}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className={FIELD_CLASS_NAME}>
                    <Label htmlFor="payment-account-reference">
                      Account reference
                    </Label>

                    <Input
                      id="payment-account-reference"
                      className={CONTROL_CLASS_NAME}
                      placeholder="Primary Razorpay account"
                      maxLength={256}
                      aria-describedby="payment-account-reference-help"
                      disabled={pending}
                      {...form.register("accountReference")}
                    />

                    <p
                      id="payment-account-reference-help"
                      className={FIELD_HELP_CLASS_NAME}
                    >
                      Optional internal label. Never store secrets here.
                    </p>
                  </div>
                )}
              </div>

              {rotate ? null : (
                <div className={FIELD_CLASS_NAME}>
                  <Label htmlFor="payment-key-id">Key ID</Label>

                  <Input
                    id="payment-key-id"
                    className={CONTROL_CLASS_NAME}
                    spellCheck={false}
                    autoCapitalize="none"
                    autoCorrect="off"
                    placeholder={
                      environment === "LIVE" ? "rzp_live_..." : "rzp_test_..."
                    }
                    aria-invalid={
                      clientKeyIdError === undefined ? undefined : true
                    }
                    aria-describedby="payment-key-id-help"
                    disabled={pending}
                    {...form.register("clientKeyId")}
                  />

                  <p id="payment-key-id-help" className={FIELD_HELP_CLASS_NAME}>
                    Must start with the prefix for the selected environment.
                  </p>

                  {clientKeyIdError === undefined ? null : (
                    <p role="alert" className="text-caption text-destructive">
                      {clientKeyIdError}
                    </p>
                  )}
                </div>
              )}

              <div className="grid items-start gap-x-4 gap-y-5 sm:grid-cols-2">
                <SecretField
                  id="payment-key-secret"
                  label="Key Secret"
                  error={apiSecretError}
                  description="Razorpay API secret. Encrypted and never returned."
                  descriptionId="payment-key-secret-help"
                  disabled={pending}
                  visible={apiSecretVisible}
                  onVisibleChange={setApiSecretVisible}
                  registration={form.register("apiSecret")}
                />

                <SecretField
                  id="payment-webhook-secret"
                  label="Webhook Secret"
                  error={webhookSecretError}
                  description="ERP webhook signing secret. Must differ from Key Secret."
                  descriptionId="payment-webhook-secret-help"
                  disabled={pending}
                  visible={webhookSecretVisible}
                  onVisibleChange={setWebhookSecretVisible}
                  registration={form.register("webhookSecret")}
                />
              </div>

              {rotate ? null : (
                <Controller
                  control={form.control}
                  name="isDefault"
                  render={({ field }) => (
                    <div className="flex items-center justify-between gap-4 rounded-2xl border border-border/70 bg-muted/20 px-4 py-3">
                      <div className="min-w-0">
                        <Label htmlFor="payment-default-account">
                          Default payment account
                        </Label>
                        <p className="mt-1 text-caption text-muted-readable">
                          Use this active account for new payment intents unless
                          another account is explicitly selected.
                        </p>
                      </div>

                      <Switch
                        id="payment-default-account"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={pending}
                        className="shrink-0"
                      />
                    </div>
                  )}
                />
              )}
            </div>
          </DialogBody>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                handleOpenChange(false);
              }}
              disabled={pending}
            >
              Cancel
            </Button>

            <Button type="submit" disabled={pending}>
              {pending ? (
                <LoaderCircle
                  aria-hidden="true"
                  className="size-4 animate-spin"
                />
              ) : rotate ? (
                <RotateCw aria-hidden="true" className="size-4" />
              ) : (
                <KeyRound aria-hidden="true" className="size-4" />
              )}

              {pending
                ? "Verifying…"
                : rotate
                  ? "Verify & rotate"
                  : "Verify & save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
