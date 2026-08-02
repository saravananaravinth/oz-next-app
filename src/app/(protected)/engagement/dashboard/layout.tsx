// oz-next-app/src/app/(protected)/engagement/dashboard/layout.tsx
import type { Metadata } from "next";
import type { ReactElement, ReactNode } from "react";

const WORKSPACE_DESCRIPTION =
  "Actor-scoped vehicle-sales lead intake, dealer performance, support, coverage, and customer video operations.";

export const metadata = {
  description: WORKSPACE_DESCRIPTION,
  robots: {
    index: false,
    follow: false,
    nocache: true,
    noarchive: true,
    nosnippet: true,
    noimageindex: true,
  },
} satisfies Metadata;

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

type EngagementDashboardLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default function EngagementDashboardLayout({
  children,
}: EngagementDashboardLayoutProps): ReactElement {
  return <>{children}</>;
}
