// oz-next-app/src/features/engagement/operations-dashboard/ui/video-sequence-configuration.tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  ChevronDown,
  ChevronUp,
  CirclePlus,
  ExternalLink,
  Film,
  Pencil,
  ShieldAlert,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

import {
  createEngagementVideoSequenceAction,
  createEngagementVideoSequenceItemAction,
  updateEngagementVideoSequenceAction,
  updateEngagementVideoSequenceItemAction,
  type EngagementDashboardActionResult,
} from "@/features/engagement/operations-dashboard/actions/engagement-dashboard.actions";
import type {
  EngagementVideoSequence,
  EngagementVideoSequenceItem,
  EngagementVideoSequenceListResult,
} from "@/features/engagement/operations-dashboard/contracts/engagement-dashboard.schema";
import {
  formatDashboardDateTime,
  formatDashboardInteger,
} from "@/features/engagement/operations-dashboard/utils/engagement-dashboard-format";
import { cn } from "@/lib/utils";

const DEFAULT_TEMPLATE_CODE = "oz_engagement_video_ta_v1";

type VideoSequenceConfigurationProps = Readonly<{
  data: EngagementVideoSequenceListResult;
  tenantId: string | undefined;
  canUpdate: boolean;
}>;

type MutationFeedbackProps = Readonly<{
  result: EngagementDashboardActionResult | null;
}>;

function MutationFeedback({
  result,
}: MutationFeedbackProps): React.ReactElement | null {
  if (result === null) return null;

  return (
    <Alert variant={result.ok ? "default" : "destructive"} role="status">
      <AlertTitle>
        {result.ok ? "Operation completed" : "Operation failed"}
      </AlertTitle>
      <AlertDescription>
        {result.message}
        {!result.ok && result.requestId !== undefined ? (
          <span className="mt-1 block text-caption">
            Request reference: <code>{result.requestId}</code>
          </span>
        ) : null}
      </AlertDescription>
    </Alert>
  );
}

function valueFromForm(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function optionalText(value: string): string | null {
  return value.length === 0 ? null : value;
}

function numberFromForm(form: FormData, name: string): number {
  return Number(valueFromForm(form, name));
}

function idempotencyKey(intent: string): string {
  return `engagement:${intent}:${crypto.randomUUID()}`;
}

function DialogFormActions({
  pending,
}: Readonly<{ pending: boolean }>): React.ReactElement {
  return (
    <DialogFooter>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save changes"}
      </Button>
    </DialogFooter>
  );
}

function CreateSequenceDialog({
  tenantId,
  disabled,
}: Readonly<{
  tenantId: string | undefined;
  disabled: boolean;
}>): React.ReactElement {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState(true);
  const [pending, startTransition] = React.useTransition();
  const [result, setResult] =
    React.useState<EngagementDashboardActionResult | null>(null);
  const keyRef = React.useRef<string | null>(null);

  function submit(event: React.SyntheticEvent<HTMLFormElement>): void {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    keyRef.current ??= idempotencyKey("video-sequence-create");

    startTransition(() => {
      void createEngagementVideoSequenceAction({
        ...(tenantId !== undefined ? { tenantId } : {}),
        values: {
          sequenceCode: valueFromForm(form, "sequenceCode"),
          name: valueFromForm(form, "name"),
          description: optionalText(valueFromForm(form, "description")),
          active,
          reason: valueFromForm(form, "reason"),
          idempotencyKey:
            keyRef.current ?? idempotencyKey("video-sequence-create"),
        },
      }).then((nextResult) => {
        setResult(nextResult);
        if (nextResult.ok) {
          keyRef.current = null;
          setOpen(false);
          setActive(true);
          router.refresh();
        }
      });
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={disabled}>
          <CirclePlus aria-hidden="true" className="size-4" />
          New sequence
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <form className="grid gap-5" onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Create video sequence</DialogTitle>
            <DialogDescription>
              Define a tenant-level master schedule. Existing materialized lead
              video messages are not rewritten by this operation.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="video-sequence-code">Sequence code</Label>
              <Input
                id="video-sequence-code"
                name="sequenceCode"
                autoComplete="off"
                placeholder="vehicle_enquiry_default"
                pattern="[a-z][a-z0-9_]{2,63}"
                maxLength={64}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="video-sequence-name">Display name</Label>
              <Input
                id="video-sequence-name"
                name="name"
                autoComplete="off"
                maxLength={256}
                required
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="video-sequence-description">Description</Label>
            <Textarea
              id="video-sequence-description"
              name="description"
              maxLength={2000}
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between gap-4 rounded-2xl border p-4">
            <div>
              <Label htmlFor="video-sequence-active">Active</Label>
              <p className="text-caption text-muted-readable">
                Active sequences can be selected by configured IVR flows.
              </p>
            </div>
            <Switch
              id="video-sequence-active"
              checked={active}
              onCheckedChange={setActive}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="video-sequence-create-reason">Audit reason</Label>
            <Textarea
              id="video-sequence-create-reason"
              name="reason"
              minLength={5}
              maxLength={500}
              rows={2}
              required
            />
          </div>

          <MutationFeedback result={result} />
          <DialogFormActions pending={pending} />
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditSequenceDialog({
  sequence,
  tenantId,
  open,
  onOpenChange,
}: Readonly<{
  sequence: EngagementVideoSequence | null;
  tenantId: string | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}>): React.ReactElement {
  const router = useRouter();
  const [active, setActive] = React.useState(sequence?.active ?? false);
  const [pending, startTransition] = React.useTransition();
  const [result, setResult] =
    React.useState<EngagementDashboardActionResult | null>(null);
  const keyRef = React.useRef<string | null>(null);

  if (sequence === null) {
    return <Dialog open={false} onOpenChange={onOpenChange} />;
  }
  const selectedSequence = sequence;

  function submit(event: React.SyntheticEvent<HTMLFormElement>): void {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    keyRef.current ??= idempotencyKey("video-sequence-update");

    startTransition(() => {
      void updateEngagementVideoSequenceAction({
        ...(tenantId !== undefined ? { tenantId } : {}),
        values: {
          videoSequenceId: selectedSequence.videoSequenceId,
          rowVersion: selectedSequence.rowVersion,
          name: valueFromForm(form, "name"),
          description: optionalText(valueFromForm(form, "description")),
          active,
          reason: valueFromForm(form, "reason"),
          idempotencyKey:
            keyRef.current ?? idempotencyKey("video-sequence-update"),
        },
      }).then((nextResult) => {
        setResult(nextResult);
        if (nextResult.ok) {
          keyRef.current = null;
          onOpenChange(false);
          router.refresh();
        }
      });
    });
  }

  const deactivationHasImpact =
    sequence.active && !active && sequence.activeLeadSequenceCount > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <form className="grid gap-5" onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Edit {sequence.name}</DialogTitle>
            <DialogDescription>
              Sequence code <code>{sequence.sequenceCode}</code> is immutable.
              Row version {sequence.rowVersion} protects this update from lost
              writes.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <Label htmlFor="video-sequence-edit-name">Display name</Label>
            <Input
              id="video-sequence-edit-name"
              name="name"
              defaultValue={sequence.name}
              maxLength={256}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="video-sequence-edit-description">Description</Label>
            <Textarea
              id="video-sequence-edit-description"
              name="description"
              defaultValue={sequence.description ?? ""}
              maxLength={2000}
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between gap-4 rounded-2xl border p-4">
            <div>
              <Label htmlFor="video-sequence-edit-active">Active</Label>
              <p className="text-caption text-muted-readable">
                {formatDashboardInteger(sequence.activeLeadSequenceCount)}{" "}
                active lead schedules and{" "}
                {formatDashboardInteger(sequence.pendingVideoMessageCount)}{" "}
                pending messages currently reference this master sequence.
              </p>
            </div>
            <Switch
              id="video-sequence-edit-active"
              checked={active}
              onCheckedChange={setActive}
            />
          </div>

          {deactivationHasImpact ? (
            <Alert variant="destructive">
              <ShieldAlert aria-hidden="true" />
              <AlertTitle>Active lead schedules are impacted</AlertTitle>
              <AlertDescription>
                The backend will reject deactivation while active lead schedules
                depend on this sequence. Existing materialized messages are
                never silently rewritten.
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="grid gap-2">
            <Label htmlFor="video-sequence-edit-reason">Audit reason</Label>
            <Textarea
              id="video-sequence-edit-reason"
              name="reason"
              minLength={5}
              maxLength={500}
              rows={2}
              required
            />
          </div>

          <MutationFeedback result={result} />
          <DialogFormActions pending={pending} />
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CreateItemDialog({
  sequence,
  tenantId,
  open,
  onOpenChange,
}: Readonly<{
  sequence: EngagementVideoSequence | null;
  tenantId: string | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}>): React.ReactElement {
  const router = useRouter();
  const [active, setActive] = React.useState(true);
  const [pending, startTransition] = React.useTransition();
  const [result, setResult] =
    React.useState<EngagementDashboardActionResult | null>(null);
  const keyRef = React.useRef<string | null>(null);

  if (sequence === null) {
    return <Dialog open={false} onOpenChange={onOpenChange} />;
  }
  const selectedSequence = sequence;

  function submit(event: React.SyntheticEvent<HTMLFormElement>): void {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    keyRef.current ??= idempotencyKey("video-sequence-item-create");

    startTransition(() => {
      void createEngagementVideoSequenceItemAction({
        ...(tenantId !== undefined ? { tenantId } : {}),
        values: {
          videoSequenceId: selectedSequence.videoSequenceId,
          dayNo: numberFromForm(form, "dayNo"),
          videoTitle: valueFromForm(form, "videoTitle"),
          videoUrl: valueFromForm(form, "videoUrl"),
          templateCode: valueFromForm(form, "templateCode"),
          active,
          reason: valueFromForm(form, "reason"),
          idempotencyKey:
            keyRef.current ?? idempotencyKey("video-sequence-item-create"),
        },
      }).then((nextResult) => {
        setResult(nextResult);
        if (nextResult.ok) {
          keyRef.current = null;
          onOpenChange(false);
          router.refresh();
        }
      });
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <form className="grid gap-5" onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Add schedule item</DialogTitle>
            <DialogDescription>
              Add a new effective day to {sequence.name}. Day numbers must
              remain unique inside the sequence.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
            <div className="grid gap-2">
              <Label htmlFor="video-item-create-day">Day number</Label>
              <Input
                id="video-item-create-day"
                name="dayNo"
                type="number"
                min={1}
                max={365}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="video-item-create-title">Title</Label>
              <Input
                id="video-item-create-title"
                name="videoTitle"
                maxLength={256}
                required
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="video-item-create-url">HTTPS video URL</Label>
            <Input
              id="video-item-create-url"
              name="videoUrl"
              type="url"
              inputMode="url"
              placeholder="https://..."
              maxLength={2048}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="video-item-create-template">Template code</Label>
            <Input
              id="video-item-create-template"
              name="templateCode"
              defaultValue={DEFAULT_TEMPLATE_CODE}
              pattern="[A-Za-z0-9._:-]{3,128}"
              maxLength={128}
              required
            />
          </div>

          <div className="flex items-center justify-between gap-4 rounded-2xl border p-4">
            <div>
              <Label htmlFor="video-item-create-active">Active item</Label>
              <p className="text-caption text-muted-readable">
                Inactive items remain in the master schedule but are not
                effective for new schedules.
              </p>
            </div>
            <Switch
              id="video-item-create-active"
              checked={active}
              onCheckedChange={setActive}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="video-item-create-reason">Audit reason</Label>
            <Textarea
              id="video-item-create-reason"
              name="reason"
              minLength={5}
              maxLength={500}
              rows={2}
              required
            />
          </div>

          <MutationFeedback result={result} />
          <DialogFormActions pending={pending} />
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditItemDialog({
  item,
  tenantId,
  open,
  onOpenChange,
}: Readonly<{
  item: EngagementVideoSequenceItem | null;
  tenantId: string | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}>): React.ReactElement {
  const router = useRouter();
  const [active, setActive] = React.useState(item?.active ?? false);
  const [pending, startTransition] = React.useTransition();
  const [result, setResult] =
    React.useState<EngagementDashboardActionResult | null>(null);
  const keyRef = React.useRef<string | null>(null);

  if (item === null) {
    return <Dialog open={false} onOpenChange={onOpenChange} />;
  }
  const selectedItem = item;

  function submit(event: React.SyntheticEvent<HTMLFormElement>): void {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    keyRef.current ??= idempotencyKey("video-sequence-item-update");

    startTransition(() => {
      void updateEngagementVideoSequenceItemAction({
        ...(tenantId !== undefined ? { tenantId } : {}),
        values: {
          videoSequenceItemId: selectedItem.videoSequenceItemId,
          rowVersion: selectedItem.rowVersion,
          dayNo: numberFromForm(form, "dayNo"),
          videoTitle: valueFromForm(form, "videoTitle"),
          videoUrl: valueFromForm(form, "videoUrl"),
          templateCode: valueFromForm(form, "templateCode"),
          active,
          reason: valueFromForm(form, "reason"),
          idempotencyKey:
            keyRef.current ?? idempotencyKey("video-sequence-item-update"),
        },
      }).then((nextResult) => {
        setResult(nextResult);
        if (nextResult.ok) {
          keyRef.current = null;
          onOpenChange(false);
          router.refresh();
        }
      });
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <form className="grid gap-5" onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Edit schedule item</DialogTitle>
            <DialogDescription>
              Row version {item.rowVersion} protects this change. Updating the
              master item affects newly materialized schedules by default, not
              existing lead messages.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
            <div className="grid gap-2">
              <Label htmlFor="video-item-edit-day">Day number</Label>
              <Input
                id="video-item-edit-day"
                name="dayNo"
                type="number"
                min={1}
                max={365}
                defaultValue={item.dayNo}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="video-item-edit-title">Title</Label>
              <Input
                id="video-item-edit-title"
                name="videoTitle"
                defaultValue={item.videoTitle}
                maxLength={256}
                required
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="video-item-edit-url">HTTPS video URL</Label>
            <Input
              id="video-item-edit-url"
              name="videoUrl"
              type="url"
              inputMode="url"
              defaultValue={item.videoUrl}
              maxLength={2048}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="video-item-edit-template">Template code</Label>
            <Input
              id="video-item-edit-template"
              name="templateCode"
              defaultValue={item.templateCode}
              pattern="[A-Za-z0-9._:-]{3,128}"
              maxLength={128}
              required
            />
          </div>

          <div className="flex items-center justify-between gap-4 rounded-2xl border p-4">
            <div>
              <Label htmlFor="video-item-edit-active">Active item</Label>
              <p className="text-caption text-muted-readable">
                Deactivation preserves the item for audit history and future
                reactivation.
              </p>
            </div>
            <Switch
              id="video-item-edit-active"
              checked={active}
              onCheckedChange={setActive}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="video-item-edit-reason">Audit reason</Label>
            <Textarea
              id="video-item-edit-reason"
              name="reason"
              minLength={5}
              maxLength={500}
              rows={2}
              required
            />
          </div>

          <MutationFeedback result={result} />
          <DialogFormActions pending={pending} />
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SequenceSchedule({
  sequence,
  canUpdate,
  onEditItem,
}: Readonly<{
  sequence: EngagementVideoSequence;
  canUpdate: boolean;
  onEditItem: (item: EngagementVideoSequenceItem) => void;
}>): React.ReactElement {
  if (sequence.items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed p-5 text-center text-body-sm text-muted-readable">
        No schedule items have been configured.
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      {sequence.items.map((item) => (
        <div
          key={item.videoSequenceItemId}
          className={cn(
            "grid gap-3 rounded-2xl border p-3 md:grid-cols-[5rem_minmax(0,1fr)_auto] md:items-center",
            !item.active && "opacity-65",
          )}
        >
          <div className="flex items-center gap-2">
            <CalendarClock
              aria-hidden="true"
              className="size-4 text-muted-readable"
            />
            <span className="font-medium text-tabular">Day {item.dayNo}</span>
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate font-medium">{item.videoTitle}</p>
              <Badge variant={item.active ? "secondary" : "outline"}>
                {item.active ? "Active" : "Inactive"}
              </Badge>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-muted-readable">
              <code>{item.templateCode}</code>
              <span>Version {item.rowVersion}</span>
              <span>{formatDashboardDateTime(item.updatedAt)}</span>
              <a
                href={item.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 underline underline-offset-4"
              >
                Preview video
                <ExternalLink aria-hidden="true" className="size-3" />
              </a>
            </div>
          </div>
          {canUpdate ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                onEditItem(item);
              }}
            >
              <Pencil aria-hidden="true" className="size-4" />
              Edit
            </Button>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function VideoSequenceConfiguration({
  data,
  tenantId,
  canUpdate,
}: VideoSequenceConfigurationProps): React.ReactElement {
  const [expandedSequenceId, setExpandedSequenceId] = React.useState<
    string | null
  >(null);
  const [editSequence, setEditSequence] =
    React.useState<EngagementVideoSequence | null>(null);
  const [createItemFor, setCreateItemFor] =
    React.useState<EngagementVideoSequence | null>(null);
  const [editItem, setEditItem] =
    React.useState<EngagementVideoSequenceItem | null>(null);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-card-title">Video sequences</h3>
          <p className="mt-1 max-w-3xl text-body-sm text-muted-readable">
            Tenant-level master schedules with explicit active-lead impact,
            row-version concurrency, and audited reasons. Existing materialized
            lead messages are not silently changed.
          </p>
        </div>
        {canUpdate ? (
          <CreateSequenceDialog tenantId={tenantId} disabled={false} />
        ) : null}
      </div>

      {data.items.length === 0 ? (
        <div className="rounded-3xl border border-dashed p-8 text-center">
          <Film
            aria-hidden="true"
            className="mx-auto size-8 text-muted-readable"
          />
          <p className="mt-3 text-card-title">No video sequences</p>
          <p className="mt-1 text-body-sm text-muted-readable">
            Create the first tenant-level sequence when the configuration
            permission is available.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {data.items.map((sequence) => {
            const expanded = expandedSequenceId === sequence.videoSequenceId;
            return (
              <Card key={sequence.videoSequenceId}>
                <CardHeader className="gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle>{sequence.name}</CardTitle>
                      <Badge
                        variant={sequence.active ? "secondary" : "outline"}
                      >
                        {sequence.active ? "Active" : "Inactive"}
                      </Badge>
                      <Badge variant="outline">{sequence.sequenceCode}</Badge>
                    </div>
                    <CardDescription className="mt-2">
                      {sequence.description ?? "No description configured."}
                    </CardDescription>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-caption text-muted-readable">
                      <span>
                        {formatDashboardInteger(
                          sequence.activeLeadSequenceCount,
                        )}{" "}
                        active lead schedules
                      </span>
                      <span>
                        {formatDashboardInteger(
                          sequence.pendingVideoMessageCount,
                        )}{" "}
                        pending messages
                      </span>
                      <span>
                        {formatDashboardInteger(sequence.items.length)} schedule
                        items
                      </span>
                      <span>Version {sequence.rowVersion}</span>
                      <span>
                        Updated {formatDashboardDateTime(sequence.updatedAt)}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {canUpdate ? (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setCreateItemFor(sequence);
                          }}
                        >
                          <CirclePlus aria-hidden="true" className="size-4" />
                          Add item
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditSequence(sequence);
                          }}
                        >
                          <Pencil aria-hidden="true" className="size-4" />
                          Edit sequence
                        </Button>
                      </>
                    ) : null}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-expanded={expanded}
                      onClick={() => {
                        setExpandedSequenceId(
                          expanded ? null : sequence.videoSequenceId,
                        );
                      }}
                    >
                      {expanded ? (
                        <ChevronUp aria-hidden="true" className="size-4" />
                      ) : (
                        <ChevronDown aria-hidden="true" className="size-4" />
                      )}
                      {expanded ? "Hide schedule" : "Preview schedule"}
                    </Button>
                  </div>
                </CardHeader>
                {expanded ? (
                  <>
                    <Separator />
                    <CardContent className="pt-5">
                      <SequenceSchedule
                        sequence={sequence}
                        canUpdate={canUpdate}
                        onEditItem={setEditItem}
                      />
                    </CardContent>
                  </>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}

      <EditSequenceDialog
        key={editSequence?.videoSequenceId ?? "no-sequence"}
        sequence={editSequence}
        tenantId={tenantId}
        open={editSequence !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setEditSequence(null);
        }}
      />
      <CreateItemDialog
        key={createItemFor?.videoSequenceId ?? "no-item-sequence"}
        sequence={createItemFor}
        tenantId={tenantId}
        open={createItemFor !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setCreateItemFor(null);
        }}
      />
      <EditItemDialog
        key={editItem?.videoSequenceItemId ?? "no-sequence-item"}
        item={editItem}
        tenantId={tenantId}
        open={editItem !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setEditItem(null);
        }}
      />
    </div>
  );
}
