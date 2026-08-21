// oz-next-app/src/features/integrations/zoho-inventory/ui/zoho-organization-selector.tsx
"use client";

import * as React from "react";
import { Building2, LoaderCircle, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/shared/hooks";

import { createZohoConnectionAction } from "@/features/integrations/zoho-inventory/actions/zoho-inventory.actions";
import type { ZohoPendingGrant } from "@/features/integrations/zoho-inventory/contracts/zoho-inventory.schema";

const INTEGRATION_PATH = "/settings/integrations/zoho-inventory";

export function ZohoOrganizationSelector({
  grant,
  defaultIsDefault,
}: Readonly<{
  grant: ZohoPendingGrant;
  defaultIsDefault: boolean;
}>): React.ReactElement {
  const router = useRouter();
  const defaultOrganization =
    grant.organizations.find((organization) => organization.isDefault) ??
    grant.organizations[0];
  const [organizationId, setOrganizationId] = React.useState(
    defaultOrganization?.organizationId ?? "",
  );
  const [isDefault, setIsDefault] = React.useState(defaultIsDefault);
  const [isPending, startTransition] = React.useTransition();

  function saveConnection(): void {
    if (organizationId.length === 0) {
      toast.error({
        title: "Select a Zoho organization",
        description:
          "Choose the Zoho Inventory organization to bind to this ERP tenant.",
        replace: true,
      });
      return;
    }

    startTransition(() => {
      void createZohoConnectionAction({
        authorizationId: grant.authorizationId,
        organizationId,
        isDefault,
      }).then((result) => {
        if (!result.ok) {
          toast.error({
            title: "Zoho organization could not be connected",
            description:
              result.requestId === undefined
                ? result.message
                : `${result.message} Reference: ${result.requestId}`,
            replace: true,
          });
          return;
        }

        toast.success({
          title: "Zoho Inventory connected",
          description: `${result.data.organizationName} is now connected to the active ERP tenant.`,
          replace: true,
        });
        router.replace(INTEGRATION_PATH);
        router.refresh();
      });
    });
  }

  return (
    <div className="grid gap-5 rounded-2xl border border-info/25 bg-info/5 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-info/20 bg-background text-info">
          <Building2 aria-hidden="true" className="size-5" />
        </span>
        <div className="grid min-w-0 gap-1">
          <h2 className="text-card-title text-foreground">
            Choose the Zoho Inventory organization
          </h2>
          <p className="text-body-sm text-muted-readable">
            OAuth authorization succeeded. The backend will validate this
            selection against the durable pending grant before creating the
            connection.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div className="grid gap-2">
          <Label htmlFor="zoho-organization">Zoho organization</Label>
          <Select
            value={organizationId}
            onValueChange={setOrganizationId}
            disabled={isPending}
          >
            <SelectTrigger
              id="zoho-organization"
              className="w-full rounded-xl bg-background"
            >
              <SelectValue placeholder="Select organization" />
            </SelectTrigger>
            <SelectContent>
              {grant.organizations.map((organization) => (
                <SelectItem
                  key={organization.organizationId}
                  value={organization.organizationId}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate">{organization.name}</span>
                    {organization.isDefault ? (
                      <span className="text-caption text-muted-readable">
                        Zoho default
                      </span>
                    ) : null}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          type="button"
          onClick={saveConnection}
          disabled={isPending}
          aria-busy={isPending}
        >
          {isPending ? (
            <LoaderCircle
              aria-hidden="true"
              className="size-4 animate-spin motion-reduce:animate-none"
            />
          ) : (
            <ShieldCheck aria-hidden="true" className="size-4" />
          )}
          {isPending ? "Connecting…" : "Connect organization"}
        </Button>
      </div>

      <div className="flex items-start justify-between gap-4 rounded-xl border border-border/70 bg-background p-3">
        <div className="grid gap-1">
          <Label htmlFor="zoho-default-connection">
            Use as default Zoho connection
          </Label>
          <p className="text-caption text-muted-readable">
            Only affects which connection is treated as the tenant default. It
            does not change Zoho organization ownership.
          </p>
        </div>
        <Switch
          id="zoho-default-connection"
          checked={isDefault}
          onCheckedChange={setIsDefault}
          disabled={isPending}
          aria-label="Use as default Zoho connection"
        />
      </div>
    </div>
  );
}
