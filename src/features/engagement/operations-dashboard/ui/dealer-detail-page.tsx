// oz-next-app/src/features/engagement/operations-dashboard/ui/dealer-detail-page.tsx
import type * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Clock3,
  ExternalLink,
  MapPin,
  Settings2,
  ShieldCheck,
} from "lucide-react";

import {
  ContentDescriptionItem,
  ContentDescriptionList,
  ContentGrid,
  ContentHeader,
  ContentMetricCard,
  ContentRoot,
  ContentSection,
  ContentStatus,
} from "@/components/common/content-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import type {
  EngagementDashboardSearchParams,
  EngagementDealerDetail,
} from "@/features/engagement/operations-dashboard/contracts/engagement-dashboard.schema";
import type { ResolvedEngagementDashboardAccess } from "@/features/engagement/operations-dashboard/policies/engagement-dashboard.policy";
import { DealerConfigurationSheet } from "@/features/engagement/operations-dashboard/ui/dealer-configuration-sheet";
import {
  formatDashboardDateTime,
  formatDashboardDuration,
  formatDashboardInteger,
  formatDashboardPercentage,
  titleCaseDashboardToken,
} from "@/features/engagement/operations-dashboard/utils/engagement-dashboard-format";
import { engagementDashboardHref } from "@/features/engagement/operations-dashboard/utils/engagement-dashboard-url";

export type EngagementDealerDetailPageProps = Readonly<{
  dealer: EngagementDealerDetail;
  query: EngagementDashboardSearchParams;
  access: ResolvedEngagementDashboardAccess;
}>;

function isUnknownRecord(
  value: unknown,
): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function businessHoursRows(
  value: Readonly<Record<string, unknown>>,
): ReadonlyArray<Readonly<{ day: string; summary: string }>> {
  return Object.entries(value).map(([day, raw]) => {
    if (!isUnknownRecord(raw)) {
      return { day: titleCaseDashboardToken(day), summary: "Configured" };
    }
    if (raw["closed"] === true) {
      return { day: titleCaseDashboardToken(day), summary: "Closed" };
    }
    const intervals = raw["intervals"];
    if (!Array.isArray(intervals)) {
      return { day: titleCaseDashboardToken(day), summary: "Configured" };
    }
    const labels = intervals.flatMap((interval) => {
      if (!isUnknownRecord(interval)) return [];
      const opensAt = interval["opensAt"];
      const closesAt = interval["closesAt"];
      return typeof opensAt === "string" && typeof closesAt === "string"
        ? [`${opensAt}–${closesAt}`]
        : [];
    });
    return {
      day: titleCaseDashboardToken(day),
      summary: labels.length > 0 ? labels.join(", ") : "Configured",
    };
  });
}

export function EngagementDealerDetailPage({
  dealer,
  query,
  access,
}: EngagementDealerDetailPageProps): React.ReactElement {
  const flows = [
    dealer.supportsVehicleEnquiries ? "Vehicle" : null,
    dealer.supportsServiceEnquiries ? "Service" : null,
    dealer.supportsWarranty ? "Warranty" : null,
  ].filter((value): value is string => value !== null);
  const hours = businessHoursRows(dealer.settings.businessHours);

  return (
    <ContentRoot width="full" density="compact">
      <ContentHeader
        eyebrow="Dealer engagement workspace"
        title={dealer.dealerName}
        description={`${dealer.dealerCode} · ${[dealer.district, dealer.city].filter(Boolean).join(" · ") || "Location not classified"}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href={engagementDashboardHref(query, {}, "dealers")}>
                <ArrowLeft aria-hidden="true" className="size-4" /> Back to
                dashboard
              </Link>
            </Button>
            <DealerConfigurationSheet
              dealer={dealer}
              tenantId={query.tenantId}
              canUpdateSettings={access.capabilities.canUpdateDealerSettings}
              canUpdateLocation={access.capabilities.canUpdateDealerLocation}
            />
            {dealer.googleMapsUrl !== null ? (
              <Button asChild>
                <a
                  href={dealer.googleMapsUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  <MapPin aria-hidden="true" className="size-4" /> Open Maps
                  <ExternalLink aria-hidden="true" className="size-3.5" />
                </a>
              </Button>
            ) : null}
          </div>
        }
        meta={
          <div className="flex flex-wrap gap-2">
            <Badge variant={dealer.orgUnitActive ? "secondary" : "outline"}>
              {dealer.orgUnitActive ? "Active" : "Inactive"}
            </Badge>
            <Badge variant={dealer.engagementActive ? "secondary" : "outline"}>
              {dealer.engagementActive
                ? "Engagement enabled"
                : "Engagement disabled"}
            </Badge>
            <Badge
              variant={
                dealer.locationStatus === "READY" ? "outline" : "destructive"
              }
            >
              {titleCaseDashboardToken(dealer.locationStatus)}
            </Badge>
            <Badge variant="outline">Row version {dealer.rowVersion}</Badge>
          </div>
        }
        variant="compact"
      />

      <ContentGrid variant="metrics">
        <ContentMetricCard
          label="Assigned leads"
          value={formatDashboardInteger(dealer.assignedCount)}
          description={`${formatDashboardInteger(dealer.openLeadCount)} open backlog`}
          icon={<Building2 aria-hidden="true" />}
        />
        <ContentMetricCard
          label="Response SLA"
          value={formatDashboardPercentage(dealer.responseSlaRatePct)}
          description={`Median ${formatDashboardDuration(dealer.medianFirstResponseMinutes)}`}
          icon={<Clock3 aria-hidden="true" />}
        />
        <ContentMetricCard
          label="Cohort conversion"
          value={formatDashboardPercentage(dealer.conversionRatePct)}
          description={`${formatDashboardInteger(dealer.convertedCount)} converted · ${formatDashboardInteger(dealer.bookedCount)} booked`}
          icon={<ShieldCheck aria-hidden="true" />}
        />
        <ContentMetricCard
          label="Operational issues"
          value={formatDashboardInteger(dealer.issueCount)}
          description={`${formatDashboardInteger(dealer.overdueFollowUpCount)} overdue · ${formatDashboardInteger(dealer.failedCommunicationCount)} communication failures`}
          icon={<Settings2 aria-hidden="true" />}
        />
      </ContentGrid>

      <Tabs defaultValue="profile" className="grid gap-4">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-0">
          <ContentGrid variant="two">
            <ContentSection
              title="Identity and readiness"
              description="Read-only dealer identity and backend readiness state."
            >
              <ContentDescriptionList columns="two">
                <ContentDescriptionItem term="Dealer code">
                  {dealer.dealerCode}
                </ContentDescriptionItem>
                <ContentDescriptionItem term="Health">
                  {titleCaseDashboardToken(dealer.health.status)}
                </ContentDescriptionItem>
                <ContentDescriptionItem term="Supported flows">
                  {flows.length > 0 ? flows.join(", ") : "None"}
                </ContentDescriptionItem>
                <ContentDescriptionItem term="Last activity">
                  {formatDashboardDateTime(dealer.lastActivityAt)}
                </ContentDescriptionItem>
                <ContentDescriptionItem term="Oldest untouched lead">
                  {formatDashboardDateTime(dealer.oldestUntouchedLeadAt)}
                </ContentDescriptionItem>
                <ContentDescriptionItem term="Settings updated">
                  {formatDashboardDateTime(dealer.settings.updatedAt)}
                </ContentDescriptionItem>
              </ContentDescriptionList>
              {dealer.health.reasons.length > 0 ? (
                <div className="mt-4 rounded-2xl border p-4">
                  <p className="font-medium">Explainable health reasons</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-body-sm text-muted-readable">
                    {dealer.health.reasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </ContentSection>

            <ContentSection
              title="Address and location"
              description="Validated dealer address and map metadata."
            >
              <ContentDescriptionList columns="one">
                <ContentDescriptionItem term="Address line 1">
                  {dealer.address.line1 ?? "Not configured"}
                </ContentDescriptionItem>
                <ContentDescriptionItem term="Address line 2">
                  {dealer.address.line2 ?? "Not configured"}
                </ContentDescriptionItem>
                <ContentDescriptionItem term="District / city">
                  {[dealer.district, dealer.city].filter(Boolean).join(" · ") ||
                    "Not configured"}
                </ContentDescriptionItem>
                <ContentDescriptionItem term="State / postal code">
                  {[dealer.address.state, dealer.address.postalCode]
                    .filter(Boolean)
                    .join(" · ") || "Not configured"}
                </ContentDescriptionItem>
                <ContentDescriptionItem term="Coordinates">
                  {dealer.latitude === null || dealer.longitude === null
                    ? "Not configured"
                    : `${String(dealer.latitude)}, ${String(dealer.longitude)}`}
                </ContentDescriptionItem>
                <ContentDescriptionItem term="Timezone">
                  {dealer.address.timezone}
                </ContentDescriptionItem>
              </ContentDescriptionList>
            </ContentSection>
          </ContentGrid>
        </TabsContent>

        <TabsContent value="performance" className="mt-0">
          <ContentGrid variant="two">
            <ContentSection title="Lead execution">
              <ContentDescriptionList columns="two">
                <ContentDescriptionItem term="Assigned">
                  {formatDashboardInteger(dealer.assignedCount)}
                </ContentDescriptionItem>
                <ContentDescriptionItem term="Open backlog">
                  {formatDashboardInteger(dealer.openLeadCount)}
                </ContentDescriptionItem>
                <ContentDescriptionItem term="Follow-ups due">
                  {formatDashboardInteger(dealer.followUpsDueCount)}
                </ContentDescriptionItem>
                <ContentDescriptionItem term="Follow-ups overdue">
                  {formatDashboardInteger(dealer.overdueFollowUpCount)}
                </ContentDescriptionItem>
                <ContentDescriptionItem term="Booked">
                  {formatDashboardInteger(dealer.bookedCount)}
                </ContentDescriptionItem>
                <ContentDescriptionItem term="Converted">
                  {formatDashboardInteger(dealer.convertedCount)}
                </ContentDescriptionItem>
              </ContentDescriptionList>
            </ContentSection>
            <ContentSection title="Assignment controls">
              <ContentDescriptionList columns="two">
                <ContentDescriptionItem term="Priority">
                  {dealer.settings.priority}
                </ContentDescriptionItem>
                <ContentDescriptionItem term="Weight">
                  {dealer.settings.assignmentWeight}
                </ContentDescriptionItem>
                <ContentDescriptionItem term="Maximum open leads">
                  {dealer.settings.maxOpenLeads ?? "Backend default"}
                </ContentDescriptionItem>
                <ContentDescriptionItem term="Maximum distance">
                  {dealer.settings.maxAssignmentDistanceKm === null
                    ? "Backend default"
                    : `${String(dealer.settings.maxAssignmentDistanceKm)} km`}
                </ContentDescriptionItem>
              </ContentDescriptionList>
              <div className="mt-4 rounded-2xl border p-4">
                <p className="font-medium">Business hours</p>
                {hours.length === 0 ? (
                  <p className="mt-2 text-body-sm text-muted-readable">
                    No day-level business hours are configured.
                  </p>
                ) : (
                  <dl className="mt-2 grid gap-2 text-body-sm">
                    {hours.map((item) => (
                      <div
                        key={item.day}
                        className="flex justify-between gap-4"
                      >
                        <dt className="text-muted-readable">{item.day}</dt>
                        <dd>{item.summary}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </div>
            </ContentSection>
          </ContentGrid>
        </TabsContent>

        <TabsContent value="configuration" className="mt-0">
          {!access.capabilities.canUpdateDealerSettings &&
          !access.capabilities.canUpdateDealerLocation ? (
            <ContentStatus
              title="Configuration is read-only"
              description="The active actor lacks dealer engagement or organization-unit update permissions."
            />
          ) : null}
          <ContentSection
            title="Dedicated configuration sheet"
            description="Dealer mutations are intentionally separated from the performance table and opened in a focused side sheet."
          >
            <DealerConfigurationSheet
              dealer={dealer}
              tenantId={query.tenantId}
              canUpdateSettings={access.capabilities.canUpdateDealerSettings}
              canUpdateLocation={access.capabilities.canUpdateDealerLocation}
              triggerLabel="Open configuration"
            />
          </ContentSection>
        </TabsContent>
      </Tabs>
    </ContentRoot>
  );
}
