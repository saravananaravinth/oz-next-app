// oz-next-app/src/features/erp-core/ui/erp-actor-scope-cache-boundary.tsx
"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";

import { clearErpActorScopedQueries } from "@/features/erp-core/mutations/erp-mutation";
import { erpActorScopeQueryKey } from "@/features/erp-core/queries/erp-query-keys";
import type { ErpActorScope } from "@/features/erp-core/contracts/erp-common.schema";

export type ErpActorScopeCacheBoundaryProps = Readonly<
  React.PropsWithChildren<{
    scope: ErpActorScope;
  }>
>;

type PreviousScope = Readonly<{
  key: string;
  scope: ErpActorScope;
}>;

function scopeKey(scope: ErpActorScope): string {
  return JSON.stringify(erpActorScopeQueryKey(scope));
}

export function ErpActorScopeCacheBoundary({
  scope,
  children,
}: ErpActorScopeCacheBoundaryProps): React.ReactElement {
  const queryClient = useQueryClient();
  const currentKey = React.useMemo(() => scopeKey(scope), [scope]);
  const previousScopeRef = React.useRef<PreviousScope | null>(null);

  React.useEffect(() => {
    const previous = previousScopeRef.current;

    previousScopeRef.current = {
      key: currentKey,
      scope,
    };

    if (previous === null || previous.key === currentKey) {
      return;
    }

    void clearErpActorScopedQueries(queryClient, previous.scope);
  }, [currentKey, queryClient, scope]);

  return <>{children}</>;
}
