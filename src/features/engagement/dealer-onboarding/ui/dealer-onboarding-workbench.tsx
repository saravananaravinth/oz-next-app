// oz-next-app/src/features/engagement/dealer-onboarding/ui/dealer-onboarding-workbench.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  LocateFixed,
  SearchCheck,
  ShieldCheck,
  Sparkles,
  UserPlus,
} from "lucide-react";

import {
  WorkflowStepper,
  WorkflowSummaryItem,
  type WorkflowStep,
} from "@/components/common/operation-workflow";
import {
  ContentDataSurface,
  ContentRoot,
  ContentSection,
  ContentStatus,
} from "@/components/common/content-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
  loadDealerOnboardingOptionsAction,
  lookupDealerOnboardingGstinAction,
  preflightDealerOnboardingAction,
  provisionDealerOnboardingAction,
} from "@/features/engagement/dealer-onboarding/actions/dealer-onboarding.actions";
import {
  DEALER_GST_TREATMENTS,
  DEALER_ONBOARDING_LANGUAGES,
  DEALER_TAX_PREFERENCES,
  dealerOnboardingProvisionBodySchema,
  type DealerOnboardingOptions,
  type DealerOnboardingPreflightResult,
  type DealerOnboardingProvisionResult,
  type DealerOnboardingType,
  type DealerPreflightApplication,
} from "@/features/engagement/dealer-onboarding/contracts/dealer-onboarding.schema";
import type { ResolvedDealerAdministrationAccess } from "@/features/engagement/dealer-onboarding/policies/dealer-onboarding.policy";
import {
  isPreflightExpired,
  preflightRemainingMs,
} from "@/features/engagement/dealer-onboarding/ui/dealer-onboarding-preflight-expiry";
import { DealerWorkspaceHeader } from "@/features/engagement/dealer-onboarding/ui/dealer-workspace-header";
import {
  DEALER_ADMINISTRATION_ROUTE,
  dealerDetailHref,
} from "@/features/engagement/dealer-onboarding/utils/dealer-onboarding-url";

const WORKFLOW_STEPS = [
  {
    id: "preflight",
    label: "Check records",
    description: "Prevent duplicates",
  },
  { id: "dealer", label: "Dealer", description: "Identity & contact" },
  { id: "tax", label: "Tax", description: "GST & legal profile" },
  { id: "locations", label: "Addresses", description: "Operating & delivery" },
  { id: "review", label: "Review", description: "Validate & provision" },
] as const satisfies readonly WorkflowStep[];

const EMPTY_OPTIONS: DealerOnboardingOptions = {
  parents: [],
  states: [],
  districts: [],
  currencies: [],
  priceBooks: [],
  marginTemplates: [],
};

const PINCODE_PATTERN = /^[1-9][0-9]{5}$/u;
const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/u;
const PAN_PATTERN = /^[A-Z]{5}[0-9]{4}[A-Z]$/u;
const UIN_PATTERN = /^[A-Z0-9]{15}$/u;

type Notice = Readonly<{
  kind: "error" | "success" | "info";
  message: string;
}> | null;

type PreflightInput = Readonly<{
  businessName: string;
  email: string;
  phone: string;
  gstin: string;
  uin: string;
  pan: string;
}>;

type Draft = Readonly<{
  dealerType: DealerOnboardingType;
  parentOrgUnitId: string;
  companyName: string;
  displayName: string;
  contactName: string;
  email: string;
  phone: string;
  preferredLanguage: "en" | "ta" | "hi";
  emailChannel: boolean;
  whatsappChannel: boolean;
  legalName: string;
  tradeName: string;
  gstTreatment:
    "REGISTERED" | "COMPOSITION" | "UNREGISTERED" | "SEZ" | "OVERSEAS";
  gstin: string;
  uin: string;
  pan: string;
  placeOfSupplyStateId: string;
  taxPreference: "TAXABLE" | "EXEMPT" | "NON_GST";
  currency: string;
  operatingAddressLine1: string;
  operatingAddressLine2: string;
  operatingCity: string;
  operatingStateId: string;
  operatingDistrictId: string;
  operatingPostalCode: string;
  latitude: string;
  longitude: string;
  billingSameAsOperating: boolean;
  billingAddressLine1: string;
  billingAddressLine2: string;
  billingCity: string;
  billingStateId: string;
  billingDistrictId: string;
  billingPostalCode: string;
  shippingSameAsBilling: boolean;
  shippingAddressLine1: string;
  shippingAddressLine2: string;
  shippingCity: string;
  shippingStateId: string;
  shippingDistrictId: string;
  shippingPostalCode: string;
}>;

const EMPTY_PREFLIGHT: PreflightInput = {
  businessName: "",
  email: "",
  phone: "",
  gstin: "",
  uin: "",
  pan: "",
};

const EMPTY_DRAFT: Draft = {
  dealerType: "DEALER",
  parentOrgUnitId: "",
  companyName: "",
  displayName: "",
  contactName: "",
  email: "",
  phone: "",
  preferredLanguage: "en",
  emailChannel: true,
  whatsappChannel: true,
  legalName: "",
  tradeName: "",
  gstTreatment: "REGISTERED",
  gstin: "",
  uin: "",
  pan: "",
  placeOfSupplyStateId: "",
  taxPreference: "TAXABLE",
  currency: "INR",
  operatingAddressLine1: "",
  operatingAddressLine2: "",
  operatingCity: "",
  operatingStateId: "",
  operatingDistrictId: "",
  operatingPostalCode: "",
  latitude: "",
  longitude: "",
  billingSameAsOperating: true,
  billingAddressLine1: "",
  billingAddressLine2: "",
  billingCity: "",
  billingStateId: "",
  billingDistrictId: "",
  billingPostalCode: "",
  shippingSameAsBilling: true,
  shippingAddressLine1: "",
  shippingAddressLine2: "",
  shippingCity: "",
  shippingStateId: "",
  shippingDistrictId: "",
  shippingPostalCode: "",
};

type BrowserGeolocation = Readonly<{
  getCurrentPosition: (
    successCallback: PositionCallback,
    errorCallback?: PositionErrorCallback | null,
    options?: PositionOptions,
  ) => void;
}>;

function isBrowserGeolocation(value: unknown): value is BrowserGeolocation {
  return (
    typeof value === "object" &&
    value !== null &&
    "getCurrentPosition" in value &&
    typeof value.getCurrentPosition === "function"
  );
}

function requestBrowserCurrentPosition(
  successCallback: PositionCallback,
  errorCallback: PositionErrorCallback,
  options: PositionOptions,
): boolean {
  const geolocation: unknown = Reflect.get(navigator, "geolocation");

  if (!isBrowserGeolocation(geolocation)) {
    return false;
  }

  geolocation.getCurrentPosition(successCallback, errorCallback, options);
  return true;
}

export function DealerOnboardingWorkbench({
  access,
}: Readonly<{
  access: ResolvedDealerAdministrationAccess;
}>): React.ReactElement {
  const [currentStep, setCurrentStep] = React.useState(0);
  const [preflightInput, setPreflightInput] =
    React.useState<PreflightInput>(EMPTY_PREFLIGHT);
  const [preflight, setPreflight] =
    React.useState<DealerOnboardingPreflightResult | null>(null);
  const [draft, setDraft] = React.useState<Draft>(EMPTY_DRAFT);
  const [options, setOptions] =
    React.useState<DealerOnboardingOptions>(EMPTY_OPTIONS);
  const [notice, setNotice] = React.useState<Notice>(null);
  const [provisioned, setProvisioned] =
    React.useState<DealerOnboardingProvisionResult | null>(null);
  const [preflightBusy, setPreflightBusy] = React.useState(false);
  const [optionsBusy, setOptionsBusy] = React.useState(false);
  const [gstinBusy, setGstinBusy] = React.useState(false);
  const [provisionBusy, setProvisionBusy] = React.useState(false);
  const [geoBusy, setGeoBusy] = React.useState(false);
  const idempotencyKeyRef = React.useRef(createIdempotencyKey());
  const optionsRequestRef = React.useRef(0);

  React.useEffect(() => {
    if (
      preflight?.preflightToken === undefined ||
      preflight.preflightToken === null ||
      preflight.expiresAt === null
    )
      return;
    const remainingMs = preflightRemainingMs(preflight);
    const expirePreflight = (): void => {
      setPreflight(null);
      setCurrentStep(0);
      setNotice({
        kind: "error",
        message:
          "Identity preflight expired. Run the existing-record check again.",
      });
    };
    if (remainingMs === null || remainingMs <= 0) {
      expirePreflight();
      return;
    }
    const timeout = window.setTimeout(expirePreflight, remainingMs);
    return () => {
      window.clearTimeout(timeout);
    };
  }, [preflight]);

  const updateDraft = React.useCallback(
    <K extends keyof Draft>(key: K, value: Draft[K]): void => {
      setDraft((current) => ({ ...current, [key]: value }));
    },
    [],
  );

  const updatePreflight = React.useCallback(
    <K extends keyof PreflightInput>(
      key: K,
      value: PreflightInput[K],
    ): void => {
      setPreflightInput((current) => ({ ...current, [key]: value }));
    },
    [],
  );

  const loadOptions = React.useCallback(
    async (
      input: Readonly<{
        dealerType: DealerOnboardingType;
        stateId?: string;
        currency: string;
      }>,
    ): Promise<void> => {
      const requestId = optionsRequestRef.current + 1;
      optionsRequestRef.current = requestId;
      setOptionsBusy(true);
      const result = await loadDealerOnboardingOptionsAction({
        dealerType: input.dealerType,
        ...(input.stateId === undefined || input.stateId === ""
          ? {}
          : { stateId: input.stateId }),
        currency: input.currency,
      });
      if (optionsRequestRef.current !== requestId) return;
      setOptionsBusy(false);
      if (!result.ok) {
        setNotice({ kind: "error", message: result.message });
        return;
      }
      setOptions(result.data);
    },
    [],
  );

  React.useEffect(() => {
    if (
      preflight?.preflightToken === null ||
      preflight?.preflightToken === undefined
    )
      return;

    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;

      void loadOptions({
        dealerType: draft.dealerType,
        ...(draft.operatingStateId === ""
          ? {}
          : { stateId: draft.operatingStateId }),
        currency: draft.currency,
      });
    });

    return () => {
      cancelled = true;
    };
  }, [
    draft.currency,
    draft.dealerType,
    draft.operatingStateId,
    loadOptions,
    preflight?.preflightToken,
  ]);

  const runPreflight = React.useCallback(
    async (application?: DealerPreflightApplication): Promise<void> => {
      setPreflightBusy(true);
      setNotice(null);
      const origin = application === undefined ? "DIRECT" : "APPLICATION";
      const result = await preflightDealerOnboardingAction({
        origin,
        ...(application === undefined
          ? {}
          : { applicationId: application.applicationId }),
        businessName: preflightInput.businessName,
        phone: preflightInput.phone,
        email: preflightInput.email,
        ...(preflightInput.gstin.trim() === ""
          ? {}
          : { gstin: preflightInput.gstin.trim().toUpperCase() }),
        ...(preflightInput.uin.trim() === ""
          ? {}
          : { uin: preflightInput.uin.trim().toUpperCase() }),
        ...(preflightInput.pan.trim() === ""
          ? {}
          : { pan: preflightInput.pan.trim().toUpperCase() }),
      });
      setPreflightBusy(false);

      if (!result.ok) {
        setNotice({ kind: "error", message: result.message });
        return;
      }

      setPreflight(result.data);

      if (result.data.preflightToken !== null) {
        setDraft((current) => ({
          ...current,
          companyName: preflightInput.businessName,
          displayName: preflightInput.businessName,
          legalName: preflightInput.businessName,
          email: preflightInput.email,
          phone: preflightInput.phone,
          gstin: preflightInput.gstin.toUpperCase(),
          uin: preflightInput.uin.toUpperCase(),
          pan: preflightInput.pan.toUpperCase(),
        }));
        setCurrentStep(1);
        setNotice({
          kind: "success",
          message:
            result.data.outcome === "APPLICATION_FOUND"
              ? "Existing dealership application verified. Onboarding will preserve application provenance."
              : result.data.outcome === "LEGAL_ENTITY_FOUND"
                ? "Existing legal entity verified. Final provisioning will link this outlet to that legal identity."
                : "Identity preflight passed. No duplicate dealer blocks provisioning.",
        });
      }
    },
    [preflightInput],
  );

  const lookupGstin = React.useCallback(async (): Promise<void> => {
    const gstin = draft.gstin.trim().toUpperCase();
    if (!GSTIN_PATTERN.test(gstin)) {
      setNotice({
        kind: "error",
        message:
          "Enter a valid 15-character GSTIN before using GST portal prefill.",
      });
      return;
    }

    setGstinBusy(true);
    setNotice(null);
    const result = await lookupDealerOnboardingGstinAction({ gstin });
    setGstinBusy(false);

    if (!result.ok) {
      setNotice({ kind: "error", message: result.message });
      return;
    }

    const prefill = result.data;
    setDraft((current) => {
      const next = {
        ...current,
        legalName: prefill.legalName,
        tradeName: prefill.tradeName ?? current.tradeName,
        companyName:
          current.companyName.trim() === ""
            ? (prefill.tradeName ?? prefill.legalName)
            : current.companyName,
        displayName:
          current.displayName.trim() === ""
            ? (prefill.tradeName ?? prefill.legalName)
            : current.displayName,
        pan: prefill.pan ?? current.pan,
        placeOfSupplyStateId: prefill.stateId ?? current.placeOfSupplyStateId,
        operatingStateId: prefill.stateId ?? current.operatingStateId,
      };

      if (prefill.registeredAddress === null) return next;
      return {
        ...next,
        operatingAddressLine1: prefill.registeredAddress.addressLine1,
        operatingAddressLine2: prefill.registeredAddress.addressLine2 ?? "",
        operatingCity: prefill.registeredAddress.city,
        operatingPostalCode: prefill.registeredAddress.postalCode,
        latitude:
          prefill.registeredAddress.latitude === null
            ? current.latitude
            : String(prefill.registeredAddress.latitude),
        longitude:
          prefill.registeredAddress.longitude === null
            ? current.longitude
            : String(prefill.registeredAddress.longitude),
      };
    });
    setNotice({
      kind: "success",
      message: `GST portal prefill completed (${prefill.status.toLocaleLowerCase("en-US")}). Review all fields before provisioning.`,
    });
  }, [draft.gstin]);

  const captureLocation = React.useCallback((): void => {
    setGeoBusy(true);

    const requested = requestBrowserCurrentPosition(
      (position) => {
        setGeoBusy(false);
        setDraft((current) => ({
          ...current,
          latitude: String(position.coords.latitude),
          longitude: String(position.coords.longitude),
        }));
      },
      () => {
        setGeoBusy(false);
        setNotice({
          kind: "error",
          message:
            "Location permission was unavailable. Enter latitude and longitude manually.",
        });
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 12_000 },
    );

    if (!requested) {
      setGeoBusy(false);
      setNotice({
        kind: "error",
        message: "Location services are not available in this browser.",
      });
    }
  }, []);

  const nextStep = React.useCallback((): void => {
    const error = validateStep(currentStep, draft, preflight);
    if (error !== null) {
      setNotice({ kind: "error", message: error });
      return;
    }
    setNotice(null);
    setCurrentStep((current) =>
      Math.min(current + 1, WORKFLOW_STEPS.length - 1),
    );
  }, [currentStep, draft, preflight]);

  const provision = React.useCallback(async (): Promise<void> => {
    if (
      preflight?.preflightToken === null ||
      preflight?.preflightToken === undefined
    ) {
      setNotice({
        kind: "error",
        message: "Run identity preflight again before provisioning.",
      });
      return;
    }
    if (isPreflightExpired(preflight)) {
      setPreflight(null);
      setCurrentStep(0);
      setNotice({
        kind: "error",
        message:
          "Identity preflight expired. Run the existing-record check again.",
      });
      return;
    }

    const body = buildProvisionBody(draft, preflight);
    const parsed = dealerOnboardingProvisionBodySchema.safeParse(body);
    if (!parsed.success) {
      setNotice({
        kind: "error",
        message:
          parsed.error.issues[0]?.message ??
          "Review the onboarding fields before provisioning.",
      });
      return;
    }

    setProvisionBusy(true);
    setNotice(null);
    const result = await provisionDealerOnboardingAction({
      body: parsed.data,
      idempotencyKey: idempotencyKeyRef.current,
    });
    setProvisionBusy(false);

    if (!result.ok) {
      if (result.requiresPreflightRestart === true) {
        setPreflight(null);
        setCurrentStep(0);
      }
      setNotice({ kind: "error", message: result.message });
      return;
    }

    setProvisioned(result.data);
    setNotice({ kind: "success", message: "Dealer provisioned successfully." });
  }, [draft, preflight]);

  if (provisioned !== null) {
    return <ProvisionedState result={provisioned} />;
  }

  const canGoBack = currentStep > 1;

  return (
    <ContentRoot
      width="full"
      density="comfortable"
      aria-labelledby="dealer-onboarding-title"
      className="min-h-[calc(100dvh-8rem)]"
    >
      <DealerWorkspaceHeader
        titleId="dealer-onboarding-title"
        title="Onboard Dealer"
        description="Duplicate-safe dealer and sub-dealer provisioning with verified tax identity and auditable organization setup."
        icon={<UserPlus aria-hidden="true" className="size-4" />}
        backHref={DEALER_ADMINISTRATION_ROUTE}
        backLabel="Back to dealer directory"
        meta={
          <div className="flex shrink-0 items-center gap-2">
            <Badge variant="info" className="h-8">
              Enterprise onboarding
            </Badge>
            <Badge variant="outline" className="h-8 text-tabular">
              Step {(currentStep + 1).toLocaleString("en-IN")} of{" "}
              {WORKFLOW_STEPS.length.toLocaleString("en-IN")}
            </Badge>
          </div>
        }
      />

      <Alert variant="info">
        <Sparkles aria-hidden="true" />
        <AlertTitle>GST Portal Prefill</AlertTitle>
        <AlertDescription>
          Use a valid GSTIN to prefill verified legal and tax details. All
          returned data remains subject to the onboarding validation contract
          before provisioning.
        </AlertDescription>
      </Alert>

      {notice !== null ? (
        <Alert
          variant={
            notice.kind === "error"
              ? "destructive"
              : notice.kind === "info"
                ? "info"
                : "default"
          }
        >
          {notice.kind === "error" ? (
            <CircleAlert aria-hidden="true" />
          ) : (
            <ShieldCheck aria-hidden="true" />
          )}
          <AlertTitle>
            {notice.kind === "error"
              ? "Onboarding needs attention"
              : "Onboarding update"}
          </AlertTitle>
          <AlertDescription>{notice.message}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid min-h-0 gap-5 xl:grid-cols-[minmax(15rem,19rem)_minmax(0,1fr)]">
        <aside className="xl:sticky xl:top-4 xl:self-start">
          <ContentSection
            title="Onboarding progress"
            description="Complete each validated stage before dealer provisioning."
            padded
          >
            <WorkflowStepper steps={WORKFLOW_STEPS} currentStep={currentStep} />
          </ContentSection>
        </aside>

        <ContentDataSurface
          title={WORKFLOW_STEPS[currentStep]?.label ?? "Dealer onboarding"}
          description={WORKFLOW_STEPS[currentStep]?.description}
          padded
          className="min-w-0"
        >
          {currentStep === 0 ? (
            <PreflightStep
              input={preflightInput}
              result={preflight}
              busy={preflightBusy}
              update={updatePreflight}
              onRun={() => void runPreflight()}
              onContinueApplication={(application) =>
                void runPreflight(application)
              }
            />
          ) : null}

          {currentStep === 1 ? (
            <DealerStep
              draft={draft}
              options={options}
              optionsBusy={optionsBusy}
              update={updateDraft}
            />
          ) : null}

          {currentStep === 2 ? (
            <TaxStep
              draft={draft}
              options={options}
              gstinBusy={gstinBusy}
              update={updateDraft}
              onGstinPrefill={() => void lookupGstin()}
            />
          ) : null}

          {currentStep === 3 ? (
            <LocationsStep
              draft={draft}
              options={options}
              geoBusy={geoBusy}
              update={updateDraft}
              onCaptureLocation={captureLocation}
            />
          ) : null}

          {currentStep === 4 ? (
            <ReviewStep draft={draft} preflight={preflight} />
          ) : null}
        </ContentDataSurface>
      </div>

      {currentStep > 0 ? (
        <div className="sticky bottom-3 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/80 bg-background/95 p-3 shadow-lg shadow-foreground/5 supports-[backdrop-filter]:backdrop-blur-md">
          <Button
            type="button"
            variant="outline"
            disabled={!canGoBack || provisionBusy}
            onClick={() => {
              setCurrentStep((current) => Math.max(1, current - 1));
            }}
          >
            <ChevronLeft aria-hidden="true" />
            Back
          </Button>
          {currentStep < WORKFLOW_STEPS.length - 1 ? (
            <Button type="button" onClick={nextStep} disabled={optionsBusy}>
              Continue
              <ChevronRight aria-hidden="true" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => void provision()}
              disabled={!access.capabilities.canProvision || provisionBusy}
            >
              {provisionBusy ? (
                <Spinner aria-hidden="true" />
              ) : (
                <CheckCircle2 aria-hidden="true" />
              )}
              {provisionBusy ? "Provisioning…" : "Create Dealer"}
            </Button>
          )}
        </div>
      ) : null}
    </ContentRoot>
  );
}

function PreflightStep({
  input,
  result,
  busy,
  update,
  onRun,
  onContinueApplication,
}: Readonly<{
  input: PreflightInput;
  result: DealerOnboardingPreflightResult | null;
  busy: boolean;
  update: <K extends keyof PreflightInput>(
    key: K,
    value: PreflightInput[K],
  ) => void;
  onRun: () => void;
  onContinueApplication: (application: DealerPreflightApplication) => void;
}>): React.ReactElement {
  return (
    <div>
      <p className="mb-5 max-w-4xl text-body-sm text-muted-readable">
        Identity preflight is mandatory. It prevents duplicate dealers and
        preserves dealership-application provenance when a matching application
        already exists.
      </p>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <TextField
          label="Company / Business Name"
          value={input.businessName}
          onChange={(value) => {
            update("businessName", value);
          }}
          placeholder="Business name"
        />
        <TextField
          label="Primary Email"
          type="email"
          value={input.email}
          onChange={(value) => {
            update("email", value);
          }}
          placeholder="name@example.com"
        />
        <TextField
          label="Primary Phone"
          type="tel"
          value={input.phone}
          onChange={(value) => {
            update("phone", value);
          }}
          placeholder="+919876543210"
        />
        <TextField
          label="GSTIN"
          value={input.gstin}
          onChange={(value) => {
            update("gstin", value.toUpperCase());
          }}
          placeholder="Optional GSTIN"
          maxLength={15}
        />
        <TextField
          label="UIN"
          value={input.uin}
          onChange={(value) => {
            update("uin", value.toUpperCase());
          }}
          placeholder="Optional UIN"
          maxLength={15}
        />
        <TextField
          label="PAN"
          value={input.pan}
          onChange={(value) => {
            update("pan", value.toUpperCase());
          }}
          placeholder="Optional PAN"
          maxLength={10}
        />
      </div>
      <div className="mt-5 flex justify-end">
        <Button type="button" onClick={onRun} disabled={busy}>
          {busy ? (
            <Spinner aria-hidden="true" />
          ) : (
            <SearchCheck aria-hidden="true" />
          )}
          {busy ? "Checking…" : "Check Existing Records"}
        </Button>
      </div>

      {result === null ? null : (
        <div className="mt-5">
          <PreflightResult
            result={result}
            onContinueApplication={onContinueApplication}
            busy={busy}
          />
        </div>
      )}
    </div>
  );
}

function PreflightResult({
  result,
  onContinueApplication,
  busy,
}: Readonly<{
  result: DealerOnboardingPreflightResult;
  onContinueApplication: (application: DealerPreflightApplication) => void;
  busy: boolean;
}>): React.ReactElement {
  if (result.outcome === "EXISTING_DEALER" && result.dealer !== null) {
    return (
      <ContentStatus
        variant="warning"
        title="Existing dealer found"
        description="Creation is blocked because the backend matched an existing dealer/sub-dealer."
        actions={
          <Button asChild>
            <Link href={dealerDetailHref(result.dealer.dealerOrgUnitId)}>
              Open Existing Dealer
            </Link>
          </Button>
        }
      />
    );
  }

  if (
    result.outcome === "APPLICATION_FOUND" &&
    result.preflightToken === null
  ) {
    if (result.nextAction === "WAIT_FOR_APPLICATION_APPROVAL") {
      return (
        <ContentStatus
          variant="warning"
          title="Application approval required"
          description={
            result.warnings[0] ??
            "This application must be approved before onboarding can continue."
          }
        />
      );
    }
    return (
      <ContentSection
        title="Existing dealership application found"
        description="Select the matching application to continue with application provenance instead of creating a direct-origin dealer."
      >
        <div className="grid gap-3">
          {result.applications.map((application) => (
            <div
              key={application.applicationId}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 p-3"
            >
              <div>
                <div className="font-medium">
                  {application.applicationNo ?? application.applicationId}
                </div>
                <div className="text-caption text-muted-readable">
                  {formatEnum(application.phase)} ·{" "}
                  {formatEnum(application.status)}
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                disabled={
                  busy ||
                  application.status !== "APPROVED" ||
                  application.approvedAt === null
                }
                onClick={() => {
                  onContinueApplication(application);
                }}
              >
                {application.status === "APPROVED" &&
                application.approvedAt !== null
                  ? "Continue Application"
                  : "Awaiting Approval"}
              </Button>
            </div>
          ))}
        </div>
      </ContentSection>
    );
  }

  if (result.outcome === "AMBIGUOUS") {
    return (
      <ContentStatus
        variant="destructive"
        title="Administrator resolution required"
        description={
          result.warnings[0] ??
          "Conflicting dealer identity evidence prevents safe provisioning."
        }
      />
    );
  }

  if (result.preflightToken !== null) {
    return (
      <ContentStatus
        variant="success"
        title="Preflight passed"
        description={
          result.outcome === "LEGAL_ENTITY_FOUND"
            ? "A matching legal entity was found and will be linked explicitly during provisioning."
            : "No duplicate dealer blocks onboarding."
        }
      />
    );
  }

  return (
    <ContentStatus
      variant="warning"
      title="Preflight is not ready"
      description={
        result.warnings[0] ?? "Review the matched records before continuing."
      }
    />
  );
}

function DealerStep({
  draft,
  options,
  optionsBusy,
  update,
}: Readonly<{
  draft: Draft;
  options: DealerOnboardingOptions;
  optionsBusy: boolean;
  update: <K extends keyof Draft>(key: K, value: Draft[K]) => void;
}>): React.ReactElement {
  return (
    <ContentDataSurface
      title="Dealer identity"
      description="Define the dealer organization and primary ERP identity. Dealer Code and DIC are generated by the backend and are never manually entered."
      padded
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <SelectField
          label="Dealer Type"
          value={draft.dealerType}
          onValueChange={(value) => {
            if (value === "DEALER" || value === "SUB_DEALER") {
              update("dealerType", value);
              if (value === "DEALER") update("parentOrgUnitId", "");
            }
          }}
          placeholder="Select dealer type"
          options={[
            { value: "DEALER", label: "Dealer" },
            { value: "SUB_DEALER", label: "Sub-Dealer" },
          ]}
        />
        {draft.dealerType === "SUB_DEALER" ? (
          <SelectField
            label="Parent Dealer"
            value={draft.parentOrgUnitId}
            onValueChange={(value) => {
              update("parentOrgUnitId", value);
            }}
            placeholder={
              optionsBusy ? "Loading dealers…" : "Select parent dealer"
            }
            options={options.parents.map((parent) => ({
              value: parent.orgUnitId,
              label: `${parent.code} · ${parent.name}`,
            }))}
          />
        ) : null}
        <TextField
          label="Company Name"
          value={draft.companyName}
          onChange={(value) => {
            update("companyName", value);
          }}
          placeholder="Registered company name"
        />
        <TextField
          label="Display Name"
          value={draft.displayName}
          onChange={(value) => {
            update("displayName", value);
          }}
          placeholder="ERP display name"
        />
        <TextField
          label="Primary Contact"
          value={draft.contactName}
          onChange={(value) => {
            update("contactName", value);
          }}
          placeholder="Primary contact person"
        />
        <TextField
          label="Email Address"
          type="email"
          value={draft.email}
          onChange={(value) => {
            update("email", value);
          }}
          placeholder="name@example.com"
        />
        <TextField
          label="Phone"
          type="tel"
          value={draft.phone}
          onChange={(value) => {
            update("phone", value);
          }}
          placeholder="+919876543210"
        />
        <SelectField
          label="Customer Language"
          value={draft.preferredLanguage}
          onValueChange={(value) => {
            const parsed = DEALER_ONBOARDING_LANGUAGES.find(
              (candidate) => candidate === value,
            );
            if (parsed !== undefined) update("preferredLanguage", parsed);
          }}
          placeholder="Select language"
          options={[
            { value: "en", label: "English" },
            { value: "ta", label: "Tamil" },
            { value: "hi", label: "Hindi" },
          ]}
        />
        <div className="space-y-2">
          <Label>Communication Channels</Label>
          <div className="flex min-h-11 items-center gap-4 rounded-2xl border border-input px-3">
            <CheckField
              label="Email"
              checked={draft.emailChannel}
              onCheckedChange={(value) => {
                update("emailChannel", value);
              }}
            />
            <CheckField
              label="WhatsApp"
              checked={draft.whatsappChannel}
              onCheckedChange={(value) => {
                update("whatsappChannel", value);
              }}
            />
          </div>
        </div>
      </div>
      <div className="mt-5 rounded-2xl border border-info/25 bg-info/5 p-3 text-body-sm">
        Dealer Code and DIC are generated during the provisioning transaction
        and remain immutable after creation.
      </div>
    </ContentDataSurface>
  );
}

function TaxStep({
  draft,
  options,
  gstinBusy,
  update,
  onGstinPrefill,
}: Readonly<{
  draft: Draft;
  options: DealerOnboardingOptions;
  gstinBusy: boolean;
  update: <K extends keyof Draft>(key: K, value: Draft[K]) => void;
  onGstinPrefill: () => void;
}>): React.ReactElement {
  return (
    <ContentDataSurface
      title="Legal & tax identity"
      description="Verify tax identity and place of supply. Dealer pricing is automatically derived from commercial price books by dealer type; no per-dealer price list or margin configuration is required."
      padded
    >
      <div className="mb-5 flex flex-wrap items-end gap-3 rounded-2xl border border-info/25 bg-info/5 p-4">
        <div className="min-w-64 flex-1">
          <TextField
            label="GSTIN"
            value={draft.gstin}
            onChange={(value) => {
              update("gstin", value.toUpperCase());
            }}
            placeholder="Enter GSTIN for portal prefill"
            maxLength={15}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={onGstinPrefill}
          disabled={gstinBusy}
        >
          {gstinBusy ? (
            <Spinner aria-hidden="true" />
          ) : (
            <Sparkles aria-hidden="true" />
          )}
          {gstinBusy ? "Prefilling…" : "Prefill from GST Portal"}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <SelectField
          label="GST Treatment"
          value={draft.gstTreatment}
          onValueChange={(value) => {
            const parsed = DEALER_GST_TREATMENTS.find(
              (candidate) => candidate === value,
            );
            if (parsed !== undefined) update("gstTreatment", parsed);
          }}
          placeholder="Select GST treatment"
          options={DEALER_GST_TREATMENTS.map((value) => ({
            value,
            label: formatEnum(value),
          }))}
        />
        <TextField
          label="Legal Name"
          value={draft.legalName}
          onChange={(value) => {
            update("legalName", value);
          }}
          placeholder="Legal business name"
        />
        <TextField
          label="Trade Name"
          value={draft.tradeName}
          onChange={(value) => {
            update("tradeName", value);
          }}
          placeholder="Trade name, if any"
        />
        <TextField
          label="UIN"
          value={draft.uin}
          onChange={(value) => {
            update("uin", value.toUpperCase());
          }}
          placeholder="Optional UIN"
          maxLength={15}
        />
        <TextField
          label="PAN"
          value={draft.pan}
          onChange={(value) => {
            update("pan", value.toUpperCase());
          }}
          placeholder="PAN"
          maxLength={10}
        />
        <SelectField
          label="Place of Supply"
          value={draft.placeOfSupplyStateId}
          onValueChange={(value) => {
            update("placeOfSupplyStateId", value);
            if (draft.operatingStateId === "")
              update("operatingStateId", value);
          }}
          placeholder="Select state"
          options={options.states.map((state) => ({
            value: state.stateId,
            label: state.name,
          }))}
        />
        <SelectField
          label="Tax Preference"
          value={draft.taxPreference}
          onValueChange={(value) => {
            const parsed = DEALER_TAX_PREFERENCES.find(
              (candidate) => candidate === value,
            );
            if (parsed !== undefined) update("taxPreference", parsed);
          }}
          placeholder="Select tax preference"
          options={DEALER_TAX_PREFERENCES.map((value) => ({
            value,
            label: formatEnum(value),
          }))}
        />
        <SelectField
          label="Currency"
          value={draft.currency}
          onValueChange={(value) => {
            update("currency", value);
          }}
          placeholder="Select currency"
          options={(options.currencies.length === 0
            ? [{ code: "INR", name: "Indian Rupee", symbol: "₹" }]
            : options.currencies
          ).map((currency) => ({
            value: currency.code,
            label: `${currency.code} · ${currency.name}`,
          }))}
        />
      </div>
    </ContentDataSurface>
  );
}

function LocationsStep({
  draft,
  options,
  geoBusy,
  update,
  onCaptureLocation,
}: Readonly<{
  draft: Draft;
  options: DealerOnboardingOptions;
  geoBusy: boolean;
  update: <K extends keyof Draft>(key: K, value: Draft[K]) => void;
  onCaptureLocation: () => void;
}>): React.ReactElement {
  const operatingDistricts = options.districts.filter(
    (district) => district.stateId === draft.operatingStateId,
  );
  const billingDistricts = options.districts.filter(
    (district) => district.stateId === draft.billingStateId,
  );
  const shippingDistricts = options.districts.filter(
    (district) => district.stateId === draft.shippingStateId,
  );

  return (
    <div className="space-y-5">
      <ContentDataSurface
        title="Operating location"
        description="Capture the physical operating location used for organization hierarchy, routing, and regional policy."
        padded
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <AddressFields
            prefix="operating"
            draft={draft}
            states={options.states}
            districts={operatingDistricts}
            update={update}
          />
          <TextField
            label="Latitude"
            value={draft.latitude}
            onChange={(value) => {
              update("latitude", value);
            }}
            placeholder="11.0168"
            inputMode="decimal"
          />
          <TextField
            label="Longitude"
            value={draft.longitude}
            onChange={(value) => {
              update("longitude", value);
            }}
            placeholder="76.9558"
            inputMode="decimal"
          />
          <div className="flex items-end">
            <Button
              type="button"
              variant="outline"
              onClick={onCaptureLocation}
              disabled={geoBusy}
            >
              {geoBusy ? (
                <Spinner aria-hidden="true" />
              ) : (
                <LocateFixed aria-hidden="true" />
              )}
              {geoBusy ? "Locating…" : "Use Current Location"}
            </Button>
          </div>
        </div>
      </ContentDataSurface>

      <ContentSection
        title="Billing address"
        description="Use the operating address or provide a dedicated billing address."
      >
        <CheckField
          label="Billing address is the same as operating location"
          checked={draft.billingSameAsOperating}
          onCheckedChange={(value) => {
            update("billingSameAsOperating", value);
          }}
        />
        {!draft.billingSameAsOperating ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <AddressFields
              prefix="billing"
              draft={draft}
              states={options.states}
              districts={billingDistricts}
              update={update}
            />
          </div>
        ) : null}
      </ContentSection>

      <ContentSection
        title="Shipping address"
        description="Use the billing address or provide a dedicated shipping address."
      >
        <CheckField
          label="Shipping address is the same as billing"
          checked={draft.shippingSameAsBilling}
          onCheckedChange={(value) => {
            update("shippingSameAsBilling", value);
          }}
        />
        {!draft.shippingSameAsBilling ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <AddressFields
              prefix="shipping"
              draft={draft}
              states={options.states}
              districts={shippingDistricts}
              update={update}
            />
          </div>
        ) : null}
      </ContentSection>
    </div>
  );
}

function ReviewStep({
  draft,
  preflight,
}: Readonly<{
  draft: Draft;
  preflight: DealerOnboardingPreflightResult | null;
}>): React.ReactElement {
  const billing = resolvedBilling(draft);
  const shipping = resolvedShipping(draft, billing);

  return (
    <ContentDataSurface
      title="Review & create"
      description="Review the final tenant-scoped dealer record. Pricing is not configured here; the commercial pricing engine resolves dealer/sub-dealer sell prices by type."
      padded
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <WorkflowSummaryItem
          label="Dealer"
          value={`${draft.displayName} · ${draft.dealerType === "DEALER" ? "Dealer" : "Sub-dealer"}`}
        />
        <WorkflowSummaryItem
          label="Primary contact"
          value={`${draft.contactName} · ${draft.email} · ${draft.phone}`}
        />
        <WorkflowSummaryItem
          label="Origin"
          value={
            preflight?.application === null ||
            preflight?.application === undefined
              ? "Direct onboarding"
              : `Application ${preflight.application.applicationNo ?? preflight.application.applicationId}`
          }
        />
        <WorkflowSummaryItem
          label="Legal identity"
          value={`${draft.legalName} · ${draft.gstin || draft.uin || "No GSTIN/UIN"}`}
        />
        <WorkflowSummaryItem
          label="Place of supply"
          value={draft.placeOfSupplyStateId}
        />
        <WorkflowSummaryItem
          label="Operating address"
          value={`${draft.operatingAddressLine1}, ${draft.operatingCity} ${draft.operatingPostalCode}`}
        />
        <WorkflowSummaryItem
          label="Billing address"
          value={`${billing.addressLine1}, ${billing.city} ${billing.postalCode}`}
        />
        <WorkflowSummaryItem
          label="Shipping address"
          value={`${shipping.addressLine1}, ${shipping.city} ${shipping.postalCode}`}
        />
        <WorkflowSummaryItem
          label="Pricing"
          value="Automatic by dealer type / commercial price book"
        />
      </div>
      <div className="mt-5 rounded-2xl border border-success/25 bg-success/5 p-4 text-body-sm">
        Final provisioning remains idempotent. The backend rechecks identity
        conflicts, validates scope and locations, creates
        organization/profile/login/store records in a short transaction, and
        records provisioning provenance.
      </div>
    </ContentDataSurface>
  );
}

function ProvisionedState({
  result,
}: Readonly<{ result: DealerOnboardingProvisionResult }>): React.ReactElement {
  return (
    <ContentRoot width="wide">
      <ContentStatus
        variant="success"
        icon={<CheckCircle2 aria-hidden="true" />}
        title="Dealer onboarded successfully"
        description={`${result.dealerCode} · DIC ${result.dicCode} · ${result.onboardingOrigin === "APPLICATION" ? "Application-origin" : "Direct-origin"} provisioning completed.`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href={dealerDetailHref(result.dealerOrgUnitId)}>
                Open Dealer
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={DEALER_ADMINISTRATION_ROUTE}>Back to Dealers</Link>
            </Button>
          </div>
        }
      />
    </ContentRoot>
  );
}

type AddressPrefix = "operating" | "billing" | "shipping";

function AddressFields({
  prefix,
  draft,
  states,
  districts,
  update,
}: Readonly<{
  prefix: AddressPrefix;
  draft: Draft;
  states: DealerOnboardingOptions["states"];
  districts: DealerOnboardingOptions["districts"];
  update: <K extends keyof Draft>(key: K, value: Draft[K]) => void;
}>): React.ReactElement {
  const keys = addressKeys(prefix);
  return (
    <>
      <TextField
        label="Address Line 1"
        value={draft[keys.addressLine1]}
        onChange={(value) => {
          update(keys.addressLine1, value);
        }}
        placeholder="Building, street, area"
      />
      <TextField
        label="Address Line 2"
        value={draft[keys.addressLine2]}
        onChange={(value) => {
          update(keys.addressLine2, value);
        }}
        placeholder="Landmark / locality"
      />
      <TextField
        label="City"
        value={draft[keys.city]}
        onChange={(value) => {
          update(keys.city, value);
        }}
        placeholder="City"
      />
      <SelectField
        label="State"
        value={draft[keys.stateId]}
        onValueChange={(value) => {
          update(keys.stateId, value);
        }}
        placeholder="Select state"
        options={states.map((state) => ({
          value: state.stateId,
          label: state.name,
        }))}
      />
      <SelectField
        label="District"
        value={draft[keys.districtId]}
        onValueChange={(value) => {
          update(keys.districtId, value);
        }}
        placeholder="Select district"
        options={districts.map((district) => ({
          value: district.districtId,
          label: district.name,
        }))}
      />
      <TextField
        label="Pincode"
        value={draft[keys.postalCode]}
        onChange={(value) => {
          update(keys.postalCode, value);
        }}
        placeholder="641001"
        inputMode="numeric"
        maxLength={6}
      />
    </>
  );
}

function addressKeys(prefix: AddressPrefix): Readonly<{
  addressLine1:
    "operatingAddressLine1" | "billingAddressLine1" | "shippingAddressLine1";
  addressLine2:
    "operatingAddressLine2" | "billingAddressLine2" | "shippingAddressLine2";
  city: "operatingCity" | "billingCity" | "shippingCity";
  stateId: "operatingStateId" | "billingStateId" | "shippingStateId";
  districtId:
    "operatingDistrictId" | "billingDistrictId" | "shippingDistrictId";
  postalCode:
    "operatingPostalCode" | "billingPostalCode" | "shippingPostalCode";
}> {
  if (prefix === "operating") {
    return {
      addressLine1: "operatingAddressLine1",
      addressLine2: "operatingAddressLine2",
      city: "operatingCity",
      stateId: "operatingStateId",
      districtId: "operatingDistrictId",
      postalCode: "operatingPostalCode",
    };
  }
  if (prefix === "billing") {
    return {
      addressLine1: "billingAddressLine1",
      addressLine2: "billingAddressLine2",
      city: "billingCity",
      stateId: "billingStateId",
      districtId: "billingDistrictId",
      postalCode: "billingPostalCode",
    };
  }
  return {
    addressLine1: "shippingAddressLine1",
    addressLine2: "shippingAddressLine2",
    city: "shippingCity",
    stateId: "shippingStateId",
    districtId: "shippingDistrictId",
    postalCode: "shippingPostalCode",
  };
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  ...props
}: Readonly<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: React.HTMLInputTypeAttribute;
}> &
  Omit<
    React.ComponentProps<typeof Input>,
    "value" | "onChange" | "placeholder" | "type"
  >): React.ReactElement {
  const id = React.useId();
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        placeholder={placeholder}
        {...props}
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onValueChange,
  placeholder,
  options,
}: Readonly<{
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  options: ReadonlyArray<Readonly<{ value: string; label: string }>>;
}>): React.ReactElement {
  const id = React.useId();
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger id={id}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function CheckField({
  label,
  checked,
  onCheckedChange,
}: Readonly<{
  label: string;
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
}>): React.ReactElement {
  const id = React.useId();
  return (
    <div className="flex items-center gap-2">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(value) => {
          onCheckedChange(value === true);
        }}
      />
      <Label htmlFor={id}>{label}</Label>
    </div>
  );
}

function validateStep(
  step: number,
  draft: Draft,
  preflight: DealerOnboardingPreflightResult | null,
): string | null {
  if (
    preflight?.preflightToken === null ||
    preflight?.preflightToken === undefined
  ) {
    return "Identity preflight must pass before continuing.";
  }
  if (isPreflightExpired(preflight)) {
    return "Identity preflight expired. Run the existing-record check again.";
  }
  if (step === 1) {
    if (draft.dealerType === "SUB_DEALER" && draft.parentOrgUnitId === "")
      return "Select the parent dealer for this sub-dealer.";
    if (
      draft.companyName.trim().length < 2 ||
      draft.displayName.trim().length < 2
    )
      return "Company Name and Display Name are required.";
    if (
      draft.contactName.trim().length < 2 ||
      draft.email.trim() === "" ||
      draft.phone.trim() === ""
    )
      return "Primary contact name, email, and phone are required.";
    if (!draft.emailChannel && !draft.whatsappChannel)
      return "Choose at least one communication channel.";
  }
  if (step === 2) {
    if (draft.legalName.trim().length < 2) return "Legal Name is required.";
    if (draft.placeOfSupplyStateId === "")
      return "Place of Supply is required.";
    const gstin = draft.gstin.trim().toUpperCase();
    const uin = draft.uin.trim().toUpperCase();
    const pan = draft.pan.trim().toUpperCase();
    if (gstin !== "" && !GSTIN_PATTERN.test(gstin))
      return "GSTIN format is invalid.";
    if (uin !== "" && !UIN_PATTERN.test(uin)) return "UIN format is invalid.";
    if (pan !== "" && !PAN_PATTERN.test(pan)) return "PAN format is invalid.";
    if (gstin !== "" && uin !== "")
      return "GSTIN and UIN cannot both be supplied.";
    if (
      (draft.gstTreatment === "REGISTERED" ||
        draft.gstTreatment === "COMPOSITION") &&
      gstin === ""
    )
      return "GSTIN is required for registered or composition dealers.";
    if (gstin !== "" && pan !== "" && gstin.slice(2, 12) !== pan)
      return "PAN must match the PAN embedded in GSTIN.";
  }
  if (step === 3) {
    if (
      !validLocation(
        draft.operatingAddressLine1,
        draft.operatingCity,
        draft.operatingStateId,
        draft.operatingDistrictId,
        draft.operatingPostalCode,
      )
    )
      return "Complete the operating address with a valid six-digit pincode.";
    const latitude = Number(draft.latitude);
    const longitude = Number(draft.longitude);
    if (
      !Number.isFinite(latitude) ||
      latitude < -90 ||
      latitude > 90 ||
      !Number.isFinite(longitude) ||
      longitude < -180 ||
      longitude > 180
    )
      return "Enter valid operating latitude and longitude.";
    if (
      !draft.billingSameAsOperating &&
      !validLocation(
        draft.billingAddressLine1,
        draft.billingCity,
        draft.billingStateId,
        draft.billingDistrictId,
        draft.billingPostalCode,
      )
    )
      return "Complete the billing address.";
    if (
      !draft.shippingSameAsBilling &&
      !validLocation(
        draft.shippingAddressLine1,
        draft.shippingCity,
        draft.shippingStateId,
        draft.shippingDistrictId,
        draft.shippingPostalCode,
      )
    )
      return "Complete the shipping address.";
    if (draft.placeOfSupplyStateId !== draft.operatingStateId)
      return "Place of Supply must match the initial operating state.";
  }
  return null;
}

function validLocation(
  address: string,
  city: string,
  stateId: string,
  districtId: string,
  postalCode: string,
): boolean {
  return (
    address.trim().length >= 3 &&
    city.trim().length >= 2 &&
    stateId !== "" &&
    districtId !== "" &&
    PINCODE_PATTERN.test(postalCode.trim())
  );
}

type ResolvedAddress = Readonly<{
  addressLine1: string;
  addressLine2: string;
  city: string;
  stateId: string;
  districtId: string;
  postalCode: string;
}>;

function resolvedBilling(draft: Draft): ResolvedAddress {
  return draft.billingSameAsOperating
    ? {
        addressLine1: draft.operatingAddressLine1,
        addressLine2: draft.operatingAddressLine2,
        city: draft.operatingCity,
        stateId: draft.operatingStateId,
        districtId: draft.operatingDistrictId,
        postalCode: draft.operatingPostalCode,
      }
    : {
        addressLine1: draft.billingAddressLine1,
        addressLine2: draft.billingAddressLine2,
        city: draft.billingCity,
        stateId: draft.billingStateId,
        districtId: draft.billingDistrictId,
        postalCode: draft.billingPostalCode,
      };
}

function resolvedShipping(
  draft: Draft,
  billing: ResolvedAddress,
): ResolvedAddress {
  return draft.shippingSameAsBilling
    ? billing
    : {
        addressLine1: draft.shippingAddressLine1,
        addressLine2: draft.shippingAddressLine2,
        city: draft.shippingCity,
        stateId: draft.shippingStateId,
        districtId: draft.shippingDistrictId,
        postalCode: draft.shippingPostalCode,
      };
}

function buildProvisionBody(
  draft: Draft,
  preflight: DealerOnboardingPreflightResult,
): unknown {
  if (preflight.preflightToken === null) return null;
  const application =
    preflight.outcome === "APPLICATION_FOUND" ? preflight.application : null;
  const billing = resolvedBilling(draft);
  const shipping = resolvedShipping(draft, billing);
  const legalEntity = preflight.legalEntity;

  return {
    origin: application === null ? "DIRECT" : "APPLICATION",
    ...(application === null
      ? {}
      : { applicationId: application.applicationId }),
    preflightToken: preflight.preflightToken,
    dealerType: draft.dealerType,
    ...(draft.dealerType === "SUB_DEALER"
      ? { parentOrgUnitId: draft.parentOrgUnitId }
      : {}),
    legalEntityMode: legalEntity === null ? "CREATE" : "LINK_EXISTING",
    ...(legalEntity === null
      ? {}
      : { legalEntityId: legalEntity.legalEntityId }),
    business: {
      companyName: draft.companyName,
      displayName: draft.displayName,
      legalName: draft.legalName,
      ...(draft.tradeName.trim() === ""
        ? {}
        : { tradeName: draft.tradeName.trim() }),
      gstTreatment: draft.gstTreatment,
      ...(draft.gstin.trim() === ""
        ? {}
        : { gstin: draft.gstin.trim().toUpperCase() }),
      ...(draft.uin.trim() === ""
        ? {}
        : { uin: draft.uin.trim().toUpperCase() }),
      ...(draft.pan.trim() === ""
        ? {}
        : { pan: draft.pan.trim().toUpperCase() }),
      placeOfSupplyStateId: draft.placeOfSupplyStateId,
      taxPreference: draft.taxPreference,
      currency: draft.currency,
    },
    primaryContact: {
      displayName: draft.contactName,
      email: draft.email,
      phone: draft.phone,
      preferredLanguage: draft.preferredLanguage,
      communicationChannels: [
        ...(draft.emailChannel ? (["EMAIL"] as const) : []),
        ...(draft.whatsappChannel ? (["WHATSAPP"] as const) : []),
      ],
    },
    operatingLocation: {
      addressLine1: draft.operatingAddressLine1,
      ...(draft.operatingAddressLine2.trim() === ""
        ? {}
        : { addressLine2: draft.operatingAddressLine2.trim() }),
      city: draft.operatingCity,
      stateId: draft.operatingStateId,
      districtId: draft.operatingDistrictId,
      postalCode: draft.operatingPostalCode,
      countryCode: "IN",
      latitude: Number(draft.latitude),
      longitude: Number(draft.longitude),
      captureSource: "VERIFIED_ADDRESS",
    },
    billingLocation: {
      addressLine1: billing.addressLine1,
      ...(billing.addressLine2.trim() === ""
        ? {}
        : { addressLine2: billing.addressLine2.trim() }),
      city: billing.city,
      stateId: billing.stateId,
      districtId: billing.districtId,
      postalCode: billing.postalCode,
      countryCode: "IN",
    },
    shippingLocation: draft.shippingSameAsBilling
      ? { sameAsBilling: true }
      : {
          sameAsBilling: false,
          location: {
            addressLine1: shipping.addressLine1,
            ...(shipping.addressLine2.trim() === ""
              ? {}
              : { addressLine2: shipping.addressLine2.trim() }),
            city: shipping.city,
            stateId: shipping.stateId,
            districtId: shipping.districtId,
            postalCode: shipping.postalCode,
            countryCode: "IN",
          },
        },
  };
}

function createIdempotencyKey(): string {
  return `dealer-provision:${crypto.randomUUID()}`;
}

function formatEnum(value: string): string {
  return value
    .replaceAll("_", " ")
    .toLocaleLowerCase("en-US")
    .replace(/\b\w/gu, (character) => character.toLocaleUpperCase("en-US"));
}
