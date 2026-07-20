// oz-next-app/src/features/tenant-context/ui/tenant-selection.tsx
"use client";

import * as React from "react";
import { BadgeCheck, Building2, ShieldCheck } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import type { TenantMembership } from "@/lib/api/contracts";
import { cn } from "@/lib/utils";

export type TenantSelectionProps = Readonly<{
  tenants: readonly TenantMembership[];
  currentTenantId: string | null;
  onTenantPreviewChange?: (tenantId: string) => void;
}>;

const MAX_TENANTS = 80;
const MAX_TEXT_LENGTH = 120;

const C0_CONTROL_MAX_CODE_POINT = 0x1f;
const DELETE_CONTROL_CODE_POINT = 0x7f;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const WHITESPACE_RE = /\s+/gu;

function isControlCodePoint(codePoint: number): boolean {
  return (
    codePoint <= C0_CONTROL_MAX_CODE_POINT ||
    codePoint === DELETE_CONTROL_CODE_POINT
  );
}

function replaceControlCharacters(value: string): string {
  let output = "";

  for (const character of value) {
    const codePoint = character.codePointAt(0);

    output +=
      codePoint === undefined || isControlCodePoint(codePoint)
        ? " "
        : character;
  }

  return output;
}

function truncateText(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function normalizeDisplayText(value: string): string {
  return replaceControlCharacters(value).replace(WHITESPACE_RE, " ").trim();
}

function cleanText(value: string | null | undefined, fallback: string): string {
  const normalized = normalizeDisplayText(value ?? "");
  const normalizedFallback = normalizeDisplayText(fallback);
  const resolved =
    normalized.length > 0
      ? normalized
      : normalizedFallback.length > 0
        ? normalizedFallback
        : "Untitled tenant";

  return truncateText(resolved, MAX_TEXT_LENGTH);
}

function normalizeTenantId(value: string | null | undefined): string | null {
  const tenantId = value?.trim() ?? "";

  return UUID_PATTERN.test(tenantId) ? tenantId : null;
}

function normalizeTenants(
  tenants: readonly TenantMembership[],
): readonly TenantMembership[] {
  const normalizedTenants: TenantMembership[] = [];
  const seenTenantIds = new Set<string>();

  for (const tenant of tenants.slice(0, MAX_TENANTS)) {
    const tenantId = normalizeTenantId(tenant.tenant_id);

    if (tenantId === null || seenTenantIds.has(tenantId)) {
      continue;
    }

    seenTenantIds.add(tenantId);
    normalizedTenants.push({
      ...tenant,
      tenant_id: tenantId,
      tenant_name: cleanText(tenant.tenant_name, "Current tenant"),
    });
  }

  return normalizedTenants;
}

function VerifiedTenantIcon({
  className,
}: Readonly<{
  className?: string;
}>): React.ReactElement {
  return (
    <BadgeCheck
      aria-hidden="true"
      className={cn("size-4 shrink-0 text-success", className)}
      strokeWidth={2}
    />
  );
}

function TenantAvatar(): React.ReactElement {
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-2xl border border-border/70 bg-muted/40 text-muted-readable">
      <Building2 aria-hidden="true" className="size-4" />
    </span>
  );
}

function ActiveTenantBadge(): React.ReactElement {
  return (
    <span className="ml-auto inline-flex h-6 shrink-0 items-center rounded-full border border-success/25 bg-success/10 px-2.5 text-caption text-success dark:border-success/35 dark:bg-success/10">
      Active
    </span>
  );
}

function EmptyTenantSelection(): React.ReactElement {
  return (
    <div
      role="status"
      aria-live="polite"
      className="inline-flex h-11 items-center gap-2 rounded-3xl border border-border/70 bg-muted/40 px-3 text-body-sm text-muted-readable shadow-xs"
    >
      <Building2 aria-hidden="true" className="size-4" />
      <span>No tenant</span>
    </div>
  );
}

export function TenantSelection({
  tenants,
  currentTenantId,
  onTenantPreviewChange,
}: TenantSelectionProps): React.ReactElement {
  const normalizedTenants = React.useMemo(
    () => normalizeTenants(tenants),
    [tenants],
  );

  const selectedTenant = React.useMemo(() => {
    const normalizedCurrentTenantId = normalizeTenantId(currentTenantId);

    if (normalizedCurrentTenantId !== null) {
      const matchedTenant = normalizedTenants.find(
        (tenant) => tenant.tenant_id === normalizedCurrentTenantId,
      );

      if (matchedTenant !== undefined) {
        return matchedTenant;
      }
    }

    return normalizedTenants[0] ?? null;
  }, [currentTenantId, normalizedTenants]);

  const handleTenantChange = React.useCallback(
    (tenantId: string): void => {
      const normalizedTenantId = normalizeTenantId(tenantId);

      if (normalizedTenantId === null) {
        return;
      }

      const tenantExists = normalizedTenants.some(
        (tenant) => tenant.tenant_id === normalizedTenantId,
      );

      if (!tenantExists) {
        return;
      }

      onTenantPreviewChange?.(normalizedTenantId);
    },
    [normalizedTenants, onTenantPreviewChange],
  );

  if (selectedTenant === null) {
    return <EmptyTenantSelection />;
  }

  return (
    <Select
      value={selectedTenant.tenant_id}
      onValueChange={handleTenantChange}
      disabled={normalizedTenants.length <= 1}
    >
      <SelectTrigger
        title={selectedTenant.tenant_name}
        aria-label={`Current tenant: ${selectedTenant.tenant_name}`}
        className={cn(
          "rounded-3xl border-border/70 bg-card/80 px-3 shadow-xs",
          "transition-[background-color,border-color,box-shadow]",
          "hover:bg-accent/40",
          "data-[state=open]:border-ring data-[state=open]:ring-3 data-[state=open]:ring-ring/20",
          "disabled:cursor-default disabled:opacity-100",
          "dark:bg-card/70",
          "[&>svg:last-child]:hidden",
        )}
      >
        <span className="sr-only">
          Current tenant: {selectedTenant.tenant_name}
        </span>

        <span className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
          <TenantAvatar />

          <span className="flex min-w-0 flex-1 items-center gap-2">
            <span className="truncate text-body-sm text-foreground [font-weight:var(--typography-emphasis-weight)]">
              {selectedTenant.tenant_name}
            </span>
            <VerifiedTenantIcon />
          </span>
        </span>
      </SelectTrigger>

      <SelectContent align="end" position="popper" className="w-[420px] p-1.5">
        {normalizedTenants.map((tenant) => {
          const isActiveTenant = tenant.tenant_id === selectedTenant.tenant_id;

          return (
            <SelectItem
              key={tenant.tenant_id}
              value={tenant.tenant_id}
              textValue={tenant.tenant_name}
              className={cn(
                "rounded-2xl py-2.5",
                "[&>span:first-child]:hidden",
                isActiveTenant
                  ? "bg-accent/60 text-accent-foreground"
                  : "text-popover-foreground",
              )}
            >
              <span className="flex min-w-0 items-center gap-2.5 pr-1">
                <TenantAvatar />

                <span className="flex min-w-0 flex-1 items-center gap-2">
                  <span className="truncate text-body-sm text-foreground">
                    {tenant.tenant_name}
                  </span>
                  <VerifiedTenantIcon className="size-3.5" />
                </span>

                {isActiveTenant ? <ActiveTenantBadge /> : null}
              </span>
            </SelectItem>
          );
        })}

        <div className="mt-1 flex items-start gap-2 rounded-2xl border border-border/70 bg-muted/35 px-3 py-2.5 text-caption text-muted-readable">
          <ShieldCheck
            aria-hidden="true"
            className="mt-0.5 size-3.5 shrink-0"
          />
          <span>
            Tenant context changes require server-validated actor access.
          </span>
        </div>
      </SelectContent>
    </Select>
  );
}
