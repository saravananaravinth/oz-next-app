// oz-next-app/src/app/public/location/[token]/error.tsx
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
import { PublicLocationShell } from "@/features/engagement/location-requests/ui/location-request-shell";
import { PublicFormStatusEmblem } from "@/features/engagement/shared/ui/public-form-status-emblem";

type PublicLocationErrorProps = Readonly<{
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

export default function PublicLocationError({
  error,
  reset,
}: PublicLocationErrorProps): ReactElement {
  const reference = useMemo(() => safeDigest(error.digest), [error.digest]);
  const handleReset = useCallback((): void => {
    reset();
  }, [reset]);

  const footerActions = (
    <ContentFormActions className="mx-auto w-full max-w-2xl border-0 bg-transparent p-0 shadow-none supports-[backdrop-filter]:bg-transparent">
      <Button type="button" onClick={handleReset} className="min-h-11 w-full">
        <RotateCcw aria-hidden="true" />
        Try again
      </Button>
    </ContentFormActions>
  );

  return (
    <PublicLocationShell
      footerActions={footerActions}
      mainLabelledBy="public-location-error-title"
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
            <span id="public-location-error-title">
              Location page could not be opened
            </span>
          }
          description="Retry the secure location page. No location was captured or submitted by this failure."
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
                The public location request could not render safely. Try again
                using the same link.
                {reference === null ? null : (
                  <span className="mt-2 block text-caption">
                    Reference:{" "}
                    <code className="break-all text-tabular">{reference}</code>
                  </span>
                )}
              </>
            }
          />

          <p className="mt-4 text-center text-caption text-muted-readable">
            Retrying does not submit a location until browser permission is
            approved.
          </p>
        </ContentSection>
      </ContentRoot>
    </PublicLocationShell>
  );
}
