// oz-next-app/src/app/(protected)/dashboard/page.tsx
import type { Metadata } from "next";
import type { ReactElement } from "react";

import { WelcomeDashboard } from "@/features/dashboard/components/welcome-dashboard";

const PAGE_TITLE = "Dashboard";
const PAGE_DESCRIPTION = "Secure Ozotec EV workspace home.";

export const metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
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

export default function DashboardPage(): ReactElement {
  return <WelcomeDashboard />;
}
