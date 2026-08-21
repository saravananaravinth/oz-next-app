// oz-next-app/src/features/integrations/zoho-inventory/ui/zoho-connect-control.tsx
"use client";

import * as React from "react";
import { Link2, LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/shared/hooks";

import { beginZohoAuthorizationAction } from "@/features/integrations/zoho-inventory/actions/zoho-inventory.actions";
import {
  zohoInventoryDataCenterSchema,
  type ZohoInventoryDataCenter,
} from "@/features/integrations/zoho-inventory/contracts/zoho-inventory.schema";

const DATA_CENTER_LABELS = {
  IN: "India",
  US: "United States",
  EU: "Europe",
  AU: "Australia",
  CA: "Canada",
} as const satisfies Record<ZohoInventoryDataCenter, string>;

export type ZohoConnectControlProps = Readonly<{
  defaultDataCenter?: ZohoInventoryDataCenter;
  fixedDataCenter?: ZohoInventoryDataCenter;
  forceConsent?: true;
  label?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
}>;

function failureDescription(
  input: Readonly<{
    message: string;
    requestId?: string;
  }>,
): string {
  return input.requestId === undefined
    ? input.message
    : `${input.message} Reference: ${input.requestId}`;
}

export function ZohoConnectControl({
  defaultDataCenter = "IN",
  fixedDataCenter,
  forceConsent = true,
  label = "Connect Zoho",
  variant = "default",
}: ZohoConnectControlProps): React.ReactElement {
  const [dataCenter, setDataCenter] = React.useState<ZohoInventoryDataCenter>(
    fixedDataCenter ?? defaultDataCenter,
  );
  const [isPending, startTransition] = React.useTransition();

  function beginAuthorization(): void {
    startTransition(() => {
      void beginZohoAuthorizationAction({
        dataCenter: fixedDataCenter ?? dataCenter,
        forceConsent,
      }).then((result) => {
        if (!result.ok) {
          toast.error({
            title: "Zoho connection could not start",
            description: failureDescription(result),
            replace: true,
          });
          return;
        }

        window.location.assign(result.data.authorizationUrl);
      });
    });
  }

  return (
    <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
      {fixedDataCenter === undefined ? (
        <Select
          value={dataCenter}
          onValueChange={(value) => {
            const parsed = zohoInventoryDataCenterSchema.safeParse(value);

            if (parsed.success) {
              setDataCenter(parsed.data);
            }
          }}
          disabled={isPending}
        >
          <SelectTrigger
            aria-label="Zoho data center"
            className="min-w-44 rounded-xl bg-background"
          >
            <SelectValue placeholder="Select data center" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(DATA_CENTER_LABELS).map(([value, text]) => (
              <SelectItem key={value} value={value}>
                {text}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}

      <Button
        type="button"
        variant={variant}
        onClick={beginAuthorization}
        disabled={isPending}
        aria-busy={isPending}
      >
        {isPending ? (
          <LoaderCircle
            aria-hidden="true"
            className="size-4 animate-spin motion-reduce:animate-none"
          />
        ) : (
          <Link2 aria-hidden="true" className="size-4" />
        )}
        {isPending ? "Opening Zoho…" : label}
      </Button>
    </div>
  );
}
