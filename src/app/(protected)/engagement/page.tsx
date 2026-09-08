// oz-next-app/src/app/(protected)/engagement/page.tsx
import "server-only";

import { permanentRedirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

export default function LegacyEngagementRoute(): never {
  permanentRedirect("/engagement/dashboard");
}
