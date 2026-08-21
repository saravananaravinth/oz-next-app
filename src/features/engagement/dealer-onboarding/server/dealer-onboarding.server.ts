// oz-next-app/src/features/engagement/dealer-onboarding/server/dealer-onboarding.server.ts
import "server-only";

import { createErpFeatureClient } from "@/features/erp-core/api/erp-feature.client.server";
import { HTTP_METHODS } from "@/lib/api/http-contract";

import {
  dealerDirectoryDetailSchema,
  dealerDirectoryPageSchema,
  dealerDocumentDownloadResultSchema,
  dealerDocumentSchema,
  dealerFileStatusSchema,
  dealerOnboardingGstinPrefillResultSchema,
  dealerOnboardingMarginGridSchema,
  dealerOnboardingOptionsSchema,
  dealerOnboardingPreflightResultSchema,
  dealerOnboardingProvisionResultSchema,
  dealerUploadCancelResultSchema,
  dealerUploadIntentResultSchema,
  type DealerContactCreateBody,
  type DealerContactUpdateBody,
  type DealerDirectoryDetail,
  type DealerDirectoryListQuery,
  type DealerDirectoryPage,
  type DealerDocument,
  type DealerDocumentBindBody,
  type DealerDocumentDownloadResult,
  type DealerFileStatus,
  type DealerMarginUpdateBody,
  type DealerOnboardingGstinPrefillBody,
  type DealerOnboardingGstinPrefillResult,
  type DealerOnboardingMarginsQuery,
  type DealerOnboardingMarginGrid,
  type DealerOnboardingOptions,
  type DealerOnboardingOptionsQuery,
  type DealerOnboardingPreflightBody,
  type DealerOnboardingPreflightResult,
  type DealerOnboardingProvisionBody,
  type DealerOnboardingProvisionResult,
  type DealerProfileUpdateBody,
  type DealerUploadFinalizeBody,
  type DealerUploadIntentBody,
  type DealerUploadIntentResult,
} from "@/features/engagement/dealer-onboarding/contracts/dealer-onboarding.schema";
import type { ResolvedDealerAdministrationAccess } from "@/features/engagement/dealer-onboarding/policies/dealer-onboarding.policy";

const dealerAdministrationClient = createErpFeatureClient({
  featureName: "engagement.dealer-administration",
  basePath: "/erp/engagement/dealers",
});

function segment(value: string): string {
  return encodeURIComponent(value);
}

export async function readDealerDirectory(
  input: Readonly<{
    access: ResolvedDealerAdministrationAccess;
    query: DealerDirectoryListQuery;
  }>,
): Promise<DealerDirectoryPage> {
  return await dealerAdministrationClient.request({
    method: HTTP_METHODS.GET,
    path: "/",
    query: input.query,
    schema: dealerDirectoryPageSchema,
    ...(input.access.actorContext === undefined
      ? {}
      : { actorContext: input.access.actorContext }),
  });
}

export async function readDealerDirectoryDetail(
  input: Readonly<{
    access: ResolvedDealerAdministrationAccess;
    dealerOrgUnitId: string;
  }>,
): Promise<DealerDirectoryDetail> {
  return await dealerAdministrationClient.request({
    method: HTTP_METHODS.GET,
    path: `/${segment(input.dealerOrgUnitId)}`,
    schema: dealerDirectoryDetailSchema,
    ...(input.access.actorContext === undefined
      ? {}
      : { actorContext: input.access.actorContext }),
  });
}

export async function createDealerContact(
  input: Readonly<{
    access: ResolvedDealerAdministrationAccess;
    dealerOrgUnitId: string;
    body: DealerContactCreateBody;
  }>,
): Promise<DealerDirectoryDetail> {
  return await dealerAdministrationClient.request({
    method: HTTP_METHODS.POST,
    path: `/${segment(input.dealerOrgUnitId)}/contacts`,
    body: input.body,
    schema: dealerDirectoryDetailSchema,
    refreshOnUnauthorized: false,
    ...(input.access.actorContext === undefined
      ? {}
      : { actorContext: input.access.actorContext }),
  });
}

export async function updateDealerContact(
  input: Readonly<{
    access: ResolvedDealerAdministrationAccess;
    dealerOrgUnitId: string;
    userId: string;
    body: DealerContactUpdateBody;
  }>,
): Promise<DealerDirectoryDetail> {
  return await dealerAdministrationClient.request({
    method: HTTP_METHODS.PATCH,
    path: `/${segment(input.dealerOrgUnitId)}/contacts/${segment(input.userId)}`,
    body: input.body,
    schema: dealerDirectoryDetailSchema,
    refreshOnUnauthorized: false,
    ...(input.access.actorContext === undefined
      ? {}
      : { actorContext: input.access.actorContext }),
  });
}

export async function updateDealerDirectoryProfile(
  input: Readonly<{
    access: ResolvedDealerAdministrationAccess;
    dealerOrgUnitId: string;
    body: DealerProfileUpdateBody;
  }>,
): Promise<DealerDirectoryDetail> {
  return await dealerAdministrationClient.request({
    method: HTTP_METHODS.PATCH,
    path: `/${segment(input.dealerOrgUnitId)}/profile`,
    body: input.body,
    schema: dealerDirectoryDetailSchema,
    refreshOnUnauthorized: false,
    ...(input.access.actorContext === undefined
      ? {}
      : { actorContext: input.access.actorContext }),
  });
}

export async function updateDealerDirectoryMargins(
  input: Readonly<{
    access: ResolvedDealerAdministrationAccess;
    dealerOrgUnitId: string;
    body: DealerMarginUpdateBody;
  }>,
): Promise<DealerDirectoryDetail> {
  return await dealerAdministrationClient.request({
    method: HTTP_METHODS.POST,
    path: `/${segment(input.dealerOrgUnitId)}/margins`,
    body: input.body,
    schema: dealerDirectoryDetailSchema,
    refreshOnUnauthorized: false,
    ...(input.access.actorContext === undefined
      ? {}
      : { actorContext: input.access.actorContext }),
  });
}

export async function runDealerOnboardingPreflight(
  input: Readonly<{
    access: ResolvedDealerAdministrationAccess;
    body: DealerOnboardingPreflightBody;
  }>,
): Promise<DealerOnboardingPreflightResult> {
  return await dealerAdministrationClient.request({
    method: HTTP_METHODS.POST,
    path: "/onboarding/preflight",
    body: input.body,
    schema: dealerOnboardingPreflightResultSchema,
    refreshOnUnauthorized: false,
    ...(input.access.actorContext === undefined
      ? {}
      : { actorContext: input.access.actorContext }),
  });
}

export async function readDealerOnboardingGstinPrefill(
  input: Readonly<{
    access: ResolvedDealerAdministrationAccess;
    body: DealerOnboardingGstinPrefillBody;
  }>,
): Promise<DealerOnboardingGstinPrefillResult> {
  return await dealerAdministrationClient.request({
    method: HTTP_METHODS.POST,
    path: "/onboarding/gstin-prefill",
    body: input.body,
    schema: dealerOnboardingGstinPrefillResultSchema,
    refreshOnUnauthorized: false,
    ...(input.access.actorContext === undefined
      ? {}
      : { actorContext: input.access.actorContext }),
  });
}

export async function readDealerOnboardingOptions(
  input: Readonly<{
    access: ResolvedDealerAdministrationAccess;
    query: DealerOnboardingOptionsQuery;
  }>,
): Promise<DealerOnboardingOptions> {
  return await dealerAdministrationClient.request({
    method: HTTP_METHODS.GET,
    path: "/onboarding/options",
    query: input.query,
    schema: dealerOnboardingOptionsSchema,
    ...(input.access.actorContext === undefined
      ? {}
      : { actorContext: input.access.actorContext }),
  });
}

export async function readDealerOnboardingMargins(
  input: Readonly<{
    access: ResolvedDealerAdministrationAccess;
    query: DealerOnboardingMarginsQuery;
  }>,
): Promise<DealerOnboardingMarginGrid> {
  return await dealerAdministrationClient.request({
    method: HTTP_METHODS.GET,
    path: "/onboarding/margins",
    query: input.query,
    schema: dealerOnboardingMarginGridSchema,
    ...(input.access.actorContext === undefined
      ? {}
      : { actorContext: input.access.actorContext }),
  });
}

export async function provisionDealerOnboarding(
  input: Readonly<{
    access: ResolvedDealerAdministrationAccess;
    body: DealerOnboardingProvisionBody;
    idempotencyKey: string;
  }>,
): Promise<DealerOnboardingProvisionResult> {
  return await dealerAdministrationClient.create(
    input.body,
    dealerOnboardingProvisionResultSchema,
    input.idempotencyKey,
    "/onboarding",
    input.access.actorContext,
  );
}

export async function createDealerDocumentUploadIntent(
  input: Readonly<{
    access: ResolvedDealerAdministrationAccess;
    body: DealerUploadIntentBody;
  }>,
): Promise<DealerUploadIntentResult> {
  return await dealerAdministrationClient.request({
    method: HTTP_METHODS.POST,
    path: "/uploads",
    body: input.body,
    schema: dealerUploadIntentResultSchema,
    refreshOnUnauthorized: false,
    ...(input.access.actorContext === undefined
      ? {}
      : { actorContext: input.access.actorContext }),
  });
}

export async function finalizeDealerDocumentUpload(
  input: Readonly<{
    access: ResolvedDealerAdministrationAccess;
    body: DealerUploadFinalizeBody;
  }>,
): Promise<DealerFileStatus> {
  return await dealerAdministrationClient.request({
    method: HTTP_METHODS.POST,
    path: `/uploads/${segment(input.body.uploadId)}/finalize`,
    body: {
      checksumSha256: input.body.checksumSha256,
      sizeBytes: input.body.sizeBytes,
    },
    schema: dealerFileStatusSchema,
    refreshOnUnauthorized: false,
    ...(input.access.actorContext === undefined
      ? {}
      : { actorContext: input.access.actorContext }),
  });
}

export async function cancelDealerDocumentUpload(
  input: Readonly<{
    access: ResolvedDealerAdministrationAccess;
    uploadId: string;
  }>,
): Promise<void> {
  await dealerAdministrationClient.request({
    method: HTTP_METHODS.DELETE,
    path: `/uploads/${segment(input.uploadId)}`,
    schema: dealerUploadCancelResultSchema,
    refreshOnUnauthorized: false,
    ...(input.access.actorContext === undefined
      ? {}
      : { actorContext: input.access.actorContext }),
  });
}

export async function readDealerDocumentFileStatus(
  input: Readonly<{
    access: ResolvedDealerAdministrationAccess;
    fileId: string;
  }>,
): Promise<DealerFileStatus> {
  return await dealerAdministrationClient.request({
    method: HTTP_METHODS.GET,
    path: `/files/${segment(input.fileId)}`,
    schema: dealerFileStatusSchema,
    ...(input.access.actorContext === undefined
      ? {}
      : { actorContext: input.access.actorContext }),
  });
}

export async function bindDealerDocument(
  input: Readonly<{
    access: ResolvedDealerAdministrationAccess;
    body: DealerDocumentBindBody;
  }>,
): Promise<DealerDocument> {
  return await dealerAdministrationClient.request({
    method: HTTP_METHODS.POST,
    path: `/${segment(input.body.dealerOrgUnitId)}/documents`,
    body: {
      fileId: input.body.fileId,
      kind: input.body.kind,
      ...(input.body.expiresAt === undefined
        ? {}
        : { expiresAt: input.body.expiresAt }),
      ...(input.body.note === undefined ? {} : { note: input.body.note }),
    },
    schema: dealerDocumentSchema,
    refreshOnUnauthorized: false,
    ...(input.access.actorContext === undefined
      ? {}
      : { actorContext: input.access.actorContext }),
  });
}

export async function readDealerDocumentDownload(
  input: Readonly<{
    access: ResolvedDealerAdministrationAccess;
    dealerOrgUnitId: string;
    dealerDocumentId: string;
  }>,
): Promise<DealerDocumentDownloadResult> {
  return await dealerAdministrationClient.request({
    method: HTTP_METHODS.GET,
    path: `/${segment(input.dealerOrgUnitId)}/documents/${segment(input.dealerDocumentId)}/download`,
    schema: dealerDocumentDownloadResultSchema,
    ...(input.access.actorContext === undefined
      ? {}
      : { actorContext: input.access.actorContext }),
  });
}
