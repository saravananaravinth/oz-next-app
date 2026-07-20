// oz-next-app/src/features/engagement/dealer-dashboard/ui/dealer-dashboard-controls.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  CircleHelp,
  Edit3,
  Link2,
  LoaderCircle,
  PauseCircle,
  PlayCircle,
  Power,
  UserPlus,
} from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { Controller, useForm } from "react-hook-form";

import { createClientIdempotencyKey } from "@/features/erp-core/mutations/erp-mutation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/shared/hooks/use-toast";

import {
  onboardOwnerGuideAction,
  ownerGuideLifecycleAction,
  updateOwnerGuideAction,
  updateOwnerGuideAssignmentEligibilityAction,
  type DealerDashboardActionResult,
} from "@/features/engagement/dealer-dashboard/actions/dealer-dashboard.actions";
import type { DealerDashboardCapabilities } from "@/features/engagement/dealer-dashboard/policies/dealer-dashboard.policy";
import {
  ownerGuideEditFormSchema,
  ownerGuideOnboardFormSchema,
  type DealerDashboardContext,
  type OwnerGuideEditFormValues,
  type OwnerGuideOnboardFormValues,
  type OwnerGuideSummary,
} from "@/features/engagement/dealer-dashboard/contracts/dealer-dashboard.schema";

function optionalNumber(value: unknown): number | undefined {
  if (value === "" || value === null || value === undefined) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function errorMessage(value: unknown): string | undefined {
  if (typeof value !== "object" || value === null || !("message" in value)) {
    return undefined;
  }

  return typeof value.message === "string" ? value.message : undefined;
}

function useActionFeedback(): Readonly<{
  complete: (result: DealerDashboardActionResult) => boolean;
}> {
  const router = useRouter();
  const toast = useToast();

  const complete = React.useCallback(
    (result: DealerDashboardActionResult): boolean => {
      if (result.ok) {
        toast.success({ title: result.message });
        router.refresh();
        return true;
      }

      toast.error({
        title: "Dealer operation failed",
        description:
          result.requestId === undefined
            ? result.message
            : `${result.message} Reference: ${result.requestId}`,
      });
      return false;
    },
    [router, toast],
  );

  return { complete };
}

function SubmitButton({
  pending,
  children,
}: Readonly<{
  pending: boolean;
  children: React.ReactNode;
}>): React.ReactElement {
  return (
    <Button type="submit" disabled={pending}>
      {pending ? (
        <LoaderCircle
          aria-hidden="true"
          className="size-4 animate-spin motion-reduce:animate-none"
        />
      ) : null}
      {children}
    </Button>
  );
}

function HelpTooltip({
  label,
  children,
}: Readonly<{
  label: string;
  children: React.ReactNode;
}>): React.ReactElement {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex size-6 shrink-0 items-center justify-center rounded-full text-muted-readable outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transition-none"
          aria-label={label}
        >
          <CircleHelp aria-hidden="true" className="size-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent>{children}</TooltipContent>
    </Tooltip>
  );
}

function FormSection({
  step,
  title,
  description,
  children,
}: Readonly<{
  step: number;
  title: string;
  description: string;
  children: React.ReactNode;
}>): React.ReactElement {
  return (
    <section className="grid gap-4 rounded-2xl border border-border/70 bg-muted/25 p-4 sm:p-5">
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-caption text-primary-foreground text-tabular">
          {step}
        </span>
        <div className="grid min-w-0 gap-1">
          <h3 className="text-card-title text-foreground">{title}</h3>
          <p className="text-body-sm text-muted-readable text-pretty">
            {description}
          </p>
        </div>
      </div>
      {children}
    </section>
  );
}

function FieldLabelWithHelp({
  htmlFor,
  label,
  help,
}: Readonly<{
  htmlFor: string;
  label: string;
  help: React.ReactNode;
}>): React.ReactElement {
  return (
    <div className="flex items-center gap-1">
      <FieldLabel htmlFor={htmlFor}>{label}</FieldLabel>
      <HelpTooltip label={`About ${label}`}>{help}</HelpTooltip>
    </div>
  );
}

function ActionTooltip({
  label,
  children,
}: Readonly<{
  label: string;
  children: React.ReactElement;
}>): React.ReactElement {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export function OwnerGuideOnboardDialog({
  context,
}: Readonly<{ context: DealerDashboardContext }>): React.ReactElement {
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const feedback = useActionFeedback();
  const form = useForm<OwnerGuideOnboardFormValues>({
    resolver: zodResolver(ownerGuideOnboardFormSchema),
    defaultValues: {
      mobileNumber: "",
      displayName: "",
      vehicleModel: "",
      vehicleVariant: "",
      vehicleChassisNo: "",
      vehicleDeliveryDate: "",
      assignmentEnabled: true,
      idempotencyKey: createClientIdempotencyKey("owner-guide-onboard"),
    },
  });

  const resetForm = React.useCallback((): void => {
    form.reset({
      mobileNumber: "",
      displayName: "",
      vehicleModel: "",
      vehicleVariant: "",
      vehicleChassisNo: "",
      vehicleDeliveryDate: "",
      assignmentEnabled: true,
      idempotencyKey: createClientIdempotencyKey("owner-guide-onboard"),
    });
  }, [form]);

  const submit = form.handleSubmit((values): void => {
    startTransition((): void => {
      void onboardOwnerGuideAction({ context, values }).then((result) => {
        if (feedback.complete(result)) {
          resetForm();
          setOpen(false);
        }
      });
    });
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!pending) {
          setOpen(nextOpen);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <UserPlus aria-hidden="true" className="size-4" />
          Onboard Owner Guide
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[min(92dvh,58rem)] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden sm:max-w-3xl">
        <DialogHeader className="pr-10">
          <DialogTitle>Onboard an Owner Guide</DialogTitle>
          <DialogDescription>
            Complete the customer, vehicle, and assignment steps. The customer
            must already exist under this tenant.
          </DialogDescription>
        </DialogHeader>

        <form className="contents" onSubmit={submit} noValidate>
          <ScrollArea className="h-full min-h-0">
            <div className="grid gap-5 pb-1 pr-4">
              <FormSection
                step={1}
                title="Identify the customer"
                description="The mobile number resolves the existing customer and prevents duplicate Owner Guide profiles."
              >
                <FieldGroup className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabelWithHelp
                      htmlFor="owner-guide-mobile"
                      label="Registered mobile number"
                      help="Use the mobile number stored on the existing customer record."
                    />
                    <Input
                      id="owner-guide-mobile"
                      autoComplete="tel"
                      inputMode="tel"
                      placeholder="+91…"
                      aria-invalid={
                        form.formState.errors.mobileNumber !== undefined
                      }
                      {...form.register("mobileNumber")}
                    />
                    <FieldError>
                      {errorMessage(form.formState.errors.mobileNumber)}
                    </FieldError>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="owner-guide-name">
                      Owner Guide name
                    </FieldLabel>
                    <Input
                      id="owner-guide-name"
                      autoComplete="name"
                      aria-invalid={
                        form.formState.errors.displayName !== undefined
                      }
                      {...form.register("displayName")}
                    />
                    <FieldError>
                      {errorMessage(form.formState.errors.displayName)}
                    </FieldError>
                  </Field>
                </FieldGroup>
              </FormSection>

              <FormSection
                step={2}
                title="Add the delivered vehicle"
                description="Vehicle details help the dealer identify the Owner Guide without exposing full sensitive identifiers."
              >
                <FieldGroup className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="owner-guide-model">
                      Vehicle model
                    </FieldLabel>
                    <Input
                      id="owner-guide-model"
                      {...form.register("vehicleModel")}
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="owner-guide-variant">
                      Vehicle variant
                    </FieldLabel>
                    <Input
                      id="owner-guide-variant"
                      {...form.register("vehicleVariant")}
                    />
                  </Field>

                  <Field>
                    <FieldLabelWithHelp
                      htmlFor="owner-guide-chassis"
                      label="Chassis number"
                      help="Enter the 11 to 17 character chassis/VIN. It is stored as a hash and displayed only in masked form."
                    />
                    <Input
                      id="owner-guide-chassis"
                      autoCapitalize="characters"
                      autoComplete="off"
                      maxLength={17}
                      spellCheck={false}
                      placeholder="MA1…"
                      aria-invalid={
                        form.formState.errors.vehicleChassisNo !== undefined
                      }
                      {...form.register("vehicleChassisNo")}
                    />
                    <FieldDescription>
                      Letters I, O, and Q are not accepted in a standard VIN.
                    </FieldDescription>
                    <FieldError>
                      {errorMessage(form.formState.errors.vehicleChassisNo)}
                    </FieldError>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="owner-guide-delivery-date">
                      Delivery date
                    </FieldLabel>
                    <Input
                      id="owner-guide-delivery-date"
                      type="date"
                      aria-invalid={
                        form.formState.errors.vehicleDeliveryDate !== undefined
                      }
                      {...form.register("vehicleDeliveryDate")}
                    />
                    <FieldError>
                      {errorMessage(form.formState.errors.vehicleDeliveryDate)}
                    </FieldError>
                  </Field>
                </FieldGroup>
              </FormSection>

              <FormSection
                step={3}
                title="Set assignment availability"
                description="Assignment can be paused independently from the Owner Guide profile status."
              >
                <Controller
                  control={form.control}
                  name="assignmentEnabled"
                  render={({ field }) => (
                    <Field orientation="horizontal">
                      <div className="grid flex-1 gap-1">
                        <div className="flex items-center gap-1">
                          <FieldLabel htmlFor="owner-guide-assignment-enabled">
                            Eligible for new assignments
                          </FieldLabel>
                          <HelpTooltip label="About assignment eligibility">
                            Disable this when the Owner Guide is temporarily
                            unavailable. Their account and history remain
                            active.
                          </HelpTooltip>
                        </div>
                        <FieldDescription>
                          Enabled Owner Guides still require an active profile
                          and a fresh location before matching.
                        </FieldDescription>
                      </div>
                      <Switch
                        id="owner-guide-assignment-enabled"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </Field>
                  )}
                />

                <FieldGroup className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabelWithHelp
                      htmlFor="owner-guide-distance"
                      label="Maximum assignment distance"
                      help="Optional per-guide limit. When empty, the backend-configured dealer policy applies."
                    />
                    <Input
                      id="owner-guide-distance"
                      type="number"
                      min={1}
                      max={250}
                      inputMode="decimal"
                      placeholder="Dealer default"
                      {...form.register("maxAssignmentDistanceKm", {
                        setValueAs: optionalNumber,
                      })}
                    />
                    <FieldDescription>Kilometres</FieldDescription>
                  </Field>

                  <Field>
                    <FieldLabelWithHelp
                      htmlFor="owner-guide-daily-limit"
                      label="Daily assignment limit"
                      help="Optional workload cap. Once reached, the guide is excluded until the next day."
                    />
                    <Input
                      id="owner-guide-daily-limit"
                      type="number"
                      min={1}
                      max={100}
                      inputMode="numeric"
                      placeholder="No per-guide limit"
                      {...form.register("dailyAssignmentLimit", {
                        setValueAs: optionalNumber,
                      })}
                    />
                  </Field>
                </FieldGroup>
              </FormSection>
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOpen(false);
              }}
              disabled={pending}
            >
              Cancel
            </Button>
            <SubmitButton pending={pending}>Complete onboarding</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function OwnerGuideEditDialog({
  context,
  ownerGuide,
  showLabel,
}: Readonly<{
  context: DealerDashboardContext;
  ownerGuide: OwnerGuideSummary;
  showLabel: boolean;
}>): React.ReactElement {
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const feedback = useActionFeedback();
  const form = useForm<OwnerGuideEditFormValues>({
    resolver: zodResolver(ownerGuideEditFormSchema),
    defaultValues: {
      ownerGuideId: ownerGuide.ownerGuideId,
      displayName: ownerGuide.displayName,
      vehicleModel: ownerGuide.vehicleModel ?? "",
      vehicleVariant: ownerGuide.vehicleVariant ?? "",
      replacementVehicleChassisNo: "",
      assignmentEnabled: ownerGuide.assignmentEnabled,
      maxAssignmentDistanceKm: ownerGuide.maxAssignmentDistanceKm ?? undefined,
      dailyAssignmentLimit: ownerGuide.dailyAssignmentLimit ?? undefined,
      rowVersion: ownerGuide.rowVersion,
      idempotencyKey: createClientIdempotencyKey("owner-guide-update"),
    },
  });

  const submit = form.handleSubmit((values): void => {
    startTransition((): void => {
      void updateOwnerGuideAction({ context, values }).then((result) => {
        if (feedback.complete(result)) {
          setOpen(false);
        }
      });
    });
  });

  const trigger = (
    <Button type="button" variant="ghost" size={showLabel ? "sm" : "icon-sm"}>
      <Edit3 aria-hidden="true" className="size-4" />
      {showLabel ? <span>Edit</span> : <span className="sr-only">Edit</span>}
    </Button>
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!pending) {
          setOpen(nextOpen);
        }
      }}
    >
      {showLabel ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
          </TooltipTrigger>
          <TooltipContent>Edit Owner Guide</TooltipContent>
        </Tooltip>
      )}
      <DialogContent className="max-h-[min(92dvh,52rem)] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden sm:max-w-2xl">
        <DialogHeader className="pr-10">
          <DialogTitle>Edit Owner Guide</DialogTitle>
          <DialogDescription>
            Update the profile, vehicle, workload, or assignment availability.
            Existing assignment history is preserved.
          </DialogDescription>
        </DialogHeader>

        <form className="contents" onSubmit={submit} noValidate>
          <ScrollArea className="h-full min-h-0">
            <div className="grid gap-5 pb-1 pr-4">
              <FieldGroup className="grid gap-4 sm:grid-cols-2">
                <Field className="sm:col-span-2">
                  <FieldLabel htmlFor={`edit-name-${ownerGuide.ownerGuideId}`}>
                    Display name
                  </FieldLabel>
                  <Input
                    id={`edit-name-${ownerGuide.ownerGuideId}`}
                    {...form.register("displayName")}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor={`edit-model-${ownerGuide.ownerGuideId}`}>
                    Vehicle model
                  </FieldLabel>
                  <Input
                    id={`edit-model-${ownerGuide.ownerGuideId}`}
                    {...form.register("vehicleModel")}
                  />
                </Field>
                <Field>
                  <FieldLabel
                    htmlFor={`edit-variant-${ownerGuide.ownerGuideId}`}
                  >
                    Vehicle variant
                  </FieldLabel>
                  <Input
                    id={`edit-variant-${ownerGuide.ownerGuideId}`}
                    {...form.register("vehicleVariant")}
                  />
                </Field>
                <Field className="sm:col-span-2">
                  <FieldLabelWithHelp
                    htmlFor={`edit-chassis-${ownerGuide.ownerGuideId}`}
                    label="Replace chassis number"
                    help="Leave this empty to preserve the current masked chassis number."
                  />
                  <Input
                    id={`edit-chassis-${ownerGuide.ownerGuideId}`}
                    autoCapitalize="characters"
                    autoComplete="off"
                    maxLength={17}
                    spellCheck={false}
                    placeholder={
                      ownerGuide.vehicleChassisNoMasked ??
                      "Leave empty to preserve the current value"
                    }
                    {...form.register("replacementVehicleChassisNo")}
                  />
                  <FieldError>
                    {errorMessage(
                      form.formState.errors.replacementVehicleChassisNo,
                    )}
                  </FieldError>
                </Field>
                <Field>
                  <FieldLabel
                    htmlFor={`edit-distance-${ownerGuide.ownerGuideId}`}
                  >
                    Maximum distance (km)
                  </FieldLabel>
                  <Input
                    id={`edit-distance-${ownerGuide.ownerGuideId}`}
                    type="number"
                    min={1}
                    max={250}
                    inputMode="decimal"
                    {...form.register("maxAssignmentDistanceKm", {
                      setValueAs: optionalNumber,
                    })}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor={`edit-limit-${ownerGuide.ownerGuideId}`}>
                    Daily assignment limit
                  </FieldLabel>
                  <Input
                    id={`edit-limit-${ownerGuide.ownerGuideId}`}
                    type="number"
                    min={1}
                    max={100}
                    inputMode="numeric"
                    {...form.register("dailyAssignmentLimit", {
                      setValueAs: optionalNumber,
                    })}
                  />
                </Field>
              </FieldGroup>

              <Separator />

              <Controller
                control={form.control}
                name="assignmentEnabled"
                render={({ field }) => (
                  <Field orientation="horizontal">
                    <div className="grid flex-1 gap-1">
                      <FieldLabel
                        htmlFor={`edit-assignment-${ownerGuide.ownerGuideId}`}
                      >
                        Eligible for new assignments
                      </FieldLabel>
                      <FieldDescription>
                        This does not deactivate the Owner Guide account.
                      </FieldDescription>
                    </div>
                    <Switch
                      id={`edit-assignment-${ownerGuide.ownerGuideId}`}
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </Field>
                )}
              />
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOpen(false);
              }}
              disabled={pending}
            >
              Cancel
            </Button>
            <SubmitButton pending={pending}>Save changes</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AssignmentEligibilityDialog({
  context,
  ownerGuide,
  showLabel,
}: Readonly<{
  context: DealerDashboardContext;
  ownerGuide: OwnerGuideSummary;
  showLabel: boolean;
}>): React.ReactElement {
  const [pending, startTransition] = React.useTransition();
  const feedback = useActionFeedback();
  const nextEnabled = !ownerGuide.assignmentEnabled;
  const label = nextEnabled ? "Enable assignments" : "Pause assignments";
  const icon = nextEnabled ? (
    <PlayCircle aria-hidden="true" className="size-4" />
  ) : (
    <PauseCircle aria-hidden="true" className="size-4" />
  );

  const trigger = (
    <Button
      type="button"
      variant="ghost"
      size={showLabel ? "sm" : "icon-sm"}
      disabled={pending}
    >
      {pending ? (
        <LoaderCircle
          aria-hidden="true"
          className="size-4 animate-spin motion-reduce:animate-none"
        />
      ) : (
        icon
      )}
      {showLabel ? (
        <span>{label}</span>
      ) : (
        <span className="sr-only">{label}</span>
      )}
    </Button>
  );

  return (
    <AlertDialog>
      {showLabel ? (
        <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
          </TooltipTrigger>
          <TooltipContent>{label}</TooltipContent>
        </Tooltip>
      )}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{label}?</AlertDialogTitle>
          <AlertDialogDescription>
            {nextEnabled
              ? `${ownerGuide.displayName} can be matched to new leads once the profile is active, location is fresh, and workload limits allow it.`
              : `${ownerGuide.displayName} will be excluded from new lead matching. Existing assignments and account access are not changed.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={() => {
              startTransition((): void => {
                void updateOwnerGuideAssignmentEligibilityAction({
                  context,
                  ownerGuideId: ownerGuide.ownerGuideId,
                  assignmentEnabled: nextEnabled,
                  rowVersion: ownerGuide.rowVersion,
                  idempotencyKey: createClientIdempotencyKey(
                    nextEnabled
                      ? "owner-guide-assignment-enable"
                      : "owner-guide-assignment-pause",
                  ),
                }).then(feedback.complete);
              });
            }}
          >
            {label}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function LifecycleDialog({
  context,
  ownerGuide,
  showLabel,
}: Readonly<{
  context: DealerDashboardContext;
  ownerGuide: OwnerGuideSummary;
  showLabel: boolean;
}>): React.ReactElement {
  const [pending, startTransition] = React.useTransition();
  const feedback = useActionFeedback();
  const operation = ownerGuide.status === "ACTIVE" ? "deactivate" : "activate";
  const label =
    operation === "activate" ? "Activate profile" : "Deactivate profile";

  const trigger = (
    <Button
      type="button"
      variant="ghost"
      size={showLabel ? "sm" : "icon-sm"}
      disabled={pending}
    >
      {pending ? (
        <LoaderCircle
          aria-hidden="true"
          className="size-4 animate-spin motion-reduce:animate-none"
        />
      ) : (
        <Power aria-hidden="true" className="size-4" />
      )}
      {showLabel ? (
        <span>{label}</span>
      ) : (
        <span className="sr-only">{label}</span>
      )}
    </Button>
  );

  return (
    <AlertDialog>
      {showLabel ? (
        <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
          </TooltipTrigger>
          <TooltipContent>{label}</TooltipContent>
        </Tooltip>
      )}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{label}?</AlertDialogTitle>
          <AlertDialogDescription>
            {operation === "activate"
              ? "Activation restores the Owner Guide profile. New matching still depends on assignment eligibility, a fresh location, and workload limits."
              : "Deactivation removes this profile from new matching and should be used for a longer-term account state change. Existing history is retained."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={() => {
              startTransition((): void => {
                void ownerGuideLifecycleAction({
                  context,
                  ownerGuideId: ownerGuide.ownerGuideId,
                  operation,
                  idempotencyKey: createClientIdempotencyKey(
                    `owner-guide-${operation}`,
                  ),
                }).then(feedback.complete);
              });
            }}
          >
            {label}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function OwnerGuideRowActions({
  context,
  ownerGuide,
  capabilities,
  showLabels = false,
}: Readonly<{
  context: DealerDashboardContext;
  ownerGuide: OwnerGuideSummary;
  capabilities: DealerDashboardCapabilities;
  showLabels?: boolean;
}>): React.ReactElement {
  const [pending, startTransition] = React.useTransition();
  const feedback = useActionFeedback();

  const sendLinkButton = (
    <Button
      type="button"
      variant="ghost"
      size={showLabels ? "sm" : "icon-sm"}
      disabled={pending}
      onClick={() => {
        startTransition((): void => {
          void ownerGuideLifecycleAction({
            context,
            ownerGuideId: ownerGuide.ownerGuideId,
            operation: "send-app-link",
            idempotencyKey: createClientIdempotencyKey(
              "owner-guide-send-app-link",
            ),
          }).then(feedback.complete);
        });
      }}
    >
      {pending ? (
        <LoaderCircle
          aria-hidden="true"
          className="size-4 animate-spin motion-reduce:animate-none"
        />
      ) : (
        <Link2 aria-hidden="true" className="size-4" />
      )}
      {showLabels ? (
        <span>Send app link</span>
      ) : (
        <span className="sr-only">Send app link</span>
      )}
    </Button>
  );

  return (
    <div
      className={
        showLabels
          ? "grid grid-cols-1 gap-1 sm:grid-cols-2"
          : "flex flex-wrap items-center justify-end gap-1"
      }
    >
      {capabilities.canUpdateOwnerGuide ? (
        <>
          <OwnerGuideEditDialog
            context={context}
            ownerGuide={ownerGuide}
            showLabel={showLabels}
          />
          <AssignmentEligibilityDialog
            context={context}
            ownerGuide={ownerGuide}
            showLabel={showLabels}
          />
        </>
      ) : null}
      {capabilities.canSendOwnerGuideAppLink ? (
        showLabels ? (
          sendLinkButton
        ) : (
          <ActionTooltip label="Send Owner Guide app link">
            {sendLinkButton}
          </ActionTooltip>
        )
      ) : null}
      {(
        ownerGuide.status === "ACTIVE"
          ? capabilities.canDisableOwnerGuide
          : capabilities.canUpdateOwnerGuide
      ) ? (
        <LifecycleDialog
          context={context}
          ownerGuide={ownerGuide}
          showLabel={showLabels}
        />
      ) : null}
    </div>
  );
}

export function OwnerGuideAssignmentBadge({
  ownerGuide,
}: Readonly<{ ownerGuide: OwnerGuideSummary }>): React.ReactElement {
  return ownerGuide.assignmentEnabled ? (
    <Badge variant="outline">
      <PlayCircle aria-hidden="true" className="size-3.5" />
      Assignment enabled
    </Badge>
  ) : (
    <Badge variant="secondary">
      <PauseCircle aria-hidden="true" className="size-3.5" />
      Assignment paused
    </Badge>
  );
}
