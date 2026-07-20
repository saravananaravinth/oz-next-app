// oz-next-app/src/features/erp-core/ui/erp-feature-states.tsx
import { AlertCircle, Inbox, Loader2, ShieldAlert } from "lucide-react";
import type { ReactNode } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export type ErpFeatureStateProps = Readonly<{
  title: string;
  description?: string;
  action?: ReactNode;
}>;

export type ErpFeatureErrorStateProps = ErpFeatureStateProps &
  Readonly<{
    reference?: string | null;
    onRetry?: (() => void) | undefined;
  }>;

const SAFE_REFERENCE_PATTERN = /^[A-Za-z0-9_.:/@-]{1,128}$/u;

function safeReference(value: string | null | undefined): string | null {
  const normalized = value?.trim() ?? "";

  return SAFE_REFERENCE_PATTERN.test(normalized) ? normalized : null;
}

export function ErpFeatureEmptyState({
  title,
  description,
  action,
}: ErpFeatureStateProps) {
  return (
    <Card>
      <CardContent className="grid justify-items-center gap-4 px-6 py-12 text-center">
        <div className="flex size-12 items-center justify-center rounded-2xl border border-border/70 bg-muted/50 text-muted-readable">
          <Inbox aria-hidden="true" className="size-6" />
        </div>
        <div className="grid max-w-md gap-2">
          <h2 className="text-card-title text-foreground">{title}</h2>
          {description !== undefined ? (
            <p className="text-body-sm text-muted-readable">{description}</p>
          ) : null}
        </div>
        {action}
      </CardContent>
    </Card>
  );
}

export function ErpFeatureLoadingState({
  title = "Loading workspace data",
}: Partial<ErpFeatureStateProps>) {
  return (
    <Card aria-busy="true">
      <CardContent className="grid gap-5 px-6 py-8">
        <div
          className="flex items-center gap-3 text-body-sm text-muted-readable"
          role="status"
        >
          <Loader2 aria-hidden="true" className="size-4 animate-spin" />
          {title}
        </div>
        <div className="grid gap-3">
          <Skeleton className="h-10 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
      </CardContent>
    </Card>
  );
}

export function ErpFeatureErrorState({
  title,
  description,
  reference,
  onRetry,
  action,
}: ErpFeatureErrorStateProps) {
  const normalizedReference = safeReference(reference);

  return (
    <Alert
      variant="destructive"
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      <AlertCircle aria-hidden="true" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        {description !== undefined ? <p>{description}</p> : null}
        {normalizedReference !== null ? (
          <p className="mt-2 text-caption">
            Reference:{" "}
            <code className="break-all text-tabular">
              {normalizedReference}
            </code>
          </p>
        ) : null}
        {onRetry !== undefined ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={onRetry}
          >
            Retry
          </Button>
        ) : (
          action
        )}
      </AlertDescription>
    </Alert>
  );
}

export function ErpFeaturePermissionState({
  title,
  description,
  action,
}: ErpFeatureStateProps) {
  return (
    <Alert variant="warning" role="status" aria-live="polite">
      <ShieldAlert aria-hidden="true" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        {description !== undefined ? <p>{description}</p> : null}
        {action}
      </AlertDescription>
    </Alert>
  );
}
