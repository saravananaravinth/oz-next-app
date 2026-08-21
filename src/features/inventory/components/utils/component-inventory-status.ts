// oz-next-app/src/features/inventory/components/utils/component-inventory-status.ts
import type {
  ComponentInventoryItem,
  ComponentOperationalState,
  ComponentStatusSource,
} from "@/features/inventory/components/contracts/component-inventory.schema";

export function humanizeComponentStatus(value: string): string {
  return value
    .toLocaleLowerCase("en-US")
    .replaceAll("_", " ")
    .replace(/(^|\s)\p{L}/gu, (match) => match.toLocaleUpperCase("en-US"));
}

export function componentOperationalStateLabel(
  state: ComponentOperationalState,
): string {
  return state === "OTHER" ? "Other status" : humanizeComponentStatus(state);
}

export function componentStatusSourceLabel(
  source: ComponentStatusSource,
): string {
  return source === "VEHICLE" ? "Vehicle inventory" : "Component custody";
}

export function isSoldVehicleStatus(value: string | null | undefined): boolean {
  return value?.trim().toUpperCase() === "SOLD";
}

export function isSoldComponentVehicle(
  vehicle: ComponentInventoryItem["vehicle"],
): boolean {
  if (vehicle === null) {
    return false;
  }

  return (
    isSoldVehicleStatus(vehicle.status) ||
    isSoldVehicleStatus(vehicle.inventoryStatus) ||
    isSoldVehicleStatus(vehicle.lifecycleStatus)
  );
}
