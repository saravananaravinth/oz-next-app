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
import { PublicFormStatusEmblem } from "@/features/engagement/shared/ui/public-form-status-emblem";

export type PublicDealerLeadErrorProps = Readonly<{
  error: Error & {
    readonly digest?: string;
  };
  reset: () => void;
}>;

const SAFE_DIGEST_PATTERN = /^[A-Za-z0-9._:/@-]{1,128}$/u;

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
    <ContentFormActions className="mx-auto w-full max-w-4xl border-0 bg-transparent p-0 shadow-none supports-[backdrop-filter]:bg-transparent">
      <Button
        type="button"
        onClick={handleReset}
        className="min-h-12 w-full touch-manipulation sm:ml-auto sm:w-auto sm:min-w-64"
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
        className="max-w-2xl px-3 py-8 sm:px-0 sm:py-6"
      >
        <div className="grid justify-items-center">
          <PublicFormStatusEmblem status="error" />
        </div>

        <ContentSection
          className="border-destructive/20 bg-card/96 text-center shadow-xl shadow-destructive/5"
          title={
            <span id="dealer-lead-error-title">
              Enquiry page could not be opened
            </span>
          }
          description="Retry the secure page. This failure did not submit or change any customer follow-up action."
        >
          <ContentStatus
            variant="destructive"
            role="alert"
            aria-live="assertive"
            aria-atomic="true"
            icon={<AlertTriangle aria-hidden="true" />}
            title="The page failed safely"
            description={
              <>
                The assigned enquiry workspace could not render safely. Try
                again using the same secure link.
                {errorReference === null ? null : (
                  <span className="mt-2 block text-caption">
                    Reference:{" "}
                    <code className="break-all text-tabular">
                      {errorReference}
                    </code>
                  </span>
                )}
              </>
            }
          />

          <p className="mt-4 text-center text-caption leading-relaxed text-muted-readable">
            No internal ERP records, unmasked customer data, or sensitive
            diagnostics are exposed on this public page.
          </p>
        </ContentSection>
      </ContentRoot>
    </PublicDealerLeadShell>
  );
}
