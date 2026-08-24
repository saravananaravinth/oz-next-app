// oz-next-app/src/features/app-shell/ui/nav-search.tsx
"use client";

import * as React from "react";
import type { Route } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  Building2,
  Boxes,
  CarFront,
  LoaderCircle,
  MapPin,
  Search,
  Wrench,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { z } from "zod";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { sameOriginFetch } from "@/lib/api/same-origin-client";
import { HTTP_METHODS, HTTP_STATUS } from "@/lib/api/http-contract";
import { isApiHttpError } from "@/lib/api/problem";
import { safeInternalHref } from "@/lib/security/navigation";
import { useDebounce } from "@/shared/hooks/use-debounce";

export type SearchCategory =
  | "navigation"
  | "customer"
  | "dealer"
  | "order"
  | "vehicle"
  | "component"
  | "report"
  | "action";

export type SearchResult = Readonly<{
  id: string;
  title: string;
  description?: string | null;
  href: Route;
  category?: SearchCategory;
}>;

export type GlobalSearchProps = Readonly<{
  results?: readonly SearchResult[];
}>;

type PageSearchMode =
  "submit" | "dealer-live" | "vehicle-live" | "component-live";

type PageSearchScope = Readonly<{
  title: string;
  description: string;
  placeholder: string;
  inputLabel: string;
  triggerLabel: string;
  cursorParams: readonly string[];
  mode: PageSearchMode;
  minimumCharacters: number;
}>;

type DealerLiveSearchItem = Readonly<{
  id: string;
  href: Route;
  category: "dealer";
  dealerCode: string;
  displayName: string;
  companyName: string;
  dealerType: "DEALER" | "SUB_DEALER";
  city: string | null;
  district: string | null;
  state: string | null;
  sourceName: string;
  isActive: boolean;
}>;

type DealerLiveSearchState =
  | Readonly<{
      kind: "success";
      query: string;
      items: readonly DealerLiveSearchItem[];
      truncated: boolean;
    }>
  | Readonly<{
      kind: "error";
      query: string;
      message: string;
      requestId: string | null;
    }>;

type VehicleLiveSearchItem = Readonly<{
  id: string;
  unitId: string;
  href: Route;
  category: "vehicle";
  vin: string | null;
  modelName: string | null;
  variantName: string | null;
  colorName: string | null;
  storeName: string;
  dealerName: string;
  inventoryStatus: string;
  matchedComponentSerials: readonly string[];
}>;

type VehicleLiveSearchState =
  | Readonly<{
      kind: "success";
      query: string;
      items: readonly VehicleLiveSearchItem[];
      truncated: boolean;
    }>
  | Readonly<{
      kind: "error";
      query: string;
      message: string;
      requestId: string | null;
    }>;

type ComponentLiveSearchItem = Readonly<{
  id: string;
  href: Route;
  category: "component";
  componentName: string;
  componentCode: string;
  componentType: string;
  serialNumber: string | null;
  lotNumber: string | null;
  state: string;
  storeName: string | null;
  orgUnitName: string | null;
  vin: string | null;
  integrityWarnings: readonly string[];
}>;

type ComponentLiveSearchState =
  | Readonly<{
      kind: "success";
      query: string;
      items: readonly ComponentLiveSearchItem[];
      truncated: boolean;
    }>
  | Readonly<{
      kind: "error";
      query: string;
      message: string;
      requestId: string | null;
    }>;

const MAX_QUERY_LENGTH = 100;
const MAX_RESULTS = 20;
const MAX_SOURCE_RESULTS = 500;
const MAX_TEXT_LENGTH = 160;
const MAX_SEARCH_TERMS = 8;
const MAX_HIGHLIGHT_RANGES = 64;
const LIVE_SEARCH_DELAY_MS = 280;
const LIVE_SEARCH_MAX_WAIT_MS = 750;
const LIVE_SEARCH_TIMEOUT_MS = 8_000;
const ENGAGEMENT_DASHBOARD_PREFIX = "/engagement/dashboard";
const DEALER_DIRECTORY_PATH = "/engagement/dealers";
const VEHICLE_INVENTORY_PATH = "/inventory/vehicles";
const COMPONENT_INVENTORY_PATH = "/inventory/components";
const DEALER_LIVE_SEARCH_ENDPOINT = "/api/engagement/dealers/search";
const VEHICLE_LIVE_SEARCH_ENDPOINT = "/api/inventory/vehicles/search";
const COMPONENT_LIVE_SEARCH_ENDPOINT = "/api/inventory/components/search";
const ENGAGEMENT_CURSOR_PARAMS = [
  "dealerCursor",
  "issueCursor",
  "leadCursor",
] as const;
const INVENTORY_CURSOR_PARAMS = ["cursor"] as const;
const ASCII_CONTROL_MAX_CODE_POINT = 0x1f;
const ASCII_DELETE_CODE_POINT = 0x7f;
const WHITESPACE_RE = /\s+/gu;

const dealerLiveSearchResponseSchema = z
  .object({
    asOf: z.iso.datetime({ offset: true }),
    truncated: z.boolean(),
    items: z
      .array(
        z
          .object({
            id: z.uuid(),
            href: z.string().trim().min(1).max(2_048),
            category: z.literal("dealer"),
            dealerCode: z.string().trim().min(1).max(128),
            displayName: z.string().trim().min(1).max(200),
            companyName: z.string().trim().min(1).max(200),
            dealerType: z.enum(["DEALER", "SUB_DEALER"]),
            city: z.string().trim().min(1).max(120).nullable(),
            district: z.string().trim().min(1).max(160).nullable(),
            state: z.string().trim().min(1).max(160).nullable(),
            sourceName: z.string().trim().min(1).max(180),
            isActive: z.boolean(),
          })
          .strict(),
      )
      .max(8)
      .readonly(),
  })
  .strict();

const vehicleLiveSearchResponseSchema = z
  .object({
    asOf: z.iso.datetime({ offset: true }),
    truncated: z.boolean(),
    items: z
      .array(
        z
          .object({
            id: z
              .string()
              .trim()
              .min(1)
              .max(512)
              .regex(/^[A-Za-z0-9:_-]+$/u),
            unitId: z.uuid(),
            href: z.string().trim().min(1).max(2_048),
            category: z.literal("vehicle"),
            vin: z.string().trim().min(1).max(160).nullable(),
            modelName: z.string().trim().min(1).max(160).nullable(),
            variantName: z.string().trim().min(1).max(160).nullable(),
            colorName: z.string().trim().min(1).max(160).nullable(),
            storeName: z.string().trim().min(1).max(160),
            dealerName: z.string().trim().min(1).max(160),
            inventoryStatus: z.string().trim().min(1).max(80),
            matchedComponentSerials: z
              .array(z.string().trim().min(1).max(256))
              .max(5)
              .readonly(),
          })
          .strict(),
      )
      .max(8)
      .readonly(),
  })
  .strict();

const componentLiveSearchResponseSchema = z
  .object({
    asOf: z.iso.datetime({ offset: true }),
    truncated: z.boolean(),
    items: z
      .array(
        z
          .object({
            id: z.uuid(),
            href: z.string().trim().min(1).max(2_048),
            category: z.literal("component"),
            componentName: z.string().trim().min(1).max(160),
            componentCode: z.string().trim().min(1).max(160),
            componentType: z.string().trim().min(1).max(80),
            serialNumber: z.string().trim().min(1).max(256).nullable(),
            lotNumber: z.string().trim().min(1).max(256).nullable(),
            state: z.string().trim().min(1).max(80),
            storeName: z.string().trim().min(1).max(160).nullable(),
            orgUnitName: z.string().trim().min(1).max(160).nullable(),
            vin: z.string().trim().min(1).max(160).nullable(),
            integrityWarnings: z
              .array(z.string().trim().min(1).max(128))
              .max(8)
              .readonly(),
          })
          .strict(),
      )
      .max(8)
      .readonly(),
  })
  .strict();

const ENGAGEMENT_SEARCH_SCOPE = {
  title: "Search vehicle-sales engagement",
  description:
    "Search the current page by lead number, customer, mobile, dealer, or dealer code.",
  placeholder: "Lead, customer, mobile, dealer, or code",
  inputLabel: "Search the current engagement page",
  triggerLabel: "Search this engagement page",
  cursorParams: ENGAGEMENT_CURSOR_PARAMS,
  mode: "submit",
  minimumCharacters: 1,
} as const satisfies PageSearchScope;

const DEALER_DIRECTORY_SEARCH_SCOPE = {
  title: "Search dealers",
  description:
    "Live-search the authorized dealer network by dealer name, code, GSTIN, primary staff identity, or location.",
  placeholder: "Dealer name, code, GSTIN, email, phone, location…",
  inputLabel: "Search authorized dealers",
  triggerLabel: "Search dealers",
  cursorParams: INVENTORY_CURSOR_PARAMS,
  mode: "dealer-live",
  minimumCharacters: 3,
} as const satisfies PageSearchScope;

const VEHICLE_INVENTORY_SEARCH_SCOPE = {
  title: "Search vehicle inventory",
  description:
    "Live-search authorized vehicles by VIN, model, variant, color, stock location, dealer, or installed component serial number.",
  placeholder: "VIN, battery, motor, controller, display, charger…",
  inputLabel: "Search authorized vehicle inventory",
  triggerLabel: "Search vehicle inventory",
  cursorParams: INVENTORY_CURSOR_PARAMS,
  mode: "vehicle-live",
  minimumCharacters: 3,
} as const satisfies PageSearchScope;

const COMPONENT_INVENTORY_SEARCH_SCOPE = {
  title: "Search component inventory",
  description:
    "Live-search authorized components by serial number, lot number, component code or name, or attached vehicle VIN.",
  placeholder: "Serial, lot, battery, motor, controller, charger, VIN…",
  inputLabel: "Search authorized component inventory",
  triggerLabel: "Search component inventory",
  cursorParams: INVENTORY_CURSOR_PARAMS,
  mode: "component-live",
  minimumCharacters: 3,
} as const satisfies PageSearchScope;

function replaceControlCharacters(value: string): string {
  let output = "";

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index] ?? "";
    const codePoint = value.charCodeAt(index);

    output +=
      codePoint <= ASCII_CONTROL_MAX_CODE_POINT ||
      codePoint === ASCII_DELETE_CODE_POINT
        ? " "
        : character;
  }

  return output;
}

function cleanText(value: string | null | undefined, fallback = ""): string {
  const normalized = replaceControlCharacters(value ?? "")
    .replace(WHITESPACE_RE, " ")
    .trim();
  const resolved = normalized.length > 0 ? normalized : fallback;

  return resolved.length <= MAX_TEXT_LENGTH
    ? resolved
    : `${resolved.slice(0, MAX_TEXT_LENGTH - 1).trimEnd()}…`;
}

function normalizedPageQuery(value: string): string {
  return cleanText(value).slice(0, MAX_QUERY_LENGTH);
}

function pageQueryIsReady(value: string, scope: PageSearchScope): boolean {
  const length = normalizedPageQuery(value).length;

  return length >= scope.minimumCharacters;
}

function searchTerms(value: string): readonly string[] {
  const terms: string[] = [];
  const seen = new Set<string>();

  for (const rawTerm of normalizedPageQuery(value).split(WHITESPACE_RE)) {
    const term = rawTerm.toLocaleLowerCase("en-US");
    if (term.length === 0 || seen.has(term)) {
      continue;
    }

    seen.add(term);
    terms.push(term);

    if (terms.length >= MAX_SEARCH_TERMS) {
      break;
    }
  }

  return terms;
}

type MatchRange = Readonly<{
  start: number;
  end: number;
}>;

function matchRanges(value: string, query: string): readonly MatchRange[] {
  const haystack = value.toLocaleLowerCase("en-US");
  const ranges: MatchRange[] = [];

  for (const term of searchTerms(query)) {
    let cursor = 0;

    while (cursor < haystack.length && ranges.length < MAX_HIGHLIGHT_RANGES) {
      const start = haystack.indexOf(term, cursor);
      if (start < 0) {
        break;
      }

      const end = start + term.length;
      ranges.push({ start, end });
      cursor = Math.max(end, start + 1);
    }
  }

  if (ranges.length === 0) {
    return [];
  }

  ranges.sort(
    (left, right) => left.start - right.start || left.end - right.end,
  );
  const merged: MatchRange[] = [];

  for (const range of ranges) {
    const previous = merged.at(-1);
    if (previous === undefined || range.start > previous.end) {
      merged.push(range);
      continue;
    }

    if (range.end > previous.end) {
      merged[merged.length - 1] = { start: previous.start, end: range.end };
    }
  }

  return merged;
}

function HighlightedText({
  value,
  query,
}: Readonly<{
  value: string;
  query: string;
}>): React.ReactElement {
  const ranges = matchRanges(value, query);

  if (ranges.length === 0) {
    return <>{value}</>;
  }

  const nodes: React.ReactNode[] = [];
  let cursor = 0;

  ranges.forEach((range, index) => {
    if (range.start > cursor) {
      nodes.push(value.slice(cursor, range.start));
    }

    nodes.push(
      <mark
        key={`${String(range.start)}-${String(range.end)}-${String(index)}`}
        className="rounded-[0.2rem] bg-warning/25 px-0.5 text-inherit ring-1 ring-inset ring-warning/20 dark:bg-warning/20"
      >
        {value.slice(range.start, range.end)}
      </mark>,
    );
    cursor = range.end;
  });

  if (cursor < value.length) {
    nodes.push(value.slice(cursor));
  }

  return <>{nodes}</>;
}

function displayStatus(value: string): string {
  return value
    .split("_")
    .filter((part) => part.length > 0)
    .map(
      (part) => `${part.charAt(0)}${part.slice(1).toLocaleLowerCase("en-US")}`,
    )
    .join(" ");
}

function normalizeResult(result: SearchResult): SearchResult | null {
  const id = cleanText(result.id);
  const title = cleanText(result.title);

  if (id.length === 0 || title.length === 0) {
    return null;
  }

  const description =
    result.description === undefined
      ? undefined
      : result.description === null
        ? null
        : cleanText(result.description);

  return {
    id,
    title,
    href: safeInternalHref(result.href),
    ...(description !== undefined ? { description } : {}),
    ...(result.category !== undefined ? { category: result.category } : {}),
  };
}

function normalizeResults(
  results: readonly SearchResult[],
): readonly SearchResult[] {
  const normalized: SearchResult[] = [];
  const seen = new Set<string>();

  for (const result of results.slice(0, MAX_SOURCE_RESULTS)) {
    const item = normalizeResult(result);

    if (item === null || seen.has(item.id)) {
      continue;
    }

    seen.add(item.id);
    normalized.push(item);
  }

  return normalized;
}

function matches(result: SearchResult, query: string): boolean {
  const terms = searchTerms(query);
  if (terms.length === 0) {
    return true;
  }

  const haystack =
    `${result.title} ${result.description ?? ""} ${result.category ?? ""}`.toLocaleLowerCase(
      "en-US",
    );

  return terms.every((term) => haystack.includes(term));
}

function resolvePageSearchScope(pathname: string): PageSearchScope | null {
  if (pathname === DEALER_DIRECTORY_PATH) {
    return DEALER_DIRECTORY_SEARCH_SCOPE;
  }

  if (pathname === VEHICLE_INVENTORY_PATH) {
    return VEHICLE_INVENTORY_SEARCH_SCOPE;
  }

  if (pathname === COMPONENT_INVENTORY_PATH) {
    return COMPONENT_INVENTORY_SEARCH_SCOPE;
  }

  if (
    pathname === ENGAGEMENT_DASHBOARD_PREFIX ||
    pathname.startsWith(`${ENGAGEMENT_DASHBOARD_PREFIX}/`)
  ) {
    return ENGAGEMENT_SEARCH_SCOPE;
  }

  return null;
}

function inventoryScopeFlags(searchParams: URLSearchParams): Readonly<{
  includeMyStock: boolean;
  includeSubDealerStock: boolean;
}> {
  const scopeSubmitted = searchParams.get("scopeSubmitted") === "true";

  if (!scopeSubmitted) {
    return {
      includeMyStock: true,
      includeSubDealerStock: false,
    };
  }

  return {
    includeMyStock: searchParams.getAll("includeMyStock").includes("true"),
    includeSubDealerStock: searchParams
      .getAll("includeSubDealerStock")
      .includes("true"),
  };
}

function dealerLiveSearchPath(
  query: string,
  searchParams: URLSearchParams,
): string {
  const liveParams = new URLSearchParams({ q: normalizedPageQuery(query) });
  const dealerType = searchParams.get("dealerType");
  const active = searchParams.get("active") ?? "true";

  if (dealerType === "DEALER" || dealerType === "SUB_DEALER") {
    liveParams.set("dealerType", dealerType);
  }
  if (active === "true" || active === "false" || active === "all") {
    liveParams.set("active", active);
  }

  return `${DEALER_LIVE_SEARCH_ENDPOINT}?${liveParams.toString()}`;
}

function toDealerLiveSearchItems(
  payload: z.output<typeof dealerLiveSearchResponseSchema>,
): readonly DealerLiveSearchItem[] {
  return payload.items.map((item) => ({
    id: item.id,
    href: safeInternalHref(item.href, DEALER_DIRECTORY_PATH),
    category: item.category,
    dealerCode: cleanText(item.dealerCode),
    displayName: cleanText(item.displayName, "Dealer"),
    companyName: cleanText(item.companyName, item.displayName),
    dealerType: item.dealerType,
    city: item.city === null ? null : cleanText(item.city),
    district: item.district === null ? null : cleanText(item.district),
    state: item.state === null ? null : cleanText(item.state),
    sourceName: cleanText(item.sourceName, "Direct"),
    isActive: item.isActive,
  }));
}

function vehicleLiveSearchPath(
  query: string,
  searchParams: URLSearchParams,
): string {
  const scope = inventoryScopeFlags(searchParams);
  const liveParams = new URLSearchParams({
    q: normalizedPageQuery(query),
    includeMyStock: String(scope.includeMyStock),
    includeSubDealerStock: String(scope.includeSubDealerStock),
  });
  const tenantId = searchParams.get("tenantId");
  const dealerOrgUnitId = searchParams.get("dealerOrgUnitId");

  if (tenantId !== null) {
    liveParams.set("tenantId", tenantId);
  }

  if (dealerOrgUnitId !== null) {
    liveParams.set("dealerOrgUnitId", dealerOrgUnitId);
  }

  return `${VEHICLE_LIVE_SEARCH_ENDPOINT}?${liveParams.toString()}`;
}

function toVehicleLiveSearchItems(
  payload: z.output<typeof vehicleLiveSearchResponseSchema>,
): readonly VehicleLiveSearchItem[] {
  return payload.items.map((item) => ({
    id: item.id,
    unitId: item.unitId,
    href: safeInternalHref(item.href, VEHICLE_INVENTORY_PATH),
    category: item.category,
    vin: item.vin === null ? null : cleanText(item.vin),
    modelName: item.modelName === null ? null : cleanText(item.modelName),
    variantName: item.variantName === null ? null : cleanText(item.variantName),
    colorName: item.colorName === null ? null : cleanText(item.colorName),
    storeName: cleanText(item.storeName, "Stock location unavailable"),
    dealerName: cleanText(item.dealerName, "Dealer unavailable"),
    inventoryStatus: cleanText(item.inventoryStatus, "UNKNOWN"),
    matchedComponentSerials: item.matchedComponentSerials
      .map((serial) => cleanText(serial))
      .filter((serial) => serial.length > 0),
  }));
}

function componentLiveSearchPath(query: string): string {
  const liveParams = new URLSearchParams({ q: normalizedPageQuery(query) });
  return `${COMPONENT_LIVE_SEARCH_ENDPOINT}?${liveParams.toString()}`;
}

function toComponentLiveSearchItems(
  payload: z.output<typeof componentLiveSearchResponseSchema>,
): readonly ComponentLiveSearchItem[] {
  return payload.items.map((item) => ({
    id: item.id,
    href: safeInternalHref(item.href, COMPONENT_INVENTORY_PATH),
    category: item.category,
    componentName: cleanText(item.componentName, "Component"),
    componentCode: cleanText(item.componentCode),
    componentType: cleanText(item.componentType),
    serialNumber:
      item.serialNumber === null ? null : cleanText(item.serialNumber),
    lotNumber: item.lotNumber === null ? null : cleanText(item.lotNumber),
    state: cleanText(item.state, "UNKNOWN"),
    storeName: item.storeName === null ? null : cleanText(item.storeName),
    orgUnitName: item.orgUnitName === null ? null : cleanText(item.orgUnitName),
    vin: item.vin === null ? null : cleanText(item.vin),
    integrityWarnings: item.integrityWarnings.map((warning) =>
      cleanText(warning),
    ),
  }));
}

function inventorySearchError(
  error: unknown,
  forbiddenMessage: string,
): Readonly<{
  message: string;
  requestId: string | null;
}> {
  if (isApiHttpError(error)) {
    if (error.status === HTTP_STATUS.UNAUTHORIZED) {
      return {
        message:
          "Your ERP session expired. Sign in again to search protected inventory.",
        requestId: error.requestId ?? null,
      };
    }

    if (error.status === HTTP_STATUS.FORBIDDEN) {
      return {
        message: forbiddenMessage,
        requestId: error.requestId ?? null,
      };
    }

    if (error.status === HTTP_STATUS.TOO_MANY_REQUESTS) {
      const retryAfterSeconds = error.retryAfterSeconds;

      return {
        message:
          retryAfterSeconds === undefined
            ? "Live inventory search is temporarily rate limited. Retry shortly."
            : `Live inventory search is rate limited. Retry in ${retryAfterSeconds.toLocaleString("en-IN")} second${retryAfterSeconds === 1 ? "" : "s"}.`,
        requestId: error.requestId ?? null,
      };
    }

    return {
      message:
        error.status >= 500
          ? "Live inventory search is temporarily unavailable."
          : "The inventory search request could not be completed.",
      requestId: error.requestId ?? null,
    };
  }

  return {
    message: "Live inventory search could not reach the application server.",
    requestId: null,
  };
}

function dealerSearchError(error: unknown): Readonly<{
  message: string;
  requestId: string | null;
}> {
  if (isApiHttpError(error)) {
    if (error.status === HTTP_STATUS.UNAUTHORIZED) {
      return {
        message:
          "Your ERP session expired. Sign in again to search protected dealers.",
        requestId: error.requestId ?? null,
      };
    }
    if (error.status === HTTP_STATUS.FORBIDDEN) {
      return {
        message: "You do not have access to search the dealer directory.",
        requestId: error.requestId ?? null,
      };
    }
    if (error.status === HTTP_STATUS.TOO_MANY_REQUESTS) {
      return {
        message:
          "Live dealer search is temporarily rate limited. Retry shortly.",
        requestId: error.requestId ?? null,
      };
    }
    return {
      message:
        error.status >= 500
          ? "Live dealer search is temporarily unavailable."
          : "The dealer search request could not be completed.",
      requestId: error.requestId ?? null,
    };
  }

  return {
    message: "Live dealer search could not reach the application server.",
    requestId: null,
  };
}

function DealerLiveResults({
  query,
  debouncedQuery,
  minimumCharacters,
  state,
  closeSearch,
}: Readonly<{
  query: string;
  debouncedQuery: string;
  minimumCharacters: number;
  state: DealerLiveSearchState | null;
  closeSearch: () => void;
}>): React.ReactElement {
  const normalized = normalizedPageQuery(query);
  const normalizedDebounced = normalizedPageQuery(debouncedQuery);
  const ready = normalized.length >= minimumCharacters;
  const waitingForDebounce = ready && normalized !== normalizedDebounced;
  const loading =
    ready && !waitingForDebounce && state?.query !== normalizedDebounced;
  const visibleState =
    state !== null && state.query === normalizedDebounced ? state : null;

  if (normalized.length === 0) {
    return (
      <div className="grid min-h-44 place-items-center rounded-2xl border border-dashed border-border/70 bg-muted/25 px-6 py-8 text-center">
        <div className="grid max-w-md justify-items-center gap-2">
          <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
            <Building2 aria-hidden="true" className="size-5" />
          </span>
          <p className="text-body-sm font-medium text-foreground">
            Find a dealer from the organization directory
          </p>
          <p className="text-caption text-muted-readable">
            Search dealer name, dealer code, GSTIN, primary staff email or
            phone, city, district, or state.
          </p>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="grid min-h-36 place-items-center rounded-2xl border border-border/70 bg-muted/25 px-6 py-8 text-center text-body-sm text-muted-readable">
        Type at least {String(minimumCharacters)} characters to start the live
        dealer search.
      </div>
    );
  }

  if (waitingForDebounce || loading) {
    return (
      <div
        className="grid min-h-36 place-items-center rounded-2xl border border-border/70 bg-muted/20 px-6 py-8"
        role="status"
        aria-live="polite"
      >
        <span className="inline-flex items-center gap-2 text-body-sm text-muted-readable">
          <LoaderCircle
            aria-hidden="true"
            className="size-4 animate-spin motion-reduce:animate-none"
          />
          Searching authorized dealers…
        </span>
      </div>
    );
  }

  if (visibleState?.kind === "error") {
    return (
      <Alert variant="destructive">
        <AlertTriangle aria-hidden="true" />
        <AlertTitle>Dealer search could not be completed</AlertTitle>
        <AlertDescription>
          {visibleState.message}
          {visibleState.requestId === null ? null : (
            <span className="mt-1 block text-caption">
              Reference: <code>{visibleState.requestId}</code>
            </span>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  if (visibleState?.kind !== "success" || visibleState.items.length === 0) {
    return (
      <div className="grid min-h-36 place-items-center rounded-2xl border border-border/70 bg-muted/25 px-6 py-8 text-center">
        <div className="grid gap-1">
          <p className="text-body-sm font-medium text-foreground">
            No authorized dealer matched
          </p>
          <p className="text-caption text-muted-readable">
            Check the dealer name, code, GSTIN, staff identity, or location
            spelling.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-2" role="list" aria-label="Dealer search results">
      {visibleState.items.map((item) => {
        const location = [item.city, item.district, item.state]
          .filter(
            (value): value is string => value !== null && value.length > 0,
          )
          .join(" · ");
        return (
          <Button
            key={item.id}
            variant="ghost"
            className="h-auto w-full justify-start rounded-2xl border border-transparent px-3 py-3 text-start hover:border-border/70 hover:bg-muted/55 focus-visible:border-ring"
            asChild
          >
            <Link
              href={item.href}
              prefetch={false}
              onClick={closeSearch}
              role="listitem"
            >
              <span className="grid min-w-0 flex-1 grid-cols-[auto_minmax(0,1fr)] items-start gap-3">
                <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl border border-primary/15 bg-primary/10 text-primary">
                  <Building2 aria-hidden="true" className="size-4" />
                </span>
                <span className="grid min-w-0 gap-1.5">
                  <span className="flex min-w-0 items-center justify-between gap-3">
                    <span className="min-w-0 truncate text-body-sm font-semibold text-foreground">
                      <HighlightedText
                        value={item.displayName}
                        query={normalized}
                      />
                    </span>
                    <Badge
                      variant={item.isActive ? "success" : "secondary"}
                      className="h-5 shrink-0 rounded-md px-1.5 text-[0.625rem] font-medium"
                    >
                      {item.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </span>
                  <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 text-caption text-muted-readable">
                    <span className="font-medium text-foreground/85 text-tabular">
                      <HighlightedText
                        value={item.dealerCode}
                        query={normalized}
                      />
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {item.dealerType === "DEALER" ? "Dealer" : "Sub-dealer"}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{item.sourceName}</span>
                  </span>
                  {item.companyName === item.displayName ? null : (
                    <span className="truncate text-caption text-foreground/80">
                      <HighlightedText
                        value={item.companyName}
                        query={normalized}
                      />
                    </span>
                  )}
                  <span className="inline-flex min-w-0 items-center gap-1.5 text-caption text-muted-readable">
                    <MapPin aria-hidden="true" className="size-3.5 shrink-0" />
                    <span className="truncate">
                      {location.length === 0 ? (
                        "Location not configured"
                      ) : (
                        <HighlightedText value={location} query={normalized} />
                      )}
                    </span>
                  </span>
                </span>
              </span>
            </Link>
          </Button>
        );
      })}
      {visibleState.truncated ? (
        <p className="px-2 pt-1 text-caption text-muted-readable">
          Showing the best eight matches. Press Enter to apply the search to the
          full dealer table.
        </p>
      ) : null}
    </div>
  );
}

function VehicleLiveResults({
  query,
  debouncedQuery,
  minimumCharacters,
  state,
  closeSearch,
}: Readonly<{
  query: string;
  debouncedQuery: string;
  minimumCharacters: number;
  state: VehicleLiveSearchState | null;
  closeSearch: () => void;
}>): React.ReactElement {
  const normalized = normalizedPageQuery(query);
  const normalizedDebounced = normalizedPageQuery(debouncedQuery);
  const ready = normalized.length >= minimumCharacters;
  const waitingForDebounce = ready && normalized !== normalizedDebounced;
  const loading =
    ready && !waitingForDebounce && state?.query !== normalizedDebounced;
  const visibleState =
    state !== null && state.query === normalizedDebounced ? state : null;

  if (normalized.length === 0) {
    return (
      <div className="grid min-h-44 place-items-center rounded-2xl border border-dashed border-border/70 bg-muted/25 px-6 py-8 text-center">
        <div className="grid max-w-md justify-items-center gap-2">
          <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
            <Search aria-hidden="true" className="size-5" />
          </span>
          <p className="text-body-sm font-medium text-foreground">
            Find a vehicle from any operational identifier
          </p>
          <p className="text-caption text-muted-readable">
            Search VIN, vehicle details, dealer or stock location, or installed
            battery, motor, controller, display, and charger serial numbers.
          </p>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="grid min-h-36 place-items-center rounded-2xl border border-border/70 bg-muted/25 px-6 py-8 text-center text-body-sm text-muted-readable">
        Type at least {String(minimumCharacters)} characters to start the live
        inventory search.
      </div>
    );
  }

  if (waitingForDebounce || loading) {
    return (
      <div
        className="grid min-h-36 place-items-center rounded-2xl border border-border/70 bg-muted/20 px-6 py-8"
        role="status"
        aria-live="polite"
      >
        <span className="inline-flex items-center gap-2 text-body-sm text-muted-readable">
          <LoaderCircle
            aria-hidden="true"
            className="size-4 animate-spin motion-reduce:animate-none"
          />
          Searching authorized inventory…
        </span>
      </div>
    );
  }

  if (visibleState?.kind === "error") {
    return (
      <Alert variant="destructive">
        <AlertTriangle aria-hidden="true" />
        <AlertTitle>Inventory search could not be completed</AlertTitle>
        <AlertDescription>
          {visibleState.message}
          {visibleState.requestId === null ? null : (
            <span className="mt-1 block text-caption">
              Reference: <code>{visibleState.requestId}</code>
            </span>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  if (visibleState?.kind !== "success" || visibleState.items.length === 0) {
    return (
      <div className="grid min-h-36 place-items-center rounded-2xl border border-border/70 bg-muted/25 px-6 py-8 text-center">
        <div className="grid gap-1">
          <p className="text-body-sm font-medium text-foreground">
            No authorized vehicle matched
          </p>
          <p className="text-caption text-muted-readable">
            Check the VIN, component serial number, spelling, or current dealer
            stock scope.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-2" role="list" aria-label="Vehicle search results">
      {visibleState.items.map((item) => {
        const vin = item.vin ?? "VIN unavailable";
        const productDetails = [
          item.modelName,
          item.variantName,
          item.colorName,
        ].filter(
          (value): value is string => value !== null && value.length > 0,
        );
        const status = displayStatus(item.inventoryStatus);

        return (
          <Button
            key={item.id}
            variant="ghost"
            className="h-auto w-full justify-start rounded-2xl border border-transparent px-3 py-3 text-start hover:border-border/70 hover:bg-muted/55 focus-visible:border-ring"
            asChild
          >
            <Link
              href={item.href}
              prefetch={false}
              onClick={closeSearch}
              role="listitem"
              aria-label={`${vin}, ${productDetails.join(", ")}, ${item.storeName}, ${item.dealerName}, ${status}`}
            >
              <span className="grid min-w-0 flex-1 grid-cols-[auto_minmax(0,1fr)] items-start gap-3">
                <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl border border-primary/15 bg-primary/10 text-primary">
                  <CarFront aria-hidden="true" className="size-4" />
                </span>

                <span className="grid min-w-0 gap-1.5">
                  <span className="flex min-w-0 items-center justify-between gap-3">
                    <span className="min-w-0 truncate text-body-sm font-semibold text-foreground text-tabular">
                      <HighlightedText value={vin} query={normalized} />
                    </span>
                    <Badge
                      variant="outline"
                      className="h-5 shrink-0 rounded-md px-1.5 text-[0.625rem] font-medium"
                    >
                      <HighlightedText value={status} query={normalized} />
                    </Badge>
                  </span>

                  {productDetails.length === 0 ? (
                    <span className="text-caption text-muted-readable">
                      Vehicle configuration unavailable
                    </span>
                  ) : (
                    <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-caption text-foreground/85">
                      {productDetails.map((detail, index) => (
                        <React.Fragment key={`${detail}-${String(index)}`}>
                          {index === 0 ? null : (
                            <span
                              aria-hidden="true"
                              className="text-muted-readable"
                            >
                              ·
                            </span>
                          )}
                          <span className="min-w-0">
                            <HighlightedText
                              value={detail}
                              query={normalized}
                            />
                          </span>
                        </React.Fragment>
                      ))}
                    </span>
                  )}

                  <span className="grid min-w-0 gap-1 text-caption text-muted-readable sm:grid-cols-2 sm:gap-x-4">
                    <span className="inline-flex min-w-0 items-center gap-1.5">
                      <MapPin
                        aria-hidden="true"
                        className="size-3.5 shrink-0"
                      />
                      <span className="truncate">
                        <HighlightedText
                          value={item.storeName}
                          query={normalized}
                        />
                      </span>
                    </span>
                    <span className="inline-flex min-w-0 items-center gap-1.5">
                      <Building2
                        aria-hidden="true"
                        className="size-3.5 shrink-0"
                      />
                      <span className="truncate">
                        <HighlightedText
                          value={item.dealerName}
                          query={normalized}
                        />
                      </span>
                    </span>
                  </span>

                  {item.matchedComponentSerials.length === 0 ? null : (
                    <span className="flex min-w-0 flex-wrap items-center gap-1.5 rounded-lg border border-primary/15 bg-primary/[0.045] px-2 py-1.5 text-caption text-foreground/85 dark:bg-primary/[0.08]">
                      <Wrench
                        aria-hidden="true"
                        className="size-3.5 shrink-0 text-primary"
                      />
                      <span className="font-medium text-muted-readable">
                        Component
                      </span>
                      {item.matchedComponentSerials.map((serial) => (
                        <code
                          key={serial}
                          className="max-w-full truncate rounded-md bg-background/80 px-1.5 py-0.5 text-[0.6875rem] text-tabular text-foreground ring-1 ring-inset ring-border/70"
                        >
                          <HighlightedText value={serial} query={normalized} />
                        </code>
                      ))}
                    </span>
                  )}
                </span>
              </span>
            </Link>
          </Button>
        );
      })}

      {visibleState.truncated ? (
        <p className="px-2 pt-1 text-caption text-muted-readable">
          Showing the best eight matches. Press Enter to apply the search to the
          full inventory table.
        </p>
      ) : null}
    </div>
  );
}

function ComponentLiveResults({
  query,
  debouncedQuery,
  minimumCharacters,
  state,
  closeSearch,
}: Readonly<{
  query: string;
  debouncedQuery: string;
  minimumCharacters: number;
  state: ComponentLiveSearchState | null;
  closeSearch: () => void;
}>): React.ReactElement {
  const normalized = normalizedPageQuery(query);
  const normalizedDebounced = normalizedPageQuery(debouncedQuery);
  const ready = normalized.length >= minimumCharacters;
  const waitingForDebounce = ready && normalized !== normalizedDebounced;
  const loading =
    ready && !waitingForDebounce && state?.query !== normalizedDebounced;
  const visibleState =
    state !== null && state.query === normalizedDebounced ? state : null;

  if (normalized.length === 0) {
    return (
      <div className="grid min-h-44 place-items-center rounded-2xl border border-dashed border-border/70 bg-muted/25 px-6 py-8 text-center">
        <div className="grid max-w-md justify-items-center gap-2">
          <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
            <Boxes aria-hidden="true" className="size-5" />
          </span>
          <p className="text-body-sm font-medium text-foreground">
            Find a component from its real-world identity
          </p>
          <p className="text-caption text-muted-readable">
            Search serial or lot number, component code or name, or the VIN of
            the vehicle where it is installed.
          </p>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="grid min-h-36 place-items-center rounded-2xl border border-border/70 bg-muted/25 px-6 py-8 text-center text-body-sm text-muted-readable">
        Type at least {String(minimumCharacters)} characters to start component
        search.
      </div>
    );
  }

  if (waitingForDebounce || loading) {
    return (
      <div
        className="grid min-h-36 place-items-center rounded-2xl border border-border/70 bg-muted/20 px-6 py-8"
        role="status"
        aria-live="polite"
      >
        <span className="inline-flex items-center gap-2 text-body-sm text-muted-readable">
          <LoaderCircle
            aria-hidden="true"
            className="size-4 animate-spin motion-reduce:animate-none"
          />
          Searching authorized components…
        </span>
      </div>
    );
  }

  if (visibleState?.kind === "error") {
    return (
      <Alert variant="destructive">
        <AlertTriangle aria-hidden="true" />
        <AlertTitle>Component search could not be completed</AlertTitle>
        <AlertDescription>
          {visibleState.message}
          {visibleState.requestId === null ? null : (
            <span className="mt-1 block text-caption">
              Reference: <code>{visibleState.requestId}</code>
            </span>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  if (visibleState?.kind !== "success" || visibleState.items.length === 0) {
    return (
      <div className="grid min-h-36 place-items-center rounded-2xl border border-border/70 bg-muted/25 px-6 py-8 text-center">
        <div className="grid gap-1">
          <p className="text-body-sm font-medium text-foreground">
            No authorized component matched
          </p>
          <p className="text-caption text-muted-readable">
            Check the serial, lot, component name/code, VIN, or tenant context.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="grid gap-2"
      role="list"
      aria-label="Component search results"
    >
      {visibleState.items.map((item) => {
        const identity = item.serialNumber ?? item.componentCode;
        const location =
          item.storeName ??
          (item.vin === null ? "Location unavailable" : `Vehicle ${item.vin}`);
        return (
          <Button
            key={item.id}
            variant="ghost"
            className="h-auto w-full justify-start rounded-2xl border border-transparent px-3 py-3 text-start hover:border-border/70 hover:bg-muted/55 focus-visible:border-ring"
            asChild
          >
            <Link
              href={item.href}
              prefetch={false}
              onClick={closeSearch}
              role="listitem"
              aria-label={`${identity}, ${item.componentName}, ${displayStatus(item.state)}, ${location}`}
            >
              <span className="grid min-w-0 flex-1 grid-cols-[auto_minmax(0,1fr)] items-start gap-3">
                <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl border border-primary/15 bg-primary/10 text-primary">
                  <Boxes aria-hidden="true" className="size-4" />
                </span>
                <span className="grid min-w-0 gap-1.5">
                  <span className="flex min-w-0 items-center justify-between gap-3">
                    <span className="min-w-0 truncate text-body-sm font-semibold text-foreground text-tabular">
                      <HighlightedText value={identity} query={normalized} />
                    </span>
                    <Badge
                      variant="outline"
                      className="h-5 shrink-0 rounded-md px-1.5 text-[0.625rem] font-medium"
                    >
                      <HighlightedText
                        value={displayStatus(item.state)}
                        query={normalized}
                      />
                    </Badge>
                  </span>
                  <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 text-caption text-foreground/85">
                    <span>
                      <HighlightedText
                        value={item.componentName}
                        query={normalized}
                      />
                    </span>
                    <span aria-hidden="true" className="text-muted-readable">
                      ·
                    </span>
                    <code className="text-tabular">
                      <HighlightedText
                        value={item.componentCode}
                        query={normalized}
                      />
                    </code>
                    <span aria-hidden="true" className="text-muted-readable">
                      ·
                    </span>
                    <span>{displayStatus(item.componentType)}</span>
                  </span>
                  <span className="grid min-w-0 gap-1 text-caption text-muted-readable sm:grid-cols-2 sm:gap-x-4">
                    <span className="inline-flex min-w-0 items-center gap-1.5">
                      <MapPin
                        aria-hidden="true"
                        className="size-3.5 shrink-0"
                      />
                      <span className="truncate">
                        <HighlightedText value={location} query={normalized} />
                      </span>
                    </span>
                    {item.orgUnitName === null ? null : (
                      <span className="inline-flex min-w-0 items-center gap-1.5">
                        <Building2
                          aria-hidden="true"
                          className="size-3.5 shrink-0"
                        />
                        <span className="truncate">
                          <HighlightedText
                            value={item.orgUnitName}
                            query={normalized}
                          />
                        </span>
                      </span>
                    )}
                  </span>
                  {item.lotNumber === null &&
                  item.integrityWarnings.length === 0 ? null : (
                    <span className="flex flex-wrap items-center gap-1.5 text-caption text-muted-readable">
                      {item.lotNumber === null ? null : (
                        <span>
                          Lot{" "}
                          <code className="text-tabular text-foreground">
                            <HighlightedText
                              value={item.lotNumber}
                              query={normalized}
                            />
                          </code>
                        </span>
                      )}
                      {item.integrityWarnings.length === 0 ? null : (
                        <Badge variant="destructive" className="rounded-md">
                          {item.integrityWarnings.length} integrity warning
                          {item.integrityWarnings.length === 1 ? "" : "s"}
                        </Badge>
                      )}
                    </span>
                  )}
                </span>
              </span>
            </Link>
          </Button>
        );
      })}
      {visibleState.truncated ? (
        <p className="px-2 pt-1 text-caption text-muted-readable">
          Showing the best eight matches. Press Enter to apply the search to the
          full component table.
        </p>
      ) : null}
    </div>
  );
}

export function GlobalSearch({
  results = [],
}: GlobalSearchProps): React.ReactElement {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();
  const pageSearchScope = resolvePageSearchScope(pathname);
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [dealerLiveState, setDealerLiveState] =
    React.useState<DealerLiveSearchState | null>(null);
  const [vehicleLiveState, setVehicleLiveState] =
    React.useState<VehicleLiveSearchState | null>(null);
  const [componentLiveState, setComponentLiveState] =
    React.useState<ComponentLiveSearchState | null>(null);
  const deferredQuery = React.useDeferredValue(query);
  const debouncedPageQuery = useDebounce(query, LIVE_SEARCH_DELAY_MS, {
    maxWait: LIVE_SEARCH_MAX_WAIT_MS,
  });
  const normalizedResults = React.useMemo(
    () => normalizeResults(results),
    [results],
  );
  const filteredResults = React.useMemo(() => {
    const normalizedQuery =
      normalizedPageQuery(deferredQuery).toLocaleLowerCase("en-US");

    return normalizedResults
      .filter((result) => matches(result, normalizedQuery))
      .slice(0, MAX_RESULTS);
  }, [deferredQuery, normalizedResults]);
  const currentPageQuery = normalizedPageQuery(searchParams.get("q") ?? "");

  const updatePageSearch = React.useCallback(
    (value: string, close: boolean): void => {
      if (pageSearchScope === null) {
        return;
      }

      const next = new URLSearchParams(searchParamsString);
      const normalized = normalizedPageQuery(value);

      if (normalized.length === 0) {
        next.delete("q");
      } else {
        next.set("q", normalized);
      }

      for (const cursor of pageSearchScope.cursorParams) {
        next.delete(cursor);
      }

      if (pageSearchScope.mode === "vehicle-live") {
        next.delete("unitId");
        next.delete("entryKey");
      }

      if (pageSearchScope.mode === "component-live") {
        next.delete("focusComponentInventoryId");
      }

      const serialized = next.toString();
      const href = (
        serialized.length > 0 ? `${pathname}?${serialized}` : pathname
      ) as Route;

      router.push(href, { scroll: false });

      if (close) {
        setOpen(false);
      }
    },
    [pageSearchScope, pathname, router, searchParamsString],
  );

  const handleOpenChange = React.useCallback(
    (nextOpen: boolean): void => {
      setOpen(nextOpen);
      setQuery(nextOpen && pageSearchScope !== null ? currentPageQuery : "");
    },
    [currentPageQuery, pageSearchScope],
  );

  const closeSearch = React.useCallback((): void => {
    setOpen(false);
  }, []);

  React.useEffect(() => {
    const normalized = normalizedPageQuery(debouncedPageQuery);

    if (
      !open ||
      pageSearchScope?.mode !== "dealer-live" ||
      normalized.length < pageSearchScope.minimumCharacters
    ) {
      return;
    }

    const controller = new AbortController();
    const path = dealerLiveSearchPath(
      normalized,
      new URLSearchParams(searchParamsString),
    );

    void sameOriginFetch(path, {
      method: HTTP_METHODS.GET,
      schema: dealerLiveSearchResponseSchema,
      timeoutMs: LIVE_SEARCH_TIMEOUT_MS,
      signal: controller.signal,
    })
      .then((payload) => {
        if (controller.signal.aborted) return;
        setDealerLiveState({
          kind: "success",
          query: normalized,
          items: toDealerLiveSearchItems(payload),
          truncated: payload.truncated,
        });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        const failure = dealerSearchError(error);
        setDealerLiveState({
          kind: "error",
          query: normalized,
          message: failure.message,
          requestId: failure.requestId,
        });
      });

    return () => {
      controller.abort();
    };
  }, [debouncedPageQuery, open, pageSearchScope, searchParamsString]);

  React.useEffect(() => {
    const normalized = normalizedPageQuery(debouncedPageQuery);

    if (
      !open ||
      pageSearchScope?.mode !== "vehicle-live" ||
      normalized.length < pageSearchScope.minimumCharacters
    ) {
      return;
    }

    const controller = new AbortController();
    const path = vehicleLiveSearchPath(
      normalized,
      new URLSearchParams(searchParamsString),
    );

    void sameOriginFetch(path, {
      method: HTTP_METHODS.GET,
      schema: vehicleLiveSearchResponseSchema,
      timeoutMs: LIVE_SEARCH_TIMEOUT_MS,
      signal: controller.signal,
    })
      .then((payload) => {
        if (controller.signal.aborted) {
          return;
        }

        setVehicleLiveState({
          kind: "success",
          query: normalized,
          items: toVehicleLiveSearchItems(payload),
          truncated: payload.truncated,
        });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        const failure = inventorySearchError(
          error,
          "You do not have access to search this dealer inventory.",
        );
        setVehicleLiveState({
          kind: "error",
          query: normalized,
          message: failure.message,
          requestId: failure.requestId,
        });
      });

    return () => {
      controller.abort();
    };
  }, [debouncedPageQuery, open, pageSearchScope, searchParamsString]);

  React.useEffect(() => {
    const normalized = normalizedPageQuery(debouncedPageQuery);

    if (
      !open ||
      pageSearchScope?.mode !== "component-live" ||
      normalized.length < pageSearchScope.minimumCharacters
    ) {
      return;
    }

    const controller = new AbortController();
    const path = componentLiveSearchPath(normalized);

    void sameOriginFetch(path, {
      method: HTTP_METHODS.GET,
      schema: componentLiveSearchResponseSchema,
      timeoutMs: LIVE_SEARCH_TIMEOUT_MS,
      signal: controller.signal,
    })
      .then((payload) => {
        if (controller.signal.aborted) return;
        setComponentLiveState({
          kind: "success",
          query: normalized,
          items: toComponentLiveSearchItems(payload),
          truncated: payload.truncated,
        });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        const failure = inventorySearchError(
          error,
          "You do not have access to search this component inventory scope.",
        );
        setComponentLiveState({
          kind: "error",
          query: normalized,
          message: failure.message,
          requestId: failure.requestId,
        });
      });

    return () => {
      controller.abort();
    };
  }, [debouncedPageQuery, open, pageSearchScope, searchParamsString]);

  React.useEffect(() => {
    function handleShortcut(event: KeyboardEvent): void {
      if (
        event.defaultPrevented ||
        event.repeat ||
        event.isComposing ||
        event.altKey ||
        event.shiftKey ||
        (!event.metaKey && !event.ctrlKey) ||
        event.key.toLocaleLowerCase("en-US") !== "k"
      ) {
        return;
      }

      event.preventDefault();
      handleOpenChange(!open);
    }

    window.addEventListener("keydown", handleShortcut);
    return () => {
      window.removeEventListener("keydown", handleShortcut);
    };
  }, [handleOpenChange, open]);

  function submitPageSearch(
    event: React.SyntheticEvent<HTMLFormElement>,
  ): void {
    event.preventDefault();

    if (pageSearchScope === null || !pageQueryIsReady(query, pageSearchScope)) {
      return;
    }

    updatePageSearch(query, true);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={pageSearchScope?.triggerLabel ?? "Open search"}
          aria-keyshortcuts="Meta+K Control+K"
        >
          <Search aria-hidden="true" className="size-4" />
        </Button>
      </DialogTrigger>

      <DialogContent height="default" className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {pageSearchScope?.title ?? "Search workspace"}
          </DialogTitle>
          <DialogDescription>
            {pageSearchScope?.description ??
              "Search available navigation, actions, and workspace records."}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="grid content-start gap-4">
          {pageSearchScope !== null ? (
            <form
              id="global-page-search-form"
              role="search"
              className="grid gap-4"
              onSubmit={submitPageSearch}
            >
              <div className="relative">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-readable"
                />
                <Input
                  type="search"
                  value={query}
                  onChange={(event) => {
                    setQuery(
                      event.currentTarget.value.slice(0, MAX_QUERY_LENGTH),
                    );
                  }}
                  className="ps-9"
                  placeholder={pageSearchScope.placeholder}
                  autoFocus
                  autoComplete="off"
                  enterKeyHint="search"
                  spellCheck={false}
                  aria-label={pageSearchScope.inputLabel}
                />
              </div>

              {pageSearchScope.mode === "dealer-live" ? (
                <DealerLiveResults
                  query={query}
                  debouncedQuery={debouncedPageQuery}
                  minimumCharacters={pageSearchScope.minimumCharacters}
                  state={dealerLiveState}
                  closeSearch={closeSearch}
                />
              ) : pageSearchScope.mode === "vehicle-live" ? (
                <VehicleLiveResults
                  query={query}
                  debouncedQuery={debouncedPageQuery}
                  minimumCharacters={pageSearchScope.minimumCharacters}
                  state={vehicleLiveState}
                  closeSearch={closeSearch}
                />
              ) : pageSearchScope.mode === "component-live" ? (
                <ComponentLiveResults
                  query={query}
                  debouncedQuery={debouncedPageQuery}
                  minimumCharacters={pageSearchScope.minimumCharacters}
                  state={componentLiveState}
                  closeSearch={closeSearch}
                />
              ) : (
                <p className="text-caption text-muted-readable">
                  Press Enter to apply this search to the page. Existing page
                  filters stay in place.
                </p>
              )}
            </form>
          ) : (
            <div role="search" className="grid gap-4">
              <div className="relative">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-readable"
                />
                <Input
                  type="search"
                  value={query}
                  onChange={(event) => {
                    setQuery(
                      event.currentTarget.value.slice(0, MAX_QUERY_LENGTH),
                    );
                  }}
                  className="ps-9"
                  placeholder="Search"
                  autoFocus
                  autoComplete="off"
                  enterKeyHint="search"
                  spellCheck={false}
                  aria-label="Search workspace"
                />
              </div>

              <p className="sr-only" role="status" aria-live="polite">
                {filteredResults.length} result
                {filteredResults.length === 1 ? "" : "s"} available.
              </p>

              <div
                role="region"
                aria-label="Search results"
                tabIndex={0}
                className="scrollbar-compact grid gap-1 rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/35"
              >
                {filteredResults.length === 0 ? (
                  <p className="rounded-xl border border-border/70 bg-muted/35 px-4 py-6 text-center text-body-sm text-muted-readable">
                    {query.trim().length > 0
                      ? "No matching results."
                      : "No workspace search items are available."}
                  </p>
                ) : (
                  filteredResults.map((result) => (
                    <Button
                      key={result.id}
                      variant="ghost"
                      className="h-auto justify-start rounded-xl px-3 py-2 text-start"
                      asChild
                    >
                      <Link href={result.href} prefetch onClick={closeSearch}>
                        <span className="grid min-w-0 gap-0.5">
                          <span className="truncate text-body-sm">
                            <HighlightedText
                              value={result.title}
                              query={query}
                            />
                          </span>
                          {result.description !== undefined &&
                          result.description !== null ? (
                            <span className="truncate text-caption text-muted-readable">
                              <HighlightedText
                                value={result.description}
                                query={query}
                              />
                            </span>
                          ) : null}
                        </span>
                      </Link>
                    </Button>
                  ))
                )}
              </div>
            </div>
          )}
        </DialogBody>

        <DialogFooter className="items-center sm:justify-between">
          {pageSearchScope === null ? (
            <span className="mr-auto hidden text-caption text-muted-readable sm:inline">
              Shortcut: Ctrl/⌘ + K
            </span>
          ) : (
            <Button
              type="button"
              variant="ghost"
              className="sm:mr-auto"
              disabled={query.length === 0 && currentPageQuery.length === 0}
              onClick={() => {
                setQuery("");
                updatePageSearch("", false);
              }}
            >
              Clear page search
            </Button>
          )}

          {pageSearchScope !== null ? (
            <Button
              type="submit"
              form="global-page-search-form"
              disabled={!pageQueryIsReady(query, pageSearchScope)}
            >
              <Search aria-hidden="true" className="size-4" />
              {pageSearchScope.mode === "dealer-live" ||
              pageSearchScope.mode === "vehicle-live" ||
              pageSearchScope.mode === "component-live"
                ? "Show all matches"
                : "Search this page"}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
