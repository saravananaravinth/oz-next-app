// oz-next-app/src/features/auth/ui/auth-sessions-page.tsx
"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import {
  CheckCircle2,
  Clock3,
  Laptop2,
  LoaderCircle,
  ShieldCheck,
  Smartphone,
  Trash2,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/shared/hooks/use-toast";
import type { AuthPagination, AuthSessionSummary } from "@/lib/api/contracts";

import {
  revokeAuthSessionAction,
  type RevokeAuthSessionActionResult,
} from "@/features/auth/actions/auth.actions";

const DATE_FORMAT = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Kolkata",
});
const CONTROL_CHARACTER_PATTERN = /\p{Cc}/gu;
const WHITESPACE_PATTERN = /\s+/gu;
const MAX_USER_AGENT_LENGTH = 180;
const MAX_REQUEST_ID_LENGTH = 128;

export type AuthSessionsPageProps = Readonly<{
  sessions: readonly AuthSessionSummary[];
  pagination: AuthPagination;
  requestId: string | null;
}>;

function formatTimestamp(value: string | null): string {
  if (value === null) {
    return "No expiry recorded";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Unavailable"
    : DATE_FORMAT.format(date);
}

function normalizeDisplayText(value: string | null): string | null {
  if (value === null) {
    return null;
  }

  const normalized = value
    .replace(CONTROL_CHARACTER_PATTERN, " ")
    .replace(WHITESPACE_PATTERN, " ")
    .trim();

  if (normalized.length === 0) {
    return null;
  }

  return normalized.length <= MAX_USER_AGENT_LENGTH
    ? normalized
    : `${normalized.slice(0, MAX_USER_AGENT_LENGTH - 1).trimEnd()}…`;
}

function maskedIpAddress(value: string | null): string {
  const normalized = value?.trim() ?? "";

  if (/^(?:\d{1,3}\.){3}\d{1,3}$/u.test(normalized)) {
    const parts = normalized.split(".");
    return `${parts.slice(0, 3).join(".")}.×`;
  }

  if (normalized.includes(":")) {
    const parts = normalized.split(":").filter((part) => part.length > 0);
    return parts.length === 0 ? "Masked" : `${parts.slice(0, 3).join(":")}:…`;
  }

  return normalized.length > 0 ? "Masked" : "Not retained";
}

function safeRequestId(value: string | null): string | null {
  const normalized = value?.trim() ?? "";
  return /^[A-Za-z0-9_.:/@-]+$/u.test(normalized) &&
    normalized.length <= MAX_REQUEST_ID_LENGTH
    ? normalized
    : null;
}

function sessionIcon(session: AuthSessionSummary): React.ReactElement {
  const userAgent = session.userAgent?.toLowerCase() ?? "";
  return /android|iphone|ipad|mobile/u.test(userAgent) ? (
    <Smartphone aria-hidden="true" className="size-5" />
  ) : (
    <Laptop2 aria-hidden="true" className="size-5" />
  );
}

function resultDescription(result: RevokeAuthSessionActionResult): string {
  if (result.ok || result.requestId === null) {
    return result.ok ? "The selected session was revoked." : result.message;
  }

  return `${result.message} Reference: ${result.requestId}`;
}

function SessionCard({
  session,
}: Readonly<{ session: AuthSessionSummary }>): React.ReactElement {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = React.useTransition();
  const userAgent = normalizeDisplayText(session.userAgent);

  function revoke(): void {
    startTransition((): void => {
      void revokeAuthSessionAction(session.sessionId).then((result) => {
        if (result.ok) {
          toast.success({
            title: "Session revoked",
            description: resultDescription(result),
          });
          router.refresh();
          return;
        }

        toast.error({
          title: "Session was not revoked",
          description: resultDescription(result),
        });
      });
    });
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="gap-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-border/70 bg-muted/50 text-muted-readable">
              {sessionIcon(session)}
            </span>
            <div className="min-w-0">
              <CardTitle className="text-card-title">
                {session.isCurrent ? "This device" : "Authenticated device"}
              </CardTitle>
              <CardDescription className="mt-1 break-words text-caption">
                {userAgent ?? "Device details were not retained"}
              </CardDescription>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap justify-end gap-2">
            {session.isCurrent ? (
              <Badge>
                <ShieldCheck aria-hidden="true" className="size-3.5" />
                Current
              </Badge>
            ) : null}
            {session.isExpired || !session.hasActiveRefreshToken ? (
              <Badge variant="secondary">Inactive</Badge>
            ) : (
              <Badge variant="outline">Active</Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="grid gap-4 text-body-sm sm:grid-cols-2">
        <div className="grid gap-1">
          <span className="text-caption text-muted-readable">Signed in</span>
          <span className="text-foreground">
            {formatTimestamp(session.createdAt)}
          </span>
        </div>
        <div className="grid gap-1">
          <span className="text-caption text-muted-readable">Expires</span>
          <span className="text-foreground">
            {formatTimestamp(session.expiresAt)}
          </span>
        </div>
        <div className="grid gap-1">
          <span className="text-caption text-muted-readable">Network</span>
          <span className="font-mono text-caption text-foreground">
            {maskedIpAddress(session.ipAddress)}
          </span>
        </div>
        <div className="grid gap-1">
          <span className="text-caption text-muted-readable">Session type</span>
          <span className="text-foreground">
            {session.principalKind === "CUSTOMER"
              ? "Customer workspace"
              : "ERP workspace"}
          </span>
        </div>
      </CardContent>

      <CardFooter className="justify-between gap-3 border-t border-border/70 bg-muted/25">
        <span className="inline-flex items-center gap-2 text-caption text-muted-readable">
          <Clock3 aria-hidden="true" className="size-3.5" />
          Device fingerprint{" "}
          {session.deviceFingerprintPresent ? "registered" : "not retained"}
        </span>

        {session.isCurrent ? (
          <Button variant="outline" asChild>
            <Link href="/dashboard">Return to dashboard</Link>
          </Button>
        ) : (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="destructive" disabled={pending}>
                {pending ? (
                  <LoaderCircle
                    aria-hidden="true"
                    className="size-4 animate-spin motion-reduce:animate-none"
                  />
                ) : (
                  <Trash2 aria-hidden="true" className="size-4" />
                )}
                Revoke
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Revoke this session?</AlertDialogTitle>
                <AlertDialogDescription>
                  The device will lose access when it next uses this session.
                  The action does not delete account or ERP records.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  disabled={pending}
                  onClick={revoke}
                >
                  Revoke session
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </CardFooter>
    </Card>
  );
}

export function AuthSessionsPage({
  sessions,
  pagination,
  requestId,
}: AuthSessionsPageProps): React.ReactElement {
  const reference = safeRequestId(requestId);
  const nextHref: Route | null =
    pagination.hasNextPage && pagination.nextCursor !== null
      ? (`/account/sessions?cursor=${encodeURIComponent(pagination.nextCursor)}` as Route)
      : null;

  return (
    <section aria-labelledby="active-sessions-title" className="grid gap-6">
      <header className="grid gap-2">
        <Badge variant="secondary" className="w-fit">
          <ShieldCheck aria-hidden="true" className="size-3.5" />
          Account security
        </Badge>
        <h1 id="active-sessions-title" className="text-page-title">
          Active sessions
        </h1>
        <p className="max-w-3xl text-body-sm text-muted-readable">
          Review devices authenticated to your account. Network information is
          masked, and session data is loaded directly from the server without
          browser caching.
        </p>
      </header>

      <Alert variant="info" role="note">
        <CheckCircle2 aria-hidden="true" />
        <AlertTitle>Current session is protected</AlertTitle>
        <AlertDescription>
          Sign out from the user menu to revoke this device. Other sessions can
          be revoked individually below.
        </AlertDescription>
      </Alert>

      <Separator />

      {sessions.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No sessions found</CardTitle>
            <CardDescription>
              The server did not return an active or historical session for this
              page.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4">
          {sessions.map((session) => (
            <SessionCard key={session.sessionId} session={session} />
          ))}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-caption text-muted-readable">
          Showing up to {String(pagination.limit)} sessions.
          {reference === null ? null : (
            <>
              {" "}
              Reference: <code className="text-tabular">{reference}</code>
            </>
          )}
        </p>
        {nextHref === null ? null : (
          <Button variant="outline" asChild>
            <Link href={nextHref} prefetch={false}>
              Next page
            </Link>
          </Button>
        )}
      </div>
    </section>
  );
}
