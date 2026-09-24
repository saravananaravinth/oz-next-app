// oz-next-app/src/app/(protected)/settings/integrations/payments/page.tsx
import type { Metadata } from "next";
import { EXTENDED_WARRANTY_ROUTE_PERMISSION } from "@/features/extended-warranty/contracts/route-access";
import { requireExtendedWarrantyRouteAccess } from "@/features/extended-warranty/server/route-access";
import {
  PaymentProviderSettingsPage,
  loadPaymentProviderAccounts,
} from "@/features/extended-warranty";
export const metadata: Metadata = {
  title: "Payment Integrations | Ozotec ERP",
  robots: { index: false, follow: false, nocache: true },
};
export default async function Page() {
  const access = await requireExtendedWarrantyRouteAccess([
    EXTENDED_WARRANTY_ROUTE_PERMISSION.PAYMENT_SETTINGS,
  ]);
  if (access.kind !== "resolved")
    return (
      <div role="status" className="p-6">
        {access.reason}
      </div>
    );
  return (
    <PaymentProviderSettingsPage
      accounts={await loadPaymentProviderAccounts(access)}
      tenantId={access.tenantId}
    />
  );
}
