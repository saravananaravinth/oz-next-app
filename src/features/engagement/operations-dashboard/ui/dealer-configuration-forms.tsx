// oz-next-app/src/features/engagement/operations-dashboard/ui/dealer-configuration-forms.tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, LoaderCircle, MapPin, Settings2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/shared/hooks/use-toast";

import {
  updateEngagementDealerLocationAction,
  updateEngagementDealerSettingsAction,
  type EngagementDashboardActionResult,
} from "@/features/engagement/operations-dashboard/actions/engagement-dashboard.actions";
import type { EngagementDealerDetail } from "@/features/engagement/operations-dashboard/contracts/engagement-dashboard.schema";
import {
  createDealerConfigurationMutationCoordinator,
  extractGoogleMapsShortCode,
  GOOGLE_MAPS_SHORT_URL_PREFIX,
  normalizeIndianMobileE164,
} from "@/features/engagement/operations-dashboard/utils/dealer-configuration";

export type DealerConfigurationFormsProps = Readonly<{
  dealer: EngagementDealerDetail;
  canUpdateSettings: boolean;
  canUpdateLocation: boolean;
}>;

function createIntentKey(): string {
  return `engagement:${crypto.randomUUID()}`;
}

function optionalPositiveNumber(value: string): number | null {
  const normalized = value.trim();
  if (normalized.length === 0) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : Number.NaN;
}

function resultToast(
  result: EngagementDashboardActionResult,
  toast: ReturnType<typeof useToast>,
): boolean {
  if (result.ok) {
    toast.success({ title: result.message });
    return true;
  }
  const conflict = result.code.toLowerCase().includes("conflict");
  toast.error({
    title: "Dealer configuration failed",
    description: conflict
      ? `This configuration changed. Close and reopen the dialog to load the latest values before trying again. Your entries have been kept.${result.requestId === undefined ? "" : ` Reference: ${result.requestId}`}`
      : result.requestId === undefined
        ? result.message
        : `${result.message} Reference: ${result.requestId}`,
  });
  return false;
}

function DealerSettingsForm({
  dealer,
  rowVersion,
  disabled,
  acquireMutation,
  finishMutation,
}: Readonly<{
  dealer: EngagementDealerDetail;
  rowVersion: number;
  disabled: boolean;
  acquireMutation: () => boolean;
  finishMutation: (rowVersion?: number) => void;
}>) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = React.useTransition();
  const [intentKey, setIntentKey] = React.useState("");
  const [engagementActive, setEngagementActive] = React.useState(
    dealer.engagementActive,
  );
  const [vehicle, setVehicle] = React.useState(dealer.supportsVehicleEnquiries);
  const [service, setService] = React.useState(dealer.supportsServiceEnquiries);
  const [warranty, setWarranty] = React.useState(dealer.supportsWarranty);
  const [priority, setPriority] = React.useState(
    String(dealer.settings.priority),
  );
  const [weight, setWeight] = React.useState(
    String(dealer.settings.assignmentWeight),
  );
  const [maxOpenLeads, setMaxOpenLeads] = React.useState(
    dealer.settings.maxOpenLeads === null
      ? ""
      : String(dealer.settings.maxOpenLeads),
  );
  const [maxDistance, setMaxDistance] = React.useState(
    dealer.settings.maxAssignmentDistanceKm === null
      ? ""
      : String(dealer.settings.maxAssignmentDistanceKm),
  );
  const [reason, setReason] = React.useState("");

  const markIntent = React.useCallback((): void => {
    setIntentKey((current) =>
      current.length >= 16 ? current : createIntentKey(),
    );
  }, []);

  const submit = React.useCallback(
    (event: React.SyntheticEvent<HTMLFormElement>): void => {
      event.preventDefault();
      markIntent();
      const normalizedPriority = Number(priority);
      const normalizedWeight = Number(weight);
      const normalizedMaxOpen = optionalPositiveNumber(maxOpenLeads);
      const normalizedMaxDistance = optionalPositiveNumber(maxDistance);
      const key = intentKey.length >= 16 ? intentKey : createIntentKey();
      setIntentKey(key);

      if (
        !Number.isInteger(normalizedPriority) ||
        normalizedPriority < 1 ||
        !Number.isFinite(normalizedWeight) ||
        normalizedWeight <= 0 ||
        Number.isNaN(normalizedMaxOpen) ||
        Number.isNaN(normalizedMaxDistance) ||
        reason.trim().length < 5
      ) {
        toast.error({
          title: "Review dealer settings",
          description:
            "Priority, weight, optional limits, and a five-character reason are required.",
        });
        return;
      }

      if (!acquireMutation()) return;

      startTransition(async () => {
        let nextRowVersion: number | undefined;
        try {
          const result = await updateEngagementDealerSettingsAction({
            values: {
              dealerOrgUnitId: dealer.dealerOrgUnitId,
              rowVersion,
              engagementActive,
              supportsVehicleEnquiries: vehicle,
              supportsServiceEnquiries: service,
              supportsWarranty: warranty,
              priority: normalizedPriority,
              assignmentWeight: normalizedWeight,
              maxOpenLeads: normalizedMaxOpen,
              maxAssignmentDistanceKm: normalizedMaxDistance,
              reason,
              idempotencyKey: key,
            },
          });
          if (resultToast(result, toast)) {
            nextRowVersion = result.ok ? result.rowVersion : undefined;
            setIntentKey("");
            setReason("");
            router.refresh();
          }
        } finally {
          finishMutation(nextRowVersion);
        }
      });
    },
    [
      acquireMutation,
      dealer.dealerOrgUnitId,
      engagementActive,
      finishMutation,
      intentKey,
      markIntent,
      maxDistance,
      maxOpenLeads,
      priority,
      reason,
      rowVersion,
      router,
      service,
      startTransition,
      toast,
      vehicle,
      warranty,
      weight,
    ],
  );

  return (
    <form onSubmit={submit} onChange={markIntent} className="grid gap-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex items-center justify-between gap-4 rounded-2xl border bg-muted/20 p-4">
          <div className="min-w-0">
            <p className="font-medium">Engagement active</p>
            <p className="text-caption text-muted-readable">
              Enable or pause lead assignment without changing the dealer
              organization.
            </p>
          </div>
          <Switch
            checked={engagementActive}
            onCheckedChange={(checked) => {
              setEngagementActive(checked);
              setVehicle(checked);
              setService(checked);
              setWarranty(checked);
            }}
            disabled={disabled || pending}
            aria-label="Engagement active"
          />
        </div>
        <div className="flex items-center justify-between gap-4 rounded-2xl border bg-muted/20 p-4">
          <div className="min-w-0">
            <p className="font-medium">Accept vehicle enquiries</p>
            <p className="text-caption text-muted-readable">
              Include this dealer in vehicle-sales assignment eligibility.
            </p>
          </div>
          <Switch
            checked={vehicle}
            onCheckedChange={setVehicle}
            disabled={disabled || pending}
            aria-label="Accept vehicle enquiries"
          />
        </div>
        <div className="flex items-center justify-between gap-4 rounded-2xl border bg-muted/20 p-4">
          <div className="min-w-0">
            <p className="font-medium">Accept service enquiries</p>
            <p className="text-caption text-muted-readable">
              Include this dealer in service enquiry workflows.
            </p>
          </div>
          <Switch
            checked={service}
            onCheckedChange={setService}
            disabled={disabled || pending}
            aria-label="Accept service enquiries"
          />
        </div>
        <div className="flex items-center justify-between gap-4 rounded-2xl border bg-muted/20 p-4">
          <div className="min-w-0">
            <p className="font-medium">Support warranty</p>
            <p className="text-caption text-muted-readable">
              Include this dealer in warranty enquiry workflows.
            </p>
          </div>
          <Switch
            checked={warranty}
            onCheckedChange={setWarranty}
            disabled={disabled || pending}
            aria-label="Support warranty enquiries"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="dealer-priority">Assignment priority</FieldLabel>
          <Input
            id="dealer-priority"
            type="number"
            placeholder="Enter assignment priority"
            min={1}
            max={10000}
            value={priority}
            onChange={(event) => {
              setPriority(event.currentTarget.value);
            }}
            disabled={disabled || pending}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="dealer-weight">Assignment weight</FieldLabel>
          <Input
            id="dealer-weight"
            type="number"
            placeholder="Enter assignment weight"
            min="0.01"
            max="1000"
            step="0.01"
            value={weight}
            onChange={(event) => {
              setWeight(event.currentTarget.value);
            }}
            disabled={disabled || pending}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="dealer-max-open">Maximum open leads</FieldLabel>
          <Input
            id="dealer-max-open"
            type="number"
            min={1}
            max={1000000}
            value={maxOpenLeads}
            onChange={(event) => {
              setMaxOpenLeads(event.currentTarget.value);
            }}
            disabled={disabled || pending}
            placeholder="Backend default"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="dealer-max-distance">
            Maximum assignment distance (km)
          </FieldLabel>
          <Input
            id="dealer-max-distance"
            type="number"
            min="0.1"
            max="5000"
            step="0.1"
            value={maxDistance}
            onChange={(event) => {
              setMaxDistance(event.currentTarget.value);
            }}
            disabled={disabled || pending}
            placeholder="Backend default"
          />
        </Field>
      </div>

      <Field>
        <FieldLabel htmlFor="dealer-settings-reason">Audit reason</FieldLabel>
        <Textarea
          id="dealer-settings-reason"
          value={reason}
          minLength={5}
          maxLength={500}
          onChange={(event) => {
            setReason(event.currentTarget.value);
          }}
          disabled={disabled || pending}
          placeholder="Explain why this configuration is changing"
        />
        <FieldDescription>
          Required. The backend records the actor, request, correlation,
          before/after values, and reason.
        </FieldDescription>
      </Field>

      <Button
        type="submit"
        disabled={disabled || pending || reason.trim().length < 5}
      >
        {pending ? (
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
        ) : (
          <Settings2 aria-hidden="true" className="size-4" />
        )}
        Save engagement settings
      </Button>
    </form>
  );
}

function DealerLocationForm({
  dealer,
  rowVersion,
  disabled,
  acquireMutation,
  finishMutation,
}: Readonly<{
  dealer: EngagementDealerDetail;
  rowVersion: number;
  disabled: boolean;
  acquireMutation: () => boolean;
  finishMutation: (rowVersion?: number) => void;
}>) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = React.useTransition();
  const [intentKey, setIntentKey] = React.useState("");
  const [latitude, setLatitude] = React.useState(
    dealer.latitude === null ? "" : String(dealer.latitude),
  );
  const [longitude, setLongitude] = React.useState(
    dealer.longitude === null ? "" : String(dealer.longitude),
  );
  const [mapsShortCode, setMapsShortCode] = React.useState(
    dealer.googleMapsShortCode ?? "",
  );
  const [whatsappNumber, setWhatsappNumber] = React.useState(
    dealer.engagementWhatsappNumber ?? "",
  );
  const [reason, setReason] = React.useState("");

  const markIntent = React.useCallback((): void => {
    setIntentKey((current) =>
      current.length >= 16 ? current : createIntentKey(),
    );
  }, []);

  const submit = React.useCallback(
    (event: React.SyntheticEvent<HTMLFormElement>): void => {
      event.preventDefault();
      const parsedLatitude = Number(latitude);
      const parsedLongitude = Number(longitude);
      const normalizedMapsCode =
        mapsShortCode.trim().length === 0
          ? null
          : extractGoogleMapsShortCode(mapsShortCode);
      const normalizedWhatsapp =
        whatsappNumber.trim().length === 0
          ? null
          : normalizeIndianMobileE164(whatsappNumber);
      const key = intentKey.length >= 16 ? intentKey : createIntentKey();
      setIntentKey(key);
      if (
        latitude.trim().length === 0 ||
        !Number.isFinite(parsedLatitude) ||
        parsedLatitude < -90 ||
        parsedLatitude > 90 ||
        longitude.trim().length === 0 ||
        !Number.isFinite(parsedLongitude) ||
        parsedLongitude < -180 ||
        parsedLongitude > 180 ||
        (mapsShortCode.trim().length > 0 && normalizedMapsCode === null) ||
        (whatsappNumber.trim().length > 0 && normalizedWhatsapp === null) ||
        reason.trim().length < 5
      ) {
        toast.error({
          title: "Review dealer location",
          description:
            "Enter valid coordinates, Maps code, Indian WhatsApp number, and a five-character audit reason.",
        });
        return;
      }

      if (!acquireMutation()) return;

      startTransition(async () => {
        let nextRowVersion: number | undefined;
        try {
          const result = await updateEngagementDealerLocationAction({
            values: {
              dealerOrgUnitId: dealer.dealerOrgUnitId,
              rowVersion,
              latitude: parsedLatitude,
              longitude: parsedLongitude,
              googleMapsShortCode: normalizedMapsCode,
              engagementWhatsappNumber: normalizedWhatsapp,
              reason,
              idempotencyKey: key,
            },
          });
          if (resultToast(result, toast)) {
            nextRowVersion = result.ok ? result.rowVersion : undefined;
            setIntentKey("");
            setReason("");
            router.refresh();
          }
        } finally {
          finishMutation(nextRowVersion);
        }
      });
    },
    [
      acquireMutation,
      dealer.dealerOrgUnitId,
      finishMutation,
      intentKey,
      latitude,
      longitude,
      mapsShortCode,
      reason,
      rowVersion,
      router,
      startTransition,
      toast,
      whatsappNumber,
    ],
  );

  const checkedMapsCode =
    mapsShortCode.trim().length === 0
      ? null
      : extractGoogleMapsShortCode(mapsShortCode);
  const mapsCodeInvalid =
    mapsShortCode.trim().length > 0 && checkedMapsCode === null;
  const whatsappInvalid =
    whatsappNumber.trim().length > 0 &&
    normalizeIndianMobileE164(whatsappNumber) === null;

  return (
    <form onSubmit={submit} onChange={markIntent} className="grid gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="dealer-latitude">Latitude</FieldLabel>
          <Input
            id="dealer-latitude"
            type="number"
            placeholder="Enter latitude"
            min="-90"
            max="90"
            step="any"
            required
            value={latitude}
            onChange={(event) => {
              setLatitude(event.currentTarget.value);
            }}
            disabled={disabled || pending}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="dealer-longitude">Longitude</FieldLabel>
          <Input
            id="dealer-longitude"
            type="number"
            placeholder="Enter longitude"
            min="-180"
            max="180"
            step="any"
            required
            value={longitude}
            onChange={(event) => {
              setLongitude(event.currentTarget.value);
            }}
            disabled={disabled || pending}
          />
        </Field>
      </div>
      <Field>
        <FieldLabel htmlFor="dealer-maps-short-code">
          Google Maps URL
        </FieldLabel>
        <InputGroup>
          <InputGroupAddon align="inline-start">
            <InputGroupText>{GOOGLE_MAPS_SHORT_URL_PREFIX}</InputGroupText>
          </InputGroupAddon>
          <InputGroupInput
            id="dealer-maps-short-code"
            value={mapsShortCode}
            maxLength={2048}
            aria-invalid={mapsCodeInvalid || undefined}
            onChange={(event) => {
              const nextValue = event.currentTarget.value;
              const pastedCode = extractGoogleMapsShortCode(nextValue);
              setMapsShortCode(
                pastedCode !== null && /^https?:/iu.test(nextValue.trim())
                  ? pastedCode
                  : nextValue,
              );
            }}
            onPaste={(event) => {
              const pastedCode = extractGoogleMapsShortCode(
                event.clipboardData.getData("text"),
              );
              if (pastedCode === null) return;
              event.preventDefault();
              setMapsShortCode(pastedCode);
            }}
            disabled={disabled || pending}
            placeholder="HCBabMf7nZrHUhNn9"
          />
          <InputGroupAddon align="inline-end">
            <InputGroupButton
              type="button"
              variant="ghost"
              disabled={disabled || pending || checkedMapsCode === null}
              onClick={() => {
                if (checkedMapsCode === null) return;
                const openedWindow = window.open(
                  `${GOOGLE_MAPS_SHORT_URL_PREFIX}${checkedMapsCode}`,
                  "_blank",
                  "noopener,noreferrer",
                );
                if (openedWindow !== null) openedWindow.opener = null;
              }}
              aria-label="Check Google Maps URL"
            >
              <ExternalLink aria-hidden="true" />
              Check URL
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
        <FieldDescription>
          Paste a maps.app.goo.gl link or enter its short code. Only the code is
          stored.
        </FieldDescription>
      </Field>
      <Field>
        <FieldLabel htmlFor="dealer-engagement-whatsapp">
          Engagement WhatsApp number
        </FieldLabel>
        <Input
          id="dealer-engagement-whatsapp"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={whatsappNumber}
          maxLength={13}
          aria-invalid={whatsappInvalid || undefined}
          onChange={(event) => {
            setWhatsappNumber(event.currentTarget.value);
          }}
          onBlur={() => {
            const normalized = normalizeIndianMobileE164(whatsappNumber);
            if (normalized !== null) setWhatsappNumber(normalized);
          }}
          disabled={disabled || pending}
          placeholder="+919876543210"
        />
        <FieldDescription>
          Optional Indian mobile number. It is stored in canonical +91 format.
        </FieldDescription>
      </Field>
      <Field>
        <FieldLabel htmlFor="dealer-location-reason">Audit reason</FieldLabel>
        <Textarea
          id="dealer-location-reason"
          value={reason}
          minLength={5}
          maxLength={500}
          onChange={(event) => {
            setReason(event.currentTarget.value);
          }}
          disabled={disabled || pending}
          placeholder="Explain why the dealer location is changing"
        />
      </Field>
      <Button
        type="submit"
        disabled={disabled || pending || reason.trim().length < 5}
      >
        {pending ? (
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
        ) : (
          <MapPin aria-hidden="true" className="size-4" />
        )}
        Save dealer location
      </Button>
    </form>
  );
}

export function DealerConfigurationForms({
  dealer,
  canUpdateSettings,
  canUpdateLocation,
}: DealerConfigurationFormsProps): React.ReactElement {
  const [coordinator] = React.useState(() =>
    createDealerConfigurationMutationCoordinator(dealer.rowVersion),
  );
  const [rowVersion, setRowVersion] = React.useState(dealer.rowVersion);
  const [mutationPending, setMutationPending] = React.useState(false);

  const acquireMutation = React.useCallback((): boolean => {
    const acquired = coordinator.acquire();
    if (acquired) setMutationPending(true);
    return acquired;
  }, [coordinator]);

  const finishMutation = React.useCallback(
    (nextRowVersion?: number): void => {
      if (nextRowVersion === undefined) {
        coordinator.release();
      } else {
        coordinator.succeed(nextRowVersion);
        setRowVersion(nextRowVersion);
      }
      setMutationPending(false);
    },
    [coordinator],
  );

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <section className="grid content-start gap-4 rounded-3xl border p-5">
        <div>
          <h2 className="text-section-title">Engagement eligibility</h2>
          <p className="mt-1 text-body-sm text-muted-readable">
            Permission-gated settings with row-version concurrency.
          </p>
        </div>
        <DealerSettingsForm
          dealer={dealer}
          rowVersion={rowVersion}
          disabled={!canUpdateSettings || mutationPending}
          acquireMutation={acquireMutation}
          finishMutation={finishMutation}
        />
      </section>
      <section className="grid content-start gap-4 rounded-3xl border p-5">
        <div>
          <h2 className="text-section-title">Location configuration</h2>
          <p className="mt-1 text-body-sm text-muted-readable">
            Coordinates, Google Maps short link, and engagement WhatsApp.
          </p>
        </div>
        <DealerLocationForm
          dealer={dealer}
          rowVersion={rowVersion}
          disabled={!canUpdateLocation || mutationPending}
          acquireMutation={acquireMutation}
          finishMutation={finishMutation}
        />
      </section>
    </div>
  );
}
