"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { UserPlus, UsersRound } from "lucide-react";

import {
  ContentDataSurface,
  ContentEmptyState,
} from "@/components/common/content-shell";
import { formatUniqueRoleLabels } from "@/components/common/display-label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { createClientIdempotencyKey } from "@/features/erp-core/mutations/erp-mutation";
import {
  createDealerStaffAction,
  updateDealerStaffAction,
} from "@/features/engagement/dealer-dashboard/actions/dealer-staff.actions";
import type {
  DealerOperationDetail,
  DealerOperationUser,
} from "@/features/engagement/dealer-operations/contracts/dealer-operations.schema";
import { useToast } from "@/shared/hooks/use-toast";

type DialogMode = "create" | "edit" | null;

export function DealerStaffManagement({
  dealer,
}: Readonly<{
  dealer: Pick<DealerOperationDetail, "dealerOrgUnitId" | "name" | "users">;
}>): React.ReactElement {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = React.useTransition();
  const [mode, setMode] = React.useState<DialogMode>(null);
  const [selected, setSelected] = React.useState<DealerOperationUser | null>(
    null,
  );
  const staff = dealer.users.filter((user) =>
    user.roleNames.includes("dealer_staff"),
  );

  function close(): void {
    setMode(null);
    setSelected(null);
  }

  function submitCreate(event: React.SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await createDealerStaffAction({
        dealerOrgUnitId: dealer.dealerOrgUnitId,
        displayName: text(data, "displayName"),
        email: text(data, "email"),
        phoneE164: text(data, "phoneE164"),
        title: nullableText(data, "title"),
        idempotencyKey: createClientIdempotencyKey("dealer-staff-create"),
      });
      if (!result.ok) {
        toast.error({
          title: "Staff member was not created",
          description: result.message,
        });
        return;
      }
      toast.success({ title: "Dealer staff member created" });
      close();
      router.refresh();
    });
  }

  function submitUpdate(event: React.SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (selected === null) return;
    const data = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await updateDealerStaffAction({
        dealerOrgUnitId: dealer.dealerOrgUnitId,
        dealerUserId: selected.userId,
        expectedUpdatedAt: selected.updatedAt,
        displayName: text(data, "displayName"),
        title: nullableText(data, "title"),
        status: text(data, "status") === "DISABLED" ? "DISABLED" : "ACTIVE",
        reason: text(data, "reason"),
        idempotencyKey: createClientIdempotencyKey("dealer-staff-update"),
      });
      if (!result.ok) {
        toast.error({
          title: "Staff member was not updated",
          description: result.message,
        });
        return;
      }
      toast.success({
        title:
          result.data.status === "DISABLED"
            ? "Staff access disabled and sessions revoked"
            : "Dealer staff member updated",
      });
      close();
      router.refresh();
    });
  }

  return (
    <>
      <ContentDataSurface
        title="Dealer staff access"
        description="Create and maintain Dealer staff for this dealer organization. Role assignment and session revocation are enforced by the server."
        padded={false}
        scrollable={false}
        actions={
          <Button
            size="sm"
            onClick={() => {
              setMode("create");
            }}
          >
            <UserPlus aria-hidden="true" className="size-4" />
            Add staff member
          </Button>
        }
      >
        {staff.length === 0 ? (
          <ContentEmptyState
            icon={<UsersRound aria-hidden="true" />}
            title="No Dealer staff assigned"
            description="Create the first staff account for this dealer organization."
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff member</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staff.map((user) => (
                  <TableRow key={user.userId}>
                    <TableCell>
                      <div className="grid gap-1">
                        <span className="font-medium">
                          {user.displayName ?? "Unnamed staff member"}
                        </span>
                        <span className="text-caption text-muted-readable">
                          {user.title ?? "No operating title"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="grid gap-1">
                        <span>{user.email ?? "No email"}</span>
                        <span className="text-caption text-muted-readable">
                          {user.phoneMasked ?? "No phone"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {formatUniqueRoleLabels(user.roleNames).join(", ")}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          user.status === "ACTIVE" ? "default" : "secondary"
                        }
                      >
                        {user.status === "ACTIVE" ? "Active" : "Disabled"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelected(user);
                          setMode("edit");
                        }}
                      >
                        Manage
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </ContentDataSurface>

      <Dialog
        open={mode === "create"}
        onOpenChange={(open) => {
          if (!open) close();
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <form className="contents" onSubmit={submitCreate}>
            <DialogHeader>
              <DialogTitle>Add Dealer staff member</DialogTitle>
              <DialogDescription>
                The role is fixed to Dealer staff and scoped to {dealer.name}.
              </DialogDescription>
            </DialogHeader>
            <DialogBody className="grid gap-4 sm:grid-cols-2">
              <Field label="Display name" name="displayName" required />
              <Field label="Operating title" name="title" />
              <Field
                label="Verified email"
                name="email"
                type="email"
                required
              />
              <Field
                label="Verified mobile"
                name="phoneE164"
                type="tel"
                placeholder="+919876543210"
                required
              />
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={close}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                Create staff account
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={mode === "edit"}
        onOpenChange={(open) => {
          if (!open) close();
        }}
      >
        <DialogContent>
          {selected === null ? null : (
            <form className="contents" onSubmit={submitUpdate}>
              <DialogHeader>
                <DialogTitle>Manage Dealer staff</DialogTitle>
                <DialogDescription>
                  Disabling access immediately revokes active sessions.
                </DialogDescription>
              </DialogHeader>
              <DialogBody className="grid gap-4">
                <Field
                  label="Display name"
                  name="displayName"
                  defaultValue={selected.displayName ?? ""}
                  required
                />
                <Field
                  label="Operating title"
                  name="title"
                  defaultValue={selected.title ?? ""}
                />
                <div className="grid gap-2">
                  <Label htmlFor="dealer-staff-status">Access status *</Label>
                  <Select
                    name="status"
                    defaultValue={
                      selected.status === "DISABLED" ? "DISABLED" : "ACTIVE"
                    }
                  >
                    <SelectTrigger id="dealer-staff-status">
                      <SelectValue placeholder="Select access status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="DISABLED">
                        Disabled and revoke sessions
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="dealer-staff-reason">Audit reason *</Label>
                  <Textarea
                    id="dealer-staff-reason"
                    name="reason"
                    placeholder="Explain the staff access change"
                    minLength={3}
                    maxLength={500}
                    required
                  />
                </div>
              </DialogBody>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={close}>
                  Cancel
                </Button>
                <Button type="submit" disabled={pending}>
                  Save staff access
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
  defaultValue,
  required = false,
}: Readonly<{
  label: string;
  name: string;
  type?: React.HTMLInputTypeAttribute;
  placeholder?: string;
  defaultValue?: string;
  required?: boolean;
}>): React.ReactElement {
  const id = `dealer-staff-${name}`;
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>
        {label}
        {required ? " *" : ""}
      </Label>
      <Input
        id={id}
        name={name}
        type={type}
        placeholder={placeholder ?? `Enter ${label.toLocaleLowerCase("en-US")}`}
        defaultValue={defaultValue}
        required={required}
      />
    </div>
  );
}

function text(data: FormData, key: string): string {
  const value = data.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function nullableText(data: FormData, key: string): string | null {
  const value = text(data, key);
  return value.length === 0 ? null : value;
}
