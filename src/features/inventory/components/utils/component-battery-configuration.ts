// oz-next-app/src/features/inventory/components/utils/component-battery-configuration.ts
import {
  componentBatteryConfigurationInputSchema,
  type ComponentBatteryConfigurationInput,
  type ComponentJsonObject,
} from "@/features/inventory/components/contracts/component-inventory.schema";

const MAX_CONFIGURATION_OPTIONS = 256;

type JsonRecord = Readonly<Record<string, unknown>>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function mappedConfiguration(
  value: unknown,
  fallbackBatteryType?: string,
): ComponentBatteryConfigurationInput | null {
  if (!isRecord(value)) {
    return null;
  }

  const parsed = componentBatteryConfigurationInputSchema.safeParse({
    id: value["id"],
    ...(value["battery_type"] === undefined || value["battery_type"] === null
      ? fallbackBatteryType === undefined
        ? {}
        : { batteryType: fallbackBatteryType }
      : { batteryType: value["battery_type"] }),
    ...(value["capacity_kwh"] === undefined || value["capacity_kwh"] === null
      ? {}
      : { capacityKwh: value["capacity_kwh"] }),
    ...(value["voltage_v"] === undefined || value["voltage_v"] === null
      ? {}
      : { voltageV: value["voltage_v"] }),
    ...(value["ah"] === undefined || value["ah"] === null
      ? {}
      : { ah: value["ah"] }),
    ...(value["bms"] === undefined || value["bms"] === null
      ? {}
      : { bms: value["bms"] }),
    ...(value["mounting"] === undefined || value["mounting"] === null
      ? {}
      : { mounting: value["mounting"] }),
    ...(value["battery_pack_count"] === undefined ||
    value["battery_pack_count"] === null
      ? {}
      : { batteryPackCount: value["battery_pack_count"] }),
  });

  return parsed.success ? parsed.data : null;
}

function appendConfiguration(
  output: Map<string, ComponentBatteryConfigurationInput>,
  value: unknown,
  fallbackBatteryType?: string,
): void {
  if (output.size >= MAX_CONFIGURATION_OPTIONS) {
    return;
  }

  const configuration = mappedConfiguration(value, fallbackBatteryType);
  if (configuration !== null && !output.has(configuration.id)) {
    output.set(configuration.id, configuration);
  }
}

export function batteryConfigurationOptions(
  masterMetadata: ComponentJsonObject,
): readonly ComponentBatteryConfigurationInput[] {
  const byId = new Map<string, ComponentBatteryConfigurationInput>();
  const fallbackBatteryType =
    typeof masterMetadata["battery_type"] === "string"
      ? masterMetadata["battery_type"]
      : typeof masterMetadata["battery_type_code"] === "string"
        ? masterMetadata["battery_type_code"]
        : undefined;
  const atomicConfigurations = masterMetadata["atomic_configurations"];

  if (Array.isArray(atomicConfigurations)) {
    for (const candidate of atomicConfigurations) {
      appendConfiguration(byId, candidate, fallbackBatteryType);
    }
  }

  if (byId.size === 0) {
    const variantIndex = masterMetadata["variant_index"];
    if (Array.isArray(variantIndex)) {
      for (const variant of variantIndex) {
        if (!isRecord(variant) || !Array.isArray(variant["components"])) {
          continue;
        }

        for (const candidate of variant["components"]) {
          appendConfiguration(byId, candidate, fallbackBatteryType);
        }
      }
    }
  }

  return [...byId.values()].sort((left, right) =>
    left.id.localeCompare(right.id),
  );
}

export function currentBatteryConfiguration(
  inventoryMetadata: ComponentJsonObject,
): ComponentBatteryConfigurationInput | null {
  const fallbackBatteryType =
    typeof inventoryMetadata["battery_type_code"] === "string"
      ? inventoryMetadata["battery_type_code"]
      : typeof inventoryMetadata["battery_type_name"] === "string"
        ? inventoryMetadata["battery_type_name"]
        : undefined;

  return mappedConfiguration(
    inventoryMetadata["configuration"],
    fallbackBatteryType,
  );
}

export function batteryConfigurationLabel(
  configuration: ComponentBatteryConfigurationInput,
): string {
  const details = [
    configuration.batteryType,
    configuration.capacityKwh === undefined
      ? null
      : `${configuration.capacityKwh.toLocaleString("en-IN", { maximumFractionDigits: 2 })} kWh`,
    configuration.voltageV === undefined
      ? null
      : `${configuration.voltageV.toLocaleString("en-IN", { maximumFractionDigits: 1 })} V`,
    configuration.ah === undefined
      ? null
      : `${configuration.ah.toLocaleString("en-IN", { maximumFractionDigits: 1 })} Ah`,
    configuration.bms,
    configuration.mounting,
  ].filter((value): value is string => value !== null && value !== undefined);

  return details.length === 0
    ? "Approved battery configuration"
    : details.join(" · ");
}

export function storedBatteryMetadata(
  configuration: ComponentBatteryConfigurationInput,
): ComponentJsonObject {
  const storedConfiguration: Record<string, string | number> = {
    id: configuration.id,
    ...(configuration.batteryType === undefined
      ? {}
      : { battery_type: configuration.batteryType }),
    ...(configuration.capacityKwh === undefined
      ? {}
      : { capacity_kwh: configuration.capacityKwh }),
    ...(configuration.voltageV === undefined
      ? {}
      : { voltage_v: configuration.voltageV }),
    ...(configuration.ah === undefined ? {} : { ah: configuration.ah }),
    ...(configuration.bms === undefined ? {} : { bms: configuration.bms }),
    ...(configuration.mounting === undefined
      ? {}
      : { mounting: configuration.mounting }),
    ...(configuration.batteryPackCount === undefined
      ? {}
      : { battery_pack_count: configuration.batteryPackCount }),
  };

  return {
    configuration: storedConfiguration,
    ...(configuration.batteryType === undefined
      ? {}
      : {
          battery_type_code: configuration.batteryType,
          battery_type_name: configuration.batteryType,
        }),
    ...(configuration.capacityKwh === undefined
      ? {}
      : { capacity_kwh: configuration.capacityKwh }),
    ...(configuration.voltageV === undefined
      ? {}
      : { voltage_v: configuration.voltageV }),
    ...(configuration.bms === undefined ? {} : { bms: configuration.bms }),
    ...(configuration.mounting === undefined
      ? {}
      : { mounting: configuration.mounting }),
  };
}
