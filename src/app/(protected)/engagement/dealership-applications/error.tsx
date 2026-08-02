// oz-next-app/src/app/(protected)/engagement/dealership-applications/error.tsx
"use client";

import type { ReactElement } from "react";
import { useTransition } from "react";
import Link from "next/link";
import { TriangleAlert } from "lucide-react";

import {
  ContentHeader,
  ContentRoot,
  ContentStatus,
} from "@/components/common/content-shell";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

export default function DealershipApplicationsError({
  error,
  reset,
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>): ReactElement {
  const [pending, startTransition] = useTransition();
  const digest = error.digest;
  const reference =
    typeof digest === "string" && /^[A-Za-z0-9._:-]{1,128}$/u.test(digest)
      ? digest
      : null;

  return (
    <ContentRoot width="default">
      <ContentHeader
        eyebrow="Engagement operations"
        icon={<TriangleAlert aria-hidden="true" />}
        iconTone="destructive"
        title="Dealership applications could not be opened"
        description="The protected workspace failed before a complete validated view was rendered."
      />
      <ContentStatus
        variant="destructive"
        title="Workspace unavailable"
        description={
          reference === null
            ? "Retry the workspace. No dealership application data was changed."
            : `Retry the workspace. No dealership application data was changed. Reference: ${reference}`
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={pending}
              onClick={() => {
                startTransition(reset);
              }}
            >
              {pending ? (
                <Spinner aria-hidden="true" className="size-4" />
              ) : null}
              {pending ? "Retrying…" : "Try again"}
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard">Back to dashboard</Link>
            </Button>
          </div>
        }
      />
    </ContentRoot>
  );
}
