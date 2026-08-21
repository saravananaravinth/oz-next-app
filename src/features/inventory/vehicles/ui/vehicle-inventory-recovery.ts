// oz-next-app/src/features/inventory/vehicles/ui/vehicle-inventory-recovery.ts
import type {
  VehicleInventoryArrivalUpdate,
  VehicleInventoryBatteryConfigurationSelection,
  VehicleInventoryChargerSelection,
  VehicleInventoryRemediationCategory,
} from "@/features/inventory/vehicles/contracts/vehicle-inventory.schema";

export type RemediationRetryIntent =
  | Readonly<{
      category: "MISSING_VARIANT";
      idempotencyPrefix: string;
      chargerSelections: readonly VehicleInventoryChargerSelection[];
      batteryConfigurations: readonly VehicleInventoryBatteryConfigurationSelection[];
      targetUnitId?: string;
    }>
  | Readonly<{
      category: "UNKNOWN_ARRIVAL_DATE";
      idempotencyPrefix: string;
      arrivals: readonly VehicleInventoryArrivalUpdate[];
    }>;

export type IssueLoadResume = "ARRIVAL_DATES" | "POST_REMEDIATION_VARIANTS";

export type InventoryReviewRecovery =
  | Readonly<{
      kind: "REMEDIATION";
      intent: RemediationRetryIntent;
    }>
  | Readonly<{
      kind: "ISSUES";
      category: VehicleInventoryRemediationCategory;
      resume: IssueLoadResume;
    }>;

export type InventoryReviewRecoveryPresentation = Readonly<{
  dialogTitle: string;
  alertTitle: string;
  guidance: string;
  retryLabel: string;
  correctionCompleted: boolean;
}>;

export function inventoryReviewRecoveryPresentation(
  recovery: InventoryReviewRecovery | null,
): InventoryReviewRecoveryPresentation {
  if (
    recovery?.kind === "ISSUES" &&
    recovery.resume === "POST_REMEDIATION_VARIANTS"
  ) {
    return {
      dialogTitle: "Correction completed",
      alertTitle: "Remaining issues could not be refreshed",
      guidance:
        "The correction was saved. Retry only the remaining-issue refresh; this will not submit the correction again.",
      retryLabel: "Retry review refresh",
      correctionCompleted: true,
    };
  }

  if (recovery?.kind === "ISSUES") {
    return {
      dialogTitle: "Inventory review could not continue",
      alertTitle: "Review details could not be loaded",
      guidance:
        "Retry loading the review details. No inventory correction has been submitted.",
      retryLabel: "Retry review",
      correctionCompleted: false,
    };
  }

  if (recovery?.kind === "REMEDIATION") {
    return {
      dialogTitle: "Inventory review could not continue",
      alertTitle: "Correction could not continue",
      guidance:
        "Retry uses the same idempotency key, so a completed correction cannot be duplicated. Retry once; if it still fails, share the reference above with ERP support.",
      retryLabel: "Retry correction",
      correctionCompleted: false,
    };
  }

  return {
    dialogTitle: "Inventory review could not continue",
    alertTitle: "Inventory review could not continue",
    guidance:
      "Return to issues and refresh the review. If the problem continues, share the reference above with ERP support.",
    retryLabel: "Retry review",
    correctionCompleted: false,
  };
}
