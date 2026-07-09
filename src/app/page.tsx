// oz-next-app/src/app/page.tsx
import "server-only";

import type { Route } from "next";
import { redirect } from "next/navigation";

import { getAuthenticatedMe } from "@/features/auth/server/require-auth";
import { DEFAULT_AUTH_SUCCESS_PATH } from "@/features/auth/utils/auth-redirect";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type AppRoute = Route;

const LOGIN_PATH = "/login" as const;

const ACTIVE_SESSION_REDIRECT_PATH =
  DEFAULT_AUTH_SUCCESS_PATH satisfies AppRoute;
const INACTIVE_SESSION_REDIRECT_PATH = LOGIN_PATH satisfies AppRoute;

async function resolveRootRedirectPath(): Promise<AppRoute> {
  const me = await getAuthenticatedMe();

  return me !== null
    ? ACTIVE_SESSION_REDIRECT_PATH
    : INACTIVE_SESSION_REDIRECT_PATH;
}

export default async function RootPage(): Promise<never> {
  redirect(await resolveRootRedirectPath());
}
