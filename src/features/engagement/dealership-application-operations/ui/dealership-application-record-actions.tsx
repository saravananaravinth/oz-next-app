// oz-next-app/src/features/engagement/dealership-application-operations/ui/dealership-application-record-actions.tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileCheck2,
  PhoneCall,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  readDealershipApplicationDocumentDownloadAction,
  reviewDealershipApplicationDocumentAction,
  updateDealershipApplicationActivityAction,
  updateDealershipApplicationChecklistAction,
} from "@/features/engagement/dealership-application-operations/actions/dealership-application.actions";
import {
  DEALERSHIP_APPLICATION_ACTIVITY_STATUSES,
  DEALERSHIP_APPLICATION_CHECKLIST_STATUSES,
  type DealershipApplicationActivity,
  type DealershipApplicationChecklistItem,
  type DealershipApplicationDocument,
} from "@/features/engagement/dealership-application-operations/contracts/dealership-application.schema";
import { titleCaseDealershipToken } from "@/features/engagement/dealership-application-operations/utils/dealership-application-format";
import { useToast } from "@/shared/hooks/use-toast";

function idempotencyKey(): string {
  return `dealership:${crypto.randomUUID()}`;
}

function field(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function optionalField(formData: FormData, key: string): string | undefined {
  const value = field(formData, key);
  return value.length === 0 ? undefined : value;
}

function nullableField(formData: FormData, key: string): string | null {
  return optionalField(formData, key) ?? null;
}

function optionalIso(formData: FormData, key: string): string | undefined {
  const value = optionalField(formData, key);
  if (value === undefined) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
}

function optional<TKey extends string, TValue>(
  key: TKey,
  value: TValue | undefined,
): Readonly<Record<TKey, TValue>> | Readonly<Record<never, never>> {
  return value === undefined ? {} : { [key]: value };
}

function FormField({
  label,
  htmlFor,
  required = false,
  children,
}: Readonly<{
  label: string;
  htmlFor: string;
  required?: boolean;
  children: React.ReactNode;
}>): React.ReactElement {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={htmlFor}>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </Label>
      {children}
    </div>
  );
}

export function DealershipApplicationChecklistActions({
  applicationId,
  item,
  canManage,
}: Readonly<{
  applicationId: string;
  item: DealershipApplicationChecklistItem;
  canManage: boolean;
}>): React.ReactElement | null {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = React.useTransition();
  const [open, setOpen] = React.useState(false);
  const [status, setStatus] = React.useState(item.status);
  const keyRef = React.useRef(idempotencyKey());

  if (!canManage) return null;

  function submit(
    event: React.SyntheticEvent<HTMLFormElement, SubmitEvent>,
  ): void {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await updateDealershipApplicationChecklistAction({
        applicationId,
        checklistItemId: item.checklistItemId,
        status,
        note: nullableField(formData, "note"),
        dueAt: optionalIso(formData, "dueAt") ?? null,
        reason: field(formData, "reason"),
        rowVersion: item.rowVersion,
        idempotencyKey: keyRef.current,
      });

      if (result.ok) {
        toast.success({ title: result.message });
        keyRef.current = idempotencyKey();
        setOpen(false);
        router.refresh();
        return;
      }

      toast.error({
        title: "Checklist update failed",
        description: result.message,
      });
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          keyRef.current = idempotencyKey();
          setStatus(item.status);
        }
        setOpen(nextOpen);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <ClipboardCheck aria-hidden="true" className="size-4" />
          Update
        </Button>
      </DialogTrigger>
      <DialogContent height="compact" className="sm:max-w-xl">
        <form onSubmit={submit} className="contents">
          <DialogHeader>
            <DialogTitle>Update checklist item</DialogTitle>
            <DialogDescription>{item.label}</DialogDescription>
          </DialogHeader>
          <DialogBody className="grid gap-4">
            <FormField
              label="Status"
              htmlFor={`checklist-status-${item.checklistItemId}`}
              required
            >
              <Select
                value={status}
                onValueChange={(value) => {
                  setStatus(value as typeof item.status);
                }}
              >
                <SelectTrigger id={`checklist-status-${item.checklistItemId}`}>
                  <SelectValue placeholder="Select checklist status" />
                </SelectTrigger>
                <SelectContent>
                  {DEALERSHIP_APPLICATION_CHECKLIST_STATUSES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {titleCaseDealershipToken(value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField
              label="Due at"
              htmlFor={`checklist-due-${item.checklistItemId}`}
            >
              <Input
                id={`checklist-due-${item.checklistItemId}`}
                name="dueAt"
                type="datetime-local"
                placeholder="Select due date and time"
              />
            </FormField>
            <FormField
              label="Note"
              htmlFor={`checklist-note-${item.checklistItemId}`}
            >
              <Textarea
                id={`checklist-note-${item.checklistItemId}`}
                name="note"
                placeholder="Add checklist notes"
                maxLength={2_000}
                defaultValue={item.note ?? ""}
              />
            </FormField>
            <FormField
              label="Reason"
              htmlFor={`checklist-reason-${item.checklistItemId}`}
              required
            >
              <Textarea
                id={`checklist-reason-${item.checklistItemId}`}
                name="reason"
                placeholder="Explain the checklist update"
                minLength={3}
                maxLength={2_000}
                required
              />
            </FormField>
          </DialogBody>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={pending}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending ? "Updating…" : "Update item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DealershipApplicationActivityActions({
  applicationId,
  activity,
  canManage,
}: Readonly<{
  applicationId: string;
  activity: DealershipApplicationActivity;
  canManage: boolean;
}>): React.ReactElement | null {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = React.useTransition();
  const [open, setOpen] = React.useState(false);
  const [status, setStatus] = React.useState(activity.status);
  const keyRef = React.useRef(idempotencyKey());

  if (!canManage) return null;

  function submit(
    event: React.SyntheticEvent<HTMLFormElement, SubmitEvent>,
  ): void {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await updateDealershipApplicationActivityAction({
        applicationId,
        activityId: activity.activityId,
        status,
        reason: field(formData, "reason"),
        rowVersion: activity.rowVersion,
        idempotencyKey: keyRef.current,
        ...optional("note", optionalField(formData, "note")),
        ...optional("outcome", optionalField(formData, "outcome")),
      });

      if (result.ok) {
        toast.success({ title: result.message });
        keyRef.current = idempotencyKey();
        setOpen(false);
        router.refresh();
        return;
      }

      toast.error({
        title: "Activity update failed",
        description: result.message,
      });
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          keyRef.current = idempotencyKey();
          setStatus(activity.status);
        }
        setOpen(nextOpen);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <PhoneCall aria-hidden="true" className="size-4" />
          Update
        </Button>
      </DialogTrigger>
      <DialogContent height="compact" className="sm:max-w-xl">
        <form onSubmit={submit} className="contents">
          <DialogHeader>
            <DialogTitle>Update activity</DialogTitle>
            <DialogDescription>{activity.title}</DialogDescription>
          </DialogHeader>
          <DialogBody className="grid gap-4">
            <FormField
              label="Status"
              htmlFor={`activity-status-${activity.activityId}`}
              required
            >
              <Select
                value={status}
                onValueChange={(value) => {
                  setStatus(value as typeof activity.status);
                }}
              >
                <SelectTrigger id={`activity-status-${activity.activityId}`}>
                  <SelectValue placeholder="Select activity status" />
                </SelectTrigger>
                <SelectContent>
                  {DEALERSHIP_APPLICATION_ACTIVITY_STATUSES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {titleCaseDealershipToken(value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField
              label="Notes"
              htmlFor={`activity-note-${activity.activityId}`}
            >
              <Textarea
                id={`activity-note-${activity.activityId}`}
                name="note"
                placeholder="Add activity notes"
                defaultValue={activity.note ?? ""}
                maxLength={10_000}
              />
            </FormField>
            <FormField
              label="Outcome"
              htmlFor={`activity-outcome-${activity.activityId}`}
            >
              <Textarea
                id={`activity-outcome-${activity.activityId}`}
                name="outcome"
                placeholder="Describe the activity outcome"
                defaultValue={activity.outcome ?? ""}
                maxLength={1_000}
              />
            </FormField>
            <FormField
              label="Reason"
              htmlFor={`activity-reason-${activity.activityId}`}
              required
            >
              <Textarea
                id={`activity-reason-${activity.activityId}`}
                name="reason"
                placeholder="Explain the activity update"
                minLength={3}
                maxLength={2_000}
                required
              />
            </FormField>
          </DialogBody>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={pending}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending ? "Updating…" : "Update activity"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DealershipApplicationDocumentActions({
  applicationId,
  document,
  canManage,
}: Readonly<{
  applicationId: string;
  document: DealershipApplicationDocument;
  canManage: boolean;
}>): React.ReactElement {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = React.useTransition();
  const [open, setOpen] = React.useState(false);
  const [status, setStatus] = React.useState<
    "VERIFIED" | "REJECTED" | "EXPIRED"
  >("VERIFIED");
  const keyRef = React.useRef(idempotencyKey());

  function download(): void {
    startTransition(async () => {
      const result = await readDealershipApplicationDocumentDownloadAction({
        applicationId,
        documentId: document.documentId,
      });

      if (result.ok) {
        window.open(result.url, "_blank", "noopener,noreferrer");
        return;
      }

      toast.error({
        title: "Download unavailable",
        description: result.message,
      });
    });
  }

  function submit(
    event: React.SyntheticEvent<HTMLFormElement, SubmitEvent>,
  ): void {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await reviewDealershipApplicationDocumentAction({
        applicationId,
        documentId: document.documentId,
        status,
        reason: field(formData, "reason"),
        rowVersion: document.rowVersion,
        idempotencyKey: keyRef.current,
      });

      if (result.ok) {
        toast.success({ title: result.message });
        keyRef.current = idempotencyKey();
        setOpen(false);
        router.refresh();
        return;
      }

      toast.error({
        title: "Document review failed",
        description: result.message,
      });
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={download}
      >
        <Download aria-hidden="true" className="size-4" />
        Download
      </Button>

      {canManage ? (
        <Dialog
          open={open}
          onOpenChange={(nextOpen) => {
            if (nextOpen) {
              keyRef.current = idempotencyKey();
              setStatus("VERIFIED");
            }
            setOpen(nextOpen);
          }}
        >
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <FileCheck2 aria-hidden="true" className="size-4" />
              Review
            </Button>
          </DialogTrigger>
          <DialogContent height="compact" className="sm:max-w-xl">
            <form onSubmit={submit} className="contents">
              <DialogHeader>
                <DialogTitle>Review document</DialogTitle>
                <DialogDescription>
                  {titleCaseDealershipToken(document.kind)}
                </DialogDescription>
              </DialogHeader>
              <DialogBody className="grid gap-4">
                <FormField
                  label="Decision"
                  htmlFor={`document-status-${document.documentId}`}
                  required
                >
                  <Select
                    value={status}
                    onValueChange={(value) => {
                      setStatus(value as typeof status);
                    }}
                  >
                    <SelectTrigger
                      id={`document-status-${document.documentId}`}
                    >
                      <SelectValue placeholder="Select review decision" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="VERIFIED">Verified</SelectItem>
                      <SelectItem value="REJECTED">Rejected</SelectItem>
                      <SelectItem value="EXPIRED">Expired</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField
                  label="Review reason"
                  htmlFor={`document-reason-${document.documentId}`}
                  required
                >
                  <Textarea
                    id={`document-reason-${document.documentId}`}
                    name="reason"
                    placeholder="Explain the document decision"
                    minLength={3}
                    maxLength={2_000}
                    required
                  />
                </FormField>
              </DialogBody>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline" disabled={pending}>
                    Cancel
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={pending}>
                  {pending ? "Reviewing…" : "Save review"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}

export function CompletedBadge(): React.ReactElement {
  return (
    <Badge variant="secondary">
      <CheckCircle2 aria-hidden="true" className="size-3" />
      Completed
    </Badge>
  );
}

export function VerifiedBadge(): React.ReactElement {
  return (
    <Badge variant="secondary">
      <BadgeCheck aria-hidden="true" className="size-3" />
      Verified
    </Badge>
  );
}
