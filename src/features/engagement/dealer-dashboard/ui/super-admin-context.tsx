// oz-next-app/src/features/engagement/dealer-dashboard/ui/super-admin-context.tsx
import type { ReactElement } from "react";
import { Building2, ShieldCheck } from "lucide-react";

import {
  ContentHeader,
  ContentRoot,
  ContentSection,
  ContentStatus,
} from "@/components/common/content-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SuperAdminDealerContext(): ReactElement {
  return (
    <ContentRoot
      width="narrow"
      aria-labelledby="dealer-context-selection-title"
    >
      <ContentHeader
        eyebrow={
          <Badge variant="secondary">
            <ShieldCheck aria-hidden="true" className="size-3.5" />
            Central operations
          </Badge>
        }
        title={
          <span id="dealer-context-selection-title">
            Select a dealer context
          </span>
        }
      />

      <ContentStatus
        variant="info"
        title="Explicit context is required"
        description="Central operations users must select both tenant and dealer organization scope before dealer engagement data is requested. The backend validates the selected context on every call."
      />

      <ContentSection
        title="Authorized dealer context"
        description="Use validated identifiers from the organization administration workspace. Values are sent only as requested actor context headers; they are not authorization proof and are never persisted in browser storage."
      >
        <form method="get" className="grid gap-4" noValidate>
          <label
            className="grid gap-1.5 text-body-sm"
            htmlFor="dealer-context-tenant-id"
          >
            <span className="text-foreground">Tenant ID</span>
            <Input
              id="dealer-context-tenant-id"
              name="tenantId"
              type="text"
              inputMode="text"
              autoComplete="off"
              placeholder="00000000-0000-0000-0000-000000000000"
              required
            />
          </label>
          <label
            className="grid gap-1.5 text-body-sm"
            htmlFor="dealer-context-org-unit-id"
          >
            <span className="text-foreground">Dealer organization unit ID</span>
            <Input
              id="dealer-context-org-unit-id"
              name="dealerOrgUnitId"
              type="text"
              inputMode="text"
              autoComplete="off"
              placeholder="00000000-0000-0000-0000-000000000000"
              required
            />
          </label>
          <div className="flex justify-end">
            <Button type="submit">
              <Building2 aria-hidden="true" className="size-4" />
              Open dealer dashboard
            </Button>
          </div>
        </form>
      </ContentSection>

      <ContentStatus
        variant="warning"
        title="Organization lookup integration required"
        description="Replace UUID entry with the centralized tenant and dealer lookup when the organization module exposes its protected search endpoint. Do not persist selected context in browser storage."
      />
    </ContentRoot>
  );
}
