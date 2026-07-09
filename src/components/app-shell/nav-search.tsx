// oz-next-app/src/components/app-shell/nav-search.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { safeInternalHref } from "@/lib/security";

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

const MAX_QUERY_LENGTH = 80;
const MAX_RESULTS = 20;
const MAX_TEXT_LENGTH = 160;

const ASCII_CONTROL_MAX_CODE_POINT = 0x1f;
const ASCII_DELETE_CODE_POINT = 0x7f;
const WHITESPACE_RE = /\s+/gu;

function replaceControlCharacters(value: string): string {
  let output = "";
  let changed = false;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index] ?? "";
    const codePoint = value.charCodeAt(index);

    if (
      codePoint <= ASCII_CONTROL_MAX_CODE_POINT ||
      codePoint === ASCII_DELETE_CODE_POINT
    ) {
      output += " ";
      changed = true;
      continue;
    }

    output += character;
  }

  return changed ? output : value;
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

function matches(result: SearchResult, query: string): boolean {
  if (query.length === 0) {
    return true;
  }

  const haystack =
    `${result.title} ${result.description ?? ""} ${result.category ?? ""}`.toLowerCase();

  return haystack.includes(query.toLowerCase());
}

export function GlobalSearch({
  results = [],
}: GlobalSearchProps): React.ReactElement {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");

  const filteredResults = React.useMemo(
    () =>
      results
        .map(normalizeResult)
        .filter((result): result is SearchResult => result !== null)
        .filter((result) => matches(result, query))
        .slice(0, MAX_RESULTS),
    [query, results],
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Open search"
        >
          <Search aria-hidden="true" className="size-4" />
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Search workspace</DialogTitle>
          <DialogDescription>
            Search available navigation, actions, and workspace records.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <Input
            value={query}
            onChange={(event) => {
              setQuery(event.currentTarget.value.slice(0, MAX_QUERY_LENGTH));
            }}
            placeholder="Search"
            autoFocus
            aria-label="Search workspace"
          />

          <div className="grid max-h-[360px] gap-1 overflow-y-auto">
            {filteredResults.length === 0 ? (
              <p className="rounded-2xl border border-border/70 bg-muted/40 px-4 py-6 text-center text-body-sm text-muted-readable">
                No matching results.
              </p>
            ) : (
              filteredResults.map((result) => (
                <Button
                  key={result.id}
                  variant="ghost"
                  className="h-auto justify-start rounded-2xl px-3 py-2 text-left"
                  asChild
                >
                  <Link
                    href={result.href}
                    prefetch
                    onClick={() => {
                      setOpen(false);
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
