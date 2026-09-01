// oz-next-app/src/app/api/credit-notes/invoices/[invoiceProjectionId]/document/route.ts
import "server-only";

import type { NextRequest } from "next/server";
import { z } from "zod";

import { requireAuthenticatedMe } from "@/features/auth/server/require-auth";
import { resolveWalletAccess } from "@/features/wallet/policies/wallet.policy";
import { readCreditNotePurchaseInvoiceDocumentResponse } from "@/features/wallet/server/wallet.server";
import { CT, HTTP_STATUS } from "@/lib/api/http-contract";
import { isApiHttpError } from "@/lib/api/problem";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

const routeParamsSchema = z
  .object({
    invoiceProjectionId: z.uuid(),
  })
  .strict();
const documentQuerySchema = z
  .object({
    disposition: z.enum(["inline", "attachment"]).default("inline"),
  })
  .strict();
const SAFE_CONTENT_DISPOSITION_PATTERN =
  /^(?:inline|attachment); filename="zoho-invoice-[A-Za-z0-9._-]{1,240}\.pdf"$/u;
const SAFE_REFERENCE_PATTERN = /^[A-Za-z0-9_.:/@-]{1,128}$/u;
const NO_STORE = "private, no-store, no-cache, must-revalidate";
const MAX_INVOICE_PDF_BYTES = 10 * 1024 * 1024;

type RouteContext = Readonly<{
  params: Promise<Readonly<{ invoiceProjectionId: string }>>;
}>;

function problemResponse(
  input: Readonly<{
    status: number;
    code: string;
    title: string;
    detail: string;
    requestId?: string;
  }>,
): Response {
  const requestId =
    input.requestId !== undefined &&
    SAFE_REFERENCE_PATTERN.test(input.requestId)
      ? input.requestId
      : crypto.randomUUID();

  return Response.json(
    {
      type: "about:blank",
      title: input.title,
      status: input.status,
      detail: input.detail,
      code: input.code,
      request_id: requestId,
      timestamp: new Date().toISOString(),
    },
    {
      status: input.status,
      headers: {
        "Cache-Control": NO_STORE,
        "Content-Type": CT.PROBLEM_JSON,
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}

export async function GET(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  const [paramsValue, me] = await Promise.all([
    context.params,
    requireAuthenticatedMe(),
  ]);
  const params = routeParamsSchema.safeParse(paramsValue);
  const query = documentQuerySchema.safeParse({
    disposition: request.nextUrl.searchParams.get("disposition") ?? undefined,
  });

  if (!params.success || !query.success) {
    return problemResponse({
      status: HTTP_STATUS.BAD_REQUEST,
      code: "CREDIT_NOTE_DOCUMENT_REQUEST_INVALID",
      title: "Invoice document request invalid",
      detail: "The Credit Note purchase invoice document request is invalid.",
    });
  }

  const access = resolveWalletAccess(me);
  if (
    access.kind === "forbidden" ||
    !access.capabilities.canReadCreditNoteDocuments
  ) {
    return problemResponse({
      status: HTTP_STATUS.FORBIDDEN,
      code: "CREDIT_NOTE_DOCUMENT_FORBIDDEN",
      title: "Invoice document forbidden",
      detail:
        "You do not have permission to view Credit Note purchase invoice documents.",
    });
  }

  try {
    const upstream = await readCreditNotePurchaseInvoiceDocumentResponse({
      invoiceProjectionId: params.data.invoiceProjectionId,
      disposition: query.data.disposition,
    });
    const contentType =
      upstream.headers.get("content-type")?.toLowerCase() ?? "";
    const declaredLength = Number(
      upstream.headers.get("content-length") ?? "0",
    );

    if (
      !contentType.startsWith(CT.PDF) ||
      upstream.body === null ||
      (Number.isFinite(declaredLength) &&
        declaredLength > MAX_INVOICE_PDF_BYTES)
    ) {
      await upstream.body?.cancel();
      return problemResponse({
        status: HTTP_STATUS.BAD_GATEWAY,
        code: "CREDIT_NOTE_DOCUMENT_CONTRACT_INVALID",
        title: "Invoice document unavailable",
        detail:
          "The private ERP API returned an invalid invoice document contract.",
      });
    }

    const contentDisposition =
      upstream.headers.get("content-disposition")?.trim() ?? "";
    const safeContentDisposition = SAFE_CONTENT_DISPOSITION_PATTERN.test(
      contentDisposition,
    )
      ? contentDisposition
      : `${query.data.disposition}; filename="zoho-invoice.pdf"`;
    const requestId = upstream.headers.get("x-request-id")?.trim() ?? "";
    const headers = new Headers({
      "Cache-Control": NO_STORE,
      "Content-Type": CT.PDF,
      "Content-Disposition": safeContentDisposition,
      "X-Content-Type-Options": "nosniff",
      "Cross-Origin-Resource-Policy": "same-origin",
    });

    if (SAFE_REFERENCE_PATTERN.test(requestId)) {
      headers.set("X-Request-ID", requestId);
    }
    if (Number.isFinite(declaredLength) && declaredLength > 0) {
      headers.set("Content-Length", String(declaredLength));
    }

    return new Response(upstream.body, {
      status: HTTP_STATUS.OK,
      headers,
    });
  } catch (error: unknown) {
    if (isApiHttpError(error)) {
      return problemResponse({
        status: error.status,
        code: error.code,
        title: "Invoice document unavailable",
        detail:
          "The invoice document could not be retrieved for the authenticated dealer scope.",
        ...(error.requestId === undefined
          ? {}
          : { requestId: error.requestId }),
      });
    }

    return problemResponse({
      status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      code: "CREDIT_NOTE_DOCUMENT_FAILED",
      title: "Invoice document unavailable",
      detail:
        "The server could not complete the protected invoice document request.",
    });
  }
}
