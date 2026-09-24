// oz-next-app/src/app/(protected)/extended-warranty/orders/[orderId]/page.tsx
import { redirect, notFound } from "next/navigation";
import { loadExtendedWarrantyOrderVehicle } from "@/features/extended-warranty/api/admin.server";
import { requireExtendedWarrantyRouteAccess } from "@/features/extended-warranty/server/route-access";
export default async function Page({
  params,
}: {
  params: Promise<{ orderId: string }>;
}): Promise<never> {
  const access = await requireExtendedWarrantyRouteAccess([
    "extended-warranty:order:read",
  ]);
  if (access.kind !== "resolved") notFound();
  const result = await loadExtendedWarrantyOrderVehicle(
    access,
    (await params).orderId,
  );
  if (result.unitId === null) notFound();
  redirect(`/extended-warranty?unitId=${result.unitId}`);
}
