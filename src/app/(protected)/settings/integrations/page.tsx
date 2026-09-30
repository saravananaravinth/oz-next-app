// oz-next-app/src/app/(protected)/settings/integrations/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactElement } from "react";

import { ContentRoot, ContentStatus } from "@/components/common/content-shell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireAuthenticatedMe } from "@/features/auth/server/require-auth";

export const metadata: Metadata = {
  title: "Integrations | Ozotec ERP",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

type IntegrationEntry = Readonly<{
  href:
    "/settings/integrations/payments" | "/settings/integrations/zoho-inventory";
  title: string;
  description: string;
}>;

export default async function IntegrationsPage(): Promise<ReactElement> {
  const me = await requireAuthenticatedMe();
  const entries: IntegrationEntry[] = [];

  if (me.permissions.includes("payment:read")) {
    entries.push({
      href: "/settings/integrations/payments",
      title: "Payments",
      description:
        "Manage tenant payment provider accounts, health, transactions, and webhook reconciliation.",
    });
  }

  if (me.permissions.includes("integration:read")) {
    entries.push({
      href: "/settings/integrations/zoho-inventory",
      title: "Zoho Inventory",
      description:
        "Manage tenant Zoho Inventory connections, synchronization, mappings, and operational history.",
    });
  }

  return (
    <ContentRoot width="wide">
      <div className="grid gap-6">
        <div className="grid gap-1">
          <h1 className="text-3xl font-semibold tracking-tight">
            Integrations
          </h1>
          <p className="text-sm text-muted-foreground">
            Open an integration that the current ERP authorization projection
            permits for the active actor.
          </p>
        </div>

        {entries.length === 0 ? (
          <ContentStatus
            variant="warning"
            title="No integration settings are available"
            description="The current actor does not have permission to read payment or external integration settings."
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {entries.map((entry) => (
              <Card key={entry.href}>
                <CardHeader>
                  <CardTitle>{entry.title}</CardTitle>
                  <CardDescription>{entry.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild variant="outline">
                    <Link href={entry.href}>Open {entry.title}</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ContentRoot>
  );
}
