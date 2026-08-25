// oz-next-app/src/features/engagement/dealer-onboarding/ui/dealer-onboarding-dialog.tsx
"use client";

import * as React from "react";
import {
  Check,
  FileCheck2,
  LocateFixed,
  Plus,
  Search,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  loadDealerOnboardingMarginsAction,
  loadDealerOnboardingOptionsAction,
  lookupDealerOnboardingGstinAction,
  preflightDealerOnboardingAction,
  provisionDealerOnboardingAction,
} from "@/features/engagement/dealer-onboarding/actions/dealer-onboarding.actions";
import {
  DEALER_COMMUNICATION_CHANNELS,
  DEALER_GST_TREATMENTS,
  DEALER_ONBOARDING_LANGUAGES,
  DEALER_ONBOARDING_TYPES,
  DEALER_TAX_PREFERENCES,
  dealerOnboardingProvisionBodySchema,
  type DealerOnboardingMarginGrid,
  type DealerOnboardingOptions,
  type DealerOnboardingPreflightResult,
  type DealerOnboardingProvisionBody,
  type DealerOnboardingProvisionResult,
  type DealerOnboardingType,
  type DealerPreflightApplication,
} from "@/features/engagement/dealer-onboarding/contracts/dealer-onboarding.schema";
import type { ResolvedDealerAdministrationAccess } from "@/features/engagement/dealer-onboarding/policies/dealer-onboarding.policy";
import { dealerDetailHref } from "@/features/engagement/dealer-onboarding/utils/dealer-onboarding-url";

const EMPTY_OPTIONS: DealerOnboardingOptions = {
  parents: [],
  states: [],
  districts: [],
  currencies: [],
  priceBooks: [],
  marginTemplates: [],
};

type FormValues = Readonly<{
  dealerType: DealerOnboardingType;
  parentOrgUnitId: string;
  primaryContactName: string;
  companyName: string;
  displayName: string;
  email: string;
  phone: string;
  preferredLanguage: "en" | "ta" | "hi";
  emailChannel: boolean;
  whatsappChannel: boolean;
  gstTreatment:
    "REGISTERED" | "COMPOSITION" | "UNREGISTERED" | "SEZ" | "OVERSEAS";
  gstin: string;
  legalName: string;
  tradeName: string;
  pan: string;
  placeOfSupplyStateId: string;
  taxPreference: "TAXABLE" | "EXEMPT" | "NON_GST";
  currency: string;
  priceBookId: string;
  marginTemplateId: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  districtId: string;
  stateId: string;
  postalCode: string;
  latitude: string;
  longitude: string;
  shippingSameAsBilling: boolean;
  shippingAddressLine1: string;
  shippingAddressLine2: string;
  shippingCity: string;
  shippingDistrictId: string;
  shippingStateId: string;
  shippingPostalCode: string;
}>;

const INITIAL_VALUES: FormValues = {
  dealerType: "DEALER",
  parentOrgUnitId: "",
  primaryContactName: "",
  companyName: "",
  displayName: "",
  email: "",
  phone: "",
  preferredLanguage: "en",
  emailChannel: true,
  whatsappChannel: true,
  gstTreatment: "REGISTERED",
  gstin: "",
  legalName: "",
  tradeName: "",
  pan: "",
  placeOfSupplyStateId: "",
  taxPreference: "TAXABLE",
  currency: "INR",
  priceBookId: "",
  marginTemplateId: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  districtId: "",
  stateId: "",
  postalCode: "",
  latitude: "",
  longitude: "",
  shippingSameAsBilling: true,
  shippingAddressLine1: "",
  shippingAddressLine2: "",
  shippingCity: "",
  shippingDistrictId: "",
  shippingStateId: "",
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

type SubmissionState =
  | Readonly<{ kind: "idle" }>
  | Readonly<{ kind: "working"; message: string }>
  | Readonly<{ kind: "error"; message: string }>
  | Readonly<{
      kind: "existing";
      dealerOrgUnitId: string;
      dealerCode: string;
      displayName: string;
    }>
  | Readonly<{ kind: "success"; result: DealerOnboardingProvisionResult }>;

export function DealerOnboardingDialog({
  access,
}: Readonly<{
  access: ResolvedDealerAdministrationAccess;
}>): React.ReactElement {
  const [open, setOpen] = React.useState(false);
  const [values, setValues] = React.useState<FormValues>(INITIAL_VALUES);
  const [options, setOptions] =
    React.useState<DealerOnboardingOptions>(EMPTY_OPTIONS);
  const [margins, setMargins] =
    React.useState<DealerOnboardingMarginGrid | null>(null);
  const [marginValues, setMarginValues] = React.useState<
    Readonly<Record<string, string>>
  >({});
  const [optionsBusy, setOptionsBusy] = React.useState(false);
  const [marginsBusy, setMarginsBusy] = React.useState(false);
  const [gstinBusy, setGstinBusy] = React.useState(false);
  const [submission, setSubmission] = React.useState<SubmissionState>({
    kind: "idle",
  });
  const [applicationMatches, setApplicationMatches] = React.useState<
    readonly DealerPreflightApplication[]
  >([]);
  const [applicationDialogOpen, setApplicationDialogOpen] =
    React.useState(false);
  const idempotencyKeyRef = React.useRef<string>(createIdempotencyKey());
  const optionsRequestRef = React.useRef(0);
  const marginRequestRef = React.useRef(0);

  const setField = React.useCallback(
    <K extends keyof FormValues>(key: K, value: FormValues[K]) => {
      setValues((current) => ({ ...current, [key]: value }));
    },
    [],
  );

  const reset = React.useCallback(() => {
    setValues(INITIAL_VALUES);
    setOptions(EMPTY_OPTIONS);
    setMargins(null);
    setMarginValues({});
    setSubmission({ kind: "idle" });
    setApplicationMatches([]);
    setApplicationDialogOpen(false);
    setOptionsBusy(false);
    setMarginsBusy(false);
    setGstinBusy(false);
    optionsRequestRef.current += 1;
    marginRequestRef.current += 1;
    idempotencyKeyRef.current = createIdempotencyKey();
  }, []);

  React.useEffect(() => {
    if (!open) return;

    let cancelled = false;
    const requestId = optionsRequestRef.current + 1;
    optionsRequestRef.current = requestId;

    queueMicrotask(() => {
      if (cancelled || optionsRequestRef.current !== requestId) return;

      setOptionsBusy(true);
      void loadDealerOnboardingOptionsAction({
        dealerType: values.dealerType,
        ...(values.stateId === "" ? {} : { stateId: values.stateId }),
        currency: values.currency,
      }).then((result) => {
        if (cancelled || optionsRequestRef.current !== requestId) return;

        setOptionsBusy(false);
        if (!result.ok) {
          setSubmission({ kind: "error", message: result.message });
          return;
        }

        setOptions(result.data);
        setValues((current) => {
          const priceBook = choosePriceBook(result.data, current.priceBookId);
          const marginTemplate = chooseMarginTemplate(
            result.data,
            current.marginTemplateId,
          );

          return {
            ...current,
            parentOrgUnitId:
              current.dealerType === "SUB_DEALER" &&
              result.data.parents.some(
                (parent) => parent.orgUnitId === current.parentOrgUnitId,
              )
                ? current.parentOrgUnitId
                : "",
            priceBookId: priceBook,
            marginTemplateId: marginTemplate,
          };
        });
      });
    });

    return () => {
      cancelled = true;
    };
  }, [open, values.currency, values.dealerType, values.stateId]);

  React.useEffect(() => {
    if (!open) {
      return;
    }

    if (values.priceBookId === "" || values.marginTemplateId === "") {
      let cancelled = false;

      queueMicrotask(() => {
        if (cancelled) return;

        setMargins(null);
        setMarginValues({});
        setMarginsBusy(false);
      });

      return () => {
        cancelled = true;
      };
    }

    let cancelled = false;
    const requestId = marginRequestRef.current + 1;
    marginRequestRef.current = requestId;

    queueMicrotask(() => {
      if (cancelled || marginRequestRef.current !== requestId) return;

      setMarginsBusy(true);
      void loadDealerOnboardingMarginsAction({
        priceBookId: values.priceBookId,
        marginTemplateId: values.marginTemplateId,
        limit: 500,
      }).then((result) => {
        if (cancelled || marginRequestRef.current !== requestId) return;

        setMarginsBusy(false);
        if (!result.ok) {
          setSubmission({ kind: "error", message: result.message });
          return;
        }

        setMargins(result.data);
        setMarginValues(
          Object.fromEntries(
            result.data.rows.map((row) => [
              row.variantId,
              row.defaultMargin ?? "",
            ]),
          ),
        );
      });
    });

    return () => {
      cancelled = true;
    };
  }, [open, values.marginTemplateId, values.priceBookId]);

  const handleGstinLookup = React.useCallback(async (): Promise<void> => {
    setGstinBusy(true);
    setSubmission({ kind: "idle" });
    const result = await lookupDealerOnboardingGstinAction({
      gstin: values.gstin,
    });
    setGstinBusy(false);
    if (!result.ok) {
      setSubmission({ kind: "error", message: result.message });
      return;
    }

    const address = result.data.registeredAddress;
    setValues((current) => {
      const stateId = result.data.stateId ?? current.stateId;
      const districtId =
        address?.district === null || address?.district === undefined
          ? current.districtId
          : (matchDistrictId(options, stateId, address.district) ??
            current.districtId);
      return {
        ...current,
        legalName: result.data.legalName,
        tradeName: result.data.tradeName ?? "",
        pan: result.data.pan ?? current.pan,
        stateId,
        placeOfSupplyStateId: stateId,
        districtId,
        addressLine1: address?.addressLine1 ?? current.addressLine1,
        addressLine2: address?.addressLine2 ?? current.addressLine2,
        city: address?.city ?? current.city,
        postalCode: address?.postalCode ?? current.postalCode,
        latitude:
          address?.latitude === null || address?.latitude === undefined
            ? current.latitude
            : String(address.latitude),
        longitude:
          address?.longitude === null || address?.longitude === undefined
            ? current.longitude
            : String(address.longitude),
      };
    });
  }, [options, values.gstin]);

  const handleGeolocation = React.useCallback((): void => {
    const requested = requestBrowserCurrentPosition(
      (position) => {
        setValues((current) => ({
          ...current,
          latitude: String(position.coords.latitude),
          longitude: String(position.coords.longitude),
        }));
      },
      () => {
        setSubmission({
          kind: "error",
          message:
            "Location permission was not available. Enter latitude and longitude manually.",
        });
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 12_000 },
    );

    if (!requested) {
      setSubmission({
        kind: "error",
        message: "Location services are not available in this browser.",
      });
    }
  }, []);

  const continueAfterPreflight = React.useCallback(
    async (
      preflight: DealerOnboardingPreflightResult,
      candidate: DealerOnboardingProvisionBody,
      origin: "DIRECT" | "APPLICATION",
      applicationId?: string,
    ): Promise<void> => {
      if (
        preflight.outcome === "EXISTING_DEALER" &&
        preflight.dealer !== null
      ) {
        setSubmission({
          kind: "existing",
          dealerOrgUnitId: preflight.dealer.dealerOrgUnitId,
          dealerCode: preflight.dealer.dealerCode,
          displayName: preflight.dealer.displayName,
        });
        return;
      }

      if (preflight.nextAction === "WAIT_FOR_APPLICATION_APPROVAL") {
        setSubmission({
          kind: "error",
          message:
            preflight.warnings[0] ??
            "The matching application must be approved before onboarding can continue.",
        });
        return;
      }

      if (origin === "DIRECT" && preflight.outcome === "APPLICATION_FOUND") {
        if (preflight.applications.length === 0) {
          setSubmission({
            kind: "error",
            message:
              "A matching application exists but could not be selected safely.",
          });
          return;
        }
        setApplicationMatches(preflight.applications);
        setApplicationDialogOpen(true);
        setSubmission({ kind: "idle" });
        return;
      }

      if (preflight.outcome === "AMBIGUOUS") {
        setSubmission({
          kind: "error",
          message:
            preflight.warnings[0] ??
            "Multiple strong records conflict. Resolve the records before onboarding.",
        });
        return;
      }

      if (preflight.preflightToken === null) {
        setSubmission({
          kind: "error",
          message:
            preflight.warnings[0] ??
            "The existing-record check did not authorize provisioning.",
        });
        return;
      }

      const finalBody: DealerOnboardingProvisionBody = {
        ...candidate,
        origin,
        ...(applicationId === undefined ? {} : { applicationId }),
        preflightToken: preflight.preflightToken,
        legalEntityMode:
          preflight.legalEntity === null ? "CREATE" : "LINK_EXISTING",
        ...(preflight.legalEntity === null
          ? {}
          : { legalEntityId: preflight.legalEntity.legalEntityId }),
      };
      const parsed = dealerOnboardingProvisionBodySchema.safeParse(finalBody);
      if (!parsed.success) {
        setSubmission({
          kind: "error",
          message:
            parsed.error.issues[0]?.message ?? "Review the onboarding form.",
        });
        return;
      }

      setSubmission({
        kind: "working",
        message:
          "Provisioning dealer, login, store, pricing, and margins atomically…",
      });
      const result = await provisionDealerOnboardingAction({
        body: parsed.data,
        idempotencyKey: idempotencyKeyRef.current,
      });
      if (!result.ok) {
        setSubmission({ kind: "error", message: result.message });
        return;
      }
      setSubmission({ kind: "success", result: result.data });
    },
    [],
  );

  const submitWithOrigin = React.useCallback(
    async (
      origin: "DIRECT" | "APPLICATION",
      applicationId?: string,
    ): Promise<void> => {
      const candidate = buildProvisionCandidate(
        values,
        margins,
        marginValues,
        origin,
        applicationId,
      );
      if (!candidate.ok) {
        setSubmission({ kind: "error", message: candidate.message });
        return;
      }

      setSubmission({
        kind: "working",
        message: "Checking existing dealer and application records…",
      });
      const preflight = await preflightDealerOnboardingAction({
        origin,
        ...(applicationId === undefined ? {} : { applicationId }),
        businessName: values.companyName,
        phone: values.phone,
        email: values.email,
        ...(values.gstin.trim() === ""
          ? {}
          : { gstin: values.gstin.trim().toUpperCase() }),
        ...(values.pan.trim() === ""
          ? {}
          : { pan: values.pan.trim().toUpperCase() }),
        stateId: values.stateId,
        districtId: values.districtId,
      });
      if (!preflight.ok) {
        setSubmission({ kind: "error", message: preflight.message });
        return;
      }

      await continueAfterPreflight(
        preflight.data,
        candidate.body,
        origin,
        applicationId,
      );
    },
    [continueAfterPreflight, marginValues, margins, values],
  );

  const handleSubmit = React.useCallback(async (): Promise<void> => {
    await submitWithOrigin("DIRECT");
  }, [submitWithOrigin]);

  const selectApplication = React.useCallback(
    async (applicationId: string): Promise<void> => {
      setApplicationDialogOpen(false);
      await submitWithOrigin("APPLICATION", applicationId);
    },
    [submitWithOrigin],
  );

  const busy = submission.kind === "working";
  const canProvision = access.capabilities.canProvision;
  const districts = options.districts.filter(
    (district) => district.stateId === values.stateId,
  );
  const shippingDistricts = options.districts.filter(
    (district) => district.stateId === values.shippingStateId,
  );

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) reset();
        }}
      >
        <DialogTrigger asChild>
          <Button disabled={!access.capabilities.canOnboard}>
            <Plus aria-hidden="true" />
            Onboard Dealer
          </Button>
        </DialogTrigger>
        <DialogContent height="viewport" className="sm:max-w-6xl">
          <DialogHeader>
            <DialogTitle>Onboard dealer or sub-dealer</DialogTitle>
            <DialogDescription>
              Complete one form. Existing dealers and dealership applications
              are checked automatically only when you submit.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-5">
            {!canProvision ? (
              <Alert variant="destructive">
                <TriangleAlert aria-hidden="true" />
                <AlertTitle>Provisioning permission is incomplete</AlertTitle>
                <AlertDescription>
                  You can review this form, but final onboarding requires the
                  full dealer, user, organization, and role provisioning
                  permission set.
                </AlertDescription>
              </Alert>
            ) : null}

            {submission.kind === "error" ? (
              <Alert variant="destructive">
                <TriangleAlert aria-hidden="true" />
                <AlertTitle>Onboarding needs attention</AlertTitle>
                <AlertDescription>{submission.message}</AlertDescription>
              </Alert>
            ) : null}

            {submission.kind === "existing" ? (
              <Alert>
                <ShieldCheck aria-hidden="true" />
                <AlertTitle>Existing dealer found</AlertTitle>
                <AlertDescription>
                  {submission.displayName} ({submission.dealerCode}) already
                  exists. Open the dealer record instead of creating a
                  duplicate.
                  <div className="mt-3">
                    <Button asChild size="sm" variant="outline">
                      <a href={dealerDetailHref(submission.dealerOrgUnitId)}>
                        Open dealer
                      </a>
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            ) : null}

            {submission.kind === "success" ? (
              <Alert>
                <FileCheck2 aria-hidden="true" />
                <AlertTitle>Dealer onboarding completed</AlertTitle>
                <AlertDescription>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="success">
                      {submission.result.dealerCode}
                    </Badge>
                    <Badge variant="secondary">
                      DIC {submission.result.dicCode}
                    </Badge>
                    <Badge variant="outline">
                      {submission.result.onboardingOrigin}
                    </Badge>
                    <Badge variant="outline">
                      {submission.result.activeMarginCount} margins
                    </Badge>
                  </div>
                  <div className="mt-3">
                    <Button asChild size="sm" variant="outline">
                      <a
                        href={dealerDetailHref(
                          submission.result.dealerOrgUnitId,
                        )}
                      >
                        Open dealer profile
                      </a>
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            ) : null}

            <FormSection
              title="Dealer identity & communication"
              description="Dealer code and the unique two-letter DIC are generated by the backend."
            >
              <SelectField
                label="Dealer Type"
                value={values.dealerType}
                onValueChange={(value) => {
                  const parsed = DEALER_ONBOARDING_TYPES.find(
                    (candidate) => candidate === value,
                  );
                  if (parsed !== undefined) setField("dealerType", parsed);
                }}
                placeholder="Select dealer type"
                options={[
                  { value: "DEALER", label: "Dealer" },
                  { value: "SUB_DEALER", label: "Sub-dealer" },
                ]}
              />
              {values.dealerType === "SUB_DEALER" ? (
                <SelectField
                  label="Parent Dealer"
                  value={values.parentOrgUnitId}
                  onValueChange={(value) => {
                    setField("parentOrgUnitId", value);
                  }}
                  placeholder={
                    optionsBusy
                      ? "Loading active dealers…"
                      : "Select active parent dealer"
                  }
                  options={options.parents.map((parent) => ({
                    value: parent.orgUnitId,
                    label: `${parent.code} · ${parent.name}`,
                  }))}
                />
              ) : null}
              <TextField
                label="Primary Contact"
                value={values.primaryContactName}
                onChange={(value) => {
                  setField("primaryContactName", value);
                }}
                placeholder="Enter primary contact name"
              />
              <TextField
                label="Company Name"
                value={values.companyName}
                onChange={(value) => {
                  setField("companyName", value);
                }}
                placeholder="Enter registered company or dealership name"
              />
              <TextField
                label="Display Name"
                value={values.displayName}
                onChange={(value) => {
                  setField("displayName", value);
                }}
                placeholder="Enter name shown across ERP"
              />
              <TextField
                label="Email Address"
                type="email"
                value={values.email}
                onChange={(value) => {
                  setField("email", value);
                }}
                placeholder="dealer@example.com"
                autoComplete="email"
              />
              <TextField
                label="Phone"
                type="tel"
                value={values.phone}
                onChange={(value) => {
                  setField("phone", value);
                }}
                placeholder="Enter 10-digit Indian mobile number"
                autoComplete="tel"
              />
              <SelectField
                label="Customer Language"
                value={values.preferredLanguage}
                onValueChange={(value) => {
                  const parsed = DEALER_ONBOARDING_LANGUAGES.find(
                    (candidate) => candidate === value,
                  );
                  if (parsed !== undefined)
                    setField("preferredLanguage", parsed);
                }}
                placeholder="Select communication language"
                options={[
                  { value: "en", label: "English" },
                  { value: "ta", label: "Tamil" },
                  { value: "hi", label: "Hindi" },
                ]}
              />
              <div className="space-y-2">
                <Label>Communication Channels</Label>
                <div className="flex min-h-11 flex-wrap items-center gap-4 rounded-2xl border border-input bg-background px-3 py-2">
                  <CheckboxField
                    checked={values.emailChannel}
                    onCheckedChange={(checked) => {
                      setField("emailChannel", checked);
                    }}
                    label="Email"
                  />
                  <CheckboxField
                    checked={values.whatsappChannel}
                    onCheckedChange={(checked) => {
                      setField("whatsappChannel", checked);
                    }}
                    label="WhatsApp"
                  />
                </div>
              </div>
            </FormSection>

            <FormSection
              title="Tax & commercial setup"
              description="GST taxpayer search is optional; all returned values remain reviewable before submission."
            >
              <SelectField
                label="GST Treatment"
                value={values.gstTreatment}
                onValueChange={(value) => {
                  const parsed = DEALER_GST_TREATMENTS.find(
                    (candidate) => candidate === value,
                  );
                  if (parsed !== undefined) setField("gstTreatment", parsed);
                }}
                placeholder="Select GST treatment"
                options={[
                  { value: "REGISTERED", label: "Registered" },
                  { value: "COMPOSITION", label: "Composition" },
                  { value: "UNREGISTERED", label: "Unregistered" },
                  { value: "SEZ", label: "SEZ" },
                  { value: "OVERSEAS", label: "Overseas" },
                ]}
              />
              <div className="space-y-2">
                <Label htmlFor="onboarding-gstin">GSTIN</Label>
                <div className="flex gap-2">
                  <Input
                    id="onboarding-gstin"
                    value={values.gstin}
                    onChange={(event) => {
                      setField("gstin", event.target.value.toUpperCase());
                    }}
                    placeholder="Enter 15-character GSTIN"
                    autoCapitalize="characters"
                    maxLength={15}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void handleGstinLookup()}
                    disabled={
                      gstinBusy || !access.capabilities.canUseGstinPrefill
                    }
                  >
                    {gstinBusy ? <Spinner /> : <Search aria-hidden="true" />}
                    Prefill
                  </Button>
                </div>
              </div>
              <TextField
                label="Business Legal Name"
                value={values.legalName}
                onChange={(value) => {
                  setField("legalName", value);
                }}
                placeholder="Enter legal name as per tax records"
              />
              <TextField
                label="Business Trade Name"
                value={values.tradeName}
                onChange={(value) => {
                  setField("tradeName", value);
                }}
                placeholder="Enter trade name, if applicable"
              />
              <SelectField
                label="Place of Supply"
                value={values.placeOfSupplyStateId}
                onValueChange={(value) => {
                  setField("placeOfSupplyStateId", value);
                }}
                placeholder="Select place-of-supply state"
                options={options.states.map((state) => ({
                  value: state.stateId,
                  label: state.name,
                }))}
              />
              <TextField
                label="PAN"
                value={values.pan}
                onChange={(value) => {
                  setField("pan", value.toUpperCase());
                }}
                placeholder="Enter 10-character PAN"
                maxLength={10}
              />
              <SelectField
                label="Tax Preference"
                value={values.taxPreference}
                onValueChange={(value) => {
                  const parsed = DEALER_TAX_PREFERENCES.find(
                    (candidate) => candidate === value,
                  );
                  if (parsed !== undefined) setField("taxPreference", parsed);
                }}
                placeholder="Select tax preference"
                options={[
                  { value: "TAXABLE", label: "Taxable" },
                  { value: "EXEMPT", label: "Exempt" },
                  { value: "NON_GST", label: "Non-GST" },
                ]}
              />
              <SelectField
                label="Currency"
                value={values.currency}
                onValueChange={(value) => {
                  setField("currency", value);
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
              <SelectField
                label="Price List"
                value={values.priceBookId}
                onValueChange={(value) => {
                  setField("priceBookId", value);
                }}
                placeholder={
                  optionsBusy
                    ? "Loading price lists…"
                    : "Select latest price list"
                }
                options={options.priceBooks.map((book) => ({
                  value: book.priceBookId,
                  label: `${book.name}${book.isDefault ? " · Default" : ""}`,
                }))}
              />
            </FormSection>

            <FormSection
              title="Billing, shipping & location"
              description="The operating location uses the billing address plus verified latitude and longitude."
            >
              <TextField
                label="Country / Region"
                value="India"
                onChange={() => undefined}
                placeholder="India"
                disabled
              />
              <TextField
                label="Address line 1"
                value={values.addressLine1}
                onChange={(value) => {
                  setField("addressLine1", value);
                }}
                placeholder="Building, street, area"
              />
              <TextField
                label="Address line 2"
                value={values.addressLine2}
                onChange={(value) => {
                  setField("addressLine2", value);
                }}
                placeholder="Landmark or additional address"
              />
              <TextField
                label="City"
                value={values.city}
                onChange={(value) => {
                  setField("city", value);
                }}
                placeholder="Enter city or town"
              />
              <SelectField
                label="State"
                value={values.stateId}
                onValueChange={(value) => {
                  setField("stateId", value);
                  setField("placeOfSupplyStateId", value);
                  setField("districtId", "");
                }}
                placeholder="Select state"
                options={options.states.map((state) => ({
                  value: state.stateId,
                  label: state.name,
                }))}
              />
              <SelectField
                label="District"
                value={values.districtId}
                onValueChange={(value) => {
                  setField("districtId", value);
                }}
                placeholder="Select district"
                options={districts.map((district) => ({
                  value: district.districtId,
                  label: district.name,
                }))}
              />
              <TextField
                label="Pincode"
                inputMode="numeric"
                value={values.postalCode}
                onChange={(value) => {
                  setField("postalCode", value);
                }}
                placeholder="Enter 6-digit pincode"
                maxLength={6}
              />
              <TextField
                label="Latitude"
                inputMode="decimal"
                value={values.latitude}
                onChange={(value) => {
                  setField("latitude", value);
                }}
                placeholder="Example: 11.1271"
              />
              <TextField
                label="Longitude"
                inputMode="decimal"
                value={values.longitude}
                onChange={(value) => {
                  setField("longitude", value);
                }}
                placeholder="Example: 78.6569"
              />
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGeolocation}
                  className="w-full"
                >
                  <LocateFixed aria-hidden="true" />
                  Use current location
                </Button>
              </div>
              <div className="col-span-full flex items-center justify-between gap-4 rounded-2xl border border-border/70 bg-muted/30 px-4 py-3">
                <div>
                  <div className="text-body-sm font-medium">
                    Shipping address
                  </div>
                  <div className="text-caption text-muted-readable">
                    Use the billing address for shipping.
                  </div>
                </div>
                <Switch
                  checked={values.shippingSameAsBilling}
                  onCheckedChange={(checked) => {
                    setField("shippingSameAsBilling", checked);
                  }}
                  aria-label="Use billing address for shipping"
                />
              </div>
              {!values.shippingSameAsBilling ? (
                <>
                  <TextField
                    label="Shipping address line 1"
                    value={values.shippingAddressLine1}
                    onChange={(value) => {
                      setField("shippingAddressLine1", value);
                    }}
                    placeholder="Building, street, area"
                  />
                  <TextField
                    label="Shipping address line 2"
                    value={values.shippingAddressLine2}
                    onChange={(value) => {
                      setField("shippingAddressLine2", value);
                    }}
                    placeholder="Landmark or additional address"
                  />
                  <TextField
                    label="Shipping city"
                    value={values.shippingCity}
                    onChange={(value) => {
                      setField("shippingCity", value);
                    }}
                    placeholder="Enter city or town"
                  />
                  <SelectField
                    label="Shipping state"
                    value={values.shippingStateId}
                    onValueChange={(value) => {
                      setField("shippingStateId", value);
                      setField("shippingDistrictId", "");
                    }}
                    placeholder="Select shipping state"
                    options={options.states.map((state) => ({
                      value: state.stateId,
                      label: state.name,
                    }))}
                  />
                  <SelectField
                    label="Shipping district"
                    value={values.shippingDistrictId}
                    onValueChange={(value) => {
                      setField("shippingDistrictId", value);
                    }}
                    placeholder="Select shipping district"
                    options={shippingDistricts.map((district) => ({
                      value: district.districtId,
                      label: district.name,
                    }))}
                  />
                  <TextField
                    label="Shipping pincode"
                    inputMode="numeric"
                    value={values.shippingPostalCode}
                    onChange={(value) => {
                      setField("shippingPostalCode", value);
                    }}
                    placeholder="Enter 6-digit pincode"
                    maxLength={6}
                  />
                </>
              ) : null}
            </FormSection>

            <div className="rounded-3xl border border-border/70 bg-card">
              <div className="flex flex-col gap-3 border-b border-border/70 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-card-title">
                    Dealer margin configuration
                  </h3>
                  <p className="text-body-sm text-muted-readable">
                    Defaults are selected from the latest matching dealer or
                    sub-dealer margin template. Edit only where needed.
                  </p>
                </div>
                <Select
                  value={values.marginTemplateId}
                  onValueChange={(value) => {
                    setField("marginTemplateId", value);
                  }}
                >
                  <SelectTrigger className="sm:w-80">
                    <SelectValue
                      placeholder={
                        optionsBusy
                          ? "Loading margin templates…"
                          : "Select margin template"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {options.marginTemplates.map((template) => (
                      <SelectItem
                        key={template.marginTemplateId}
                        value={template.marginTemplateId}
                      >
                        {template.name} v{template.version}
                        {template.isDefault ? " · Default" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="max-h-[28rem] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">Serial No</TableHead>
                      <TableHead>Model Name</TableHead>
                      <TableHead>Variant</TableHead>
                      <TableHead>Existing Price</TableHead>
                      <TableHead className="w-52">Margin</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {marginsBusy ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-28 text-center">
                          <Spinner />{" "}
                          <span className="ms-2">
                            Loading margin reference…
                          </span>
                        </TableCell>
                      </TableRow>
                    ) : margins === null || margins.rows.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="h-28 text-center text-muted-readable"
                        >
                          Select a price list and margin template to load live
                          pricing and default margins.
                        </TableCell>
                      </TableRow>
                    ) : (
                      margins.rows.map((row) => (
                        <TableRow key={row.variantId}>
                          <TableCell>{row.sequence}</TableCell>
                          <TableCell className="font-medium">
                            {row.modelName}
                          </TableCell>
                          <TableCell>
                            <VariantLabel
                              batteryType={row.batteryType}
                              batteryPowerKw={row.batteryPowerKw}
                              variantName={row.variantName}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">
                              {formatCurrency(row.exShowroom ?? row.mrp)}
                            </div>
                            {row.exShowroom !== null && row.mrp !== null ? (
                              <div className="text-caption text-muted-readable">
                                MRP {formatCurrency(row.mrp)}
                              </div>
                            ) : null}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Input
                                value={marginValues[row.variantId] ?? ""}
                                onChange={(event) => {
                                  setMarginValues((current) => ({
                                    ...current,
                                    [row.variantId]: event.target.value,
                                  }));
                                }}
                                placeholder="Enter margin"
                                inputMode="decimal"
                                aria-label={`Margin for ${row.variantName}`}
                              />
                              <Badge variant="secondary">
                                {row.valueType === "PERCENT" ? "%" : "₹"}
                              </Badge>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              {margins?.hasMore ? (
                <Alert variant="destructive" className="m-4">
                  <TriangleAlert aria-hidden="true" />
                  <AlertTitle>
                    Margin coverage exceeds the safe onboarding grid limit
                  </AlertTitle>
                  <AlertDescription>
                    Reduce the active variant set or add cursor-based
                    configuration before provisioning. The form will not submit
                    partial margin coverage.
                  </AlertDescription>
                </Alert>
              ) : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOpen(false);
              }}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={busy || !canProvision || submission.kind === "success"}
            >
              {busy ? <Spinner /> : <Check aria-hidden="true" />}
              {busy ? submission.message : "Submit Dealer Onboarding"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={applicationDialogOpen}
        onOpenChange={setApplicationDialogOpen}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Matching dealership application found</DialogTitle>
            <DialogDescription>
              Select the application that should become the onboarding source.
              This preserves dealer acquisition history.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-2">
            {applicationMatches.map((application) => (
              <button
                key={application.applicationId}
                type="button"
                disabled={
                  application.status !== "APPROVED" ||
                  application.approvedAt === null
                }
                className="flex w-full items-center justify-between gap-4 rounded-2xl border border-border/70 bg-background p-4 text-start transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
                onClick={() =>
                  void selectApplication(application.applicationId)
                }
              >
                <div>
                  <div className="font-medium">
                    {application.applicationNo ?? "Application"}
                  </div>
                  <div className="text-caption text-muted-readable">
                    {application.phase} · {application.status}
                  </div>
                </div>
                <Badge variant="outline">
                  {application.status === "APPROVED" &&
                  application.approvedAt !== null
                    ? "Use application"
                    : "Awaiting approval"}
                </Badge>
              </button>
            ))}
          </DialogBody>
          <DialogFooter showCloseButton />
        </DialogContent>
      </Dialog>
    </>
  );
}

function FormSection({
  title,
  description,
  children,
}: Readonly<{
  title: string;
  description: string;
  children: React.ReactNode;
}>): React.ReactElement {
  return (
    <section className="rounded-3xl border border-border/70 bg-card p-4 sm:p-5">
      <div className="mb-4">
        <h3 className="text-card-title">{title}</h3>
        <p className="text-body-sm text-muted-readable">{description}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{children}</div>
    </section>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  disabled = false,
  ...inputProps
}: Readonly<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: React.HTMLInputTypeAttribute;
  disabled?: boolean;
}> &
  Omit<
    React.ComponentProps<typeof Input>,
    "value" | "onChange" | "placeholder" | "type" | "disabled"
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
        disabled={disabled}
        {...inputProps}
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

function CheckboxField({
  checked,
  onCheckedChange,
  label,
}: Readonly<{
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
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

function VariantLabel({
  batteryType,
  batteryPowerKw,
  variantName,
}: Readonly<{
  batteryType: string | null;
  batteryPowerKw: string | null;
  variantName: string;
}>): React.ReactElement {
  if (batteryType?.toUpperCase() === "GRAPHENE") {
    return <span className="font-medium">{variantName}</span>;
  }
  return (
    <div>
      <div className="font-medium">
        {[batteryType, batteryPowerKw].filter(Boolean).join(" – ") ||
          variantName}
      </div>
      <div className="text-caption text-muted-readable">{variantName}</div>
    </div>
  );
}

function buildProvisionCandidate(
  values: FormValues,
  margins: DealerOnboardingMarginGrid | null,
  marginValues: Readonly<Record<string, string>>,
  origin: "DIRECT" | "APPLICATION",
  applicationId?: string,
):
  | Readonly<{ ok: true; body: DealerOnboardingProvisionBody }>
  | Readonly<{ ok: false; message: string }> {
  if (margins === null || margins.hasMore) {
    return {
      ok: false,
      message: "Load a complete margin grid before submitting.",
    };
  }
  if (
    margins.rows.some((row) => row.missingPrice || row.missingTemplateMargin)
  ) {
    return {
      ok: false,
      message:
        "The selected price list or margin template has incomplete active-variant coverage.",
    };
  }
  const latitude = Number(values.latitude);
  const longitude = Number(values.longitude);
  const channels = DEALER_COMMUNICATION_CHANNELS.filter((channel) =>
    channel === "EMAIL" ? values.emailChannel : values.whatsappChannel,
  );
  const invalidMargin = margins.rows.find((row) => {
    const current = marginValues[row.variantId]?.trim() ?? "";
    if (current === "" || current === (row.defaultMargin ?? "")) return false;
    const numeric = Number(current);
    if (!Number.isFinite(numeric) || numeric < 0) return true;
    return row.valueType === "PERCENT" && numeric > 100;
  });
  if (invalidMargin !== undefined) {
    return {
      ok: false,
      message: `Enter a valid ${invalidMargin.valueType === "PERCENT" ? "percentage" : "amount"} margin for ${invalidMargin.variantName}.`,
    };
  }
  const overrides = margins.rows.flatMap((row) => {
    const current = marginValues[row.variantId]?.trim() ?? "";
    const baseline = row.defaultMargin ?? "";
    if (current === "" || current === baseline) return [];
    return [{ variantId: row.variantId, value: Number(current) }];
  });

  const body: DealerOnboardingProvisionBody = {
    origin,
    ...(applicationId === undefined ? {} : { applicationId }),
    preflightToken: "placeholder-preflight-token-that-is-long-enough",
    dealerType: values.dealerType,
    ...(values.dealerType === "SUB_DEALER"
      ? { parentOrgUnitId: values.parentOrgUnitId }
      : {}),
    legalEntityMode: "CREATE",
    business: {
      companyName: values.companyName,
      displayName: values.displayName,
      legalName: values.legalName,
      ...(values.tradeName.trim() === ""
        ? {}
        : { tradeName: values.tradeName }),
      gstTreatment: values.gstTreatment,
      ...(values.gstin.trim() === ""
        ? {}
        : { gstin: values.gstin.trim().toUpperCase() }),
      ...(values.pan.trim() === ""
        ? {}
        : { pan: values.pan.trim().toUpperCase() }),
      placeOfSupplyStateId: values.placeOfSupplyStateId,
      taxPreference: values.taxPreference,
      currency: values.currency,
    },
    primaryContact: {
      displayName: values.primaryContactName,
      email: values.email,
      phone: values.phone,
      preferredLanguage: values.preferredLanguage,
      communicationChannels: channels,
    },
    operatingLocation: {
      addressLine1: values.addressLine1,
      ...(values.addressLine2.trim() === ""
        ? {}
        : { addressLine2: values.addressLine2 }),
      city: values.city,
      stateId: values.stateId,
      districtId: values.districtId,
      postalCode: values.postalCode,
      countryCode: "IN",
      latitude,
      longitude,
      captureSource: "MAP_PIN",
    },
    billingLocation: {
      addressLine1: values.addressLine1,
      ...(values.addressLine2.trim() === ""
        ? {}
        : { addressLine2: values.addressLine2 }),
      city: values.city,
      stateId: values.stateId,
      districtId: values.districtId,
      postalCode: values.postalCode,
      countryCode: "IN",
    },
    shippingLocation: values.shippingSameAsBilling
      ? { sameAsBilling: true }
      : {
          sameAsBilling: false,
          location: {
            addressLine1: values.shippingAddressLine1,
            ...(values.shippingAddressLine2.trim() === ""
              ? {}
              : { addressLine2: values.shippingAddressLine2 }),
            city: values.shippingCity,
            stateId: values.shippingStateId,
            districtId: values.shippingDistrictId,
            postalCode: values.shippingPostalCode,
            countryCode: "IN",
          },
        },
    priceBookId: values.priceBookId,
    marginTemplateId: values.marginTemplateId,
    marginOverrides: overrides,
  };
  const parsed = dealerOnboardingProvisionBodySchema.safeParse(body);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Review the onboarding form.",
    };
  }
  return { ok: true, body: parsed.data };
}

function choosePriceBook(
  options: DealerOnboardingOptions,
  current: string,
): string {
  if (options.priceBooks.some((book) => book.priceBookId === current))
    return current;
  return (
    options.priceBooks.find((book) => book.isDefault)?.priceBookId ??
    options.priceBooks[0]?.priceBookId ??
    ""
  );
}

function chooseMarginTemplate(
  options: DealerOnboardingOptions,
  current: string,
): string {
  if (
    options.marginTemplates.some(
      (template) => template.marginTemplateId === current,
    )
  )
    return current;
  return (
    options.marginTemplates.find((template) => template.isDefault)
      ?.marginTemplateId ??
    options.marginTemplates[0]?.marginTemplateId ??
    ""
  );
}

function matchDistrictId(
  options: DealerOnboardingOptions,
  stateId: string,
  districtName: string,
): string | null {
  const normalized = districtName.trim().toLocaleLowerCase("en-US");
  return (
    options.districts.find(
      (district) =>
        district.stateId === stateId &&
        district.name.trim().toLocaleLowerCase("en-US") === normalized,
    )?.districtId ?? null
  );
}

function createIdempotencyKey(): string {
  return `dealer-provision:${crypto.randomUUID()}`;
}

function formatCurrency(value: string | null): string {
  if (value === null || value.trim() === "") return "—";
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return value;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(numeric);
}
