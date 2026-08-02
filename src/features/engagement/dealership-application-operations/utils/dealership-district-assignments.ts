import type {
  DealershipDistrictAssignmentCatalog,
  DealershipDistrictAssignmentsUpdateActionInput,
} from "@/features/engagement/dealership-application-operations/contracts/dealership-application.schema";

export type DealershipDistrictAssignmentDraft = Readonly<
  Record<string, string | null>
>;

export function createDealershipDistrictAssignmentDraft(
  catalog: DealershipDistrictAssignmentCatalog,
): DealershipDistrictAssignmentDraft {
  const assignedStaffByDistrict = new Map(
    catalog.assignments.map((assignment) => [
      assignment.districtId,
      assignment.staffUserId,
    ]),
  );

  return Object.fromEntries(
    catalog.districts.map((district) => [
      district.districtId,
      assignedStaffByDistrict.get(district.districtId) ?? null,
    ]),
  );
}

export function buildDealershipDistrictAssignmentChanges(
  catalog: DealershipDistrictAssignmentCatalog,
  draft: DealershipDistrictAssignmentDraft,
): DealershipDistrictAssignmentsUpdateActionInput["changes"] {
  const currentByDistrict = new Map(
    catalog.assignments.map((assignment) => [
      assignment.districtId,
      assignment,
    ]),
  );

  return catalog.districts.flatMap((district) => {
    const current = currentByDistrict.get(district.districtId);
    const currentStaffUserId = current?.staffUserId ?? null;
    const nextStaffUserId = draft[district.districtId] ?? null;

    return currentStaffUserId === nextStaffUserId
      ? []
      : [
          {
            districtId: district.districtId,
            staffUserId: nextStaffUserId,
            expectedRowVersion: current?.rowVersion ?? null,
          },
        ];
  });
}
