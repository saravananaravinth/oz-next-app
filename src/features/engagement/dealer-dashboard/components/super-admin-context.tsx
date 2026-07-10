import type { ReactElement } from "react";
import { Building2, ShieldCheck } from "lucide-react";

import {
  ContentHeader,
  ContentRoot,
  ContentSection,
  ContentStatus,
} from "@/components/content";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SuperAdminDealerContext(): ReactElement {
  return (
    <ContentRoot
      width="narrow"
      aria-labelledby="super-admin-dealer-context-title"
    >
      <ContentHeader
        eyebrow={
          <Badge variant="secondary">
            <ShieldCheck aria-hidden="true" className="size-3.5" />
            Super administrator
          </Badge>
        }
        title={
          <span id="super-admin-dealer-context-title">
            Select a dealer context
          </span>
        }
      />

      <ContentStatus
        variant="info"
        title="Explicit context is required"
        description="Super administrators must select both tenant and dealer organization scope before dealer engagement data is requested. The backend validates the selected context on every call."
      />

      <ContentSection
        title="Administrative dealer context"
        description="Use validated UUIDs from the organization administration workspace. Values are sent only as requested actor context headers and are never authorization proof."
      >
        <form method="get" className="grid gap-4" noValidate>
          <label
            className="grid gap-1.5 text-body-sm"
            htmlFor="super-admin-tenant-id"
          >
            <span className="text-foreground">Tenant ID</span>
            <Input
              id="super-admin-tenant-id"
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
            htmlFor="super-admin-dealer-id"
          >
            <span className="text-foreground">Dealer organization unit ID</span>
            <Input
              id="super-admin-dealer-id"
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
