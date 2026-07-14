// oz-next-app/src/lib/api-server.ts
import "server-only";

export {
  serverApiClient,
  serverEdgeFetch,
  serverEdgeFetchEnvelope,
  buildServerEdgeUrl,
} from "@/server/api/server-client";
export type {
  ServerApiOptions,
  ServerApiEnvelopeOptions,
} from "@/server/api/server-client";
