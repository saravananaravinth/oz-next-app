// oz-next-app/src/app/public/extended-warranty/purchase/[token]/page.tsx
import type { Metadata, Viewport } from "next";
import type { ReactElement } from "react";

import { ExtendedWarrantyPurchasePage } from "@/features/extended-warranty";

export const metadata: Metadata = {
  title: "Extended Warranty Purchase | Ozotec EV",
  description: "Secure Ozotec EV Extended Warranty purchase.",
  robots: { index: false, follow: false, nocache: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

type PurchaseRouteProps = Readonly<{ params: Promise<{ token: string }> }>;

export default async function ExtendedWarrantyPurchaseRoute({
  params,
}: PurchaseRouteProps): Promise<ReactElement> {
  const { token } = await params;
  return <ExtendedWarrantyPurchasePage token={token} />;
}
