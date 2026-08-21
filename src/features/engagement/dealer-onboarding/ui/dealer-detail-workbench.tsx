// oz-next-app/src/features/engagement/dealer-onboarding/ui/dealer-detail-workbench.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  FileUp,
  LocateFixed,
  Mail,
  MapPin,
  Phone,
  Plus,
  Save,
  ShieldCheck,
  TriangleAlert,
  UserRound,
  WalletCards,
} from "lucide-react";

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
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

import {
  bindDealerDocumentAction,
  createDealerContactAction,
  getDealerDocumentDownloadAction,
  loadDealerOnboardingOptionsAction,
  updateDealerContactAction,
  updateDealerProfileAction,
} from "@/features/engagement/dealer-onboarding/actions/dealer-onboarding.actions";
import {
  DEALER_DOCUMENT_KINDS,
  DEALER_GST_TREATMENTS,
  DEALER_ONBOARDING_LANGUAGES,
  DEALER_TAX_PREFERENCES,
  type DealerContact,
  type DealerDirectoryDetail,
  type DealerDocumentKind,
  type DealerFileStatus,
  type DealerOnboardingOptions,
} from "@/features/engagement/dealer-onboarding/contracts/dealer-onboarding.schema";
import type { ResolvedDealerAdministrationAccess } from "@/features/engagement/dealer-onboarding/policies/dealer-onboarding.policy";
import {
  DealerDocumentUploadError,
  resumeDealerDocumentScan,
  uploadDealerDocumentFile,
  type DealerDocumentUploadProgress,
} from "@/features/engagement/dealer-onboarding/utils/dealer-document-upload.client";
import { DEALER_ADMINISTRATION_ROUTE } from "@/features/engagement/dealer-onboarding/utils/dealer-onboarding-url";

const EMPTY_OPTIONS: DealerOnboardingOptions = {
  parents: [],
  states: [],
  districts: [],
  currencies: [],
  priceBooks: [],
  marginTemplates: [],
};

type Feedback = Readonly<{ kind: "success" | "error"; message: string }> | null;

type ProfileDraft = Readonly<{
  companyName: string;
  displayName: string;
  isActive: boolean;
  parentOrgUnitId: string;
  primaryContactName: string;
  replacementEmail: string;
  replacementPhone: string;
  preferredLanguage: "en" | "ta" | "hi";
  emailChannel: boolean;
  whatsappChannel: boolean;
  legalName: string;
  tradeName: string;
  gstTreatment:
    "REGISTERED" | "COMPOSITION" | "UNREGISTERED" | "SEZ" | "OVERSEAS";
  replacementGstin: string;
  replacementPan: string;
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
  reason: string;
}>;

type NewContactDraft = Readonly<{
  displayName: string;
  email: string;
  phone: string;
  title: string;
}>;

const EMPTY_CONTACT: NewContactDraft = {
  displayName: "",
  email: "",
  phone: "",
  title: "",
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

export function DealerDetailWorkbench({
  access,
  initialDealer,
}: Readonly<{
  access: ResolvedDealerAdministrationAccess;
  initialDealer: DealerDirectoryDetail;
}>): React.ReactElement {
  const [dealer, setDealer] = React.useState(initialDealer);
  const [draft, setDraft] = React.useState<ProfileDraft>(() =>
    profileDraft(initialDealer),
  );
  const [options, setOptions] =
    React.useState<DealerOnboardingOptions>(EMPTY_OPTIONS);
  const [profileBusy, setProfileBusy] = React.useState(false);
  const [feedback, setFeedback] = React.useState<Feedback>(null);

  const setField = React.useCallback(
    <K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]): void => {
      setDraft((current) => ({ ...current, [key]: value }));
    },
    [],
  );

  React.useEffect(() => {
    let cancelled = false;

    void loadDealerOnboardingOptionsAction({
      dealerType: dealer.dealerType,
      stateId: draft.operatingStateId,
      currency: draft.currency,
    }).then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        setFeedback({ kind: "error", message: result.message });
        return;
      }
      setOptions(result.data);
    });

    return () => {
      cancelled = true;
    };
  }, [dealer.dealerType, draft.currency, draft.operatingStateId]);

  const saveProfile = React.useCallback(async (): Promise<void> => {
    const latitude = Number(draft.latitude);
    const longitude = Number(draft.longitude);

    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
      setFeedback({
        kind: "error",
        message: "Operating latitude must be between -90 and 90.",
      });
      return;
    }
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      setFeedback({
        kind: "error",
        message: "Operating longitude must be between -180 and 180.",
      });
      return;
    }
    if (!draft.emailChannel && !draft.whatsappChannel) {
      setFeedback({
        kind: "error",
        message: "Choose at least one communication channel.",
      });
      return;
    }

    setProfileBusy(true);
    setFeedback(null);

    const result = await updateDealerProfileAction({
      dealerOrgUnitId: dealer.dealerOrgUnitId,
      body: {
        expectedUpdatedAt: dealer.updatedAt,
        companyName: draft.companyName,
        displayName: draft.displayName,
        isActive: draft.isActive,
        parentOrgUnitId:
          dealer.dealerType === "SUB_DEALER" && draft.parentOrgUnitId !== ""
            ? draft.parentOrgUnitId
            : null,
        primaryContact: {
          displayName: draft.primaryContactName,
          ...(draft.replacementEmail.trim() === ""
            ? {}
            : { replacementEmail: draft.replacementEmail.trim() }),
          ...(draft.replacementPhone.trim() === ""
            ? {}
            : { replacementPhone: draft.replacementPhone.trim() }),
          preferredLanguage: draft.preferredLanguage,
          communicationChannels: [
            ...(draft.emailChannel ? (["EMAIL"] as const) : []),
            ...(draft.whatsappChannel ? (["WHATSAPP"] as const) : []),
          ],
        },
        business: {
          legalName: draft.legalName,
          tradeName:
            draft.tradeName.trim() === "" ? null : draft.tradeName.trim(),
          gstTreatment: draft.gstTreatment,
          ...(draft.replacementGstin.trim() === ""
            ? {}
            : {
                replacementGstin: draft.replacementGstin.trim().toUpperCase(),
              }),
          ...(draft.replacementPan.trim() === ""
            ? {}
            : { replacementPan: draft.replacementPan.trim().toUpperCase() }),
          placeOfSupplyStateId: draft.placeOfSupplyStateId,
          taxPreference: draft.taxPreference,
          currency: draft.currency,
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
          latitude,
          longitude,
          captureSource: "VERIFIED_ADDRESS",
        },
        billingLocation: {
          addressLine1: draft.billingAddressLine1,
          ...(draft.billingAddressLine2.trim() === ""
            ? {}
            : { addressLine2: draft.billingAddressLine2.trim() }),
          city: draft.billingCity,
          stateId: draft.billingStateId,
          districtId: draft.billingDistrictId,
          postalCode: draft.billingPostalCode,
          countryCode: "IN",
        },
        shippingLocation: draft.shippingSameAsBilling
          ? { sameAsBilling: true }
          : {
              sameAsBilling: false,
              location: {
                addressLine1: draft.shippingAddressLine1,
                ...(draft.shippingAddressLine2.trim() === ""
                  ? {}
                  : { addressLine2: draft.shippingAddressLine2.trim() }),
                city: draft.shippingCity,
                stateId: draft.shippingStateId,
                districtId: draft.shippingDistrictId,
                postalCode: draft.shippingPostalCode,
                countryCode: "IN",
              },
            },
        reason: draft.reason,
      },
    });

    setProfileBusy(false);

    if (!result.ok) {
      setFeedback({ kind: "error", message: result.message });
      return;
    }

    setDealer(result.data);
    setDraft(profileDraft(result.data));
    setFeedback({
      kind: "success",
      message:
        "Dealer profile updated with optimistic concurrency and tenant-scoped authorization.",
    });
  }, [dealer, draft]);

  const useCurrentLocation = React.useCallback((): void => {
    const requested = requestBrowserCurrentPosition(
      (position) => {
        setDraft((current) => ({
          ...current,
          latitude: String(position.coords.latitude),
          longitude: String(position.coords.longitude),
        }));
      },
      () => {
        setFeedback({
          kind: "error",
          message:
            "Location permission was not available. Enter coordinates manually.",
        });
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 12_000 },
    );

    if (!requested) {
      setFeedback({
        kind: "error",
        message: "Location services are not available in this browser.",
      });
    }
  }, []);

  return (
    <ContentRoot
      width="full"
      density="compact"
      className="min-h-[calc(100dvh-8rem)]"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-3">
          <Button asChild variant="outline">
            <Link href={DEALER_ADMINISTRATION_ROUTE}>
              <ArrowLeft aria-hidden="true" />
              Dealers
            </Link>
          </Button>
          <div>
            <h1 className="text-page-title">{dealer.displayName}</h1>
            <p className="mt-1 text-body-sm text-muted-readable">
              {dealer.companyName} ·{" "}
              {dealer.dealerType === "DEALER" ? "Dealer" : "Sub-dealer"}
              {dealer.parentDealerName === null
                ? ""
                : ` · Parent: ${dealer.parentDealerName}`}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={dealer.dealerType === "DEALER" ? "info" : "warning"}>
            {dealer.dealerType === "DEALER" ? "Dealer" : "Sub-dealer"}
          </Badge>
          <Badge variant={dealer.isActive ? "success" : "secondary"}>
            {dealer.isActive ? "Active" : "Inactive"}
          </Badge>
          <Badge variant="outline">{dealer.source.name}</Badge>
        </div>
      </div>

      {feedback !== null ? (
        <Alert variant={feedback.kind === "error" ? "destructive" : "default"}>
          {feedback.kind === "error" ? (
            <TriangleAlert aria-hidden="true" />
          ) : (
            <ShieldCheck aria-hidden="true" />
          )}
          <AlertTitle>
            {feedback.kind === "error"
              ? "Dealer update needs attention"
              : "Dealer record updated"}
          </AlertTitle>
          <AlertDescription>{feedback.message}</AlertDescription>
        </Alert>
      ) : null}

      <ContentDataSurface
        title="Dealer administration"
        description="Organization, tax, contacts, addresses, documents, wallet balances, and Welfare Fund activity. Dealer Code and DIC are immutable identifiers."
        padded
        className="min-h-0 flex-1"
      >
        <Tabs defaultValue="overview" className="min-h-0">
          <TabsList className="h-auto flex-wrap justify-start">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="profile">Profile & Addresses</TabsTrigger>
            <TabsTrigger value="contacts">Contacts</TabsTrigger>
            <TabsTrigger value="wallets">Wallet & Welfare</TabsTrigger>
            <TabsTrigger value="documents">Attachments</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-5 space-y-5">
            <Overview dealer={dealer} />
          </TabsContent>

          <TabsContent value="profile" className="mt-5 space-y-5">
            <ProfileEditor
              access={access}
              dealer={dealer}
              draft={draft}
              options={options}
              setField={setField}
              onUseCurrentLocation={useCurrentLocation}
              onSave={() => void saveProfile()}
              busy={profileBusy}
            />
          </TabsContent>

          <TabsContent value="contacts" className="mt-5">
            <ContactsWorkspace
              access={access}
              dealer={dealer}
              onDealerChange={setDealer}
              onFeedback={setFeedback}
            />
          </TabsContent>

          <TabsContent value="wallets" className="mt-5">
            <WalletAndWelfare dealer={dealer} />
          </TabsContent>

          <TabsContent value="documents" className="mt-5">
            <DocumentWorkspace
              access={access}
              dealer={dealer}
              onDealerChange={setDealer}
              onFeedback={setFeedback}
            />
          </TabsContent>
        </Tabs>
      </ContentDataSurface>
    </ContentRoot>
  );
}

function Overview({
  dealer,
}: Readonly<{ dealer: DealerDirectoryDetail }>): React.ReactElement {
  const walletTotal = dealer.wallets.reduce(
    (sum, wallet) => sum + safeNumber(wallet.availableBalance),
    0,
  );
  const walletCurrency = dealer.wallets[0]?.currency ?? dealer.currency;

  return (
    <div className="grid gap-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Summary
          label="Dealer Code"
          value={dealer.dealerCode}
          helper="Immutable after creation"
        />
        <Summary
          label="DIC"
          value={dealer.dicCode ?? "—"}
          helper="Immutable after creation"
        />
        <Summary
          label="GSTIN / Place of Supply"
          value={dealer.legalEntity.gstinMasked ?? "Not registered"}
          helper={dealer.legalEntity.placeOfSupply}
        />
        <Summary
          label="Wallet Balance"
          value={
            dealer.financialAccess.wallet
              ? formatMoney(walletTotal, walletCurrency)
              : "Restricted"
          }
          helper={
            dealer.financialAccess.wallet
              ? `${dealer.wallets.length.toString()} wallet account(s)`
              : "Requires wallet:read"
          }
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <ContentSection
          title="Business & provenance"
          description="Authoritative dealer identity and onboarding provenance."
        >
          <DescriptionGrid>
            <DescriptionItem label="Company" value={dealer.companyName} />
            <DescriptionItem label="Display name" value={dealer.displayName} />
            <DescriptionItem
              label="Type"
              value={dealer.dealerType === "DEALER" ? "Dealer" : "Sub-dealer"}
            />
            <DescriptionItem
              label="Parent dealer"
              value={dealer.parentDealerName ?? "—"}
            />
            <DescriptionItem
              label="Onboarding origin"
              value={formatEnum(dealer.onboardingOrigin)}
            />
            <DescriptionItem
              label="Application"
              value={dealer.applicationNo ?? "Direct onboarding"}
            />
            <DescriptionItem
              label="Source"
              value={`${dealer.source.name} (${dealer.source.code})`}
            />
            <DescriptionItem
              label="Status"
              value={dealer.isActive ? "Active" : "Inactive"}
            />
          </DescriptionGrid>
        </ContentSection>

        <ContentSection
          title="Primary contact"
          description="Primary ERP identity and communication preferences."
        >
          <div className="grid gap-3">
            <IconValue
              icon={<UserRound aria-hidden="true" />}
              label="Name"
              value={dealer.primaryContactName}
            />
            <IconValue
              icon={<Mail aria-hidden="true" />}
              label="Email"
              value={dealer.primaryEmail ?? dealer.primaryEmailMasked}
            />
            <IconValue
              icon={<Phone aria-hidden="true" />}
              label="Phone"
              value={dealer.primaryPhone ?? dealer.primaryPhoneMasked}
            />
            <DescriptionGrid>
              <DescriptionItem
                label="Language"
                value={languageLabel(dealer.preferredLanguage)}
              />
              <DescriptionItem
                label="Channels"
                value={dealer.communicationChannels.join(", ")}
              />
            </DescriptionGrid>
          </div>
        </ContentSection>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <AddressCard
          title="Operating location"
          location={dealer.operatingLocation}
        />
        <AddressCard
          title="Billing address"
          location={dealer.billingLocation}
        />
        <AddressCard
          title="Shipping address"
          location={dealer.shippingLocation}
        />
      </div>

      <ContentSection
        title="Tax profile"
        description="Legal and tax identity. Sensitive identifiers are masked by default."
      >
        <DescriptionGrid columns="three">
          <DescriptionItem
            label="Legal name"
            value={dealer.legalEntity.legalName}
          />
          <DescriptionItem
            label="Trade name"
            value={dealer.legalEntity.tradeName ?? "—"}
          />
          <DescriptionItem
            label="GST treatment"
            value={formatEnum(dealer.legalEntity.gstTreatment)}
          />
          <DescriptionItem
            label="GSTIN"
            value={dealer.legalEntity.gstinMasked ?? "—"}
          />
          <DescriptionItem
            label="PAN"
            value={dealer.legalEntity.panMasked ?? "—"}
          />
          <DescriptionItem
            label="Place of supply"
            value={dealer.legalEntity.placeOfSupply}
          />
          <DescriptionItem
            label="Tax preference"
            value={formatEnum(dealer.legalEntity.taxPreference)}
          />
          <DescriptionItem
            label="Verification"
            value={formatEnum(dealer.legalEntity.verificationState)}
          />
          <DescriptionItem label="Currency" value={dealer.currency} />
        </DescriptionGrid>
      </ContentSection>
    </div>
  );
}

function ProfileEditor({
  access,
  dealer,
  draft,
  options,
  setField,
  onUseCurrentLocation,
  onSave,
  busy,
}: Readonly<{
  access: ResolvedDealerAdministrationAccess;
  dealer: DealerDirectoryDetail;
  draft: ProfileDraft;
  options: DealerOnboardingOptions;
  setField: <K extends keyof ProfileDraft>(
    key: K,
    value: ProfileDraft[K],
  ) => void;
  onUseCurrentLocation: () => void;
  onSave: () => void;
  busy: boolean;
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

  if (!access.capabilities.canUpdateDealer) {
    return (
      <ContentStatus
        variant="info"
        title="Read-only dealer profile"
        description="You can view this dealer, but the current actor does not have the complete dealer update permission set."
      />
    );
  }

  return (
    <div className="space-y-5">
      <EditSection
        title="Immutable identifiers"
        description="These identifiers are generated during provisioning and cannot be edited."
      >
        <TextField
          label="Dealer Code"
          value={dealer.dealerCode}
          onChange={() => undefined}
          placeholder="Dealer Code"
          disabled
        />
        <TextField
          label="DIC"
          value={dealer.dicCode ?? "—"}
          onChange={() => undefined}
          placeholder="DIC"
          disabled
        />
        <TextField
          label="Dealer Type"
          value={dealer.dealerType === "DEALER" ? "Dealer" : "Sub-dealer"}
          onChange={() => undefined}
          placeholder="Dealer Type"
          disabled
        />
      </EditSection>

      <EditSection
        title="Organization & primary contact"
        description="Changes are validated and written under the selected tenant scope."
      >
        <TextField
          label="Company Name"
          value={draft.companyName}
          onChange={(value) => {
            setField("companyName", value);
          }}
          placeholder="Registered company name"
        />
        <TextField
          label="Display Name"
          value={draft.displayName}
          onChange={(value) => {
            setField("displayName", value);
          }}
          placeholder="ERP display name"
        />
        {dealer.dealerType === "SUB_DEALER" ? (
          <SelectField
            label="Parent Dealer"
            value={draft.parentOrgUnitId}
            onValueChange={(value) => {
              setField("parentOrgUnitId", value);
            }}
            placeholder="Select parent dealer"
            options={options.parents.map((parent) => ({
              value: parent.orgUnitId,
              label: `${parent.code} · ${parent.name}`,
            }))}
          />
        ) : null}
        <TextField
          label="Primary Contact"
          value={draft.primaryContactName}
          onChange={(value) => {
            setField("primaryContactName", value);
          }}
          placeholder="Primary contact name"
        />
        <TextField
          label="Replacement Email"
          type="email"
          value={draft.replacementEmail}
          onChange={(value) => {
            setField("replacementEmail", value);
          }}
          placeholder={`Leave blank to keep ${dealer.primaryEmail ?? dealer.primaryEmailMasked}`}
        />
        <TextField
          label="Replacement Phone"
          type="tel"
          value={draft.replacementPhone}
          onChange={(value) => {
            setField("replacementPhone", value);
          }}
          placeholder={`Leave blank to keep ${dealer.primaryPhone ?? dealer.primaryPhoneMasked}`}
        />
        <SelectField
          label="Customer Language"
          value={draft.preferredLanguage}
          onValueChange={(value) => {
            const parsed = DEALER_ONBOARDING_LANGUAGES.find(
              (candidate) => candidate === value,
            );
            if (parsed !== undefined) setField("preferredLanguage", parsed);
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
                setField("emailChannel", value);
              }}
            />
            <CheckField
              label="WhatsApp"
              checked={draft.whatsappChannel}
              onCheckedChange={(value) => {
                setField("whatsappChannel", value);
              }}
            />
          </div>
        </div>
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-input px-3 py-2">
          <div>
            <div className="text-body-sm font-medium">Dealer status</div>
            <div className="text-caption text-muted-readable">
              Controls whether this dealer remains active.
            </div>
          </div>
          <Switch
            checked={draft.isActive}
            onCheckedChange={(value) => {
              setField("isActive", value);
            }}
            aria-label="Dealer active status"
          />
        </div>
      </EditSection>

      <EditSection
        title="Legal & tax"
        description="Dealer pricing is derived by dealer type from commercial price books; no per-dealer price list or margin assignment is configured here."
      >
        <SelectField
          label="GST Treatment"
          value={draft.gstTreatment}
          onValueChange={(value) => {
            const parsed = DEALER_GST_TREATMENTS.find(
              (candidate) => candidate === value,
            );
            if (parsed !== undefined) setField("gstTreatment", parsed);
          }}
          placeholder="Select GST treatment"
          options={DEALER_GST_TREATMENTS.map((value) => ({
            value,
            label: formatEnum(value),
          }))}
        />
        <TextField
          label="Replacement GSTIN"
          value={draft.replacementGstin}
          onChange={(value) => {
            setField("replacementGstin", value.toUpperCase());
          }}
          placeholder={`Leave blank to keep ${dealer.legalEntity.gstinMasked ?? "current GSTIN"}`}
          maxLength={15}
        />
        <TextField
          label="Legal Name"
          value={draft.legalName}
          onChange={(value) => {
            setField("legalName", value);
          }}
          placeholder="Legal business name"
        />
        <TextField
          label="Trade Name"
          value={draft.tradeName}
          onChange={(value) => {
            setField("tradeName", value);
          }}
          placeholder="Trade name, if applicable"
        />
        <TextField
          label="Replacement PAN"
          value={draft.replacementPan}
          onChange={(value) => {
            setField("replacementPan", value.toUpperCase());
          }}
          placeholder={`Leave blank to keep ${dealer.legalEntity.panMasked ?? "current PAN"}`}
          maxLength={10}
        />
        <SelectField
          label="Place of Supply"
          value={draft.placeOfSupplyStateId}
          onValueChange={(value) => {
            setField("placeOfSupplyStateId", value);
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
            if (parsed !== undefined) setField("taxPreference", parsed);
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
      </EditSection>

      <EditSection
        title="Operating location"
        description="Used for operational routing and dealer geography."
      >
        <AddressFields
          prefix="operating"
          draft={draft}
          states={options.states}
          districts={operatingDistricts}
          setField={setField}
        />
        <TextField
          label="Latitude"
          value={draft.latitude}
          onChange={(value) => {
            setField("latitude", value);
          }}
          placeholder="11.0168"
          inputMode="decimal"
        />
        <TextField
          label="Longitude"
          value={draft.longitude}
          onChange={(value) => {
            setField("longitude", value);
          }}
          placeholder="76.9558"
          inputMode="decimal"
        />
        <div className="flex items-end">
          <Button
            type="button"
            variant="outline"
            onClick={onUseCurrentLocation}
          >
            <LocateFixed aria-hidden="true" />
            Use current location
          </Button>
        </div>
      </EditSection>

      <EditSection
        title="Billing address"
        description="Tax and invoice correspondence address."
      >
        <AddressFields
          prefix="billing"
          draft={draft}
          states={options.states}
          districts={billingDistricts}
          setField={setField}
        />
      </EditSection>

      <EditSection
        title="Shipping address"
        description="Set a dedicated shipping address only when it differs from billing."
      >
        <div className="md:col-span-2 xl:col-span-3">
          <CheckField
            label="Shipping address is the same as billing"
            checked={draft.shippingSameAsBilling}
            onCheckedChange={(value) => {
              setField("shippingSameAsBilling", value);
            }}
          />
        </div>
        {!draft.shippingSameAsBilling ? (
          <AddressFields
            prefix="shipping"
            draft={draft}
            states={options.states}
            districts={shippingDistricts}
            setField={setField}
          />
        ) : null}
      </EditSection>

      <ContentSection
        title="Change reason"
        description="Required for administrative audit context."
      >
        <Textarea
          value={draft.reason}
          onChange={(event) => {
            setField("reason", event.target.value);
          }}
          placeholder="Reason for this dealer profile update"
        />
      </ContentSection>

      <div className="flex justify-end">
        <Button type="button" onClick={onSave} disabled={busy}>
          {busy ? <Spinner aria-hidden="true" /> : <Save aria-hidden="true" />}
          {busy ? "Saving…" : "Save Dealer"}
        </Button>
      </div>
    </div>
  );
}

type AddressPrefix = "operating" | "billing" | "shipping";

function AddressFields({
  prefix,
  draft,
  states,
  districts,
  setField,
}: Readonly<{
  prefix: AddressPrefix;
  draft: ProfileDraft;
  states: DealerOnboardingOptions["states"];
  districts: DealerOnboardingOptions["districts"];
  setField: <K extends keyof ProfileDraft>(
    key: K,
    value: ProfileDraft[K],
  ) => void;
}>): React.ReactElement {
  const keys = addressKeys(prefix);

  return (
    <>
      <TextField
        label="Address Line 1"
        value={draft[keys.addressLine1]}
        onChange={(value) => {
          setField(keys.addressLine1, value);
        }}
        placeholder="Building, street, area"
      />
      <TextField
        label="Address Line 2"
        value={draft[keys.addressLine2]}
        onChange={(value) => {
          setField(keys.addressLine2, value);
        }}
        placeholder="Landmark or locality"
      />
      <TextField
        label="City"
        value={draft[keys.city]}
        onChange={(value) => {
          setField(keys.city, value);
        }}
        placeholder="City"
      />
      <SelectField
        label="State"
        value={draft[keys.stateId]}
        onValueChange={(value) => {
          setField(keys.stateId, value);
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
          setField(keys.districtId, value);
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
          setField(keys.postalCode, value);
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

function ContactsWorkspace({
  access,
  dealer,
  onDealerChange,
  onFeedback,
}: Readonly<{
  access: ResolvedDealerAdministrationAccess;
  dealer: DealerDirectoryDetail;
  onDealerChange: (dealer: DealerDirectoryDetail) => void;
  onFeedback: (feedback: Feedback) => void;
}>): React.ReactElement {
  const [draft, setDraft] = React.useState<NewContactDraft>(EMPTY_CONTACT);
  const [busy, setBusy] = React.useState(false);
  const [editingUserId, setEditingUserId] = React.useState<string | null>(null);

  const createContact = React.useCallback(async (): Promise<void> => {
    setBusy(true);
    onFeedback(null);
    const result = await createDealerContactAction({
      dealerOrgUnitId: dealer.dealerOrgUnitId,
      body: {
        displayName: draft.displayName,
        email: draft.email,
        phone: draft.phone,
        title: draft.title.trim() === "" ? null : draft.title.trim(),
      },
    });
    setBusy(false);

    if (!result.ok) {
      onFeedback({ kind: "error", message: result.message });
      return;
    }

    onDealerChange(result.data);
    setDraft(EMPTY_CONTACT);
    onFeedback({
      kind: "success",
      message: "Contact person added without granting ERP roles by default.",
    });
  }, [dealer.dealerOrgUnitId, draft, onDealerChange, onFeedback]);

  return (
    <div className="space-y-5">
      <ContentSection
        title="Contact persons"
        description="The primary contact remains managed in the dealer profile. Additional contacts do not receive ERP roles automatically."
      >
        <div className="overflow-auto rounded-2xl border border-border/70">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contact</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead className="text-end">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dealer.contacts.map((contact) => (
                <React.Fragment key={contact.userId}>
                  <TableRow>
                    <TableCell>
                      <div className="font-medium">{contact.displayName}</div>
                      {contact.isPrimary ? (
                        <Badge variant="info" className="mt-1">
                          Primary
                        </Badge>
                      ) : null}
                    </TableCell>
                    <TableCell>{contact.email ?? "—"}</TableCell>
                    <TableCell>{contact.phone ?? "—"}</TableCell>
                    <TableCell>{contact.title ?? "—"}</TableCell>
                    <TableCell>
                      {contact.lastLoginAt === null
                        ? "Never"
                        : formatDateTime(contact.lastLoginAt)}
                    </TableCell>
                    <TableCell className="text-end">
                      {!contact.isPrimary &&
                      access.capabilities.canManageContacts ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingUserId((current) =>
                              current === contact.userId
                                ? null
                                : contact.userId,
                            );
                          }}
                        >
                          Edit
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                  {editingUserId === contact.userId ? (
                    <TableRow>
                      <TableCell colSpan={6} className="bg-muted/20">
                        <ContactEditor
                          dealerOrgUnitId={dealer.dealerOrgUnitId}
                          contact={contact}
                          onUpdated={(updatedDealer) => {
                            onDealerChange(updatedDealer);
                            setEditingUserId(null);
                          }}
                          onFeedback={onFeedback}
                        />
                      </TableCell>
                    </TableRow>
                  ) : null}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
      </ContentSection>

      {access.capabilities.canManageContacts ? (
        <ContentSection
          title="Add contact person"
          description="Creates a contact-only tenant membership for this dealer; access roles are not assigned here."
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <TextField
              label="Display Name"
              value={draft.displayName}
              onChange={(value) => {
                setDraft((current) => ({ ...current, displayName: value }));
              }}
              placeholder="Contact name"
            />
            <TextField
              label="Email"
              type="email"
              value={draft.email}
              onChange={(value) => {
                setDraft((current) => ({ ...current, email: value }));
              }}
              placeholder="name@example.com"
            />
            <TextField
              label="Phone"
              type="tel"
              value={draft.phone}
              onChange={(value) => {
                setDraft((current) => ({ ...current, phone: value }));
              }}
              placeholder="+919876543210"
            />
            <TextField
              label="Title"
              value={draft.title}
              onChange={(value) => {
                setDraft((current) => ({ ...current, title: value }));
              }}
              placeholder="Owner / Accounts / Sales"
            />
          </div>
          <div className="mt-4 flex justify-end">
            <Button
              type="button"
              onClick={() => void createContact()}
              disabled={busy}
            >
              {busy ? (
                <Spinner aria-hidden="true" />
              ) : (
                <Plus aria-hidden="true" />
              )}
              {busy ? "Adding…" : "Add Contact"}
            </Button>
          </div>
        </ContentSection>
      ) : null}
    </div>
  );
}

function ContactEditor({
  dealerOrgUnitId,
  contact,
  onUpdated,
  onFeedback,
}: Readonly<{
  dealerOrgUnitId: string;
  contact: DealerContact;
  onUpdated: (dealer: DealerDirectoryDetail) => void;
  onFeedback: (feedback: Feedback) => void;
}>): React.ReactElement {
  const [displayName, setDisplayName] = React.useState(contact.displayName);
  const [replacementEmail, setReplacementEmail] = React.useState("");
  const [replacementPhone, setReplacementPhone] = React.useState("");
  const [title, setTitle] = React.useState(contact.title ?? "");
  const [busy, setBusy] = React.useState(false);

  const save = React.useCallback(async (): Promise<void> => {
    setBusy(true);
    onFeedback(null);
    const result = await updateDealerContactAction({
      dealerOrgUnitId,
      userId: contact.userId,
      body: {
        expectedUpdatedAt: contact.updatedAt,
        displayName,
        ...(replacementEmail.trim() === ""
          ? {}
          : { replacementEmail: replacementEmail.trim() }),
        ...(replacementPhone.trim() === ""
          ? {}
          : { replacementPhone: replacementPhone.trim() }),
        title: title.trim() === "" ? null : title.trim(),
      },
    });
    setBusy(false);

    if (!result.ok) {
      onFeedback({ kind: "error", message: result.message });
      return;
    }

    onUpdated(result.data);
    onFeedback({ kind: "success", message: "Contact person updated." });
  }, [
    contact.updatedAt,
    contact.userId,
    dealerOrgUnitId,
    displayName,
    onFeedback,
    onUpdated,
    replacementEmail,
    replacementPhone,
    title,
  ]);

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5 xl:items-end">
      <TextField
        label="Display Name"
        value={displayName}
        onChange={setDisplayName}
        placeholder="Contact name"
      />
      <TextField
        label="Replacement Email"
        type="email"
        value={replacementEmail}
        onChange={setReplacementEmail}
        placeholder={contact.email ?? "New email"}
      />
      <TextField
        label="Replacement Phone"
        type="tel"
        value={replacementPhone}
        onChange={setReplacementPhone}
        placeholder={contact.phone ?? "New phone"}
      />
      <TextField
        label="Title"
        value={title}
        onChange={setTitle}
        placeholder="Contact title"
      />
      <Button type="button" onClick={() => void save()} disabled={busy}>
        {busy ? <Spinner aria-hidden="true" /> : <Save aria-hidden="true" />}
        {busy ? "Saving…" : "Save"}
      </Button>
    </div>
  );
}

function WalletAndWelfare({
  dealer,
}: Readonly<{ dealer: DealerDirectoryDetail }>): React.ReactElement {
  if (!dealer.financialAccess.wallet) {
    return (
      <ContentStatus
        variant="info"
        icon={<WalletCards aria-hidden="true" />}
        title="Wallet data is permission-gated"
        description="The current actor can administer this dealer but does not have wallet:read permission. Wallet balances are therefore omitted by the API."
      />
    );
  }

  return (
    <div className="space-y-5">
      <ContentSection
        title="Wallet accounts"
        description="Balances are read directly from PostgreSQL and are never cached as authoritative financial state."
      >
        <div className="overflow-auto rounded-2xl border border-border/70">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Wallet</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-end">Posted</TableHead>
                <TableHead className="text-end">Available</TableHead>
                <TableHead className="text-end">Reserved</TableHead>
                <TableHead className="text-end">Pending Credit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dealer.wallets.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-28 text-center text-muted-readable"
                  >
                    No wallet account is currently linked to this dealer.
                  </TableCell>
                </TableRow>
              ) : (
                dealer.wallets.map((wallet) => (
                  <TableRow key={wallet.walletId}>
                    <TableCell>
                      <div className="font-medium">
                        {formatEnum(wallet.walletType)}
                      </div>
                      <div className="text-caption text-muted-readable">
                        {wallet.currency}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          wallet.status === "ACTIVE" ? "success" : "secondary"
                        }
                      >
                        {formatEnum(wallet.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-end text-tabular">
                      {formatCurrencyString(
                        wallet.postedBalance,
                        wallet.currency,
                      )}
                    </TableCell>
                    <TableCell className="text-end text-tabular font-medium">
                      {formatCurrencyString(
                        wallet.availableBalance,
                        wallet.currency,
                      )}
                    </TableCell>
                    <TableCell className="text-end text-tabular">
                      {formatCurrencyString(
                        wallet.reservedBalance,
                        wallet.currency,
                      )}
                    </TableCell>
                    <TableCell className="text-end text-tabular">
                      {formatCurrencyString(
                        wallet.pendingCredit,
                        wallet.currency,
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </ContentSection>

      {!dealer.financialAccess.welfare || dealer.welfare === null ? (
        <ContentStatus
          variant="info"
          title="Welfare Fund details are restricted"
          description="Welfare accrual detail requires welfare:accrual:read in addition to wallet access."
        />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Summary
              label="Current Welfare Rate"
              value={
                dealer.welfare.currentRatePercentage === null
                  ? "No active rate"
                  : `${dealer.welfare.currentRatePercentage}%`
              }
            />
            <Summary
              label="Accrual Count"
              value={String(dealer.welfare.accrualCount)}
            />
            <Summary
              label="Total Accrued"
              value={formatCurrencyString(
                dealer.welfare.totalAccruedAmount,
                dealer.currency,
              )}
            />
            <Summary
              label="Recent Records"
              value={String(dealer.welfare.recentAccruals.length)}
              helper="Latest 25 accruals"
            />
          </div>

          <ContentSection
            title="Welfare Fund status"
            description="Current accrual distribution for this dealer/sub-dealer."
          >
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {dealer.welfare.statusBreakdown.length === 0 ? (
                <p className="text-body-sm text-muted-readable">
                  No welfare accruals are recorded yet.
                </p>
              ) : (
                dealer.welfare.statusBreakdown.map((status) => (
                  <div
                    key={status.status}
                    className="rounded-2xl border border-border/70 p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <Badge variant={welfareStatusVariant(status.status)}>
                        {formatEnum(status.status)}
                      </Badge>
                      <span className="text-caption text-muted-readable">
                        {status.count}
                      </span>
                    </div>
                    <div className="mt-2 font-medium text-tabular">
                      {formatCurrencyString(status.amount, dealer.currency)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ContentSection>

          <ContentSection
            title="Recent Welfare Fund accruals"
            description="Latest sale-derived credits, pending credits, reversals, or blocked accruals."
          >
            <div className="overflow-auto rounded-2xl border border-border/70">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead className="text-end">Base Price</TableHead>
                    <TableHead className="text-end">Welfare Amount</TableHead>
                    <TableHead>Credit Due</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dealer.welfare.recentAccruals.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="h-28 text-center text-muted-readable"
                      >
                        No recent Welfare Fund accruals.
                      </TableCell>
                    </TableRow>
                  ) : (
                    dealer.welfare.recentAccruals.map((accrual) => (
                      <TableRow key={accrual.accrualId}>
                        <TableCell>
                          <div className="font-mono text-caption">
                            {shortId(accrual.invoiceId)}
                          </div>
                          {accrual.blockedReason === null ? null : (
                            <div className="mt-1 max-w-72 text-caption text-destructive">
                              {accrual.blockedReason}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={welfareStatusVariant(accrual.status)}>
                            {formatEnum(accrual.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {accrual.ratePercentage === null
                            ? "—"
                            : `${accrual.ratePercentage}%`}
                        </TableCell>
                        <TableCell className="text-end text-tabular">
                          {formatCurrencyString(
                            accrual.totalBasePrice,
                            accrual.currency,
                          )}
                        </TableCell>
                        <TableCell className="text-end text-tabular font-medium">
                          {formatCurrencyString(
                            accrual.welfareAmount,
                            accrual.currency,
                          )}
                        </TableCell>
                        <TableCell>
                          {formatDateTime(accrual.creditDueAt)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </ContentSection>
        </>
      )}
    </div>
  );
}

function DocumentWorkspace({
  access,
  dealer,
  onDealerChange,
  onFeedback,
}: Readonly<{
  access: ResolvedDealerAdministrationAccess;
  dealer: DealerDirectoryDetail;
  onDealerChange: (dealer: DealerDirectoryDetail) => void;
  onFeedback: (feedback: Feedback) => void;
}>): React.ReactElement {
  const [kind, setKind] = React.useState<DealerDocumentKind>("KYC");
  const [note, setNote] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [progress, setProgress] =
    React.useState<DealerDocumentUploadProgress | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [pendingFile, setPendingFile] = React.useState<DealerFileStatus | null>(
    null,
  );

  const upload = React.useCallback(async (): Promise<void> => {
    if (pendingFile === null && file === null) {
      onFeedback({
        kind: "error",
        message: "Choose a dealer document to upload.",
      });
      return;
    }

    setBusy(true);
    onFeedback(null);

    try {
      let cleanFile: DealerFileStatus;

      if (pendingFile !== null) {
        cleanFile = await resumeDealerDocumentScan(pendingFile, setProgress);
      } else {
        if (file === null) {
          onFeedback({
            kind: "error",
            message: "Choose a dealer document to upload.",
          });
          return;
        }

        cleanFile = await uploadDealerDocumentFile(
          file,
          dealer.dealerOrgUnitId,
          setProgress,
        );
      }

      setPendingFile(cleanFile);
      const bindResult = await bindDealerDocumentAction({
        dealerOrgUnitId: dealer.dealerOrgUnitId,
        fileId: cleanFile.fileId,
        kind,
        note: note.trim() === "" ? null : note.trim(),
      });

      if (!bindResult.ok) {
        onFeedback({ kind: "error", message: bindResult.message });
        return;
      }

      setPendingFile(null);
      setFile(null);
      setNote("");
      setProgress(null);
      onDealerChange({
        ...dealer,
        documents: [
          bindResult.data,
          ...dealer.documents.filter(
            (document) =>
              document.dealerDocumentId !== bindResult.data.dealerDocumentId,
          ),
        ],
      });
      onFeedback({
        kind: "success",
        message: `${bindResult.data.fileName} attached to the dealer.`,
      });
    } catch (error: unknown) {
      if (
        error instanceof DealerDocumentUploadError &&
        error.code === "file_scan_pending" &&
        error.fileStatus !== null
      ) {
        setPendingFile(error.fileStatus);
      }
      onFeedback({ kind: "error", message: uploadErrorMessage(error) });
    } finally {
      setBusy(false);
    }
  }, [dealer, file, kind, note, onDealerChange, onFeedback, pendingFile]);

  const download = React.useCallback(
    async (dealerDocumentId: string): Promise<void> => {
      const result = await getDealerDocumentDownloadAction({
        dealerOrgUnitId: dealer.dealerOrgUnitId,
        dealerDocumentId,
      });
      if (!result.ok) {
        onFeedback({ kind: "error", message: result.message });
        return;
      }
      const anchor = document.createElement("a");
      anchor.href = result.data.url;
      anchor.download = result.data.fileName;
      anchor.rel = "noopener noreferrer";
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
    },
    [dealer.dealerOrgUnitId, onFeedback],
  );

  return (
    <div className="space-y-4">
      {access.capabilities.canManageDocuments ? (
        <div className="grid gap-4 rounded-3xl border border-border/70 bg-muted/20 p-4 lg:grid-cols-4 lg:items-end">
          <SelectField
            label="Document Type"
            value={kind}
            onValueChange={(value) => {
              const parsed = DEALER_DOCUMENT_KINDS.find(
                (candidate) => candidate === value,
              );
              if (parsed !== undefined) setKind(parsed);
            }}
            placeholder="Select document type"
            options={DEALER_DOCUMENT_KINDS.map((value) => ({
              value,
              label: documentKindLabel(value),
            }))}
          />
          <div className="space-y-2 lg:col-span-2">
            <Label htmlFor="dealer-document-file">File</Label>
            <Input
              id="dealer-document-file"
              type="file"
              placeholder="Choose KYC or dealer document"
              accept="application/pdf,image/png,image/jpeg,image/webp,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(event) => {
                setFile(event.currentTarget.files?.[0] ?? null);
                setPendingFile(null);
                setProgress(null);
              }}
            />
          </div>
          <TextField
            label="Note"
            value={note}
            onChange={setNote}
            placeholder="Optional document note"
          />
          <div className="lg:col-span-4 flex flex-wrap items-center justify-between gap-3">
            <div className="text-caption text-muted-readable">
              {progress?.message ??
                "PDF, PNG, JPEG, WebP, or DOCX up to 25 MB. Files remain private and are scanned before binding."}
            </div>
            <Button type="button" onClick={() => void upload()} disabled={busy}>
              {busy ? (
                <Spinner aria-hidden="true" />
              ) : (
                <FileUp aria-hidden="true" />
              )}
              {pendingFile === null ? "Upload Attachment" : "Resume Attachment"}
            </Button>
          </div>
        </div>
      ) : null}

      <div className="overflow-auto rounded-3xl border border-border/70">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Attachment</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="text-end">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dealer.documents.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-32 text-center text-muted-readable"
                >
                  No dealer attachments have been added yet.
                </TableCell>
              </TableRow>
            ) : (
              dealer.documents.map((dealerDocument) => (
                <TableRow key={dealerDocument.dealerDocumentId}>
                  <TableCell>
                    <div className="font-medium">{dealerDocument.fileName}</div>
                    <div className="text-caption text-muted-readable">
                      {dealerDocument.note ?? "No note"}
                    </div>
                  </TableCell>
                  <TableCell>
                    {documentKindLabel(dealerDocument.kind)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        dealerDocument.status === "APPROVED"
                          ? "success"
                          : dealerDocument.status === "REJECTED"
                            ? "destructive"
                            : "warning"
                      }
                    >
                      {formatEnum(dealerDocument.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {formatDateTime(dealerDocument.updatedAt)}
                  </TableCell>
                  <TableCell className="text-end">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={!access.capabilities.canReadDocuments}
                      onClick={() =>
                        void download(dealerDocument.dealerDocumentId)
                      }
                    >
                      <Download aria-hidden="true" />
                      Download
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function AddressCard({
  title,
  location,
}: Readonly<{
  title: string;
  location: DealerDirectoryDetail["operatingLocation"];
}>): React.ReactElement {
  return (
    <ContentSection title={title}>
      <div className="flex gap-3">
        <MapPin
          aria-hidden="true"
          className="mt-0.5 size-4 shrink-0 text-muted-readable"
        />
        <div className="text-body-sm">
          <p>{location.addressLine1}</p>
          {location.addressLine2 === null ? null : (
            <p>{location.addressLine2}</p>
          )}
          <p>
            {location.city}, {location.district}
          </p>
          <p>
            {location.state} {location.postalCode}
          </p>
          {location.latitude === null || location.longitude === null ? null : (
            <p className="mt-2 text-caption text-muted-readable">
              {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
            </p>
          )}
        </div>
      </div>
    </ContentSection>
  );
}

function EditSection({
  title,
  description,
  children,
}: Readonly<{
  title: string;
  description?: string;
  children: React.ReactNode;
}>): React.ReactElement {
  return (
    <section className="rounded-3xl border border-border/70 bg-card p-4 sm:p-5">
      <h3 className="text-card-title">{title}</h3>
      {description === undefined ? null : (
        <p className="mt-1 text-body-sm text-muted-readable">{description}</p>
      )}
      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {children}
      </div>
    </section>
  );
}

function Summary({
  label,
  value,
  helper,
}: Readonly<{
  label: string;
  value: string;
  helper?: string;
}>): React.ReactElement {
  return (
    <div className="rounded-2xl border border-border/70 bg-muted/25 p-3">
      <div className="text-caption text-muted-readable">{label}</div>
      <div className="mt-1 font-medium">{value}</div>
      {helper === undefined ? null : (
        <div className="mt-1 text-caption text-muted-readable">{helper}</div>
      )}
    </div>
  );
}

function DescriptionGrid({
  children,
  columns = "two",
}: Readonly<{
  children: React.ReactNode;
  columns?: "two" | "three";
}>): React.ReactElement {
  return (
    <dl
      className={
        columns === "three"
          ? "grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
          : "grid gap-4 sm:grid-cols-2"
      }
    >
      {children}
    </dl>
  );
}

function DescriptionItem({
  label,
  value,
}: Readonly<{ label: string; value: string }>): React.ReactElement {
  return (
    <div>
      <dt className="text-caption text-muted-readable">{label}</dt>
      <dd className="mt-1 text-body-sm font-medium">{value}</dd>
    </div>
  );
}

function IconValue({
  icon,
  label,
  value,
}: Readonly<{
  icon: React.ReactNode;
  label: string;
  value: string;
}>): React.ReactElement {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border/70 p-3">
      <div className="text-muted-readable">{icon}</div>
      <div className="min-w-0">
        <div className="text-caption text-muted-readable">{label}</div>
        <div className="truncate text-body-sm font-medium">{value}</div>
      </div>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  disabled = false,
  ...props
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

function profileDraft(dealer: DealerDirectoryDetail): ProfileDraft {
  const sameShipping = sameLocation(
    dealer.billingLocation,
    dealer.shippingLocation,
  );
  return {
    companyName: dealer.companyName,
    displayName: dealer.displayName,
    isActive: dealer.isActive,
    parentOrgUnitId: dealer.parentOrgUnitId ?? "",
    primaryContactName: dealer.primaryContactName,
    replacementEmail: "",
    replacementPhone: "",
    preferredLanguage: dealer.preferredLanguage,
    emailChannel: dealer.communicationChannels.includes("EMAIL"),
    whatsappChannel: dealer.communicationChannels.includes("WHATSAPP"),
    legalName: dealer.legalEntity.legalName,
    tradeName: dealer.legalEntity.tradeName ?? "",
    gstTreatment: dealer.legalEntity.gstTreatment,
    replacementGstin: "",
    replacementPan: "",
    placeOfSupplyStateId: dealer.legalEntity.placeOfSupplyStateId,
    taxPreference: dealer.legalEntity.taxPreference,
    currency: dealer.currency,
    operatingAddressLine1: dealer.operatingLocation.addressLine1,
    operatingAddressLine2: dealer.operatingLocation.addressLine2 ?? "",
    operatingCity: dealer.operatingLocation.city,
    operatingStateId: dealer.operatingLocation.stateId,
    operatingDistrictId: dealer.operatingLocation.districtId,
    operatingPostalCode: dealer.operatingLocation.postalCode,
    latitude:
      dealer.operatingLocation.latitude === null
        ? ""
        : String(dealer.operatingLocation.latitude),
    longitude:
      dealer.operatingLocation.longitude === null
        ? ""
        : String(dealer.operatingLocation.longitude),
    billingAddressLine1: dealer.billingLocation.addressLine1,
    billingAddressLine2: dealer.billingLocation.addressLine2 ?? "",
    billingCity: dealer.billingLocation.city,
    billingStateId: dealer.billingLocation.stateId,
    billingDistrictId: dealer.billingLocation.districtId,
    billingPostalCode: dealer.billingLocation.postalCode,
    shippingSameAsBilling: sameShipping,
    shippingAddressLine1: dealer.shippingLocation.addressLine1,
    shippingAddressLine2: dealer.shippingLocation.addressLine2 ?? "",
    shippingCity: dealer.shippingLocation.city,
    shippingStateId: dealer.shippingLocation.stateId,
    shippingDistrictId: dealer.shippingLocation.districtId,
    shippingPostalCode: dealer.shippingLocation.postalCode,
    reason: "Administrative dealer profile update",
  };
}

function sameLocation(
  left: DealerDirectoryDetail["billingLocation"],
  right: DealerDirectoryDetail["shippingLocation"],
): boolean {
  return (
    left.addressLine1 === right.addressLine1 &&
    left.addressLine2 === right.addressLine2 &&
    left.city === right.city &&
    left.stateId === right.stateId &&
    left.districtId === right.districtId &&
    left.postalCode === right.postalCode
  );
}

function documentKindLabel(kind: DealerDocumentKind): string {
  return formatEnum(kind);
}

function languageLabel(value: "en" | "ta" | "hi"): string {
  if (value === "ta") return "Tamil";
  if (value === "hi") return "Hindi";
  return "English";
}

function formatEnum(value: string): string {
  return value
    .replaceAll("_", " ")
    .toLocaleLowerCase("en-US")
    .replace(/\b\w/gu, (character) => character.toLocaleUpperCase("en-US"));
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatCurrencyString(value: string, currency: string): string {
  return formatMoney(safeNumber(value), currency);
}

function formatMoney(value: number, currency: string): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

function safeNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function shortId(value: string): string {
  return `${value.slice(0, 8)}…${value.slice(-4)}`;
}

function welfareStatusVariant(
  status: string,
): React.ComponentProps<typeof Badge>["variant"] {
  if (status === "CREDITED") return "success";
  if (status === "BLOCKED" || status === "REVERSED" || status === "CANCELLED")
    return "destructive";
  if (status === "PENDING" || status === "SCHEDULED") return "warning";
  return "secondary";
}

function uploadErrorMessage(error: unknown): string {
  if (error instanceof DealerDocumentUploadError) return error.message;
  if (error instanceof Error && error.message.trim() !== "")
    return error.message;
  return "Dealer document upload failed.";
}
