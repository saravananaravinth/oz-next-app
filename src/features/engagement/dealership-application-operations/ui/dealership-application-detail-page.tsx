// oz-next-app/src/features/engagement/dealership-application-operations/ui/dealership-application-detail-page.tsx
import type * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarClock,
  ClipboardList,
  FileText,
  History,
  Mail,
  MapPin,
  Phone,
  UserRound,
  Workflow,
} from "lucide-react";

import {
  ContentDataSurface,
  ContentDescriptionItem,
  ContentDescriptionList,
  ContentEmptyState,
  ContentRoot,
  ContentSection,
} from "@/components/common/content-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import type {
  DealershipApplicationDetail,
  DealershipApplicationFilterOptions,
  DealershipApplicationSearchParams,
} from "@/features/engagement/dealership-application-operations/contracts/dealership-application.schema";
import type { ResolvedDealershipApplicationAccess } from "@/features/engagement/dealership-application-operations/policies/dealership-application.policy";
import {
  DealershipApplicationActivityActions,
  DealershipApplicationChecklistActions,
  DealershipApplicationDocumentActions,
} from "@/features/engagement/dealership-application-operations/ui/dealership-application-record-actions";
import { DealershipApplicationWorkflowActions } from "@/features/engagement/dealership-application-operations/ui/dealership-application-workflow-actions";
import {
  formatDealershipDate,
  formatDealershipDateTime,
  formatDealershipFileSize,
  formatDealershipInteger,
  titleCaseDealershipToken,
} from "@/features/engagement/dealership-application-operations/utils/dealership-application-format";
import { dealershipApplicationDashboardHref } from "@/features/engagement/dealership-application-operations/utils/dealership-application-url";

export type DealershipApplicationDetailPageProps = Readonly<{
  access: ResolvedDealershipApplicationAccess;
  query: DealershipApplicationSearchParams;
  detail: DealershipApplicationDetail;
  filterOptions: DealershipApplicationFilterOptions | null;
}>;

const PHASE_PROGRESS: Readonly<
  Record<DealershipApplicationDetail["application"]["phase"], number>
> = {
  APPLICATION: 15,
  ONBOARDING: 55,
  ACTIVE: 80,
  EXIT: 92,
  CLOSED: 100,
};

function statusVariant(
  status: string,
): "default" | "secondary" | "outline" | "destructive" {
  if (status === "REJECTED" || status === "BLOCKED" || status === "EXPIRED")
    return "destructive";
  if (status === "ACTIVE" || status === "COMPLETED" || status === "VERIFIED")
    return "default";
  if (
    status === "PENDING" ||
    status === "IN_PROGRESS" ||
    status === "SCHEDULED"
  )
    return "secondary";
  return "outline";
}

function submittedText(
  payload: Readonly<Record<string, unknown>>,
  key: string,
  maximumLength: number,
): string | null {
  const value = payload[key];
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (normalized.length === 0) return null;
  return normalized.length <= maximumLength
    ? normalized
    : `${normalized.slice(0, maximumLength - 1).trimEnd()}…`;
}

export function DealershipApplicationDetailPage({
  access,
  query,
  detail,
  filterOptions,
}: DealershipApplicationDetailPageProps): React.ReactElement {
  const application = detail.application;
  const submittedBusinessName = submittedText(
    application.validatedPayload,
    "businessName",
    256,
  );
  const submittedApplicationNotes = submittedText(
    application.validatedPayload,
    "notes",
    2_000,
  );
  const onboardingChecklist = detail.checklist.filter(
    (item) => item.phase === "ONBOARDING",
  );
  const exitChecklist = detail.checklist.filter(
    (item) => item.phase === "EXIT",
  );
  const completedChecklist = detail.checklist.filter(
    (item) => item.status === "COMPLETED" || item.status === "WAIVED",
  ).length;
  const checklistPercentage =
    detail.checklist.length === 0
      ? 0
      : (completedChecklist / detail.checklist.length) * 100;

  return (
    <ContentRoot
      width="full"
      gutter="none"
      density="compact"
      className="max-w-none gap-4"
    >
      <ContentSection padded className="overflow-hidden">
        <div className="grid gap-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="grid min-w-0 gap-1">
              <h1 className="truncate text-section-title text-foreground">
                {application.applicantName}
              </h1>
              <p className="text-body-sm text-muted-readable">
                {application.applicationNo ?? application.leadNo} · Choose the
                task you need. Each action is independent and remains protected
                by backend permissions and lifecycle rules.
              </p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href={dealershipApplicationDashboardHref(query)}>
                <ArrowLeft aria-hidden="true" className="size-4" />
                Back to applications
              </Link>
            </Button>
          </div>

          <DealershipApplicationWorkflowActions
            detail={detail}
            filterOptions={filterOptions}
            capabilities={access.capabilities}
          />

          <div className="flex flex-wrap gap-2">
            <Badge variant={statusVariant(application.status)}>
              {titleCaseDealershipToken(application.status)}
            </Badge>
            <Badge variant="outline">
              {titleCaseDealershipToken(application.phase)}
            </Badge>
            <Badge variant={application.overdue ? "destructive" : "secondary"}>
              {titleCaseDealershipToken(application.priority)}
            </Badge>
            <Badge variant="outline">Version {application.rowVersion}</Badge>
          </div>
        </div>
      </ContentSection>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(22rem,0.7fr)]">
        <ContentSection title="Application and ownership" padded>
          <ContentDescriptionList columns="two">
            <ContentDescriptionItem term="Applicant">
              <span className="flex items-center gap-2">
                <UserRound
                  aria-hidden="true"
                  className="size-4 text-muted-readable"
                />
                {application.applicantName}
              </span>
            </ContentDescriptionItem>
            <ContentDescriptionItem term="Lead number">
              {application.leadNo}
            </ContentDescriptionItem>
            <ContentDescriptionItem term="Current form">
              {application.formSubmissionId ??
                "Awaiting first application form"}
            </ContentDescriptionItem>
            <ContentDescriptionItem term="Mobile">
              <span className="flex items-center gap-2">
                <Phone
                  aria-hidden="true"
                  className="size-4 text-muted-readable"
                />
                {application.applicantMobileMasked ?? "Not available"}
              </span>
            </ContentDescriptionItem>
            <ContentDescriptionItem term="Email">
              <span className="flex items-center gap-2">
                <Mail
                  aria-hidden="true"
                  className="size-4 text-muted-readable"
                />
                {application.applicantEmail ?? "Not provided"}
              </span>
            </ContentDescriptionItem>
            <ContentDescriptionItem term="Location">
              <span className="flex items-center gap-2">
                <MapPin
                  aria-hidden="true"
                  className="size-4 text-muted-readable"
                />
                {[application.city, application.district, application.state]
                  .filter(Boolean)
                  .join(", ") || "Not captured"}
              </span>
            </ContentDescriptionItem>
            <ContentDescriptionItem term="Business name">
              {submittedBusinessName ?? "Not provided"}
            </ContentDescriptionItem>
            <ContentDescriptionItem term="Lead source">
              {application.sourceName ??
                application.sourceCode ??
                "Unattributed"}
            </ContentDescriptionItem>
            <ContentDescriptionItem term="Manager">
              {application.ownerName ?? "Unassigned"}
            </ContentDescriptionItem>
            <ContentDescriptionItem term="Owning organization">
              {application.ownerUserId === null
                ? "Central work queue"
                : (application.ownerOrgUnitName ?? "Regional staff")}
            </ContentDescriptionItem>
            <ContentDescriptionItem term="Next action">
              <span
                className={application.overdue ? "text-destructive" : undefined}
              >
                {formatDealershipDateTime(application.nextActionAt)}
                {application.overdue ? " · Overdue" : ""}
              </span>
            </ContentDescriptionItem>
            <ContentDescriptionItem term="Received">
              {formatDealershipDateTime(application.createdAt)}
            </ContentDescriptionItem>
            <ContentDescriptionItem term="Proposed partner type">
              {application.proposedOrgUnitType === null
                ? "Not selected"
                : titleCaseDealershipToken(application.proposedOrgUnitType)}
            </ContentDescriptionItem>
            <ContentDescriptionItem term="Last updated">
              {formatDealershipDateTime(application.updatedAt)}
            </ContentDescriptionItem>
            {application.rejectionReason === null ? null : (
              <ContentDescriptionItem term="Rejection reason">
                {application.rejectionReason}
              </ContentDescriptionItem>
            )}
            {application.closureReason === null ? null : (
              <ContentDescriptionItem term="Closure reason">
                {application.closureReason}
              </ContentDescriptionItem>
            )}
            {submittedApplicationNotes === null ? null : (
              <ContentDescriptionItem term="Application responses">
                <span className="whitespace-pre-line">
                  {submittedApplicationNotes}
                </span>
              </ContentDescriptionItem>
            )}
          </ContentDescriptionList>
        </ContentSection>

        <ContentSection title="Lifecycle readiness" padded>
          <div className="grid gap-5">
            <div className="grid gap-2">
              <div className="flex items-center justify-between gap-3 text-body-sm">
                <span>Lifecycle progress</span>
                <span className="text-tabular">
                  {PHASE_PROGRESS[application.phase]}%
                </span>
              </div>
              <Progress value={PHASE_PROGRESS[application.phase]} />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center justify-between gap-3 text-body-sm">
                <span>Checklist completion</span>
                <span className="text-tabular">
                  {completedChecklist}/{detail.checklist.length}
                </span>
              </div>
              <Progress value={checklistPercentage} />
            </div>
            <ContentDescriptionList columns="one">
              <ContentDescriptionItem term="Open activities" numeric>
                {formatDealershipInteger(application.openActivityCount)}
              </ContentDescriptionItem>
              <ContentDescriptionItem term="Mandatory items pending" numeric>
                {formatDealershipInteger(
                  application.pendingMandatoryChecklistCount,
                )}
              </ContentDescriptionItem>
              <ContentDescriptionItem term="Provisioned dealer">
                {application.dealerName ?? "Not provisioned"}
              </ContentDescriptionItem>
              <ContentDescriptionItem term="Activated">
                {formatDealershipDateTime(application.activatedAt)}
              </ContentDescriptionItem>
              <ContentDescriptionItem term="Exit initiated">
                {formatDealershipDateTime(application.exitInitiatedAt)}
              </ContentDescriptionItem>
            </ContentDescriptionList>
          </div>
        </ContentSection>
      </div>

      <ContentDataSurface
        title="Application form history"
        description="Every validated form submission is retained as an immutable revision; the current case points to the latest revision."
        padded={false}
        scrollable={false}
      >
        {detail.submissions.length === 0 ? (
          <ContentEmptyState
            icon={<FileText aria-hidden="true" />}
            title="Awaiting application form"
            description="The dealership lead is already tracked as an application. Its stable application identity will be preserved when the first form arrives."
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Revision</TableHead>
                  <TableHead>Application number</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detail.submissions.map((submission, index) => (
                  <TableRow key={submission.formSubmissionId}>
                    <TableCell>
                      Revision {detail.submissions.length - index}
                    </TableCell>
                    <TableCell>
                      {submission.applicationNo ?? application.leadNo}
                    </TableCell>
                    <TableCell>
                      {formatDealershipDateTime(submission.submittedAt)}
                    </TableCell>
                    <TableCell>
                      {submission.current ? (
                        <Badge>Current</Badge>
                      ) : (
                        <Badge variant="outline">Historical</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </ContentDataSurface>

      <ContentDataSurface
        title="Onboarding checklist"
        description="Mandatory business, compliance, risk, agreement, provisioning, training, collateral, and initial-order controls. Activation remains blocked until requirements are completed or explicitly waived."
        padded={false}
        scrollable={false}
      >
        {onboardingChecklist.length === 0 ? (
          <ContentEmptyState
            icon={<ClipboardList aria-hidden="true" />}
            title="No onboarding checklist items"
            description="Checklist items are created by the lifecycle projection and remain authoritative in the backend."
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Requirement</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-end">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {onboardingChecklist.map((item) => (
                  <TableRow key={item.checklistItemId}>
                    <TableCell className="min-w-72">
                      <div className="grid gap-1">
                        <span className="font-medium">{item.label}</span>
                        <span className="text-caption text-muted-readable">
                          {item.code}
                          {item.mandatory ? " · Mandatory" : " · Optional"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(item.status)}>
                        {titleCaseDealershipToken(item.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {formatDealershipDateTime(item.dueAt)}
                    </TableCell>
                    <TableCell className="max-w-96 text-body-sm text-muted-readable">
                      {item.note ?? "—"}
                    </TableCell>
                    <TableCell className="text-end">
                      <DealershipApplicationChecklistActions
                        applicationId={application.applicationId}
                        item={item}
                        canManage={access.capabilities.canManageOnboarding}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </ContentDataSurface>

      {exitChecklist.length > 0 || application.phase === "EXIT" ? (
        <ContentDataSurface
          title="Dealer exit checklist"
          description="Clearance, handover, settlement, access revocation, session closure, organization disablement, and active-margin closure controls."
          padded={false}
          scrollable={false}
        >
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Exit requirement</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-end">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exitChecklist.map((item) => (
                  <TableRow key={item.checklistItemId}>
                    <TableCell className="min-w-72">
                      <div className="grid gap-1">
                        <span className="font-medium">{item.label}</span>
                        <span className="text-caption text-muted-readable">
                          {item.code}
                          {item.mandatory ? " · Mandatory" : " · Optional"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(item.status)}>
                        {titleCaseDealershipToken(item.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {formatDealershipDateTime(item.dueAt)}
                    </TableCell>
                    <TableCell className="max-w-96 text-body-sm text-muted-readable">
                      {item.note ?? "—"}
                    </TableCell>
                    <TableCell className="text-end">
                      <DealershipApplicationChecklistActions
                        applicationId={application.applicationId}
                        item={item}
                        canManage={access.capabilities.canManageExit}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </ContentDataSurface>
      ) : null}

      <ContentDataSurface
        title="Activities, appointments, and meeting notes"
        description="Calls, follow-ups, appointments, text notes, CLEAN audio-note references, training, and review activities remain in one chronological operating record."
        padded={false}
        scrollable={false}
      >
        {detail.activities.length === 0 ? (
          <ContentEmptyState
            icon={<CalendarClock aria-hidden="true" />}
            title="No activities recorded"
            description="Use the action center to schedule an appointment, create a follow-up, or record a meeting note."
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Activity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Owner and outcome</TableHead>
                  <TableHead className="text-end">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detail.activities.map((activity) => (
                  <TableRow key={activity.activityId}>
                    <TableCell className="min-w-72">
                      <div className="grid gap-1">
                        <span className="font-medium">{activity.title}</span>
                        <span className="text-caption text-muted-readable">
                          {titleCaseDealershipToken(activity.kind)} ·{" "}
                          {formatDealershipDateTime(activity.createdAt)}
                        </span>
                        {activity.note === null ? null : (
                          <p className="max-w-xl text-body-sm text-muted-readable">
                            {activity.note}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(activity.status)}>
                        {titleCaseDealershipToken(activity.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="min-w-52">
                      <div className="grid gap-1 text-body-sm">
                        <span>
                          Due: {formatDealershipDateTime(activity.dueAt)}
                        </span>
                        <span>
                          Start:{" "}
                          {formatDealershipDateTime(activity.scheduledStartAt)}
                        </span>
                        <span>
                          End:{" "}
                          {formatDealershipDateTime(activity.scheduledEndAt)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="min-w-56">
                      <div className="grid gap-1">
                        <span>
                          {activity.ownerName ?? "Current staff queue"}
                        </span>
                        <span className="text-caption text-muted-readable">
                          {activity.outcome ?? "No outcome recorded"}
                        </span>
                        {activity.audioFileId === null ? null : (
                          <Badge variant="outline">Audio file attached</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-end">
                      <DealershipApplicationActivityActions
                        applicationId={application.applicationId}
                        activity={activity}
                        canManage={access.capabilities.canManageActivities}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </ContentDataSurface>

      <ContentDataSurface
        title="Documents and evidence"
        description="Evidence is bound only after centralized upload finalization and a CLEAN scan. Rejected or replaced files remain auditable."
        padded={false}
        scrollable={false}
      >
        {detail.documents.length === 0 ? (
          <ContentEmptyState
            icon={<FileText aria-hidden="true" />}
            title="No documents attached"
            description="Upload through the centralized file service, then bind the CLEAN file ID from the action center."
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>File</TableHead>
                  <TableHead>Validity</TableHead>
                  <TableHead className="text-end">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detail.documents.map((document) => (
                  <TableRow key={document.documentId}>
                    <TableCell className="min-w-64">
                      <div className="grid gap-1">
                        <span className="font-medium">
                          {titleCaseDealershipToken(document.kind)}
                        </span>
                        <span className="text-caption text-muted-readable">
                          {document.originalFilename ?? document.fileId}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(document.status)}>
                        {titleCaseDealershipToken(document.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="grid gap-1 text-body-sm">
                        <span>{document.mimeType ?? "Unknown type"}</span>
                        <span className="text-caption text-muted-readable">
                          {formatDealershipFileSize(document.sizeBytes)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="grid gap-1 text-body-sm">
                        <span>
                          Expires {formatDealershipDate(document.expiresAt)}
                        </span>
                        <span className="text-caption text-muted-readable">
                          Verified{" "}
                          {formatDealershipDateTime(document.verifiedAt)}
                        </span>
                        {document.rejectionReason === null ? null : (
                          <span className="text-caption text-destructive">
                            {document.rejectionReason}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-end">
                      <DealershipApplicationDocumentActions
                        applicationId={application.applicationId}
                        document={document}
                        canManage={access.capabilities.canManageDocuments}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </ContentDataSurface>

      <ContentDataSurface
        title="Audit timeline"
        description="Immutable lifecycle events, actors, reasons, and status transitions."
        padded
        scrollable={false}
      >
        {detail.events.length === 0 ? (
          <ContentEmptyState
            icon={<History aria-hidden="true" />}
            title="No events available"
            description="The lifecycle audit trail will appear after the case projection or first operation."
          />
        ) : (
          <ol className="grid gap-3">
            {detail.events.map((event) => (
              <li
                key={event.eventId}
                className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-2xl border border-border/70 p-4"
              >
                <span className="flex size-9 items-center justify-center rounded-xl bg-muted text-muted-readable">
                  <Workflow aria-hidden="true" className="size-4" />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <span className="font-medium">
                      {titleCaseDealershipToken(event.eventType)}
                    </span>
                    <time className="text-caption text-muted-readable">
                      {formatDealershipDateTime(event.occurredAt)}
                    </time>
                  </div>
                  <p className="mt-1 text-body-sm text-muted-readable">
                    {event.fromStatus === null && event.toStatus === null
                      ? "Lifecycle event"
                      : `${event.fromStatus === null ? "Created" : titleCaseDealershipToken(event.fromStatus)} → ${event.toStatus === null ? "No status" : titleCaseDealershipToken(event.toStatus)}`}
                  </p>
                  <p className="mt-1 text-caption text-muted-readable">
                    By {event.actorName ?? "System"}
                    {event.reason === null ? "" : ` · ${event.reason}`}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </ContentDataSurface>
    </ContentRoot>
  );
}
