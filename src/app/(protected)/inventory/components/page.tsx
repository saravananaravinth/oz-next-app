// oz-next-app/src/app/(protected)/inventory/components/page.tsx
import type { Metadata } from "next";
import type { ReactElement } from "react";

import { requireAuthenticatedMe } from "@/features/auth/server/require-auth";
import {
  ComponentInventoryAccessState,
  ComponentInventoryInvalidQueryState,
  ComponentInventoryPage,
  ComponentInventoryRequestFailureState,
  parseComponentInventorySearchParams,
  readComponentInventoryWorkspace,
  resolveComponentInventoryAccess,
  type ComponentInventoryRawSearchParams,
} from "@/features/inventory/components";
import { isApiHttpError } from "@/lib/api/problem";

const PAGE_TITLE = "Component inventory";
const PAGE_DESCRIPTION =
  "Actor-scoped Ozotec component inventory, custody, integrity, and audit workspace.";

type ComponentInventoryRoutePageProps = Readonly<{
  searchParams: Promise<ComponentInventoryRawSearchParams>;
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

export default async function ComponentInventoryRoutePage({
  searchParams,
}: ComponentInventoryRoutePageProps): Promise<ReactElement> {
  const [me, rawSearchParams] = await Promise.all([
    requireAuthenticatedMe(),
    searchParams,
  ]);
  const parsedQuery = parseComponentInventorySearchParams(rawSearchParams);

  if (!parsedQuery.success) {
    return (
      <ComponentInventoryInvalidQueryState issues={parsedQuery.error.issues} />
    );
  }

  const access = resolveComponentInventoryAccess(me);

  if (access.kind !== "resolved") {
    return <ComponentInventoryAccessState access={access} />;
  }

  let data;

  try {
    data = await readComponentInventoryWorkspace({
      query: parsedQuery.data,
      access,
    });
  } catch (error: unknown) {
    if (isApiHttpError(error)) {
      return <ComponentInventoryRequestFailureState error={error} />;
    }

    throw error;
  }

  return (
    <ComponentInventoryPage
      access={access}
      query={parsedQuery.data}
      data={data}
    />
  );
}
