// oz-next-app/src/app/public/dealer-leads/[token]/error.tsx
"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { useCallback, useMemo, type ReactElement } from "react";

import {
  ContentFormActions,
  ContentRoot,
  ContentSection,
  ContentStatus,
} from "@/components/common/content-shell";
import { Button } from "@/components/ui/button";
import { PublicDealerLeadShell } from "@/features/engagement/dealer-lead-updates/ui/dealer-lead-shell";

export type PublicDealerLeadErrorProps = Readonly<{
  error: Error & {
    readonly digest?: string;
  };
  reset: () => void;
}>;

const SAFE_DIGEST_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/u;

function safeDigest(value: string | undefined): string | null {
  const normalized = value?.trim();

  if (normalized === undefined || normalized.length === 0) {
    return null;
  }

  return SAFE_DIGEST_PATTERN.test(normalized) ? normalized : null;
}

export default function PublicDealerLeadError({
  error,
  reset,
}: PublicDealerLeadErrorProps): ReactElement {
  const errorReference = useMemo(
    () => safeDigest(error.digest),
    [error.digest],
  );
  const handleReset = useCallback((): void => {
    reset();
  }, [reset]);

  const footerActions = (
    <ContentFormActions className="mx-auto w-full max-w-xl border-0 bg-transparent p-0 shadow-none supports-[backdrop-filter]:bg-transparent">
      <Button
        type="button"
        onClick={handleReset}
        className="min-h-11 w-full touch-manipulation sm:w-auto"
      >
        <RotateCcw aria-hidden="true" />
        Try again
      </Button>
    </ContentFormActions>
  );

  return (
    <PublicDealerLeadShell
      footerActions={footerActions}
      mainLabelledBy="dealer-lead-error-title"
      mainClassName="items-center"
    >
      <ContentRoot
        width="narrow"
        density="compact"
        className="px-3 py-8 sm:px-0 sm:py-6"
      >
        <ContentSection
          className="border-destructive/20 bg-card/95 shadow-lg shadow-destructive/5"
          title={
            <h1 id="dealer-lead-error-title" className="text-section-title">
              Enquiry page could not be opened
            </h1>
          }
          description="Retry the secure page. No customer follow-up action was submitted."
        >
          <div className="grid gap-5">
            <div className="flex justify-center">
              <span className="flex size-14 items-center justify-center rounded-2xl border border-destructive/20 bg-destructive/8 text-destructive shadow-xs">
                <AlertTriangle aria-hidden="true" className="size-7" />
              </span>
            </div>

            <ContentStatus
              variant="destructive"
              role="alert"
              icon={<AlertTriangle aria-hidden="true" />}
              title="Page failed safely"
              description={
                <>
                  <p>
                    The vehicle enquiry page could not render safely. Try again
                    using the same link.
                  </p>
                  {errorReference === null ? null : (
                    <p className="mt-2 text-caption">
                      Reference:{" "}
                      <code className="break-all text-tabular">
                        {errorReference}
                      </code>
                    </p>
                  )}
                </>
              }
            />
          </div>
        </ContentSection>
      </ContentRoot>
    </PublicDealerLeadShell>
  );
}
