// oz-next-app/src/app/public/extended-warranty/order/[token]/page.tsx
import type { Metadata, Viewport } from "next";
import type { ReactElement } from "react";

import { ExtendedWarrantyOrderStatusPage } from "@/features/extended-warranty";

export const metadata: Metadata = {
  title: "Extended Warranty Order | Ozotec EV",
  description: "Secure Ozotec EV Extended Warranty order status.",
  robots: { index: false, follow: false, nocache: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

type OrderStatusRouteProps = Readonly<{ params: Promise<{ token: string }> }>;

export default async function ExtendedWarrantyOrderStatusRoute({
  params,
}: OrderStatusRouteProps): Promise<ReactElement> {
  const { token } = await params;
  return <ExtendedWarrantyOrderStatusPage token={token} />;
}
