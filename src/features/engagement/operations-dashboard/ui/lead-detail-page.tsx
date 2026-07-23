// oz-next-app/src/features/engagement/operations-dashboard/ui/lead-detail-page.tsx
import type * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  CalendarClock,
  MapPin,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import {
  ContentDescriptionItem,
  ContentDescriptionList,
  ContentGrid,
  ContentHeader,
  ContentRoot,
  ContentSection,
} from "@/components/common/content-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import type {
  EngagementDashboardSearchParams,
  EngagementLeadDetail,
} from "@/features/engagement/operations-dashboard/contracts/engagement-dashboard.schema";
import {
  formatDashboardDateTime,
  titleCaseDashboardToken,
} from "@/features/engagement/operations-dashboard/utils/engagement-dashboard-format";
import {
  engagementDashboardHref,
  engagementDealerDetailHref,
} from "@/features/engagement/operations-dashboard/utils/engagement-dashboard-url";

export type EngagementLeadDetailPageProps = Readonly<{
  lead: EngagementLeadDetail;
  query: EngagementDashboardSearchParams;
}>;

export function EngagementLeadDetailPage({
  lead,
  query,
}: EngagementLeadDetailPageProps): React.ReactElement {
  const location = [
    lead.location.district,
    lead.location.city,
    lead.location.state,
    lead.location.postalCode,
  ]
    .filter((value): value is string => value !== null && value.length > 0)
    .join(" · ");

  return (
    <ContentRoot width="wide" density="compact">
      <ContentHeader
        eyebrow="Engagement lead drill-down"
        title={`Lead ${lead.leadNo}`}
        description={`${titleCaseDashboardToken(lead.leadType)} · ${lead.source.name}`}
        actions={
          <Button variant="outline" asChild>
            <Link href={engagementDashboardHref(query, {}, "issues")}>
              <ArrowLeft aria-hidden="true" className="size-4" /> Back to
              dashboard
            </Link>
          </Button>
        }
        meta={
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">
              {titleCaseDashboardToken(lead.status)}
            </Badge>
            <Badge variant="outline">{lead.source.code}</Badge>
            <Badge variant="outline">Row version {lead.rowVersion}</Badge>
          </div>
        }
        variant="compact"
      />

      <ContentGrid variant="two">
        <ContentSection
          title="Lead and customer"
          description="Customer contact remains masked by the API contract."
        >
          <ContentDescriptionList columns="two">
            <ContentDescriptionItem term="Lead number">
              {lead.leadNo}
            </ContentDescriptionItem>
            <ContentDescriptionItem term="Status">
              {titleCaseDashboardToken(lead.status)}
            </ContentDescriptionItem>
            <ContentDescriptionItem term="Lead type">
              {titleCaseDashboardToken(lead.leadType)}
            </ContentDescriptionItem>
            <ContentDescriptionItem term="Source">
              {lead.source.name}
            </ContentDescriptionItem>
            <ContentDescriptionItem term="Customer name">
              {lead.customer.name ?? "Not available"}
            </ContentDescriptionItem>
            <ContentDescriptionItem term="Masked contact">
              {lead.customer.contactMasked ?? "Not available"}
            </ContentDescriptionItem>
            <ContentDescriptionItem term="Created">
              {formatDashboardDateTime(lead.createdAt)}
            </ContentDescriptionItem>
            <ContentDescriptionItem term="Updated">
              {formatDashboardDateTime(lead.updatedAt)}
            </ContentDescriptionItem>
          </ContentDescriptionList>
        </ContentSection>

        <ContentSection title="Assignment and location">
          <ContentDescriptionList columns="one">
            <ContentDescriptionItem term="Dealer">
              {lead.dealer === null ? (
                "Unassigned"
              ) : (
                <Link
                  href={engagementDealerDetailHref(lead.dealer.id, query)}
                  className="underline underline-offset-4"
                >
                  {lead.dealer.name} · {lead.dealer.code}
                </Link>
              )}
            </ContentDescriptionItem>
            <ContentDescriptionItem term="Owner assigned">
              {formatDashboardDateTime(lead.ownerAssignedAt)}
            </ContentDescriptionItem>
            <ContentDescriptionItem term="Next follow-up">
              {formatDashboardDateTime(lead.nextFollowUpAt)}
            </ContentDescriptionItem>
            <ContentDescriptionItem term="Converted">
              {formatDashboardDateTime(lead.convertedAt)}
            </ContentDescriptionItem>
            <ContentDescriptionItem term="Location">
              {location.length > 0 ? location : "Not available"}
            </ContentDescriptionItem>
            <ContentDescriptionItem term="Coordinates">
              {lead.location.latitude === null ||
              lead.location.longitude === null
                ? "Not available"
                : `${String(lead.location.latitude)}, ${String(lead.location.longitude)}`}
            </ContentDescriptionItem>
          </ContentDescriptionList>
        </ContentSection>
      </ContentGrid>

      <ContentSection
        title="Lead timeline"
        description="Auditable lifecycle events. Raw event payloads are intentionally not rendered because they may contain untrusted or sensitive data."
      >
        {lead.timeline.length === 0 ? (
          <p className="text-body-sm text-muted-readable">
            No timeline events were returned.
          </p>
        ) : (
          <ol className="grid gap-3">
            {lead.timeline.map((event, index) => (
              <li
                key={event.eventId}
                className="grid grid-cols-[auto_1fr] gap-3 rounded-2xl border p-4"
              >
                <div className="flex size-9 items-center justify-center rounded-xl bg-muted">
                  {event.type.includes("LOCATION") ? (
                    <MapPin aria-hidden="true" className="size-4" />
                  ) : event.type.includes("ASSIGN") ? (
                    <Building2 aria-hidden="true" className="size-4" />
                  ) : event.type.includes("FOLLOW") ? (
                    <CalendarClock aria-hidden="true" className="size-4" />
                  ) : event.actorKind !== null ? (
                    <UserRound aria-hidden="true" className="size-4" />
                  ) : (
                    <ShieldCheck aria-hidden="true" className="size-4" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">
                      {titleCaseDashboardToken(event.type)}
                    </p>
                    <Badge variant="outline">{index + 1}</Badge>
                  </div>
                  <p className="mt-1 text-caption text-muted-readable">
                    {formatDashboardDateTime(event.occurredAt)}
                    {event.actorKind === null
                      ? ""
                      : ` · ${titleCaseDashboardToken(event.actorKind)}`}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </ContentSection>
    </ContentRoot>
  );
}
