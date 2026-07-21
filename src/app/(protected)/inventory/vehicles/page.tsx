// oz-next-app/src/app/(protected)/inventory/vehicles/page.tsx
import type { Metadata } from "next";
import type { ReactElement } from "react";

import { requireAuthenticatedMe } from "@/features/auth/server/require-auth";
import {
  parseVehicleInventorySearchParams,
  readVehicleInventoryWorkspace,
  resolveVehicleInventoryAccess,
  VehicleInventoryAccessState,
  VehicleInventoryInvalidQueryState,
  VehicleInventoryPage,
  VehicleInventoryRequestFailureState,
  type VehicleInventoryRawSearchParams,
} from "@/features/inventory/vehicles";
import { isApiHttpError } from "@/lib/api/problem";

const PAGE_TITLE = "Vehicle inventory";
const PAGE_DESCRIPTION =
  "Dealer-scoped Ozotec vehicle inventory, pricing, transfer, and data-quality workspace.";

type VehicleInventoryPageProps = Readonly<{
  searchParams: Promise<VehicleInventoryRawSearchParams>;
}>;

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

export default async function VehicleInventoryRoutePage({
  searchParams,
}: VehicleInventoryPageProps): Promise<ReactElement> {
  const [me, rawSearchParams] = await Promise.all([
    requireAuthenticatedMe(),
    searchParams,
  ]);
  const parsedQuery = parseVehicleInventorySearchParams(rawSearchParams);

  if (!parsedQuery.success) {
    return (
      <VehicleInventoryInvalidQueryState issues={parsedQuery.error.issues} />
    );
  }

  const access = resolveVehicleInventoryAccess(me, parsedQuery.data);

  if (access.kind !== "dealer" && access.kind !== "contextual") {
    return <VehicleInventoryAccessState access={access} tenants={me.tenants} />;
  }

  let data;

  try {
    data = await readVehicleInventoryWorkspace({
      query: parsedQuery.data,
      access,
    });
  } catch (error: unknown) {
    if (isApiHttpError(error)) {
      return <VehicleInventoryRequestFailureState error={error} />;
    }

    throw error;
  }

  return (
    <VehicleInventoryPage
      access={access}
      query={parsedQuery.data}
      data={data}
    />
  );
}
