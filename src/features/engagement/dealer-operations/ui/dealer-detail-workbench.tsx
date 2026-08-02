"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  BadgeIndianRupee,
  Download,
  FileCheck2,
  FilePlus2,
  Pencil,
  ShieldCheck,
  UserPlus,
  UsersRound,
} from "lucide-react";

import {
  ContentDataSurface,
  ContentDescriptionItem,
  ContentDescriptionList,
  ContentEmptyState,
  ContentMetricCard,
  ContentSection,
} from "@/components/common/content-shell";
import { formatUniqueRoleLabels } from "@/components/common/display-label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { ResolvedDealershipApplicationAccess } from "@/features/engagement/dealership-application-operations/policies/dealership-application.policy";
import {
  bindDealerDocumentAction,
  changeDealerMarginsAction,
  createDealerUserAction,
  getDealerDocumentDownloadAction,
  reviewDealerDocumentAction,
  updateDealerProfileAction,
  updateDealerUserAction,
  type DealerOperationsActionResult,
} from "@/features/engagement/dealer-operations/actions/dealer-operations.actions";
import {
  DEALER_DOCUMENT_KINDS,
  type DealerDocument,
  type DealerOperationDetail,
  type DealerOperationUser,
} from "@/features/engagement/dealer-operations/contracts/dealer-operations.schema";
import type { CentralFileUploadFieldProps } from "@/features/engagement/dealer-operations/ui/central-file-upload-field";
import { useToast } from "@/shared/hooks/use-toast";

const CentralFileUploadField = dynamic<CentralFileUploadFieldProps>(
  () =>
    import("@/features/engagement/dealer-operations/ui/central-file-upload-field").then(
      (module) => module.CentralFileUploadField,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-28 items-center justify-center rounded-2xl border border-border/70 bg-muted/25 p-4 text-body-sm text-muted-readable">
        Loading secure uploader…
      </div>
    ),
  },
);

export type DealerDetailWorkbenchProps = Readonly<{
  access: ResolvedDealershipApplicationAccess;
  detail: DealerOperationDetail;
}>;

type DialogKind =
  | "profile"
  | "user-create"
  | "user-edit"
  | "margins"
  | "document"
  | "review"
  | null;

export function DealerDetailWorkbench({
  access,
  detail,
}: DealerDetailWorkbenchProps): React.ReactElement {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = React.useTransition();
  const [dialog, setDialog] = React.useState<DialogKind>(null);
  const [selectedDocument, setSelectedDocument] =
    React.useState<DealerDocument | null>(null);
  const [selectedUser, setSelectedUser] =
    React.useState<DealerOperationUser | null>(null);
  const [uploadedFileId, setUploadedFileId] = React.useState("");
  const [reviewStatus, setReviewStatus] = React.useState<
    "APPROVED" | "REJECTED"
  >("APPROVED");
  const [mutationIntentKey, setMutationIntentKey] = React.useState("");
  const activeMargins = detail.margins.filter(
    (margin) => margin.effectiveTo === null,
  );
  const dealerAdministrators = detail.users.filter((user) =>
    user.roleNames.includes("dealer_admin"),
  );

  function openDialog(nextDialog: Exclude<DialogKind, null>): void {
    setMutationIntentKey(intentKey(`dealer-${nextDialog}`));
    setDialog(nextDialog);
  }

  function complete(result: DealerOperationsActionResult): boolean {
    if (result.ok) {
      toast.success({ title: result.message });
      setDialog(null);
      router.refresh();
      return true;
    }
    toast.error({
      title: "Dealer operation failed",
      description: [
        result.message,
        result.requestId === undefined
          ? undefined
          : `Reference: ${result.requestId}.`,
      ]
        .filter((value): value is string => value !== undefined)
        .join(" "),
    });
    return false;
  }

  function submitProfile(event: React.SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(async () => {
      complete(
        await updateDealerProfileAction({
          dealerOrgUnitId: detail.dealerOrgUnitId,
          expectedUpdatedAt: detail.updatedAt,
          name: read(data, "name"),
          isActive: data.get("isActive") === "on",
          addressLine1: read(data, "addressLine1"),
          addressLine2: nullable(data, "addressLine2"),
          city: read(data, "city"),
          district: read(data, "district"),
          state: read(data, "state"),
          postalCode: read(data, "postalCode"),
          latitude: nullableNumber(data, "latitude"),
          longitude: nullableNumber(data, "longitude"),
          reason: read(data, "reason"),
        }),
      );
    });
  }

  function submitUserCreate(event: React.SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!isValidIntentKey(mutationIntentKey)) {
      toast.error({ title: "Start the ERP user action again." });
      return;
    }
    const data = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await createDealerUserAction({
        dealerOrgUnitId: detail.dealerOrgUnitId,
        displayName: read(data, "displayName"),
        email: read(data, "email"),
        phoneE164: read(data, "phoneE164"),
        roleName: "dealer_admin",
        title: nullable(data, "title"),
        idempotencyKey: mutationIntentKey,
      });

      if (result.ok) {
        toast.success({
          title: "Dealer ERP user created",
          description: `${result.data.displayName ?? "The user"} can now sign in with the assigned dealer role.`,
        });
        setDialog(null);
        router.refresh();
        return;
      }

      complete(result);
    });
  }

  function submitUserUpdate(event: React.SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (selectedUser === null) return;
    if (!isValidIntentKey(mutationIntentKey)) {
      toast.error({ title: "Start the ERP user action again." });
      return;
    }
    const data = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await updateDealerUserAction({
        dealerOrgUnitId: detail.dealerOrgUnitId,
        dealerUserId: selectedUser.userId,
        expectedUpdatedAt: selectedUser.updatedAt,
        displayName: read(data, "displayName"),
        roleName: "dealer_admin",
        title: nullable(data, "title"),
        status: read(data, "status") as "ACTIVE" | "DISABLED",
        reason: read(data, "reason"),
        idempotencyKey: mutationIntentKey,
      });

      if (result.ok) {
        toast.success({
          title: "Dealer ERP user updated",
          description:
            result.data.status === "DISABLED"
              ? "Access was disabled and active sessions were revoked."
              : "The user profile, role, and access state were updated.",
        });
        setSelectedUser(null);
        setDialog(null);
        router.refresh();
        return;
      }

      complete(result);
    });
  }

  function submitMargins(event: React.SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!isValidIntentKey(mutationIntentKey)) {
      toast.error({ title: "Start the margin update again." });
      return;
    }
    const data = new FormData(event.currentTarget);
    startTransition(async () => {
      const margins = activeMargins.map((margin) => ({
        modelId: margin.modelId,
        variantId: margin.variantId,
        valueType:
          margin.valueType === "PERCENTAGE"
            ? ("PERCENTAGE" as const)
            : ("FIXED" as const),
        value: Number(data.get(`margin:${margin.marginId}`)),
      }));
      complete(
        await changeDealerMarginsAction({
          dealerOrgUnitId: detail.dealerOrgUnitId,
          effectiveFrom: read(data, "effectiveFrom"),
          reason: read(data, "reason"),
          margins,
          idempotencyKey: mutationIntentKey,
        }),
      );
    });
  }

  function submitDocument(event: React.SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!isValidIntentKey(mutationIntentKey)) {
      toast.error({ title: "Start the document action again." });
      return;
    }
    const data = new FormData(event.currentTarget);
    const fileId = uploadedFileId || read(data, "fileId");
    startTransition(async () => {
      const result = await bindDealerDocumentAction({
        dealerOrgUnitId: detail.dealerOrgUnitId,
        fileId,
        kind: read(data, "kind") as (typeof DEALER_DOCUMENT_KINDS)[number],
        expiresAt: nullable(data, "expiresAt"),
        note: nullable(data, "note"),
        idempotencyKey: mutationIntentKey,
      });
      if (result.ok) {
        toast.success({ title: "Dealer document attached." });
        setUploadedFileId("");
        setDialog(null);
        router.refresh();
      } else {
        complete(result);
      }
    });
  }

  function submitReview(event: React.SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (selectedDocument === null) return;
    const data = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await reviewDealerDocumentAction({
        dealerOrgUnitId: detail.dealerOrgUnitId,
        dealerDocumentId: selectedDocument.dealerDocumentId,
        status: reviewStatus,
        expectedRowVersion: selectedDocument.rowVersion,
        reviewNote: read(data, "reviewNote"),
      });
      if (result.ok) {
        toast.success({
          title: `Document ${reviewStatus === "APPROVED" ? "approved" : "rejected"}.`,
        });
        setDialog(null);
        setSelectedDocument(null);
        router.refresh();
      } else {
        complete(result);
      }
    });
  }

  function openDownload(document: DealerDocument): void {
    startTransition(async () => {
      const result = await getDealerDocumentDownloadAction({
        dealerOrgUnitId: detail.dealerOrgUnitId,
        dealerDocumentId: document.dealerDocumentId,
      });
      if (!result.ok) {
        complete(result);
        return;
      }
      window.open(result.data.url, "_blank", "noopener,noreferrer");
    });
  }

  return (
    <div className="grid gap-4">
      <ContentSection
        title={detail.name}
        description={`${detail.orgUnitType === "SUB_DEALER" ? "Sub-dealer" : "Dealer"} ${detail.code}. Profile, ERP access, effective-dated margins, and verified documents remain in one actor-scoped workspace.`}
        actions={
          access.capabilities.canUpdateDealers ? (
            <Button
              size="sm"
              onClick={() => {
                openDialog("profile");
              }}
            >
              <Pencil aria-hidden="true" className="size-4" />
              Edit dealer profile
            </Button>
          ) : undefined
        }
        padded
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <ContentMetricCard
            label="Dealer administrators"
            value={dealerAdministrators.length}
            icon={<UsersRound aria-hidden="true" />}
          />
          <ContentMetricCard
            label="Active margins"
            value={activeMargins.length}
            icon={<BadgeIndianRupee aria-hidden="true" />}
          />
          <ContentMetricCard
            label="Documents"
            value={detail.documents.length}
            icon={<FileCheck2 aria-hidden="true" />}
          />
          <ContentMetricCard
            label="Operating status"
            value={detail.isActive ? "Active" : "Inactive"}
            icon={<ShieldCheck aria-hidden="true" />}
            tone={detail.isActive ? "success" : "warning"}
          />
        </div>
      </ContentSection>

      <Tabs defaultValue="overview" className="grid gap-4">
        <TabsList className="w-fit max-w-full overflow-x-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Dealer administrators</TabsTrigger>
          <TabsTrigger value="margins">Margins</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <ContentSection title="Dealer profile" padded>
            <ContentDescriptionList columns="two">
              <ContentDescriptionItem term="Organization code">
                {detail.code}
              </ContentDescriptionItem>
              <ContentDescriptionItem term="Type">
                {detail.orgUnitType === "SUB_DEALER" ? "Sub-dealer" : "Dealer"}
              </ContentDescriptionItem>
              <ContentDescriptionItem term="Parent organization">
                {detail.parentName ?? "Tenant root"}
              </ContentDescriptionItem>
              <ContentDescriptionItem term="Status">
                <Badge variant={detail.isActive ? "default" : "secondary"}>
                  {detail.isActive ? "Active" : "Inactive"}
                </Badge>
              </ContentDescriptionItem>
              <ContentDescriptionItem term="Address">
                {[
                  detail.location.addressLine1,
                  detail.location.addressLine2,
                  detail.location.city,
                  detail.location.district,
                  detail.location.state,
                  detail.location.postalCode,
                ]
                  .filter(
                    (value): value is string =>
                      value !== null && value.length > 0,
                  )
                  .join(", ") || "Not configured"}
              </ContentDescriptionItem>
              <ContentDescriptionItem term="Coordinates">
                {detail.location.latitude === null ||
                detail.location.longitude === null
                  ? "Not captured"
                  : `${String(detail.location.latitude)}, ${String(detail.location.longitude)}`}
              </ContentDescriptionItem>
            </ContentDescriptionList>
          </ContentSection>
        </TabsContent>

        <TabsContent value="users">
          <ContentDataSurface
            title="Dealer administrators"
            description="Central operations creates and maintains Dealer administrators only. Dealer staff are owned from the dealer workspace."
            padded={false}
            scrollable={false}
            actions={
              access.capabilities.canManageDealerUsers ? (
                <Button
                  size="sm"
                  onClick={() => {
                    openDialog("user-create");
                  }}
                >
                  <UserPlus aria-hidden="true" className="size-4" />
                  Add Dealer administrator
                </Button>
              ) : undefined
            }
          >
            {dealerAdministrators.length === 0 ? (
              <ContentEmptyState
                icon={<UsersRound aria-hidden="true" />}
                title="No Dealer administrators"
                description="This dealer has no administrator identity in the authorized tenant scope."
                actions={
                  access.capabilities.canManageDealerUsers ? (
                    <Button
                      onClick={() => {
                        openDialog("user-create");
                      }}
                    >
                      <UserPlus aria-hidden="true" className="size-4" />
                      Create first administrator
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Role and title</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-24">
                        <span className="sr-only">Actions</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dealerAdministrators.map((user) => (
                      <TableRow key={user.userId}>
                        <TableCell>
                          <span className="font-medium">
                            {user.displayName ?? "Unnamed user"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="grid gap-1 text-body-sm">
                            <span>{user.email ?? "No email"}</span>
                            <span className="text-muted-readable">
                              {user.phoneMasked ?? "No phone"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="grid gap-1">
                            <span>
                              {formatUniqueRoleLabels(user.roleNames).join(
                                ", ",
                              ) || "No role"}
                            </span>
                            <span className="text-caption text-muted-readable">
                              {user.title ?? "No operating title"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              user.status === "ACTIVE" ? "default" : "secondary"
                            }
                          >
                            {titleCase(user.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {access.capabilities.canManageDealerUsers ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedUser(user);
                                openDialog("user-edit");
                              }}
                            >
                              Edit
                            </Button>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </ContentDataSurface>
        </TabsContent>

        <TabsContent value="margins">
          <ContentDataSurface
            title="Effective-dated dealer margins"
            description="Margin changes close the replaced active rows and insert a new complete set. Historical rows remain immutable and auditable."
            actions={
              access.capabilities.canManageDealerMargins &&
              activeMargins.length > 0 ? (
                <Button
                  size="sm"
                  onClick={() => {
                    openDialog("margins");
                  }}
                >
                  <BadgeIndianRupee aria-hidden="true" className="size-4" />
                  Update margins
                </Button>
              ) : undefined
            }
            padded={false}
            scrollable={false}
          >
            {detail.margins.length === 0 ? (
              <ContentEmptyState
                icon={<BadgeIndianRupee aria-hidden="true" />}
                title="No margin rows"
                description="No dealer margin history is available for this organization."
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Model / variant</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-end">Value</TableHead>
                      <TableHead>Effective period</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detail.margins.map((margin) => (
                      <TableRow key={margin.marginId}>
                        <TableCell>
                          <div className="grid gap-1">
                            <span>{margin.modelName ?? "All models"}</span>
                            <span className="text-caption text-muted-readable">
                              {margin.variantName ?? "All variants"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{margin.valueType}</TableCell>
                        <TableCell className="text-end text-tabular">
                          {margin.valueType === "PERCENTAGE"
                            ? `${String(margin.value)}%`
                            : `₹${margin.value.toLocaleString("en-IN")}`}
                        </TableCell>
                        <TableCell>
                          {margin.effectiveFrom} →{" "}
                          {margin.effectiveTo ?? "Current"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </ContentDataSurface>
        </TabsContent>

        <TabsContent value="documents">
          <ContentDataSurface
            title="Dealer documents"
            description="Files upload directly to private storage, pass centralized scanning, and are then bound to the dealer with review status and expiry metadata."
            actions={
              access.capabilities.canUploadDealerFiles ? (
                <Button
                  size="sm"
                  onClick={() => {
                    openDialog("document");
                  }}
                >
                  <FilePlus2 aria-hidden="true" className="size-4" />
                  Add document
                </Button>
              ) : undefined
            }
            padded={false}
            scrollable={false}
          >
            {detail.documents.length === 0 ? (
              <ContentEmptyState
                icon={<FilePlus2 aria-hidden="true" />}
                title="No dealer documents"
                description="Upload the first verified business, tax, banking, agreement, showroom, or service-facility document."
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>File</TableHead>
                      <TableHead>Kind</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Expiry</TableHead>
                      <TableHead className="text-end">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detail.documents.map((document) => (
                      <TableRow key={document.dealerDocumentId}>
                        <TableCell>
                          <div className="grid gap-1">
                            <span className="font-medium">
                              {document.fileName}
                            </span>
                            <span className="text-caption text-muted-readable">
                              {document.mimeType ?? "Unknown type"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{titleCase(document.kind)}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              document.status === "APPROVED"
                                ? "default"
                                : document.status === "REJECTED"
                                  ? "destructive"
                                  : "secondary"
                            }
                          >
                            {titleCase(document.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {document.expiresAt ?? "No expiry"}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon-sm"
                              onClick={() => {
                                openDownload(document);
                              }}
                              disabled={pending}
                              aria-label={`Download ${document.fileName}`}
                            >
                              <Download aria-hidden="true" className="size-4" />
                            </Button>
                            {access.capabilities.canUploadDealerFiles ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedDocument(document);
                                  setReviewStatus("APPROVED");
                                  openDialog("review");
                                }}
                              >
                                Review
                              </Button>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </ContentDataSurface>
        </TabsContent>
      </Tabs>

      <Dialog
        open={dialog === "user-create"}
        onOpenChange={(open) => {
          if (!open) setDialog(null);
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <form onSubmit={submitUserCreate} className="contents">
            <DialogHeader>
              <DialogTitle>Create dealer ERP user</DialogTitle>
              <DialogDescription>
                Creates a verified ERP identity, tenant membership, and one
                tenant-scoped dealer role in an idempotent transaction.
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
                pattern="\+91[6-9][0-9]{9}"
                required
              />
              <div className="grid gap-1 sm:col-span-2">
                <span className="text-label text-foreground">ERP role</span>
                <span className="text-body-sm text-muted-readable">
                  Dealer administrator. Dealer staff are assigned from the
                  dealer workspace.
                </span>
              </div>
            </DialogBody>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDialog(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                Create ERP user
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialog === "user-edit"}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedUser(null);
            setDialog(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          {selectedUser === null ? null : (
            <form onSubmit={submitUserUpdate} className="contents">
              <DialogHeader>
                <DialogTitle>Manage dealer ERP user</DialogTitle>
                <DialogDescription>
                  Updates the user role and access state using optimistic
                  concurrency. Disabling access revokes current sessions.
                </DialogDescription>
              </DialogHeader>
              <DialogBody className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Display name"
                  name="displayName"
                  defaultValue={selectedUser.displayName ?? ""}
                  required
                />
                <Field
                  label="Operating title"
                  name="title"
                  defaultValue={selectedUser.title ?? ""}
                />
                <div className="grid gap-1">
                  <span className="text-label text-foreground">ERP role</span>
                  <span className="text-body-sm text-muted-readable">
                    Dealer administrator
                  </span>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="dealer-user-edit-status">
                    Access status *
                  </Label>
                  <Select
                    name="status"
                    defaultValue={
                      selectedUser.status === "DISABLED" ? "DISABLED" : "ACTIVE"
                    }
                  >
                    <SelectTrigger id="dealer-user-edit-status">
                      <SelectValue placeholder="Select access status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="DISABLED">Disabled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2 sm:col-span-2">
                  <Label htmlFor="dealer-user-edit-reason">Reason *</Label>
                  <Textarea
                    id="dealer-user-edit-reason"
                    name="reason"
                    placeholder="Explain the access change"
                    required
                    maxLength={500}
                  />
                </div>
              </DialogBody>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSelectedUser(null);
                    setDialog(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={pending}>
                  Save ERP user
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialog === "profile"}
        onOpenChange={(open) => {
          if (!open) setDialog(null);
        }}
      >
        <DialogContent className="sm:max-w-3xl">
          <form onSubmit={submitProfile} className="contents">
            <DialogHeader>
              <DialogTitle>Edit dealer profile</DialogTitle>
              <DialogDescription>
                Updates use the current record timestamp for optimistic
                concurrency and require an audit reason.
              </DialogDescription>
            </DialogHeader>
            <DialogBody className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Dealer name"
                name="name"
                defaultValue={detail.name}
                required
              />
              <div className="grid gap-2">
                <Label htmlFor="dealer-active">Operating status</Label>
                <div className="flex h-10 items-center gap-2 rounded-xl border px-3">
                  <Checkbox
                    id="dealer-active"
                    name="isActive"
                    defaultChecked={detail.isActive}
                  />
                  <Label htmlFor="dealer-active">
                    Active in ERP operations
                  </Label>
                </div>
              </div>
              <Field
                label="Address line 1"
                name="addressLine1"
                defaultValue={detail.location.addressLine1 ?? ""}
                required
              />
              <Field
                label="Address line 2"
                name="addressLine2"
                defaultValue={detail.location.addressLine2 ?? ""}
              />
              <Field
                label="City"
                name="city"
                defaultValue={detail.location.city ?? ""}
                required
              />
              <Field
                label="District"
                name="district"
                defaultValue={detail.location.district ?? ""}
                required
              />
              <Field
                label="State"
                name="state"
                defaultValue={detail.location.state ?? ""}
                required
              />
              <Field
                label="Postal code"
                name="postalCode"
                defaultValue={detail.location.postalCode ?? ""}
                required
                pattern="[1-9][0-9]{5}"
              />
              <Field
                label="Latitude"
                name="latitude"
                defaultValue={detail.location.latitude?.toString() ?? ""}
                type="number"
                step="any"
              />
              <Field
                label="Longitude"
                name="longitude"
                defaultValue={detail.location.longitude?.toString() ?? ""}
                type="number"
                step="any"
              />
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="profile-reason">Reason *</Label>
                <Textarea
                  id="profile-reason"
                  name="reason"
                  placeholder="Explain the dealer profile change"
                  required
                  maxLength={500}
                />
              </div>
            </DialogBody>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDialog(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                Save dealer profile
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialog === "margins"}
        onOpenChange={(open) => {
          if (!open) setDialog(null);
        }}
      >
        <DialogContent className="sm:max-w-3xl">
          <form onSubmit={submitMargins} className="contents">
            <DialogHeader>
              <DialogTitle>Update active margins</DialogTitle>
              <DialogDescription>
                This creates a complete effective-dated replacement for the
                current active margin set. It does not overwrite history.
              </DialogDescription>
            </DialogHeader>
            <DialogBody className="grid gap-4">
              <Field
                label="Effective from"
                name="effectiveFrom"
                type="date"
                defaultValue={new Date().toISOString().slice(0, 10)}
                required
              />
              {activeMargins.map((margin) => (
                <div
                  key={margin.marginId}
                  className="grid gap-2 rounded-2xl border border-border/70 p-4 sm:grid-cols-[minmax(0,1fr)_12rem]"
                >
                  <div>
                    <p className="font-medium">
                      {margin.modelName ?? "All models"}
                    </p>
                    <p className="text-caption text-muted-readable">
                      {margin.variantName ?? "All variants"} ·{" "}
                      {margin.valueType}
                    </p>
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor={`margin-${margin.marginId}`}>Value</Label>
                    <Input
                      id={`margin-${margin.marginId}`}
                      name={`margin:${margin.marginId}`}
                      type="number"
                      placeholder="Enter margin value"
                      min="0"
                      max={
                        margin.valueType === "PERCENTAGE" ? "100" : "10000000"
                      }
                      step="0.01"
                      defaultValue={margin.value}
                      required
                    />
                  </div>
                </div>
              ))}
              <div className="grid gap-2">
                <Label htmlFor="margin-reason">Reason *</Label>
                <Textarea
                  id="margin-reason"
                  name="reason"
                  placeholder="Explain the margin change"
                  required
                  maxLength={500}
                />
              </div>
            </DialogBody>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDialog(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                Apply margin change set
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialog === "document"}
        onOpenChange={(open) => {
          if (!open) {
            setDialog(null);
            setUploadedFileId("");
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <form onSubmit={submitDocument} className="contents">
            <DialogHeader>
              <DialogTitle>Add dealer document</DialogTitle>
              <DialogDescription>
                Upload the document from ERP. A file identifier is created only
                after secure storage and scanning begin; binding is allowed only
                after a CLEAN result.
              </DialogDescription>
            </DialogHeader>
            <DialogBody className="grid gap-4">
              <CentralFileUploadField
                id="dealer-document-file"
                name="fileId"
                label="Document file"
                description="PDF, DOCX, PNG, JPEG, or WebP up to 25 MB."
                target={{
                  resourceKind: "DEALER",
                  resourceId: detail.dealerOrgUnitId,
                  purpose: "DEALER_DOCUMENT",
                }}
                accept=".pdf,.docx,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                required
                onReadyChange={(file) => {
                  setUploadedFileId(file?.fileId ?? "");
                }}
              />
              <div className="grid gap-2">
                <Label htmlFor="document-kind">Document kind *</Label>
                <Select name="kind" defaultValue="BUSINESS_REGISTRATION">
                  <SelectTrigger id="document-kind">
                    <SelectValue placeholder="Select document kind" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEALER_DOCUMENT_KINDS.map((kind) => (
                      <SelectItem key={kind} value={kind}>
                        {titleCase(kind)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Field label="Expires on" name="expiresAt" type="date" />
              <div className="grid gap-2">
                <Label htmlFor="document-note">Note</Label>
                <Textarea
                  id="document-note"
                  name="note"
                  placeholder="Add document context"
                  maxLength={500}
                />
              </div>
            </DialogBody>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDialog(null);
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={pending || uploadedFileId.length === 0}
              >
                Attach verified document
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dialog === "review"}
        onOpenChange={(open) => {
          if (!open) {
            setDialog(null);
            setSelectedDocument(null);
          }
        }}
      >
        <DialogContent>
          <form onSubmit={submitReview} className="contents">
            <DialogHeader>
              <DialogTitle>Review dealer document</DialogTitle>
              <DialogDescription>
                {selectedDocument?.fileName ?? "Document"}. The decision is
                row-version protected and auditable.
              </DialogDescription>
            </DialogHeader>
            <DialogBody className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="review-status">Decision</Label>
                <Select
                  value={reviewStatus}
                  onValueChange={(value) => {
                    setReviewStatus(value as "APPROVED" | "REJECTED");
                  }}
                >
                  <SelectTrigger id="review-status">
                    <SelectValue placeholder="Select review decision" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="APPROVED">Approve</SelectItem>
                    <SelectItem value="REJECTED">Reject</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="review-note">Review note *</Label>
                <Textarea
                  id="review-note"
                  name="reviewNote"
                  placeholder="Explain the review decision"
                  required
                  maxLength={500}
                />
              </div>
            </DialogBody>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDialog(null);
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant={
                  reviewStatus === "REJECTED" ? "destructive" : "default"
                }
                disabled={pending}
              >
                Save review
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue = "",
  required = false,
  type = "text",
  pattern,
  step,
}: Readonly<{
  label: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
  type?: React.HTMLInputTypeAttribute;
  pattern?: string;
  step?: string;
}>): React.ReactElement {
  const id = `dealer-${name}`;
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
        defaultValue={defaultValue}
        placeholder={`Enter ${label.toLocaleLowerCase("en-US")}`}
        required={required}
        pattern={pattern}
        step={step}
      />
    </div>
  );
}

function read(data: FormData, key: string): string {
  const value = data.get(key);
  return typeof value === "string" ? value.trim() : "";
}
function nullable(data: FormData, key: string): string | null {
  const value = read(data, key);
  return value.length === 0 ? null : value;
}
function nullableNumber(data: FormData, key: string): number | null {
  const value = read(data, key);
  if (value.length === 0) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
function intentKey(prefix: string): string {
  return `${prefix}:${crypto.randomUUID()}`;
}
function isValidIntentKey(value: string): boolean {
  return value.length >= 16 && value.length <= 128;
}
function titleCase(value: string): string {
  return value
    .toLocaleLowerCase("en-US")
    .replace(/_/gu, " ")
    .replace(/\b\p{L}/gu, (match) => match.toLocaleUpperCase("en-US"));
}
