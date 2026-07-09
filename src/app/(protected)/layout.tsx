// oz-next-app/src/app/(protected)/layout.tsx
import "server-only";

import type { ReactElement, ReactNode } from "react";

import { SidebarWrapper } from "@/components/app-shell/sidebar-wrapper";
import { requireAuthenticatedMe } from "@/features/auth/server/require-auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

type ProtectedLayoutProps = Readonly<{
  children: ReactNode;
}>;

const WORKSPACE_BRAND = {
  name: "Ozotec EV",
  tagline: "Enterprise workspace",
  logoLight: "/icon-light.svg",
  logoDark: "/icon-dark.svg",
} as const;

const EMPTY_NOTIFICATIONS = [] as const;

export default async function ProtectedLayout({
  children,
}: ProtectedLayoutProps): Promise<ReactElement> {
  const me = await requireAuthenticatedMe();

  return (
    <SidebarWrapper
      me={me}
      brandName={WORKSPACE_BRAND.name}
      brandTagline={WORKSPACE_BRAND.tagline}
      brandLogoLight={WORKSPACE_BRAND.logoLight}
      brandLogoDark={WORKSPACE_BRAND.logoDark}
      notifications={EMPTY_NOTIFICATIONS}
    >
      {children}
    </SidebarWrapper>
  );
}
