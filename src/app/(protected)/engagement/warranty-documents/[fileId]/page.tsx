// oz-next-app/src/app/(protected)/engagement/warranty-documents/[fileId]/page.tsx
import "server-only";

import { redirect } from "next/navigation";
import { z } from "zod";

import { ENGAGEMENT_ENDPOINTS } from "@/lib/api/endpoints";
import { serverApiClient } from "@/server/api/edge-api-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const warrantyDocumentDownloadSchema = z
  .object({
    url: z.url(),
    expiresAt: z.iso.datetime({ offset: true }),
  })
  .strict();

const warrantyDocumentFileIdSchema = z.uuid();

type RedirectTarget = Parameters<typeof redirect>[0];

type WarrantyDocumentPageProps = Readonly<{
  params: Promise<
    Readonly<{
      fileId: string;
    }>
  >;
}>;

export default async function WarrantyDocumentPage({
  params,
}: WarrantyDocumentPageProps): Promise<never> {
  const { fileId } = await params;
  const parsedFileId = warrantyDocumentFileIdSchema.parse(fileId);

  const download = await serverApiClient.get(
    ENGAGEMENT_ENDPOINTS.warrantyDocumentDownload(parsedFileId),
    warrantyDocumentDownloadSchema,
    {
      cache: "no-store",
    },
  );

  /*
   * Next.js typed routes narrow redirect targets to generated application
   * routes, although redirect() supports validated absolute external URLs.
   */
  const redirectTarget = download.url as RedirectTarget;

  redirect(redirectTarget);
}
