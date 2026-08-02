// oz-next-app/src/features/engagement/operations-dashboard/ui/video-sequence-configuration.tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  LoaderCircle,
  MessageCircleMore,
  Save,
  Video,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/shared/hooks/use-toast";

import {
  updateEngagementVideoSequenceItemAction,
  type EngagementDashboardActionResult,
} from "@/features/engagement/operations-dashboard/actions/engagement-dashboard.actions";
import type {
  EngagementVideoSequence,
  EngagementVideoSequenceItem,
} from "@/features/engagement/operations-dashboard/contracts/engagement-dashboard.schema";
import {
  formatDashboardDateTime,
  formatDashboardInteger,
} from "@/features/engagement/operations-dashboard/utils/engagement-dashboard-format";

export type VideoSequenceConfigurationProps = Readonly<{
  sequences: readonly EngagementVideoSequence[];
  canUpdate: boolean;
}>;

function createIntentKey(): string {
  return `engagement:${crypto.randomUUID()}`;
}

function showResult(
  result: EngagementDashboardActionResult,
  toast: ReturnType<typeof useToast>,
): boolean {
  if (result.ok) {
    toast.success({ title: result.message });
    return true;
  }

  toast.error({
    title: "Video update failed",
    description:
      result.requestId === undefined
        ? result.message
        : `${result.message} Reference: ${result.requestId}`,
  });
  return false;
}

function VideoItemEditor({
  item,
  pendingMessageCount,
  canUpdate,
}: Readonly<{
  item: EngagementVideoSequenceItem;
  pendingMessageCount: number;
  canUpdate: boolean;
}>): React.ReactElement {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = React.useTransition();
  const [title, setTitle] = React.useState(item.videoTitle);
  const [url, setUrl] = React.useState(item.videoUrl);
  const [active, setActive] = React.useState(item.active);
  const [reason, setReason] = React.useState("");
  const [intentKey, setIntentKey] = React.useState("");

  const titleChanged = title.trim() !== item.videoTitle;
  const urlChanged = url.trim() !== item.videoUrl;
  const activeChanged = active !== item.active;
  const hasChanges = titleChanged || urlChanged || activeChanged;

  const markIntent = React.useCallback((): void => {
    setIntentKey((current) =>
      current.length >= 16 ? current : createIntentKey(),
    );
  }, []);

  const submit = React.useCallback(
    (event: React.SyntheticEvent<HTMLFormElement>): void => {
      event.preventDefault();
      const normalizedTitle = title.trim();
      const normalizedUrl = url.trim();
      const normalizedReason = reason.trim();
      const key = intentKey.length >= 16 ? intentKey : createIntentKey();

      if (!hasChanges) {
        toast.info({ title: "No video changes to save" });
        return;
      }

      if (
        normalizedTitle.length === 0 ||
        normalizedTitle.length > 1000 ||
        normalizedUrl.length === 0 ||
        normalizedReason.length < 5
      ) {
        toast.error({
          title: "Review the video details",
          description:
            "A title, HTTPS video link, and five-character audit reason are required.",
        });
        return;
      }

      setIntentKey(key);
      startTransition(async () => {
        const result = await updateEngagementVideoSequenceItemAction({
          values: {
            videoSequenceItemId: item.videoSequenceItemId,
            rowVersion: item.rowVersion,
            ...(titleChanged ? { videoTitle: normalizedTitle } : {}),
            ...(urlChanged ? { videoUrl: normalizedUrl } : {}),
            ...(activeChanged ? { active } : {}),
            reason: normalizedReason,
            idempotencyKey: key,
          },
        });

        if (showResult(result, toast)) {
          setReason("");
          setIntentKey("");
          router.refresh();
        }
      });
    },
    [
      active,
      activeChanged,
      hasChanges,
      intentKey,
      item.rowVersion,
      item.videoSequenceItemId,
      reason,
      router,
      startTransition,
      title,
      titleChanged,
      toast,
      url,
      urlChanged,
    ],
  );

  return (
    <form
      onSubmit={submit}
      onChange={markIntent}
      className="grid gap-5 rounded-3xl border bg-background/60 p-4 shadow-xs sm:p-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl border bg-muted/50">
            <CalendarDays aria-hidden="true" className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="text-card-title">Day {item.dayNo}</p>
            <p className="mt-1 text-caption text-muted-readable">
              Template {item.templateCode} · Last updated{" "}
              {formatDashboardDateTime(item.updatedAt)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border bg-muted/30 px-3 py-2">
          <div>
            <p className="text-body-sm font-medium">Available</p>
            <p className="text-caption text-muted-readable">
              Controls future delivery attempts
            </p>
          </div>
          <Switch
            checked={active}
            onCheckedChange={(nextActive) => {
              markIntent();
              setActive(nextActive);
            }}
            disabled={!canUpdate || pending}
            aria-label={`Day ${String(item.dayNo)} video active`}
          />
        </div>
      </div>

      <Field>
        <FieldLabel htmlFor={`video-title-${item.videoSequenceItemId}`}>
          Customer-facing video title
        </FieldLabel>
        <Textarea
          id={`video-title-${item.videoSequenceItemId}`}
          value={title}
          minLength={1}
          maxLength={1000}
          rows={4}
          onChange={(event) => {
            setTitle(event.currentTarget.value);
          }}
          disabled={!canUpdate || pending}
          placeholder="Write the title shown with this scheduled video"
        />
        <FieldDescription>
          Use clear, customer-friendly language. Updating this title also
          updates every pending message for this schedule item.
        </FieldDescription>
      </Field>

      <Field>
        <FieldLabel htmlFor={`video-url-${item.videoSequenceItemId}`}>
          Video link
        </FieldLabel>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id={`video-url-${item.videoSequenceItemId}`}
            type="url"
            value={url}
            maxLength={2048}
            onChange={(event) => {
              setUrl(event.currentTarget.value);
            }}
            disabled={!canUpdate || pending}
            placeholder="https://..."
          />
          <Button variant="outline" asChild>
            <a href={item.videoUrl} target="_blank" rel="noreferrer noopener">
              Preview
              <ExternalLink aria-hidden="true" className="size-4" />
            </a>
          </Button>
        </div>
        <FieldDescription>
          Only HTTPS links are accepted. A changed link is propagated to all
          pending messages, while sent and failed history remains unchanged.
        </FieldDescription>
      </Field>

      <Field>
        <FieldLabel htmlFor={`video-reason-${item.videoSequenceItemId}`}>
          Audit reason
        </FieldLabel>
        <Textarea
          id={`video-reason-${item.videoSequenceItemId}`}
          value={reason}
          minLength={5}
          maxLength={500}
          rows={3}
          onChange={(event) => {
            setReason(event.currentTarget.value);
          }}
          disabled={!canUpdate || pending}
          placeholder="Explain why the customer-facing video is changing"
        />
      </Field>

      <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-caption text-muted-readable">
          <MessageCircleMore aria-hidden="true" className="size-4" />
          Up to {formatDashboardInteger(pendingMessageCount)} pending messages
          in this sequence may be affected by content changes.
        </div>
        <Button
          type="submit"
          disabled={
            !canUpdate || pending || !hasChanges || reason.trim().length < 5
          }
        >
          {pending ? (
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          ) : (
            <Save aria-hidden="true" className="size-4" />
          )}
          Save video details
        </Button>
      </div>
    </form>
  );
}

function VideoSequenceCard({
  sequence,
  canUpdate,
}: Readonly<{
  sequence: EngagementVideoSequence;
  canUpdate: boolean;
}>): React.ReactElement {
  return (
    <Card>
      <CardHeader className="gap-4 border-b">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border bg-muted/40">
              <Video aria-hidden="true" className="size-6" />
            </div>
            <div className="min-w-0">
              <CardTitle>{sequence.name}</CardTitle>
              <CardDescription className="mt-1">
                {sequence.description ??
                  "Customer video schedule for vehicle-sales engagement."}
              </CardDescription>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant={sequence.active ? "secondary" : "outline"}>
                  {sequence.active ? "Schedule active" : "Schedule inactive"}
                </Badge>
                <Badge variant="outline">{sequence.sequenceCode}</Badge>
                <Badge variant="outline">
                  {sequence.items.length} scheduled videos
                </Badge>
              </div>
            </div>
          </div>

          <div className="grid min-w-64 grid-cols-2 gap-2">
            <div className="rounded-2xl border bg-muted/20 p-3">
              <p className="text-caption text-muted-readable">Active leads</p>
              <p className="mt-1 text-card-title text-tabular">
                {formatDashboardInteger(sequence.activeLeadSequenceCount)}
              </p>
            </div>
            <div className="rounded-2xl border bg-muted/20 p-3">
              <p className="text-caption text-muted-readable">
                Pending messages
              </p>
              <p className="mt-1 text-card-title text-tabular">
                {formatDashboardInteger(sequence.pendingVideoMessageCount)}
              </p>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="grid gap-4 pt-5">
        {!canUpdate ? (
          <Alert>
            <CheckCircle2 aria-hidden="true" />
            <AlertTitle>Read-only schedule</AlertTitle>
            <AlertDescription>
              The active actor can review the effective schedule but cannot edit
              customer-facing video details.
            </AlertDescription>
          </Alert>
        ) : null}

        <Alert>
          <MessageCircleMore aria-hidden="true" />
          <AlertTitle>Safe pending-message propagation</AlertTitle>
          <AlertDescription>
            Editing a title or video link updates every pending materialized
            message for the matching day. Messages already sent, cancelled, or
            failed are not rewritten, preserving delivery history and audit
            integrity.
          </AlertDescription>
        </Alert>

        <div className="grid gap-4">
          {sequence.items.map((item) => (
            <VideoItemEditor
              key={item.videoSequenceItemId}
              item={item}
              pendingMessageCount={sequence.pendingVideoMessageCount}
              canUpdate={canUpdate}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function VideoSequenceConfiguration({
  sequences,
  canUpdate,
}: VideoSequenceConfigurationProps): React.ReactElement {
  if (sequences.length === 0) {
    return (
      <Alert>
        <Video aria-hidden="true" />
        <AlertTitle>No vehicle-sales video schedule is configured</AlertTitle>
        <AlertDescription>
          Sequence creation is intentionally not exposed in this daily
          operations workspace. Configure master sequences through the
          controlled backend administration process.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="grid gap-5">
      {sequences.map((sequence) => (
        <VideoSequenceCard
          key={sequence.videoSequenceId}
          sequence={sequence}
          canUpdate={canUpdate}
        />
      ))}
    </div>
  );
}
