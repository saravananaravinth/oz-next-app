// oz-next-app/src/app/(protected)/account/sessions/page.tsx
import type { Metadata } from "next";
import type { ReactElement } from "react";

import { AuthSessionsPage } from "@/features/auth";
import { listAuthSessionsAction } from "@/features/auth/server/auth-actions";
import { requireAuthenticatedMe } from "@/features/auth/server/require-auth";
import { authListSessionsQuerySchema } from "@/lib/api/schemas";

const PAGE_TITLE = "Active sessions";
const PAGE_DESCRIPTION = "Review and revoke authenticated Ozotec ERP sessions.";

type SessionsPageProps = Readonly<{
  searchParams: Promise<
    Readonly<Record<string, string | string[] | undefined>>
  >;
}>;

export const metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  robots: {
    index: false,
    follow: false,
    nocache: true,
    noarchive: true,
  },
} satisfies Metadata;

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

function firstValue(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : value?.[0];
}

export default async function SessionsPage({
  searchParams,
}: SessionsPageProps): Promise<ReactElement> {
  await requireAuthenticatedMe();

  const rawSearchParams = await searchParams;
  const parsedQuery = authListSessionsQuerySchema.safeParse({
    limit: 20,
    cursor: firstValue(rawSearchParams["cursor"]),
  });

  const query = parsedQuery.success
    ? parsedQuery.data
    : {
        limit: 20 as const,
      };

  const data = await listAuthSessionsAction(query);

  return <AuthSessionsPage {...data} />;
}
