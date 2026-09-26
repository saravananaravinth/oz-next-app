// oz-next-app/src/app/api/extended-warranty/public/purchase/[token]/options/[offerOptionId]/image/route.ts
import "server-only";

import { z } from "zod";

import { readExtendedWarrantyPurchaseOptionImageResponse } from "@/features/extended-warranty/server/purchase-image.server";
import { CT, HTTP_STATUS } from "@/lib/api/http-contract";
import { isApiHttpError } from "@/lib/api/problem";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

const paramsSchema = z
  .object({
    token: z
      .string()
      .trim()
      .min(32)
      .max(256)
      .regex(/^[A-Za-z0-9._~-]+$/u),
    offerOptionId: z.uuid(),
  })
  .strict();

const ALLOWED_IMAGE_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const NO_STORE = "private, no-store, no-cache, must-revalidate";

type RouteContext = Readonly<{
  params: Promise<Readonly<{ token: string; offerOptionId: string }>>;
}>;

async function readBoundedImageBody(
  stream: ReadableStream<Uint8Array>,
  maxBytes: number,
): Promise<ArrayBuffer | null> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    for (;;) {
      const result = await reader.read();
      if (result.done) break;
      totalBytes += result.value.byteLength;
      if (totalBytes <= 0 || totalBytes > maxBytes) {
        await reader.cancel(
          "Extended Warranty image exceeded the response limit.",
        );
        return null;
      }
      chunks.push(result.value);
    }
  } finally {
    reader.releaseLock();
  }

  if (totalBytes === 0) return null;
  const body = new ArrayBuffer(totalBytes);
  const bytes = new Uint8Array(body);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

function problemResponse(status: number): Response {
  return Response.json(
    {
      type: "about:blank",
      title: "Kit image unavailable",
      status,
      detail: "The Extended Warranty kit image is not available.",
      code: "EXTENDED_WARRANTY_PURCHASE_IMAGE_UNAVAILABLE",
      request_id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    },
    {
      status,
      headers: {
        "Cache-Control": NO_STORE,
        "Content-Type": CT.PROBLEM_JSON,
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}

export async function GET(
  _request: Request,
  context: RouteContext,
): Promise<Response> {
  const parsed = paramsSchema.safeParse(await context.params);
  if (!parsed.success) return problemResponse(HTTP_STATUS.NOT_FOUND);

  try {
    const upstream = await readExtendedWarrantyPurchaseOptionImageResponse(
      parsed.data,
    );
    const contentType =
      upstream.headers
        .get("content-type")
        ?.split(";", 1)[0]
        ?.trim()
        .toLowerCase() ?? "";
    const declaredLengthHeader = upstream.headers.get("content-length");
    const declaredLength =
      declaredLengthHeader === null ? null : Number(declaredLengthHeader);

    if (
      !ALLOWED_IMAGE_CONTENT_TYPES.has(contentType) ||
      upstream.body === null ||
      (declaredLength !== null &&
        (!Number.isSafeInteger(declaredLength) ||
          declaredLength <= 0 ||
          declaredLength > MAX_IMAGE_BYTES))
    ) {
      await upstream.body?.cancel();
      return problemResponse(HTTP_STATUS.BAD_GATEWAY);
    }

    const body = await readBoundedImageBody(upstream.body, MAX_IMAGE_BYTES);
    if (
      body === null ||
      (declaredLength !== null && declaredLength !== body.byteLength)
    ) {
      return problemResponse(HTTP_STATUS.BAD_GATEWAY);
    }

    return new Response(body, {
      status: HTTP_STATUS.OK,
      headers: {
        "Cache-Control": NO_STORE,
        "Content-Type": contentType,
        "Content-Length": String(body.byteLength),
        "Content-Disposition": "inline",
        "X-Content-Type-Options": "nosniff",
        "Cross-Origin-Resource-Policy": "same-origin",
      },
    });
  } catch (error: unknown) {
    if (isApiHttpError(error)) {
      if (
        error.status === HTTP_STATUS.UNAUTHORIZED ||
        error.status === HTTP_STATUS.FORBIDDEN ||
        error.status === HTTP_STATUS.NOT_FOUND
      ) {
        return problemResponse(HTTP_STATUS.NOT_FOUND);
      }
      if (error.status === HTTP_STATUS.TOO_MANY_REQUESTS) {
        return problemResponse(HTTP_STATUS.TOO_MANY_REQUESTS);
      }
      if (error.status >= 500) {
        return problemResponse(HTTP_STATUS.BAD_GATEWAY);
      }
    }
    return problemResponse(HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
}
