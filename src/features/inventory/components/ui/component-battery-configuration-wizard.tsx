// oz-next-app/src/features/inventory/components/ui/component-battery-configuration-wizard.tsx
"use client";

import * as React from "react";
import { BatteryCharging, CheckCircle2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { ComponentBatteryConfigurationInput } from "@/features/inventory/components/contracts/component-inventory.schema";
import { batteryConfigurationLabel } from "@/features/inventory/components/utils/component-battery-configuration";

type Criteria = Readonly<{
  batteryType?: string;
  capacityKwh?: number;
  voltageV?: number;
  bms?: "SMART" | "STD";
  mounting?: "FIXED" | "REMOVABLE";
}>;

function numberToken(value: number): string {
  return String(value);
}

function uniqueStrings(
  values: ReadonlyArray<string | undefined>,
): readonly string[] {
  return [
    ...new Set(values.filter((value): value is string => value !== undefined)),
  ].sort((left, right) => left.localeCompare(right));
}

function uniqueNumbers(
  values: ReadonlyArray<number | undefined>,
): readonly number[] {
  return [
    ...new Set(values.filter((value): value is number => value !== undefined)),
  ].sort((left, right) => left - right);
}

function matches(
  configuration: ComponentBatteryConfigurationInput,
  criteria: Criteria,
): boolean {
  return (
    (criteria.batteryType === undefined ||
      configuration.batteryType === criteria.batteryType) &&
    (criteria.capacityKwh === undefined ||
      configuration.capacityKwh === criteria.capacityKwh) &&
    (criteria.voltageV === undefined ||
      configuration.voltageV === criteria.voltageV) &&
    (criteria.bms === undefined || configuration.bms === criteria.bms) &&
    (criteria.mounting === undefined ||
      configuration.mounting === criteria.mounting)
  );
}

function initialCriteria(
  selected: ComponentBatteryConfigurationInput | null,
  options: readonly ComponentBatteryConfigurationInput[],
): Criteria {
  if (selected !== null) {
    return {
      ...(selected.batteryType === undefined
        ? {}
        : { batteryType: selected.batteryType }),
      ...(selected.capacityKwh === undefined
        ? {}
        : { capacityKwh: selected.capacityKwh }),
      ...(selected.voltageV === undefined
        ? {}
        : { voltageV: selected.voltageV }),
      ...(selected.bms === undefined ? {} : { bms: selected.bms }),
      ...(selected.mounting === undefined
        ? {}
        : { mounting: selected.mounting }),
    };
  }

  const batteryTypes = uniqueStrings(options.map((item) => item.batteryType));
  const capacities = uniqueNumbers(options.map((item) => item.capacityKwh));
  const voltages = uniqueNumbers(options.map((item) => item.voltageV));
  const bmsOptions = uniqueStrings(options.map((item) => item.bms));
  const mountingOptions = uniqueStrings(options.map((item) => item.mounting));

  return {
    ...(batteryTypes.length === 1 ? { batteryType: batteryTypes[0] } : {}),
    ...(capacities.length === 1 ? { capacityKwh: capacities[0] } : {}),
    ...(voltages.length === 1 ? { voltageV: voltages[0] } : {}),
    ...(bmsOptions.length === 1 &&
    (bmsOptions[0] === "SMART" || bmsOptions[0] === "STD")
      ? { bms: bmsOptions[0] }
      : {}),
    ...(mountingOptions.length === 1 &&
    (mountingOptions[0] === "FIXED" || mountingOptions[0] === "REMOVABLE")
      ? { mounting: mountingOptions[0] }
      : {}),
  };
}

function resolveExact(
  options: readonly ComponentBatteryConfigurationInput[],
  criteria: Criteria,
): ComponentBatteryConfigurationInput | null {
  const candidates = options.filter((configuration) =>
    matches(configuration, criteria),
  );
  return candidates.length === 1 ? (candidates[0] ?? null) : null;
}

function Humanized({ value }: Readonly<{ value: string }>): React.ReactElement {
  return (
    <>
      {value
        .toLocaleLowerCase("en-US")
        .replace(/(^|_)\p{L}/gu, (match) =>
          match.replace("_", " ").toLocaleUpperCase("en-US"),
        )}
    </>
  );
}

export function ComponentBatteryConfigurationWizard({
  options,
  value,
  onValueChange,
  disabled = false,
}: Readonly<{
  options: readonly ComponentBatteryConfigurationInput[];
  value: ComponentBatteryConfigurationInput | null;
  onValueChange: (value: ComponentBatteryConfigurationInput | null) => void;
  disabled?: boolean | undefined;
}>): React.ReactElement {
  const [criteria, setCriteria] = React.useState<Criteria>(() =>
    initialCriteria(value, options),
  );

  const typeChoices = uniqueStrings(options.map((item) => item.batteryType));
  const typeScoped = options.filter((item) =>
    criteria.batteryType === undefined
      ? true
      : item.batteryType === criteria.batteryType,
  );
  const capacityChoices = uniqueNumbers(
    typeScoped.map((item) => item.capacityKwh),
  );
  const capacityScoped = typeScoped.filter((item) =>
    criteria.capacityKwh === undefined
      ? true
      : item.capacityKwh === criteria.capacityKwh,
  );
  const voltageChoices = uniqueNumbers(
    capacityScoped.map((item) => item.voltageV),
  );
  const voltageScoped = capacityScoped.filter((item) =>
    criteria.voltageV === undefined
      ? true
      : item.voltageV === criteria.voltageV,
  );
  const bmsChoices = uniqueStrings(voltageScoped.map((item) => item.bms));
  const bmsScoped = voltageScoped.filter((item) =>
    criteria.bms === undefined ? true : item.bms === criteria.bms,
  );
  const mountingChoices = uniqueStrings(bmsScoped.map((item) => item.mounting));

  const typeReady =
    typeChoices.length <= 1 || criteria.batteryType !== undefined;
  const capacityReady =
    capacityChoices.length <= 1 || criteria.capacityKwh !== undefined;
  const voltageReady =
    voltageChoices.length <= 1 || criteria.voltageV !== undefined;
  const bmsReady = bmsChoices.length <= 1 || criteria.bms !== undefined;

  function update(next: Criteria): void {
    setCriteria(next);
    onValueChange(resolveExact(options, next));
  }

  return (
    <div className="grid gap-4 rounded-2xl border border-border/70 bg-muted/15 p-4">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <BatteryCharging aria-hidden="true" className="size-4" />
        </span>
        <div className="grid gap-0.5">
          <p className="text-body-sm font-medium text-foreground">
            Battery configuration
          </p>
          <p className="text-caption text-muted-readable">
            Choose the real battery characteristics. The approved master
            configuration is resolved automatically; users never enter
            configuration JSON or internal IDs.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {typeChoices.length > 0 ? (
          <div className="grid gap-1.5">
            <label
              className="text-body-sm font-medium"
              htmlFor="battery-config-type"
            >
              1. Battery chemistry / type
            </label>
            <Select
              value={criteria.batteryType ?? ""}
              onValueChange={(batteryType) => {
                update({ batteryType });
              }}
              disabled={disabled || typeChoices.length === 0}
            >
              <SelectTrigger id="battery-config-type">
                <SelectValue placeholder="Choose battery type" />
              </SelectTrigger>
              <SelectContent>
                {typeChoices.map((choice) => (
                  <SelectItem key={choice} value={choice}>
                    {choice}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        {capacityChoices.length > 0 ? (
          <div className="grid gap-1.5">
            <label
              className="text-body-sm font-medium"
              htmlFor="battery-config-capacity"
            >
              2. Battery capacity
            </label>
            <Select
              value={
                criteria.capacityKwh === undefined
                  ? ""
                  : numberToken(criteria.capacityKwh)
              }
              onValueChange={(token) => {
                update({
                  ...(criteria.batteryType === undefined
                    ? {}
                    : { batteryType: criteria.batteryType }),
                  capacityKwh: Number(token),
                });
              }}
              disabled={disabled || !typeReady}
            >
              <SelectTrigger id="battery-config-capacity">
                <SelectValue placeholder="Choose kWh capacity" />
              </SelectTrigger>
              <SelectContent>
                {capacityChoices.map((choice) => (
                  <SelectItem key={choice} value={numberToken(choice)}>
                    {choice.toLocaleString("en-IN", {
                      maximumFractionDigits: 2,
                    })}{" "}
                    kWh
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[0.675rem] text-muted-readable">
              Capacity is shown in kWh. This is energy capacity, not motor power
              in kW.
            </p>
          </div>
        ) : null}

        {voltageChoices.length > 0 ? (
          <div className="grid gap-1.5">
            <label
              className="text-body-sm font-medium"
              htmlFor="battery-config-voltage"
            >
              {capacityChoices.length > 0 ? "3" : "2"}. System voltage
            </label>
            <Select
              value={
                criteria.voltageV === undefined
                  ? ""
                  : numberToken(criteria.voltageV)
              }
              onValueChange={(token) => {
                update({
                  ...(criteria.batteryType === undefined
                    ? {}
                    : { batteryType: criteria.batteryType }),
                  ...(criteria.capacityKwh === undefined
                    ? {}
                    : { capacityKwh: criteria.capacityKwh }),
                  voltageV: Number(token),
                });
              }}
              disabled={disabled || !typeReady || !capacityReady}
            >
              <SelectTrigger id="battery-config-voltage">
                <SelectValue placeholder="Choose voltage" />
              </SelectTrigger>
              <SelectContent>
                {voltageChoices.map((choice) => (
                  <SelectItem key={choice} value={numberToken(choice)}>
                    {choice.toLocaleString("en-IN", {
                      maximumFractionDigits: 1,
                    })}{" "}
                    V
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        {bmsChoices.length > 0 ? (
          <div className="grid gap-1.5">
            <label
              className="text-body-sm font-medium"
              htmlFor="battery-config-bms"
            >
              Battery management system
            </label>
            <Select
              value={criteria.bms ?? ""}
              onValueChange={(bms) => {
                if (bms !== "SMART" && bms !== "STD") return;
                update({
                  ...(criteria.batteryType === undefined
                    ? {}
                    : { batteryType: criteria.batteryType }),
                  ...(criteria.capacityKwh === undefined
                    ? {}
                    : { capacityKwh: criteria.capacityKwh }),
                  ...(criteria.voltageV === undefined
                    ? {}
                    : { voltageV: criteria.voltageV }),
                  bms,
                });
              }}
              disabled={
                disabled || !typeReady || !capacityReady || !voltageReady
              }
            >
              <SelectTrigger id="battery-config-bms">
                <SelectValue placeholder="Choose BMS" />
              </SelectTrigger>
              <SelectContent>
                {bmsChoices.map((choice) => (
                  <SelectItem key={choice} value={choice}>
                    <Humanized value={choice} />
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        {mountingChoices.length > 0 ? (
          <div className="grid gap-1.5 sm:col-span-2">
            <label
              className="text-body-sm font-medium"
              htmlFor="battery-config-mounting"
            >
              Mounting
            </label>
            <Select
              value={criteria.mounting ?? ""}
              onValueChange={(mounting) => {
                if (mounting !== "FIXED" && mounting !== "REMOVABLE") return;
                update({
                  ...(criteria.batteryType === undefined
                    ? {}
                    : { batteryType: criteria.batteryType }),
                  ...(criteria.capacityKwh === undefined
                    ? {}
                    : { capacityKwh: criteria.capacityKwh }),
                  ...(criteria.voltageV === undefined
                    ? {}
                    : { voltageV: criteria.voltageV }),
                  ...(criteria.bms === undefined ? {} : { bms: criteria.bms }),
                  mounting,
                });
              }}
              disabled={
                disabled ||
                !typeReady ||
                !capacityReady ||
                !voltageReady ||
                !bmsReady
              }
            >
              <SelectTrigger id="battery-config-mounting">
                <SelectValue placeholder="Choose fixed or removable" />
              </SelectTrigger>
              <SelectContent>
                {mountingChoices.map((choice) => (
                  <SelectItem key={choice} value={choice}>
                    <Humanized value={choice} />
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>

      {value === null ? (
        <p className="rounded-xl bg-muted/45 px-3 py-2 text-caption text-muted-readable">
          Complete only the choices that vary for this battery family. Fixed
          master characteristics are applied automatically.
        </p>
      ) : (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-success/25 bg-success/8 px-3 py-2">
          <CheckCircle2 aria-hidden="true" className="size-4 text-success" />
          <span className="text-body-sm font-medium text-foreground">
            Verified configuration
          </span>
          <Badge variant="outline">{batteryConfigurationLabel(value)}</Badge>
          {value.ah === undefined ? null : (
            <Badge variant="secondary">
              {value.ah.toLocaleString("en-IN")} Ah
            </Badge>
          )}
          {value.batteryPackCount === undefined ? null : (
            <Badge variant="secondary">
              {value.batteryPackCount} pack
              {value.batteryPackCount === 1 ? "" : "s"}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
