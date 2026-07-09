// oz-next-app/src/lib/api-server.ts
import "server-only";

export {
  serverApiClient,
  serverEdgeFetch,
  buildServerEdgeUrl,
} from "@/server/api/server-client";
export type { ServerApiOptions } from "@/server/api/server-client";
