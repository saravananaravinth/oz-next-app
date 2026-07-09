// oz-next-app/src/server/security/origin.ts
import "server-only";

import { headers } from "next/headers";

const SAME_ORIGIN_FETCH_SITES = new Set(["same-origin", "same-site", "none"]);

export async function assertSameOriginMutation(
  appOrigin: string,
): Promise<void> {
  const incomingHeaders = await headers();
  const origin = incomingHeaders.get("origin")?.trim() ?? null;
  if (origin !== null && origin !== appOrigin)
    throw new Error("cross_origin_mutation_rejected");
  const fetchSite = incomingHeaders.get("sec-fetch-site")?.trim().toLowerCase();
  if (
    fetchSite !== undefined &&
    fetchSite.length > 0 &&
    !SAME_ORIGIN_FETCH_SITES.has(fetchSite)
  )
    throw new Error("cross_site_mutation_rejected");
}
