// oz-next-app/src/features/inventory/components/actions/component-inventory.actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAuthenticatedMe } from "@/features/auth/server/require-auth";
import { API_CONFIG } from "@/lib/api/http-contract";
import { isApiHttpError } from "@/lib/api/problem";
import { assertSameOriginMutation } from "@/server/security/origin";

import {
  attachComponentActionInputSchema,
  componentDefinitionsSearchActionInputSchema,
  componentEvidenceStatusActionInputSchema,
  componentHistoryActionInputSchema,
  componentStateMutationActionInputSchema,
  correctComponentActionInputSchema,
  createComponentDefinitionActionInputSchema,
  createComponentEvidenceUploadActionInputSchema,
  createPhysicalComponentActionInputSchema,
  finalizeComponentEvidenceUploadActionInputSchema,
  replacementOptionsActionInputSchema,
  reconcileComponentsActionInputSchema,
  replaceComponentActionInputSchema,
  transferComponentActionInputSchema,
  updateComponentDefinitionActionInputSchema,
  type ComponentAttachmentResult,
  type ComponentDefinitionSummary,
  type ComponentEvidenceStatus,
  type ComponentEvidenceUploadIntent,
  type ComponentHistoryResult,
  type ComponentInventoryItem,
  type ComponentReplacementOptionsResult,
  type ComponentReplacementResult,
  type ComponentReconciliationResult,
  type ComponentStateMutationResult,
  type ComponentTransferResult,
} from "@/features/inventory/components/contracts/component-inventory.schema";
import { resolveComponentInventoryAccess } from "@/features/inventory/components/policies/component-inventory.policy";
import {
  attachComponent,
  correctPhysicalComponent,
  createAndDispatchComponentTransfer,
  createComponentDefinition,
  createComponentEvidenceUpload,
  createPhysicalComponent,
  finalizeComponentEvidenceUpload,
  listComponentDefinitions,
  quarantineComponent,
  readComponentEvidenceStatus,
  readComponentHistory,
  readReplacementOptions,
  releaseComponent,
  reconcileComponents,
  replaceComponent,
  updateComponentDefinition,
} from "@/features/inventory/components/server/component-inventory.server";

const COMPONENT_INVENTORY_PATH = "/inventory/components";

type ComponentCapability =
  | "read"
  | "create"
  | "update"
  | "update_definition"
  | "attach"
  | "replace"
  | "transfer"
  | "quarantine"
  | "reconcile"
  | "audit";

type ComponentOperation =
  | "history"
  | "definitions"
  | "create_definition"
  | "update_definition"
  | "create_physical"
  | "attach"
  | "replace"
  | "transfer"
  | "state"
  | "reconcile"
  | "evidence"
  | "correction";

export type ComponentActionFailure = Readonly<{
  ok: false;
  code: string;
  message: string;
  requestId?: string;
  retryAfterSeconds?: number;
}>;

export type ComponentHistoryActionResult =
  Readonly<{ ok: true; data: ComponentHistoryResult }> | ComponentActionFailure;
export type ComponentDefinitionsActionResult =
  | Readonly<{ ok: true; data: readonly ComponentDefinitionSummary[] }>
  | ComponentActionFailure;
export type ComponentDefinitionActionResult =
  | Readonly<{ ok: true; data: ComponentDefinitionSummary }>
  | ComponentActionFailure;
export type ComponentPhysicalActionResult =
  Readonly<{ ok: true; data: ComponentInventoryItem }> | ComponentActionFailure;
export type ComponentStateActionResult =
  | Readonly<{ ok: true; data: ComponentStateMutationResult }>
  | ComponentActionFailure;
export type ComponentAttachmentActionResult =
  | Readonly<{ ok: true; data: ComponentAttachmentResult }>
  | ComponentActionFailure;
export type ComponentReplacementOptionsActionResult =
  | Readonly<{ ok: true; data: ComponentReplacementOptionsResult }>
  | ComponentActionFailure;
export type ComponentReplacementActionResult =
  | Readonly<{ ok: true; data: ComponentReplacementResult }>
  | ComponentActionFailure;
export type ComponentTransferActionResult =
  | Readonly<{ ok: true; data: ComponentTransferResult }>
  | ComponentActionFailure;
export type ComponentEvidenceUploadActionResult =
  | Readonly<{ ok: true; data: ComponentEvidenceUploadIntent }>
  | ComponentActionFailure;
export type ComponentEvidenceStatusActionResult =
  | Readonly<{ ok: true; data: ComponentEvidenceStatus }>
  | ComponentActionFailure;
export type ComponentReconciliationActionResult =
  | Readonly<{ ok: true; data: ComponentReconciliationResult }>
  | ComponentActionFailure;

class ComponentActionAccessError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "ComponentActionAccessError";
  }
}

function capabilityMessage(operation: ComponentOperation): string {
  switch (operation) {
    case "history":
      return "You are not authorized to view this component history.";
    case "definitions":
      return "You are not authorized to read component definitions.";
    case "create_definition":
      return "You are not authorized to create component masters.";
    case "create_physical":
      return "You are not authorized to create physical component inventory.";
    case "update_definition":
      return "You are not authorized to update component master data.";
    case "attach":
      return "You are not authorized to attach components to vehicles.";
    case "replace":
      return "You are not authorized to replace vehicle components.";
    case "transfer":
      return "You are not authorized to transfer components between stores.";
    case "state":
      return "You are not authorized to change component custody state.";
    case "reconcile":
      return "You are not authorized to reconcile unlocated component custody.";
    case "evidence":
    case "correction":
      return "You are not authorized to correct component identity or metadata.";
  }
}

function failure(
  error: unknown,
  operation: ComponentOperation,
): ComponentActionFailure {
  if (error instanceof ComponentActionAccessError) {
    return {
      ok: false,
      code: "component_inventory_action_forbidden",
      message: capabilityMessage(operation),
    };
  }

  if (error instanceof z.ZodError) {
    return {
      ok: false,
      code: "component_inventory_validation_failed",
      message: error.issues[0]?.message ?? "The component request is invalid.",
    };
  }

  if (isApiHttpError(error)) {
    const requestId = error.requestId?.trim();
    const base = {
      ok: false as const,
      code: error.code,
      ...(requestId !== undefined && requestId.length > 0 ? { requestId } : {}),
      ...(error.retryAfterSeconds === undefined
        ? {}
        : { retryAfterSeconds: error.retryAfterSeconds }),
    };

    if (error.status === 401) {
      return {
        ...base,
        message: "Your session is no longer valid. Sign in again and retry.",
      };
    }
    if (error.status === 403) {
      return { ...base, message: capabilityMessage(operation) };
    }
    if (error.status === 404) {
      return {
        ...base,
        message:
          "This component or target resource is no longer available in your authorized scope.",
      };
    }
    if (error.code === "COMPONENT_TRANSFER_REQUIRED") {
      return {
        ...base,
        message:
          "The component and target vehicle are in different stores. Transfer and receive the component at the vehicle store before installation.",
      };
    }
    if (error.code === "COMPONENT_REPLACEMENT_SELECTION_REQUIRED") {
      return {
        ...base,
        message:
          "More than one matching installed component exists. The current API does not expose the installed attachment IDs required for a deterministic selection; no replacement was performed.",
      };
    }
    if (error.code === "COMPONENT_NOT_COMPATIBLE") {
      return {
        ...base,
        message:
          "The selected component is not compatible with the target vehicle configuration.",
      };
    }
    if (error.code === "COMPONENT_EVIDENCE_REQUIRED") {
      return {
        ...base,
        message:
          "A newly captured, finalized, malware-scanned component image is required before this correction can be applied.",
      };
    }
    if (error.status === 409) {
      return {
        ...base,
        message:
          "The component changed after this screen loaded. Refresh the record and retry with the latest custody/version state.",
      };
    }
    if (error.status === 422) {
      return {
        ...base,
        message:
          error.message ||
          "The component operation is not valid for its current state.",
      };
    }
    if (error.status === 429) {
      return {
        ...base,
        message:
          error.retryAfterSeconds === undefined
            ? "Too many component requests were submitted. Wait briefly and retry."
            : `Too many component requests were submitted. Retry after approximately ${String(error.retryAfterSeconds)} seconds.`,
      };
    }
    if (error.status >= 500) {
      return {
        ...base,
        message:
          "Component management is temporarily unavailable. Retry the same intent without changing its idempotency key.",
      };
    }

    return {
      ...base,
      message: "The component request could not be completed safely.",
    };
  }

  return {
    ok: false,
    code: "component_inventory_action_failed",
    message: "The component request could not be completed safely.",
  };
}

async function requireComponentAccess(
  tenantId: string,
  capability: ComponentCapability,
) {
  await assertSameOriginMutation(API_CONFIG.appOrigin);
  const me = await requireAuthenticatedMe();
  const access = resolveComponentInventoryAccess(me);

  if (access.kind !== "resolved" || !access.capabilities.canRead) {
    throw new ComponentActionAccessError(
      "Component inventory read access is unavailable.",
    );
  }
  if (access.tenantId !== tenantId) {
    throw new ComponentActionAccessError(
      "Component inventory tenant context does not match.",
    );
  }

  const allowed =
    capability === "read" ||
    (capability === "create" && access.capabilities.canCreate) ||
    (capability === "update" && access.capabilities.canUpdate) ||
    (capability === "update_definition" &&
      access.capabilities.canUpdateDefinition) ||
    (capability === "attach" && access.capabilities.canAttach) ||
    (capability === "replace" && access.capabilities.canReplace) ||
    (capability === "transfer" && access.capabilities.canTransfer) ||
    (capability === "quarantine" && access.capabilities.canQuarantine) ||
    (capability === "reconcile" && access.capabilities.canReconcile) ||
    (capability === "audit" && access.capabilities.canReadAudit);

  if (!allowed) {
    throw new ComponentActionAccessError(
      `Component capability ${capability} is unavailable.`,
    );
  }

  return access;
}

function revalidateComponentInventory(): void {
  revalidatePath(COMPONENT_INVENTORY_PATH);
}

export async function loadComponentHistoryAction(
  input: z.input<typeof componentHistoryActionInputSchema>,
): Promise<ComponentHistoryActionResult> {
  try {
    const parsed = componentHistoryActionInputSchema.parse(input);
    const access = await requireComponentAccess(
      parsed.context.tenantId,
      "audit",
    );
    const data = await readComponentHistory({
      access,
      componentInventoryId: parsed.componentInventoryId,
    });
    return { ok: true, data };
  } catch (error: unknown) {
    return failure(error, "history");
  }
}

export async function searchComponentDefinitionsAction(
  input: z.input<typeof componentDefinitionsSearchActionInputSchema>,
): Promise<ComponentDefinitionsActionResult> {
  try {
    const parsed = componentDefinitionsSearchActionInputSchema.parse(input);
    const access = await requireComponentAccess(
      parsed.context.tenantId,
      "read",
    );
    const data = await listComponentDefinitions({
      access,
      ...(parsed.q === undefined ? {} : { q: parsed.q }),
      ...(parsed.componentType === undefined
        ? {}
        : { componentType: parsed.componentType }),
      limit: parsed.limit,
    });
    return { ok: true, data };
  } catch (error: unknown) {
    return failure(error, "definitions");
  }
}

export async function createComponentDefinitionAction(
  input: z.input<typeof createComponentDefinitionActionInputSchema>,
): Promise<ComponentDefinitionActionResult> {
  try {
    const parsed = createComponentDefinitionActionInputSchema.parse(input);
    const access = await requireComponentAccess(
      parsed.context.tenantId,
      "create",
    );
    const data = await createComponentDefinition({
      access,
      code: parsed.code,
      name: parsed.name,
      type: parsed.type,
      uomCode: parsed.uomCode,
      isSerialized: parsed.isSerialized,
      trackLot: parsed.trackLot,
      idempotencyKey: parsed.idempotencyKey,
    });
    revalidateComponentInventory();
    return { ok: true, data };
  } catch (error: unknown) {
    return failure(error, "create_definition");
  }
}

export async function updateComponentDefinitionAction(
  input: z.input<typeof updateComponentDefinitionActionInputSchema>,
): Promise<ComponentDefinitionActionResult> {
  try {
    const parsed = updateComponentDefinitionActionInputSchema.parse(input);
    const access = await requireComponentAccess(
      parsed.context.tenantId,
      "update_definition",
    );
    const data = await updateComponentDefinition({
      access,
      componentId: parsed.componentId,
      rowVersion: parsed.rowVersion,
      ...(parsed.name === undefined ? {} : { name: parsed.name }),
      ...(parsed.uomCode === undefined ? {} : { uomCode: parsed.uomCode }),
      ...(parsed.isSerialized === undefined
        ? {}
        : { isSerialized: parsed.isSerialized }),
      ...(parsed.trackLot === undefined ? {} : { trackLot: parsed.trackLot }),
      idempotencyKey: parsed.idempotencyKey,
    });
    revalidateComponentInventory();
    return { ok: true, data };
  } catch (error: unknown) {
    return failure(error, "update_definition");
  }
}

export async function createPhysicalComponentAction(
  input: z.input<typeof createPhysicalComponentActionInputSchema>,
): Promise<ComponentPhysicalActionResult> {
  try {
    const parsed = createPhysicalComponentActionInputSchema.parse(input);
    const access = await requireComponentAccess(
      parsed.context.tenantId,
      "create",
    );
    const data = await createPhysicalComponent({
      access,
      componentId: parsed.componentId,
      storeId: parsed.storeId,
      serialNumber: parsed.serialNumber,
      lotNumber: parsed.lotNumber,
      expiryDate: parsed.expiryDate,
      batteryConfiguration: parsed.batteryConfiguration,
      reason: parsed.reason,
      idempotencyKey: parsed.idempotencyKey,
    });
    revalidateComponentInventory();
    return { ok: true, data };
  } catch (error: unknown) {
    return failure(error, "create_physical");
  }
}

export async function attachComponentAction(
  input: z.input<typeof attachComponentActionInputSchema>,
): Promise<ComponentAttachmentActionResult> {
  try {
    const parsed = attachComponentActionInputSchema.parse(input);
    const access = await requireComponentAccess(
      parsed.context.tenantId,
      "attach",
    );
    const data = await attachComponent({
      access,
      componentInventoryId: parsed.componentInventoryId,
      unitId: parsed.unitId,
      custodyRowVersion: parsed.custodyRowVersion,
      reason: parsed.reason,
      idempotencyKey: parsed.idempotencyKey,
    });
    revalidateComponentInventory();
    return { ok: true, data };
  } catch (error: unknown) {
    return failure(error, "attach");
  }
}

export async function loadReplacementOptionsAction(
  input: z.input<typeof replacementOptionsActionInputSchema>,
): Promise<ComponentReplacementOptionsActionResult> {
  try {
    const parsed = replacementOptionsActionInputSchema.parse(input);
    const access = await requireComponentAccess(
      parsed.context.tenantId,
      "replace",
    );
    const data = await readReplacementOptions({
      access,
      componentInventoryId: parsed.componentInventoryId,
      unitId: parsed.unitId,
      limit: parsed.limit,
    });
    return { ok: true, data };
  } catch (error: unknown) {
    return failure(error, "replace");
  }
}

export async function replaceComponentAction(
  input: z.input<typeof replaceComponentActionInputSchema>,
): Promise<ComponentReplacementActionResult> {
  try {
    const parsed = replaceComponentActionInputSchema.parse(input);
    const access = await requireComponentAccess(
      parsed.context.tenantId,
      "replace",
    );
    const data = await replaceComponent({
      access,
      newComponentInventoryId: parsed.newComponentInventoryId,
      unitId: parsed.unitId,
      newComponentCustodyRowVersion: parsed.newComponentCustodyRowVersion,
      ...(parsed.oldUnitComponentId === undefined
        ? {}
        : { oldUnitComponentId: parsed.oldUnitComponentId }),
      removedDisposition: parsed.removedDisposition,
      reason: parsed.reason,
      idempotencyKey: parsed.idempotencyKey,
    });
    revalidateComponentInventory();
    return { ok: true, data };
  } catch (error: unknown) {
    return failure(error, "replace");
  }
}

export async function transferComponentAction(
  input: z.input<typeof transferComponentActionInputSchema>,
): Promise<ComponentTransferActionResult> {
  try {
    const parsed = transferComponentActionInputSchema.parse(input);
    const access = await requireComponentAccess(
      parsed.context.tenantId,
      "transfer",
    );
    const data = await createAndDispatchComponentTransfer({
      access,
      fromStoreId: parsed.fromStoreId,
      toStoreId: parsed.toStoreId,
      componentInventoryIds: parsed.componentInventoryIds,
      reason: parsed.reason,
      idempotencyKey: parsed.idempotencyKey,
    });
    revalidateComponentInventory();
    return { ok: true, data };
  } catch (error: unknown) {
    return failure(error, "transfer");
  }
}

async function runStateMutation(
  input: z.input<typeof componentStateMutationActionInputSchema>,
  action: "quarantine" | "release",
): Promise<ComponentStateActionResult> {
  try {
    const parsed = componentStateMutationActionInputSchema.parse(input);
    const access = await requireComponentAccess(
      parsed.context.tenantId,
      "quarantine",
    );
    const mutationInput = {
      access,
      componentInventoryId: parsed.componentInventoryId,
      custodyRowVersion: parsed.custodyRowVersion,
      reason: parsed.reason,
      idempotencyKey: parsed.idempotencyKey,
    } as const;
    const data =
      action === "quarantine"
        ? await quarantineComponent(mutationInput)
        : await releaseComponent(mutationInput);
    revalidateComponentInventory();
    return { ok: true, data };
  } catch (error: unknown) {
    return failure(error, "state");
  }
}

export async function quarantineComponentAction(
  input: z.input<typeof componentStateMutationActionInputSchema>,
): Promise<ComponentStateActionResult> {
  return await runStateMutation(input, "quarantine");
}

export async function releaseComponentAction(
  input: z.input<typeof componentStateMutationActionInputSchema>,
): Promise<ComponentStateActionResult> {
  return await runStateMutation(input, "release");
}

export async function reconcileComponentsAction(
  input: z.input<typeof reconcileComponentsActionInputSchema>,
): Promise<ComponentReconciliationActionResult> {
  try {
    const parsed = reconcileComponentsActionInputSchema.parse(input);
    const access = await requireComponentAccess(
      parsed.context.tenantId,
      "reconcile",
    );
    const data = await reconcileComponents({
      access,
      components: parsed.components,
      storeId: parsed.storeId,
      reason: parsed.reason,
      idempotencyKey: parsed.idempotencyKey,
    });
    revalidateComponentInventory();
    return { ok: true, data };
  } catch (error: unknown) {
    return failure(error, "reconcile");
  }
}

export async function createComponentEvidenceUploadAction(
  input: z.input<typeof createComponentEvidenceUploadActionInputSchema>,
): Promise<ComponentEvidenceUploadActionResult> {
  try {
    const parsed = createComponentEvidenceUploadActionInputSchema.parse(input);
    const access = await requireComponentAccess(
      parsed.context.tenantId,
      "update",
    );
    const data = await createComponentEvidenceUpload({
      access,
      componentInventoryId: parsed.componentInventoryId,
      fileName: parsed.fileName,
      contentType: parsed.contentType,
      sizeBytes: parsed.sizeBytes,
      checksumSha256: parsed.checksumSha256,
      idempotencyKey: parsed.idempotencyKey,
    });
    return { ok: true, data };
  } catch (error: unknown) {
    return failure(error, "evidence");
  }
}

export async function finalizeComponentEvidenceUploadAction(
  input: z.input<typeof finalizeComponentEvidenceUploadActionInputSchema>,
): Promise<ComponentEvidenceStatusActionResult> {
  try {
    const parsed =
      finalizeComponentEvidenceUploadActionInputSchema.parse(input);
    const access = await requireComponentAccess(
      parsed.context.tenantId,
      "update",
    );
    const data = await finalizeComponentEvidenceUpload({
      access,
      uploadId: parsed.uploadId,
      checksumSha256: parsed.checksumSha256,
      sizeBytes: parsed.sizeBytes,
      captureChallenge: parsed.captureChallenge,
      capturedAt: parsed.capturedAt,
      location: parsed.location,
      idempotencyKey: parsed.idempotencyKey,
    });
    return { ok: true, data };
  } catch (error: unknown) {
    return failure(error, "evidence");
  }
}

export async function loadComponentEvidenceStatusAction(
  input: z.input<typeof componentEvidenceStatusActionInputSchema>,
): Promise<ComponentEvidenceStatusActionResult> {
  try {
    const parsed = componentEvidenceStatusActionInputSchema.parse(input);
    const access = await requireComponentAccess(
      parsed.context.tenantId,
      "update",
    );
    const data = await readComponentEvidenceStatus({
      access,
      evidenceId: parsed.evidenceId,
    });
    return { ok: true, data };
  } catch (error: unknown) {
    return failure(error, "evidence");
  }
}

export async function correctComponentAction(
  input: z.input<typeof correctComponentActionInputSchema>,
): Promise<ComponentPhysicalActionResult> {
  try {
    const parsed = correctComponentActionInputSchema.parse(input);
    const access = await requireComponentAccess(
      parsed.context.tenantId,
      "update",
    );
    const data = await correctPhysicalComponent({
      access,
      componentInventoryId: parsed.componentInventoryId,
      inventoryRowVersion: parsed.inventoryRowVersion,
      evidenceId: parsed.evidenceId,
      reason: parsed.reason,
      ...(parsed.serialNumber === undefined
        ? {}
        : { serialNumber: parsed.serialNumber }),
      ...(parsed.lotNumber === undefined
        ? {}
        : { lotNumber: parsed.lotNumber }),
      ...(parsed.expiryDate === undefined
        ? {}
        : { expiryDate: parsed.expiryDate }),
      ...(parsed.metadata === undefined ? {} : { metadata: parsed.metadata }),
      idempotencyKey: parsed.idempotencyKey,
    });
    revalidateComponentInventory();
    return { ok: true, data };
  } catch (error: unknown) {
    return failure(error, "correction");
  }
}
