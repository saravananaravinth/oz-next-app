// oz-next-app/src/lib/query.tsx
"use client";

export { AppQueryProvider } from "@/lib/query/query-client";
export { actorScopeKey, queryKeys, stableQueryValue } from "@/lib/query/keys";
export type {
  ActorQueryScope,
  QueryPrimitive,
  QuerySerializable,
} from "@/lib/query/keys";
