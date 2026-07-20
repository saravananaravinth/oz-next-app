// oz-next-app/src/app/public/dealership/[token]/error.tsx
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
import { PublicDealershipShell } from "@/features/engagement/dealership-applications/ui/dealership-application-shell";
import { PublicFormStatusEmblem } from "@/features/engagement/shared/ui/public-form-status-emblem";

export type PublicDealershipFormErrorProps = Readonly<{
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

export default function PublicDealershipFormError({
  error,
  reset,
}: PublicDealershipFormErrorProps): ReactElement {
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
    <PublicDealershipShell
      footerActions={footerActions}
      mainLabelledBy="dealership-error-title"
      mainClassName="items-center"
    >
      <ContentRoot
        width="narrow"
        density="compact"
        className="px-3 py-8 sm:px-0 sm:py-4"
      >
        <div className="grid justify-items-center">
          <PublicFormStatusEmblem status="error" />
        </div>

        <ContentSection
          className="border-destructive/20 shadow-lg shadow-destructive/5"
          title={
            <span id="dealership-error-title">
              Dealership form could not be opened
            </span>
          }
          description="Retry the form using the same secure link. No application details were submitted or changed."
        >
          <ContentStatus
            variant="destructive"
            role="alert"
            aria-live="assertive"
            aria-atomic="true"
            icon={<AlertTriangle aria-hidden="true" />}
            title="Form loading failed"
            description={
              <>
                The public dealership application could not render safely.
                {errorReference === null ? null : (
                  <span className="mt-2 block text-caption">
                    Reference: <code>{errorReference}</code>
                  </span>
                )}
              </>
            }
          />

          <p className="mt-4 text-center text-caption text-muted-readable">
            Internal ERP diagnostics are never exposed on this public page.
          </p>
        </ContentSection>
      </ContentRoot>
    </PublicDealershipShell>
  );
}
