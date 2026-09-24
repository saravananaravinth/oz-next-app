// oz-next-app/src/features/extended-warranty/ui/workspace-live-search.tsx
"use client";
import * as React from "react";
import Link from "next/link";
import { z } from "zod";
import { extendedWarrantyWorkspaceItemSchema } from "../contracts/admin.schema";
import { sameOriginFetch } from "@/lib/api/same-origin-client";
import { safeInternalHref } from "@/lib/security/navigation";
import { Badge } from "@/components/ui/badge";
const responseSchema = z
  .object({
    items: z.array(extendedWarrantyWorkspaceItemSchema).max(8),
    truncated: z.boolean(),
  })
  .strict();
export function WarrantyLiveSearch({
  query,
  debouncedQuery,
  searchParams,
  closeSearch,
}: {
  query: string;
  debouncedQuery: string;
  searchParams: string;
  closeSearch: () => void;
}): React.ReactElement {
  const [state, setState] = React.useState<{
    key: string;
    result?: z.infer<typeof responseSchema>;
    error?: string;
  } | null>(null);
  const normalized = debouncedQuery.trim();
  const key = `${normalized}:${searchParams}`;
  React.useEffect(() => {
    if (normalized.length < 3) return;
    const controller = new AbortController();
    const params = new URLSearchParams(searchParams);
    params.set("q", normalized);
    params.delete("cursor");
    params.delete("unitId");
    void sameOriginFetch(`/api/extended-warranty/search?${params}`, {
      method: "GET",
      schema: responseSchema,
      timeoutMs: 8000,
      signal: controller.signal,
    })
      .then((result) => {
        if (!controller.signal.aborted) setState({ key, result });
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setState({
            key,
            error: "Unable to search warranties. Please retry.",
          });
      });
    return () => {
      controller.abort();
    };
  }, [normalized, key, searchParams]);
  if (query.trim().length < 3)
    return (
      <p className="p-3 text-sm text-muted-foreground">
        Enter at least three characters to search sold vehicles.
      </p>
    );
  if (query.trim() !== normalized || state?.key !== key)
    return (
      <p role="status" className="p-3 text-sm">
        Searching warranties…
      </p>
    );
  if (state.error)
    return (
      <p role="alert" className="p-3 text-sm text-destructive">
        {state.error}
      </p>
    );
  return (
    <div className="grid gap-2" aria-live="polite">
      {state.result?.items.length === 0 ? (
        <p className="p-3 text-sm">No matching sold vehicles.</p>
      ) : (
        state.result?.items.map((item) => {
          const params = new URLSearchParams(searchParams);
          params.set("q", normalized);
          params.set("unitId", item.unitId);
          params.delete("cursor");
          return (
            <Link
              key={item.unitId}
              href={safeInternalHref(
                `/extended-warranty?${params}`,
                "/extended-warranty",
              )}
              onClick={closeSearch}
              className="grid gap-1 rounded-lg border p-3 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="flex justify-between gap-3">
                <span className="font-medium">
                  {item.vin ?? "VIN unavailable"}
                </span>
                <Badge variant="outline">
                  {item.status.toLowerCase().replaceAll("_", " ")}
                </Badge>
              </div>
              <span className="text-sm">
                {[item.modelName, item.variantName, item.colorName]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
              <span className="text-xs text-muted-foreground">
                {item.invoiceNumber ?? "Invoice missing"} ·{" "}
                {item.buyerName ?? "Buyer unavailable"} ·{" "}
                {item.maskedMobile ?? "Contact unavailable"}
              </span>
            </Link>
          );
        })
      )}
      {state.result?.truncated ? (
        <p className="text-xs text-muted-foreground">
          Showing eight matches. Press Enter to search the full table.
        </p>
      ) : null}
    </div>
  );
}
