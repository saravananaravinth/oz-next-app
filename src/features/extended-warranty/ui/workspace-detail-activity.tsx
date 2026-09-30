// oz-next-app/src/features/extended-warranty/ui/workspace-detail-activity.tsx
"use client";

import { Activity, FileCheck2 } from "lucide-react";
import * as React from "react";

import { ContentStatus } from "@/components/common/content-shell";
import { formatDisplayLabel } from "@/components/common/display-label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ExtendedWarrantyWorkspaceDetailPayload } from "@/features/extended-warranty/ui/workspace-detail.types";
import { formatWorkspaceDateTime } from "@/features/extended-warranty/ui/workspace-shared";

type WarrantyEvent = ExtendedWarrantyWorkspaceDetailPayload["events"][number];

const eventDayFormatter = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "full",
  timeZone: "Asia/Kolkata",
});

function groupEventsByDay(
  events: readonly WarrantyEvent[],
): ReadonlyArray<
  Readonly<{ label: string; events: readonly WarrantyEvent[] }>
> {
  const groups = new Map<string, WarrantyEvent[]>();

  for (const event of events) {
    const label = eventDayFormatter.format(new Date(event.occurredAt));
    const group = groups.get(label);
    if (group === undefined) groups.set(label, [event]);
    else group.push(event);
  }

  return Array.from(groups.entries()).map(([label, groupedEvents]) => ({
    label,
    events: groupedEvents,
  }));
}

export function WarrantyActivitySection({
  detail,
}: Readonly<{
  detail: ExtendedWarrantyWorkspaceDetailPayload;
}>): React.ReactElement {
  const [actorFilter, setActorFilter] = React.useState("ALL");
  const sortedEvents = React.useMemo(
    () =>
      [...detail.events].sort(
        (left, right) =>
          Date.parse(right.occurredAt) - Date.parse(left.occurredAt),
      ),
    [detail.events],
  );
  const actorKinds = React.useMemo(
    () =>
      Array.from(
        new Set(
          sortedEvents
            .map((event) => event.actorKind.trim())
            .filter((actorKind) => actorKind.length > 0),
        ),
      ).sort(),
    [sortedEvents],
  );
  const effectiveActorFilter =
    actorFilter === "ALL" || actorKinds.includes(actorFilter)
      ? actorFilter
      : "ALL";
  const visibleEvents = React.useMemo(
    () =>
      effectiveActorFilter === "ALL"
        ? sortedEvents
        : sortedEvents.filter(
            (event) => event.actorKind.trim() === effectiveActorFilter,
          ),
    [effectiveActorFilter, sortedEvents],
  );
  const groups = React.useMemo(
    () => groupEventsByDay(visibleEvents),
    [visibleEvents],
  );

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>Activity timeline</CardTitle>
          <CardDescription>
            Latest 100 recorded Extended Warranty events, newest first.
            Sensitive event metadata is intentionally not rendered here.
          </CardDescription>
        </div>
        {actorKinds.length <= 1 ? null : (
          <Select value={effectiveActorFilter} onValueChange={setActorFilter}>
            <SelectTrigger
              className="w-full sm:w-48"
              aria-label="Filter activity by actor"
            >
              <SelectValue placeholder="All actors" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All actors</SelectItem>
              {actorKinds.map((actorKind) => (
                <SelectItem key={actorKind} value={actorKind}>
                  {formatDisplayLabel(actorKind, "Unknown actor")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </CardHeader>
      <CardContent>
        {detail.events.length === 0 ? (
          <ContentStatus
            title="No events recorded yet"
            description="This vehicle has not generated any Extended Warranty events."
            icon={<FileCheck2 className="size-5" aria-hidden="true" />}
          />
        ) : visibleEvents.length === 0 ? (
          <ContentStatus
            title="No activity for this actor"
            description="Choose another actor filter to view recorded warranty events."
            icon={<Activity className="size-5" aria-hidden="true" />}
          />
        ) : (
          <div className="grid gap-6">
            {groups.map((group) => (
              <section key={group.label} className="grid gap-3">
                <h3 className="text-sm font-semibold text-muted-foreground">
                  {group.label}
                </h3>
                <ol className="ml-2 border-l border-border/80 pl-5">
                  {group.events.map((event) => (
                    <li key={event.id} className="relative pb-5 last:pb-0">
                      <span
                        className="absolute -left-[1.45rem] top-1.5 size-2 rounded-full bg-muted-foreground"
                        aria-hidden="true"
                      />
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                        <div className="min-w-0">
                          <div className="text-sm font-medium">
                            {formatDisplayLabel(
                              event.eventType,
                              "Warranty event",
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatDisplayLabel(
                              event.actorKind,
                              "Unknown actor",
                            )}
                            {event.reasonCode === null
                              ? ""
                              : ` · ${formatDisplayLabel(
                                  event.reasonCode,
                                  "Reason",
                                )}`}
                          </div>
                        </div>
                        <div className="shrink-0 text-xs tabular-nums text-muted-foreground">
                          {formatWorkspaceDateTime(event.occurredAt)}
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
