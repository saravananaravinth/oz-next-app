// oz-next-app/src/features/engagement/dealer-operations/ui/direct-onboarding-workbench.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  CheckCircle2,
  Info,
  MapPin,
  RotateCcw,
  SearchCheck,
  ShieldAlert,
  ShieldCheck,
  UserRoundPlus,
} from "lucide-react";

import {
  WorkflowStepper,
  WorkflowSummaryItem,
  type WorkflowStep,
} from "@/components/common/operation-workflow";
import {
  ContentSection,
  ContentStatus,
} from "@/components/common/content-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { DealershipApplicationFilterOptions } from "@/features/engagement/dealership-application-operations/contracts/dealership-application.schema";
import {
  directOnboardDealerAction,
  preflightDirectOnboardingAction,
} from "@/features/engagement/dealer-operations/actions/dealer-operations.actions";
import type { DirectOnboardingPreflightResult } from "@/features/engagement/dealer-operations/contracts/dealer-operations.schema";
import {
  applicationDetailHref,
  dealerOperationDetailHref,
} from "@/features/engagement/dealer-operations/utils/dealer-operations-url";
import { useToast } from "@/shared/hooks/use-toast";

const DIRECT_ONBOARDING_STEPS = [
  {
    id: "eligibility",
    label: "Check existing records",
    description: "Prevent duplicate applications and dealers",
  },
  {
    id: "partner",
    label: "Partner setup",
    description: "Dealer type and parent organization",
  },
  {
    id: "administrator",
    label: "ERP access",
    description: "Verified administrator identity",
  },
  {
    id: "location",
    label: "Location & margins",
    description: "Business address and commercial template",
  },
  {
    id: "review",
    label: "Review & create",
    description: "Confirm one atomic onboarding intent",
  },
] as const satisfies readonly WorkflowStep[];

export type DirectOnboardingWorkbenchProps = Readonly<{
  filterOptions: DealershipApplicationFilterOptions;
}>;

type IdentitySnapshot = Readonly<{
  dealerName: string;
  mobileE164: string;
  email: string;
  district: string;
  state: string;
}>;

function FieldLabel({
  htmlFor,
  label,
  required = false,
  help,
}: Readonly<{
  htmlFor: string;
  label: string;
  required?: boolean;
  help?: string;
}>): React.ReactElement {
  return (
    <div className="flex items-center gap-2">
      <Label htmlFor={htmlFor}>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </Label>
      {help === undefined ? null : (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label={`About ${label}`}
              className="inline-flex size-5 items-center justify-center rounded-full text-muted-readable outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
            >
              <Info aria-hidden="true" className="size-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent className="max-w-72">{help}</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
  pattern,
  step,
  required = false,
  disabled = false,
  defaultValue,
  help,
  className,
}: Readonly<{
  label: string;
  name: string;
  type?: React.HTMLInputTypeAttribute;
  placeholder?: string;
  pattern?: string;
  step?: string;
  required?: boolean;
  disabled?: boolean;
  defaultValue?: string;
  help?: string;
  className?: string;
}>): React.ReactElement {
  const id = `direct-${name}`;
  return (
    <div
      className={
        className === undefined ? "grid gap-1.5" : `grid gap-1.5 ${className}`
      }
    >
      <FieldLabel
        htmlFor={id}
        label={label}
        required={required}
        {...(help === undefined ? {} : { help })}
      />
      <Input
        id={id}
        name={name}
        type={type}
        placeholder={placeholder ?? `Enter ${label.toLocaleLowerCase("en-US")}`}
        {...(pattern === undefined ? {} : { pattern })}
        {...(step === undefined ? {} : { step })}
        {...(defaultValue === undefined ? {} : { defaultValue })}
        required={required}
        disabled={disabled}
      />
    </div>
  );
}

export function DirectOnboardingWorkbench({
  filterOptions,
}: DirectOnboardingWorkbenchProps): React.ReactElement {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = React.useTransition();
  const setupFormRef = React.useRef<HTMLFormElement>(null);
  const [preflight, setPreflight] =
    React.useState<DirectOnboardingPreflightResult | null>(null);
  const [identity, setIdentity] = React.useState<IdentitySnapshot | null>(null);
  const [contactVerified, setContactVerified] = React.useState(false);
  const [setupStep, setSetupStep] = React.useState(0);
  const [onboardingIntentKey, setOnboardingIntentKey] = React.useState("");

  const parentOptions = React.useMemo(() => {
    const options = new Map<
      string,
      { orgUnitId: string; code: string; name: string }
    >();
    for (const option of filterOptions.ownerOrgUnits) {
      options.set(option.orgUnitId, option);
    }
    for (const option of filterOptions.marginTemplates) {
      options.set(option.orgUnitId, option);
    }
    return [...options.values()].sort((left, right) =>
      left.name.localeCompare(right.name),
    );
  }, [filterOptions]);

  const eligible = preflight?.outcome === "ELIGIBLE" && identity !== null;
  const workflowStep = eligible ? setupStep + 1 : 0;
  const preferredMarginTemplateId = filterOptions.marginTemplates.find(
    (item) => item.preferred,
  )?.orgUnitId;

  function reset(): void {
    setPreflight(null);
    setIdentity(null);
    setContactVerified(false);
    setSetupStep(0);
    setOnboardingIntentKey("");
  }

  function submitPreflight(event: React.SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const snapshot: IdentitySnapshot = {
      dealerName: read(data, "dealerName"),
      mobileE164: read(data, "mobileE164"),
      email: read(data, "email"),
      district: read(data, "district"),
      state: read(data, "state"),
    };

    startTransition(async () => {
      const result = await preflightDirectOnboardingAction(snapshot);
      if (!result.ok) {
        toast.error({
          title: "Existing records could not be checked",
          description: result.message,
        });
        return;
      }

      setIdentity(snapshot);
      setPreflight(result.data);
      setContactVerified(false);
      setSetupStep(0);
      setOnboardingIntentKey(
        result.data.outcome === "ELIGIBLE"
          ? `direct-onboard:${crypto.randomUUID()}`
          : "",
      );

      if (result.data.outcome === "ELIGIBLE") {
        toast.success({
          title: "Direct onboarding is available",
          description:
            "No active application or matching dealer was found for the checked identity.",
        });
      }
    });
  }

  function continueSetup(): void {
    const panel = setupFormRef.current?.querySelector<HTMLElement>(
      `[data-direct-step="${String(setupStep)}"]`,
    );
    const controls = panel?.querySelectorAll<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >("input, select, textarea");

    if (controls !== undefined) {
      for (const control of controls) {
        if (!control.checkValidity()) {
          control.reportValidity();
          return;
        }
      }
    }

    const formData =
      setupFormRef.current === null ? null : new FormData(setupFormRef.current);
    const requiredFieldsByStep: Readonly<Record<number, readonly string[]>> = {
      0: ["orgUnitType", "parentOrgUnitId"],
      1: ["loginDisplayName"],
      2: ["addressLine1", "city", "postalCode"],
      3: [],
    };
    const missingField = requiredFieldsByStep[setupStep]?.find(
      (fieldName) =>
        formData === null || read(formData, fieldName).length === 0,
    );

    if (missingField !== undefined) {
      toast.error({
        title: "Complete the required information",
        description:
          "Fill in every required field in this step before continuing.",
      });
      return;
    }

    if (setupStep === 1 && !contactVerified) {
      toast.error({
        title: "Verify the ERP administrator",
        description:
          "Confirm the administrator's email and mobile number before continuing.",
      });
      return;
    }

    setSetupStep((value) => Math.min(3, value + 1));
  }

  function submitOnboarding(event: React.SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (
      preflight?.outcome !== "ELIGIBLE" ||
      identity === null ||
      !contactVerified ||
      onboardingIntentKey.length < 16
    ) {
      return;
    }

    const data = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await directOnboardDealerAction({
        preflightToken: preflight.preflightToken,
        parentOrgUnitId: read(data, "parentOrgUnitId"),
        orgUnitType: read(data, "orgUnitType") as "DEALER" | "SUB_DEALER",
        dealerName: identity.dealerName,
        loginDisplayName: read(data, "loginDisplayName"),
        loginEmail: identity.email,
        loginPhoneE164: identity.mobileE164,
        roleName: "dealer_admin",
        marginSourceOrgUnitId: nullable(data, "marginSourceOrgUnitId"),
        addressLine1: read(data, "addressLine1"),
        addressLine2: nullable(data, "addressLine2"),
        city: read(data, "city"),
        district: identity.district,
        state: identity.state,
        postalCode: read(data, "postalCode"),
        latitude: nullableNumber(data, "latitude"),
        longitude: nullableNumber(data, "longitude"),
        idempotencyKey: onboardingIntentKey,
      });

      if (!result.ok) {
        toast.error({
          title: "Dealer could not be created",
          description: result.message,
        });
        return;
      }

      toast.success({
        title: "Dealer and ERP access created",
        description: `${result.data.dealerCode} was provisioned with ${String(result.data.activeMarginCount)} active margin rows.`,
      });
      router.push(dealerOperationDetailHref(result.data.dealerOrgUnitId));
      router.refresh();
    });
  }

  return (
    <ContentSection padded className="overflow-hidden">
      <div className="grid gap-6">
        {preflight === null ? null : (
          <div className="flex justify-end">
            <Button type="button" variant="outline" size="sm" onClick={reset}>
              <RotateCcw aria-hidden="true" className="size-4" />
              Start again
            </Button>
          </div>
        )}

        <WorkflowStepper
          steps={DIRECT_ONBOARDING_STEPS}
          currentStep={workflowStep}
          completedThrough={eligible ? workflowStep - 1 : -1}
          label="Direct onboarding progress"
        />

        {preflight === null ? (
          <form onSubmit={submitPreflight} className="grid gap-5">
            <Alert>
              <ShieldCheck aria-hidden="true" />
              <AlertTitle>
                First, check for an existing application or dealer
              </AlertTitle>
              <AlertDescription>
                This check prevents duplicate dealers. It does not create or
                change any record.
              </AlertDescription>
            </Alert>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Dealer or business name"
                name="dealerName"
                required
                disabled={pending}
                className="sm:col-span-2"
              />
              <Field
                label="Verified mobile number"
                name="mobileE164"
                type="tel"
                placeholder="+919876543210"
                pattern="\+91[6-9][0-9]{9}"
                required
                disabled={pending}
                help="Use the Indian E.164 format. This is matched against applications and ERP users."
              />
              <Field
                label="Verified email"
                name="email"
                type="email"
                required
                disabled={pending}
              />
              <Field
                label="District"
                name="district"
                required
                disabled={pending}
              />
              <Field label="State" name="state" required disabled={pending} />
            </div>

            <div className="flex justify-end border-t border-border/70 pt-4">
              <Button type="submit" disabled={pending}>
                {pending ? (
                  <Spinner aria-hidden="true" className="size-4" />
                ) : (
                  <SearchCheck aria-hidden="true" className="size-4" />
                )}
                {pending ? "Checking…" : "Check existing records"}
              </Button>
            </div>
          </form>
        ) : preflight.outcome === "APPLICATION_FOUND" ? (
          <Alert variant="warning">
            <ShieldAlert aria-hidden="true" />
            <AlertTitle>A dealership application already exists</AlertTitle>
            <AlertDescription className="grid gap-4">
              <span>
                Continue from the existing application so evaluation, documents,
                approvals, and audit history remain in one case.
              </span>
              <div>
                <Button variant="outline" asChild>
                  <Link href={applicationDetailHref(preflight.applicationId)}>
                    Open application {preflight.applicationNumber ?? ""}
                  </Link>
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        ) : preflight.outcome === "DEALER_FOUND" ? (
          <Alert variant="warning">
            <Building2 aria-hidden="true" />
            <AlertTitle>A matching dealer already exists</AlertTitle>
            <AlertDescription className="grid gap-4">
              <span>
                {preflight.dealerName} ({preflight.dealerCode}) should be
                maintained from its current dealer workspace. A duplicate dealer
                was not created.
              </span>
              <div>
                <Button variant="outline" asChild>
                  <Link
                    href={dealerOperationDetailHref(preflight.dealerOrgUnitId)}
                  >
                    Open existing dealer
                  </Link>
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        ) : identity === null ? (
          <ContentStatus
            variant="destructive"
            title="Eligibility response is incomplete"
            description="Start the eligibility check again. No dealer record was created."
          />
        ) : (
          <form
            ref={setupFormRef}
            onSubmit={submitOnboarding}
            className="grid gap-6"
          >
            <Alert>
              <CheckCircle2 aria-hidden="true" />
              <AlertTitle>Eligible for direct onboarding</AlertTitle>
              <AlertDescription>
                The approval token is bound to this user and checked identity
                and expires at{" "}
                {new Date(preflight.expiresAt).toLocaleString("en-IN")}.
              </AlertDescription>
            </Alert>

            <div
              data-direct-step="0"
              className={
                setupStep === 0 ? "grid gap-4 sm:grid-cols-2" : "hidden"
              }
            >
              <div className="grid gap-1.5">
                <FieldLabel
                  htmlFor="direct-org-type"
                  label="Organization type"
                  required
                  help="Choose Dealer for a primary partner or Sub-dealer when it belongs under an existing dealer."
                />
                <Select
                  name="orgUnitType"
                  defaultValue="DEALER"
                  disabled={pending}
                >
                  <SelectTrigger id="direct-org-type">
                    <SelectValue placeholder="Select organization type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DEALER">Dealer</SelectItem>
                    <SelectItem value="SUB_DEALER">Sub-dealer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <WorkflowSummaryItem
                label="Business name"
                value={identity.dealerName}
                icon={<Building2 aria-hidden="true" className="size-4" />}
              />

              <div className="grid gap-1.5 sm:col-span-2">
                <FieldLabel
                  htmlFor="direct-parent"
                  label="Parent organization"
                  required
                  help="The parent determines organization hierarchy and operational scope."
                />
                <Select name="parentOrgUnitId" required disabled={pending}>
                  <SelectTrigger id="direct-parent">
                    <SelectValue placeholder="Select authorized parent organization" />
                  </SelectTrigger>
                  <SelectContent>
                    {parentOptions.map((option) => (
                      <SelectItem
                        key={option.orgUnitId}
                        value={option.orgUnitId}
                      >
                        {option.name} · {option.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div
              data-direct-step="1"
              className={
                setupStep === 1 ? "grid gap-4 sm:grid-cols-2" : "hidden"
              }
            >
              <Field
                label="Dealer administrator name"
                name="loginDisplayName"
                required
                disabled={pending}
                className="sm:col-span-2"
              />
              <WorkflowSummaryItem
                label="Verified email"
                value={identity.email}
              />
              <WorkflowSummaryItem
                label="Verified mobile"
                value={identity.mobileE164}
              />
              <div className="flex items-start gap-3 rounded-2xl border border-border/70 bg-muted/25 p-4 sm:col-span-2">
                <Checkbox
                  id="direct-contact-verified"
                  checked={contactVerified}
                  onCheckedChange={(value) => {
                    setContactVerified(value === true);
                  }}
                />
                <Label
                  htmlFor="direct-contact-verified"
                  className="cursor-pointer leading-relaxed"
                >
                  I confirmed this person will administer the new ERP dealer
                  account and verified the email and mobile number directly with
                  them.
                </Label>
              </div>
            </div>

            <div
              data-direct-step="2"
              className={
                setupStep === 2 ? "grid gap-4 sm:grid-cols-2" : "hidden"
              }
            >
              <Field
                label="Address line 1"
                name="addressLine1"
                required
                disabled={pending}
                className="sm:col-span-2"
              />
              <Field
                label="Address line 2"
                name="addressLine2"
                disabled={pending}
                className="sm:col-span-2"
              />
              <Field label="City" name="city" required disabled={pending} />
              <Field
                label="Postal code"
                name="postalCode"
                pattern="[1-9][0-9]{5}"
                placeholder="600001"
                required
                disabled={pending}
              />
              <Field
                label="Latitude"
                name="latitude"
                type="number"
                step="any"
                disabled={pending}
              />
              <Field
                label="Longitude"
                name="longitude"
                type="number"
                step="any"
                disabled={pending}
              />

              <div className="grid gap-1.5 sm:col-span-2">
                <FieldLabel
                  htmlFor="direct-margin-source"
                  label="Margin template"
                  help="The backend copies active margins from this authorized template in the same transaction."
                />
                <Select
                  name="marginSourceOrgUnitId"
                  {...(preferredMarginTemplateId === undefined
                    ? {}
                    : { defaultValue: preferredMarginTemplateId })}
                  disabled={pending}
                >
                  <SelectTrigger id="direct-margin-source">
                    <SelectValue placeholder="Use configured default" />
                  </SelectTrigger>
                  <SelectContent>
                    {filterOptions.marginTemplates.map((option) => (
                      <SelectItem
                        key={option.orgUnitId}
                        value={option.orgUnitId}
                      >
                        {option.name} · {String(option.activeMarginCount)}{" "}
                        margins
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div
              data-direct-step="3"
              className={setupStep === 3 ? "grid gap-5" : "hidden"}
            >
              <Alert>
                <ShieldCheck aria-hidden="true" />
                <AlertTitle>One audited, all-or-nothing operation</AlertTitle>
                <AlertDescription>
                  The ERP creates a manual application case, location, dealer
                  organization, administrator identity, membership, role, and
                  active margins together. A failure rolls back the complete
                  operation.
                </AlertDescription>
              </Alert>
              <div className="grid gap-3 sm:grid-cols-2">
                <WorkflowSummaryItem
                  label="Dealer"
                  value={identity.dealerName}
                />
                <WorkflowSummaryItem
                  label="Administrator email"
                  value={identity.email}
                />
                <WorkflowSummaryItem
                  label="Location"
                  value={`${identity.district}, ${identity.state}`}
                  icon={<MapPin aria-hidden="true" className="size-4" />}
                />
                <WorkflowSummaryItem
                  label="ERP role"
                  value="Dealer administrator"
                  icon={<UserRoundPlus aria-hidden="true" className="size-4" />}
                />
              </div>
            </div>

            <div className="sticky bottom-0 z-10 -mx-6 -mb-6 flex flex-col-reverse gap-2 border-t border-border/70 bg-card/90 px-6 py-4 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
              <Button
                type="button"
                variant="ghost"
                onClick={reset}
                disabled={pending}
              >
                Cancel direct onboarding
              </Button>
              <div className="flex justify-end gap-2">
                {setupStep > 0 ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setSetupStep((value) => Math.max(0, value - 1));
                    }}
                    disabled={pending}
                  >
                    Back
                  </Button>
                ) : null}
                {setupStep < 3 ? (
                  <Button
                    type="button"
                    onClick={continueSetup}
                    disabled={pending}
                  >
                    Continue
                  </Button>
                ) : (
                  <Button type="submit" disabled={pending || !contactVerified}>
                    {pending ? (
                      <Spinner aria-hidden="true" className="size-4" />
                    ) : (
                      <UserRoundPlus aria-hidden="true" className="size-4" />
                    )}
                    {pending
                      ? "Creating dealer…"
                      : "Create dealer and ERP access"}
                  </Button>
                )}
              </div>
            </div>
          </form>
        )}
      </div>
    </ContentSection>
  );
}

function read(data: FormData, key: string): string {
  const value = data.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function nullable(data: FormData, key: string): string | null {
  const value = read(data, key);
  return value.length === 0 ? null : value;
}

function nullableNumber(data: FormData, key: string): number | null {
  const value = read(data, key);
  if (value.length === 0) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
