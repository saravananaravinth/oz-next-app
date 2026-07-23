// oz-next-app/src/features/engagement/operations-dashboard/ui/dealer-configuration-forms.tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, MapPin, Settings2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/shared/hooks/use-toast";

import {
  updateEngagementDealerLocationAction,
  updateEngagementDealerSettingsAction,
  type EngagementDashboardActionResult,
} from "@/features/engagement/operations-dashboard/actions/engagement-dashboard.actions";
import type { EngagementDealerDetail } from "@/features/engagement/operations-dashboard/contracts/engagement-dashboard.schema";

export type DealerConfigurationFormsProps = Readonly<{
  dealer: EngagementDealerDetail;
  tenantId: string | undefined;
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
  toast.error({
    title: "Dealer configuration failed",
    description:
      result.requestId === undefined
        ? result.message
        : `${result.message} Reference: ${result.requestId}`,
  });
  return false;
}

function DealerSettingsForm({
  dealer,
  tenantId,
  disabled,
}: Readonly<{
  dealer: EngagementDealerDetail;
  tenantId: string | undefined;
  disabled: boolean;
}>) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = React.useTransition();
  const [intentKey, setIntentKey] = React.useState("");
  const [orgUnitActive, setOrgUnitActive] = React.useState(
    dealer.orgUnitActive,
  );
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

      startTransition(async () => {
        const result = await updateEngagementDealerSettingsAction({
          ...(tenantId !== undefined ? { tenantId } : {}),
          values: {
            dealerOrgUnitId: dealer.dealerOrgUnitId,
            rowVersion: dealer.rowVersion,
            orgUnitActive,
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
          setIntentKey("");
          setReason("");
          router.refresh();
        }
      });
    },
    [
      dealer.dealerOrgUnitId,
      dealer.rowVersion,
      engagementActive,
      intentKey,
      markIntent,
      maxDistance,
      maxOpenLeads,
      orgUnitActive,
      priority,
      reason,
      router,
      service,
      startTransition,
      tenantId,
      toast,
      vehicle,
      warranty,
      weight,
    ],
  );

  return (
    <form onSubmit={submit} onChange={markIntent} className="grid gap-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex items-center justify-between rounded-2xl border p-3">
          <div>
            <p className="font-medium">Organization active</p>
            <p className="text-caption text-muted-readable">
              Controls the dealer organization unit state.
            </p>
          </div>
          <Switch
            checked={orgUnitActive}
            onCheckedChange={setOrgUnitActive}
            disabled={disabled || pending}
          />
        </div>
        <div className="flex items-center justify-between rounded-2xl border p-3">
          <div>
            <p className="font-medium">Engagement active</p>
            <p className="text-caption text-muted-readable">
              Allows engagement lead assignment.
            </p>
          </div>
          <Switch
            checked={engagementActive}
            onCheckedChange={setEngagementActive}
            disabled={disabled || pending}
          />
        </div>
      </div>

      <fieldset className="grid gap-3 rounded-2xl border p-4">
        <legend className="px-1 text-caption text-muted-readable">
          Supported enquiry flows
        </legend>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="flex items-center justify-between rounded-xl bg-muted/40 p-3">
            <span className="text-body-sm">Vehicle</span>
            <Switch
              checked={vehicle}
              onCheckedChange={setVehicle}
              disabled={disabled || pending}
            />
          </div>
          <div className="flex items-center justify-between rounded-xl bg-muted/40 p-3">
            <span className="text-body-sm">Service</span>
            <Switch
              checked={service}
              onCheckedChange={setService}
              disabled={disabled || pending}
            />
          </div>
          <div className="flex items-center justify-between rounded-xl bg-muted/40 p-3">
            <span className="text-body-sm">Warranty</span>
            <Switch
              checked={warranty}
              onCheckedChange={setWarranty}
              disabled={disabled || pending}
            />
          </div>
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="dealer-priority">Assignment priority</FieldLabel>
          <Input
            id="dealer-priority"
            type="number"
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
  tenantId,
  disabled,
}: Readonly<{
  dealer: EngagementDealerDetail;
  tenantId: string | undefined;
  disabled: boolean;
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
  const [mapsUrl, setMapsUrl] = React.useState(dealer.googleMapsUrl ?? "");
  const [line1, setLine1] = React.useState(dealer.address.line1 ?? "");
  const [line2, setLine2] = React.useState(dealer.address.line2 ?? "");
  const [city, setCity] = React.useState(dealer.city ?? "");
  const [district, setDistrict] = React.useState(dealer.district ?? "");
  const [state, setState] = React.useState(dealer.address.state ?? "");
  const [postalCode, setPostalCode] = React.useState(
    dealer.address.postalCode ?? "",
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
      const key = intentKey.length >= 16 ? intentKey : createIntentKey();
      setIntentKey(key);
      if (
        !Number.isFinite(parsedLatitude) ||
        parsedLatitude < -90 ||
        parsedLatitude > 90 ||
        !Number.isFinite(parsedLongitude) ||
        parsedLongitude < -180 ||
        parsedLongitude > 180 ||
        reason.trim().length < 5
      ) {
        toast.error({
          title: "Review dealer location",
          description:
            "Valid coordinates and a five-character audit reason are required.",
        });
        return;
      }

      startTransition(async () => {
        const result = await updateEngagementDealerLocationAction({
          ...(tenantId !== undefined ? { tenantId } : {}),
          values: {
            dealerOrgUnitId: dealer.dealerOrgUnitId,
            rowVersion: dealer.rowVersion,
            latitude: parsedLatitude,
            longitude: parsedLongitude,
            googleMapsUrl: mapsUrl.trim().length === 0 ? null : mapsUrl.trim(),
            ...(line1.trim().length > 0 ? { addressLine1: line1.trim() } : {}),
            ...(line2.trim().length > 0
              ? { addressLine2: line2.trim() }
              : { addressLine2: null }),
            ...(city.trim().length > 0 ? { city: city.trim() } : {}),
            ...(district.trim().length > 0
              ? { district: district.trim() }
              : {}),
            ...(state.trim().length > 0 ? { state: state.trim() } : {}),
            ...(postalCode.trim().length > 0
              ? { postalCode: postalCode.trim() }
              : {}),
            reason,
            idempotencyKey: key,
          },
        });
        if (resultToast(result, toast)) {
          setIntentKey("");
          setReason("");
          router.refresh();
        }
      });
    },
    [
      city,
      dealer.dealerOrgUnitId,
      dealer.rowVersion,
      district,
      intentKey,
      latitude,
      line1,
      line2,
      longitude,
      mapsUrl,
      postalCode,
      reason,
      router,
      startTransition,
      state,
      tenantId,
      toast,
    ],
  );

  return (
    <form onSubmit={submit} onChange={markIntent} className="grid gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="dealer-latitude">Latitude</FieldLabel>
          <Input
            id="dealer-latitude"
            type="number"
            min="-90"
            max="90"
            step="any"
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
            min="-180"
            max="180"
            step="any"
            value={longitude}
            onChange={(event) => {
              setLongitude(event.currentTarget.value);
            }}
            disabled={disabled || pending}
          />
        </Field>
      </div>
      <Field>
        <FieldLabel htmlFor="dealer-maps-url">Google Maps URL</FieldLabel>
        <Input
          id="dealer-maps-url"
          type="url"
          value={mapsUrl}
          onChange={(event) => {
            setMapsUrl(event.currentTarget.value);
          }}
          disabled={disabled || pending}
          placeholder="https://maps.app.goo.gl/..."
        />
        <FieldDescription>
          Only approved HTTPS Google Maps hosts are accepted by the API.
        </FieldDescription>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field className="sm:col-span-2">
          <FieldLabel htmlFor="dealer-address-line-1">
            Address line 1
          </FieldLabel>
          <Input
            id="dealer-address-line-1"
            value={line1}
            maxLength={512}
            onChange={(event) => {
              setLine1(event.currentTarget.value);
            }}
            disabled={disabled || pending}
          />
        </Field>
        <Field className="sm:col-span-2">
          <FieldLabel htmlFor="dealer-address-line-2">
            Address line 2
          </FieldLabel>
          <Input
            id="dealer-address-line-2"
            value={line2}
            maxLength={512}
            onChange={(event) => {
              setLine2(event.currentTarget.value);
            }}
            disabled={disabled || pending}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="dealer-city">City</FieldLabel>
          <Input
            id="dealer-city"
            value={city}
            maxLength={128}
            onChange={(event) => {
              setCity(event.currentTarget.value);
            }}
            disabled={disabled || pending}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="dealer-district">District</FieldLabel>
          <Input
            id="dealer-district"
            value={district}
            maxLength={128}
            onChange={(event) => {
              setDistrict(event.currentTarget.value);
            }}
            disabled={disabled || pending}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="dealer-state">State</FieldLabel>
          <Input
            id="dealer-state"
            value={state}
            maxLength={128}
            onChange={(event) => {
              setState(event.currentTarget.value);
            }}
            disabled={disabled || pending}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="dealer-postal-code">Postal code</FieldLabel>
          <Input
            id="dealer-postal-code"
            inputMode="numeric"
            value={postalCode}
            maxLength={6}
            onChange={(event) => {
              setPostalCode(
                event.currentTarget.value.replace(/\D/gu, "").slice(0, 6),
              );
            }}
            disabled={disabled || pending}
          />
        </Field>
      </div>
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
  tenantId,
  canUpdateSettings,
  canUpdateLocation,
}: DealerConfigurationFormsProps): React.ReactElement {
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
          tenantId={tenantId}
          disabled={!canUpdateSettings}
        />
      </section>
      <section className="grid content-start gap-4 rounded-3xl border p-5">
        <div>
          <h2 className="text-section-title">Location configuration</h2>
          <p className="mt-1 text-body-sm text-muted-readable">
            Coordinates, approved maps URL, and classified address.
          </p>
        </div>
        <DealerLocationForm
          dealer={dealer}
          tenantId={tenantId}
          disabled={!canUpdateLocation}
        />
      </section>
    </div>
  );
}
