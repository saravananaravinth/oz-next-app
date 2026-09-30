// oz-next-app/src/app/(protected)/settings/page.tsx
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
  title: "Settings | Ozotec ERP",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

export default async function SettingsPage(): Promise<ReactElement> {
  const me = await requireAuthenticatedMe();
  const canReadIntegrations =
    me.permissions.includes("payment:read") ||
    me.permissions.includes("integration:read");

  return (
    <ContentRoot width="wide">
      <div className="grid gap-6">
        <div className="grid gap-1">
          <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Configure tenant-scoped ERP integrations and operational services.
          </p>
        </div>

        {canReadIntegrations ? (
          <Card>
            <CardHeader>
              <CardTitle>Integrations</CardTitle>
              <CardDescription>
                Manage approved external providers through tenant-aware ERP
                configuration flows.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/settings/integrations">Open integrations</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <ContentStatus
            variant="warning"
            title="No settings are available"
            description="The current actor does not have permission to read the available tenant settings."
          />
        )}
      </div>
    </ContentRoot>
  );
}
