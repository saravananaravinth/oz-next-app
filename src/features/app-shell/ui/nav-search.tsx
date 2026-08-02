// oz-next-app/src/features/app-shell/ui/nav-search.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

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
import { safeInternalHref } from "@/lib/security/navigation";

export type SearchCategory =
  "navigation" | "customer" | "order" | "vehicle" | "report" | "action";

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

const MAX_QUERY_LENGTH = 100;
const MAX_RESULTS = 20;
const MAX_SOURCE_RESULTS = 500;
const MAX_TEXT_LENGTH = 160;
const ENGAGEMENT_DASHBOARD_PREFIX = "/engagement/dashboard";
const DEALERSHIP_OPERATIONS_PREFIX = "/engagement/dealership-applications";
const DEALERSHIP_DEALERS_PREFIX = `${DEALERSHIP_OPERATIONS_PREFIX}/dealers`;

type PageSearchConfig = Readonly<{
  title: string;
  description: string;
  placeholder: string;
  ariaLabel: string;
  targetPath: Route;
  cursorParams: readonly string[];
}>;

const ENGAGEMENT_CURSOR_PARAMS = [
  "dealerCursor",
  "issueCursor",
  "leadCursor",
] as const;
const DEALERSHIP_CURSOR_PARAMS = ["cursor"] as const;
const ASCII_CONTROL_MAX_CODE_POINT = 0x1f;
const ASCII_DELETE_CODE_POINT = 0x7f;
const WHITESPACE_RE = /\s+/gu;

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
  if (query.length === 0) {
    return true;
  }

  return `${result.title} ${result.description ?? ""} ${result.category ?? ""}`
    .toLocaleLowerCase("en-US")
    .includes(query);
}

function pageSearchConfig(pathname: string): PageSearchConfig | null {
  if (
    pathname === ENGAGEMENT_DASHBOARD_PREFIX ||
    pathname.startsWith(`${ENGAGEMENT_DASHBOARD_PREFIX}/`)
  ) {
    return {
      title: "Search vehicle-sales engagement",
      description:
        "Search the current engagement workspace by lead number, customer, mobile, dealer, or dealer code.",
      placeholder: "Lead, customer, mobile, dealer, or code",
      ariaLabel: "Search the current engagement workspace",
      targetPath: pathname as Route,
      cursorParams: ENGAGEMENT_CURSOR_PARAMS,
    };
  }

  if (
    pathname === DEALERSHIP_OPERATIONS_PREFIX ||
    pathname.startsWith(`${DEALERSHIP_OPERATIONS_PREFIX}/`)
  ) {
    const dealerWorkspace =
      pathname === DEALERSHIP_DEALERS_PREFIX ||
      pathname.startsWith(`${DEALERSHIP_DEALERS_PREFIX}/`);

    return {
      title: "Search dealership operations",
      description: dealerWorkspace
        ? "Search authorized dealers and sub-dealers by name, code, city, district, or state."
        : "Search dealership applications by applicant, mobile, application number, business, source, or location.",
      placeholder: dealerWorkspace
        ? "Dealer, code, city, district, or state"
        : "Applicant, mobile, application, business, or location",
      ariaLabel: dealerWorkspace
        ? "Search dealers and sub-dealers"
        : "Search dealership applications",
      targetPath: (dealerWorkspace
        ? DEALERSHIP_DEALERS_PREFIX
        : DEALERSHIP_OPERATIONS_PREFIX) as Route,
      cursorParams: DEALERSHIP_CURSOR_PARAMS,
    };
  }

  return null;
}

export function GlobalSearch({
  results = [],
}: GlobalSearchProps): React.ReactElement {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pageSearch = React.useMemo(
    () => pageSearchConfig(pathname),
    [pathname],
  );
  const pageScoped = pageSearch !== null;
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const deferredQuery = React.useDeferredValue(query);
  const normalizedResults = React.useMemo(
    () => normalizeResults(results),
    [results],
  );
  const filteredResults = React.useMemo(() => {
    const normalizedQuery = cleanText(deferredQuery)
      .slice(0, MAX_QUERY_LENGTH)
      .toLocaleLowerCase("en-US");

    return normalizedResults
      .filter((result) => matches(result, normalizedQuery))
      .slice(0, MAX_RESULTS);
  }, [deferredQuery, normalizedResults]);

  const currentPageQuery = (searchParams.get("q") ?? "").slice(
    0,
    MAX_QUERY_LENGTH,
  );

  const handleOpenChange = React.useCallback(
    (nextOpen: boolean): void => {
      setOpen(nextOpen);
      setQuery(nextOpen && pageScoped ? currentPageQuery : "");
    },
    [currentPageQuery, pageScoped],
  );

  const navigatePageSearch = React.useCallback(
    (value: string): void => {
      const next = new URLSearchParams(searchParams.toString());
      const normalized = cleanText(value).slice(0, MAX_QUERY_LENGTH);

      if (normalized.length === 0) {
        next.delete("q");
      } else {
        next.set("q", normalized);
      }

      for (const cursor of pageSearch?.cursorParams ?? []) {
        next.delete(cursor);
      }

      const targetPath = pageSearch?.targetPath ?? (pathname as Route);
      const serialized = next.toString();
      router.push(
        serialized.length > 0 ? `${targetPath}?${serialized}` : targetPath,
      );
      handleOpenChange(false);
    },
    [handleOpenChange, pageSearch, pathname, router, searchParams],
  );

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
    navigatePageSearch(query);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={pageSearch?.ariaLabel ?? "Open search"}
          aria-keyshortcuts="Meta+K Control+K"
        >
          <Search aria-hidden="true" className="size-4" />
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{pageSearch?.title ?? "Search workspace"}</DialogTitle>
          <DialogDescription>
            {pageSearch?.description ??
              "Search available navigation, actions, and workspace records."}
          </DialogDescription>
        </DialogHeader>

        {pageScoped ? (
          <form role="search" className="contents" onSubmit={submitPageSearch}>
            <DialogBody className="grid gap-4">
              <Input
                type="search"
                value={query}
                onChange={(event) => {
                  setQuery(
                    event.currentTarget.value.slice(0, MAX_QUERY_LENGTH),
                  );
                }}
                placeholder={pageSearch.placeholder}
                autoFocus
                autoComplete="off"
                enterKeyHint="search"
                spellCheck={false}
                aria-label={pageSearch.ariaLabel}
              />
            </DialogBody>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={query.length === 0 && currentPageQuery.length === 0}
                onClick={() => {
                  navigatePageSearch("");
                }}
              >
                Clear search
              </Button>
              <Button type="submit">
                <Search aria-hidden="true" className="size-4" />
                Search this workspace
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <DialogBody role="search" className="grid content-start gap-4">
            <Input
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.currentTarget.value.slice(0, MAX_QUERY_LENGTH));
              }}
              placeholder="Search"
              autoFocus
              autoComplete="off"
              enterKeyHint="search"
              spellCheck={false}
              aria-label="Search workspace"
            />

            <p className="sr-only" role="status" aria-live="polite">
              {filteredResults.length} result
              {filteredResults.length === 1 ? "" : "s"} available.
            </p>

            <div
              role="region"
              aria-label="Search results"
              tabIndex={0}
              className="grid gap-1 rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/35"
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
                    <Link
                      href={result.href}
                      prefetch
                      onClick={() => {
                        handleOpenChange(false);
                      }}
                    >
                      <span className="grid min-w-0 gap-0.5">
                        <span className="truncate text-body-sm">
                          {result.title}
                        </span>
                        {result.description !== undefined &&
                        result.description !== null ? (
                          <span className="truncate text-caption text-muted-readable">
                            {result.description}
                          </span>
                        ) : null}
                      </span>
                    </Link>
                  </Button>
                ))
              )}
            </div>
          </DialogBody>
        )}
      </DialogContent>
    </Dialog>
  );
}
