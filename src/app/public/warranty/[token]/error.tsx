// oz-next-app/src/app/public/warranty/[token]/error.tsx
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
import { PublicWarrantyShell } from "@/features/engagement/warranty-applications";

export type WarrantyApplicationErrorProps = Readonly<{
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

export default function WarrantyApplicationError({
  error,
  reset,
}: WarrantyApplicationErrorProps): ReactElement {
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
        className="min-h-11 w-full touch-manipulation"
      >
        <RotateCcw aria-hidden="true" />
        Try again
      </Button>
    </ContentFormActions>
  );

  return (
    <PublicWarrantyShell
      footerActions={footerActions}
      mainLabelledBy="warranty-error-title"
      mainClassName="items-center"
    >
      <ContentRoot
        width="narrow"
        density="compact"
        className="px-3 py-8 sm:px-0 sm:py-4"
      >
        <ContentSection
          className="border-destructive/20 shadow-lg shadow-destructive/5"
          title={
            <span id="warranty-error-title">
              Warranty form could not be opened
            </span>
          }
          description="Retry the secure form. No warranty details or invoice files were submitted by this failed render."
        >
          <ContentStatus
            variant="destructive"
            role="alert"
            aria-live="assertive"
            aria-atomic="true"
            icon={<AlertTriangle aria-hidden="true" />}
            title="Warranty form failed safely"
            description={
              <>
                The public warranty application could not render safely. Try
                again using the same secure link.
                {errorReference === null ? null : (
                  <span className="mt-2 block text-caption">
                    Reference: <code>{errorReference}</code>
                  </span>
                )}
              </>
            }
          />

          <p className="mt-4 text-center text-caption text-muted-readable">
            No internal ERP diagnostics or private files are exposed here.
          </p>
        </ContentSection>
      </ContentRoot>
    </PublicWarrantyShell>
  );
}
