"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { MapPinned, Search, UsersRound } from "lucide-react";

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
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { updateDealershipDistrictAssignmentsAction } from "@/features/engagement/dealership-application-operations/actions/dealership-application.actions";
import type { DealershipDistrictAssignmentCatalog } from "@/features/engagement/dealership-application-operations/contracts/dealership-application.schema";
import {
  buildDealershipDistrictAssignmentChanges,
  createDealershipDistrictAssignmentDraft,
  type DealershipDistrictAssignmentDraft,
} from "@/features/engagement/dealership-application-operations/utils/dealership-district-assignments";
import { useToast } from "@/shared/hooks/use-toast";

const UNASSIGNED_VALUE = "__UNASSIGNED__";
const MAX_VISIBLE_DISTRICTS = 100;
const MAX_CHANGES = 100;

function idempotencyKey(): string {
  return `dealership:${crypto.randomUUID()}`;
}

export function DealershipDistrictAssignmentsDialog({
  catalog,
}: Readonly<{
  catalog: DealershipDistrictAssignmentCatalog;
}>): React.ReactElement {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [query, setQuery] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState<DealershipDistrictAssignmentDraft>(
    () => createDealershipDistrictAssignmentDraft(catalog),
  );
  const keyRef = React.useRef(idempotencyKey());

  const currentAssignmentByDistrict = React.useMemo(
    () =>
      new Map(
        catalog.assignments.map((assignment) => [
          assignment.districtId,
          assignment,
        ]),
      ),
    [catalog.assignments],
  );
  const eligibleStaffIds = React.useMemo(
    () => new Set(catalog.staff.map((staff) => staff.userId)),
    [catalog.staff],
  );
  const changes = React.useMemo(
    () => buildDealershipDistrictAssignmentChanges(catalog, draft),
    [catalog, draft],
  );
  const normalizedQuery = query.trim().toLocaleLowerCase("en-IN");
  const matchingDistricts = React.useMemo(
    () =>
      catalog.districts.filter((district) => {
        if (normalizedQuery.length === 0) return true;
        return `${district.districtName} ${district.stateName}`
          .toLocaleLowerCase("en-IN")
          .includes(normalizedQuery);
      }),
    [catalog.districts, normalizedQuery],
  );
  const visibleDistricts = matchingDistricts.slice(0, MAX_VISIBLE_DISTRICTS);

  function reset(): void {
    setDraft(createDealershipDistrictAssignmentDraft(catalog));
    setQuery("");
    setReason("");
    setError(null);
    keyRef.current = idempotencyKey();
  }

  function updateDistrict(districtId: string, value: string): void {
    setError(null);
    setDraft((current) => ({
      ...current,
      [districtId]: value === UNASSIGNED_VALUE ? null : value,
    }));
  }

  function submit(
    event: React.SyntheticEvent<HTMLFormElement, SubmitEvent>,
  ): void {
    event.preventDefault();
    const trimmedReason = reason.trim();

    if (changes.length === 0) {
      setError("Change at least one district assignment before saving.");
      return;
    }
    if (changes.length > MAX_CHANGES) {
      setError(
        `Save no more than ${String(MAX_CHANGES)} district changes at once.`,
      );
      return;
    }
    if (trimmedReason.length < 3) {
      setError("Enter a reason of at least 3 characters.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await updateDealershipDistrictAssignmentsAction({
        changes,
        reason: trimmedReason,
        idempotencyKey: keyRef.current,
      });

      if (!result.ok) {
        setError(result.message);
        toast.error({
          title: "District assignments were not saved",
          description: result.message,
        });
        return;
      }

      toast.success({ title: result.message });
      setOpen(false);
      reset();
      router.refresh();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (pending) return;
        if (nextOpen) reset();
        setOpen(nextOpen);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <MapPinned aria-hidden="true" className="size-4" />
          District assignments
        </Button>
      </DialogTrigger>
      <DialogContent height="tall" className="sm:max-w-5xl">
        <form onSubmit={submit} className="contents">
          <DialogHeader>
            <DialogTitle>Manage district assignments</DialogTitle>
            <DialogDescription>
              Assign active staff to districts. Saving also reassigns eligible
              open dealership applications in the affected districts.
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="grid gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">
                {String(catalog.assignments.length)} assigned
              </Badge>
              <Badge variant={changes.length > 0 ? "default" : "outline"}>
                {String(changes.length)} pending changes
              </Badge>
              <Badge variant="outline">
                {String(catalog.staff.length)} eligible staff
              </Badge>
            </div>

            <div className="relative">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 start-3 size-4 -translate-y-1/2 text-muted-readable"
              />
              <Input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                }}
                placeholder="Search district or state"
                aria-label="Search district or state"
                className="ps-9"
                disabled={pending}
              />
            </div>

            {matchingDistricts.length > MAX_VISIBLE_DISTRICTS ? (
              <p className="text-caption text-muted-readable">
                Showing the first {String(MAX_VISIBLE_DISTRICTS)} of{" "}
                {String(matchingDistricts.length)} matches. Refine the search to
                find another district.
              </p>
            ) : null}

            <div className="grid gap-2" aria-label="District assignment list">
              {visibleDistricts.map((district) => {
                const currentAssignment = currentAssignmentByDistrict.get(
                  district.districtId,
                );
                const selectedValue =
                  draft[district.districtId] ?? UNASSIGNED_VALUE;
                const currentStaffIsIneligible =
                  currentAssignment !== undefined &&
                  !eligibleStaffIds.has(currentAssignment.staffUserId);

                return (
                  <div
                    key={district.districtId}
                    className="grid gap-3 rounded-2xl border border-border/70 p-3 md:grid-cols-[minmax(12rem,1fr)_minmax(16rem,1.35fr)] md:items-center"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium">
                        {district.districtName}
                      </div>
                      <div className="truncate text-caption text-muted-readable">
                        {district.stateName}
                      </div>
                    </div>
                    <Select
                      value={selectedValue}
                      onValueChange={(value) => {
                        updateDistrict(district.districtId, value);
                      }}
                      disabled={pending}
                    >
                      <SelectTrigger
                        aria-label={`Staff assigned to ${district.districtName}`}
                      >
                        <SelectValue placeholder="Select staff" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={UNASSIGNED_VALUE}>
                          Unassigned
                        </SelectItem>
                        {currentStaffIsIneligible ? (
                          <SelectItem
                            value={currentAssignment.staffUserId}
                            disabled
                          >
                            {currentAssignment.staffName} — inactive
                          </SelectItem>
                        ) : null}
                        {catalog.staff.map((staff) => (
                          <SelectItem key={staff.userId} value={staff.userId}>
                            <span className="flex min-w-0 items-center gap-2">
                              <UsersRound
                                aria-hidden="true"
                                className="size-3.5 shrink-0"
                              />
                              <span className="truncate">
                                {staff.name} — {staff.orgUnitName}
                              </span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}

              {visibleDistricts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border/70 p-8 text-center text-body-sm text-muted-readable">
                  No district matches this search.
                </div>
              ) : null}
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="district-assignment-reason">
                Reason <span aria-hidden="true">*</span>
              </Label>
              <Textarea
                id="district-assignment-reason"
                value={reason}
                onChange={(event) => {
                  setReason(event.target.value);
                  setError(null);
                }}
                minLength={3}
                maxLength={2_000}
                required
                disabled={pending}
                placeholder="Why are these district assignments changing?"
              />
            </div>

            {error === null ? null : (
              <p role="alert" className="text-body-sm text-destructive">
                {error}
              </p>
            )}
          </DialogBody>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={pending}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={
                pending || changes.length === 0 || changes.length > MAX_CHANGES
              }
            >
              {pending ? <Spinner decorative className="size-4" /> : null}
              Save {changes.length > 0 ? String(changes.length) : ""} changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
