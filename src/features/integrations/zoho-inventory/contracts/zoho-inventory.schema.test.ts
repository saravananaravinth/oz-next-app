import { describe, expect, it } from "vitest";

import { creditNoteOperationsSnapshotSchema } from "./zoho-inventory.schema";

const snapshot = {
  configured: true,
  locationId: "2570752000000031422",
  locationName: "Head Office",
  lastSuccessfulSyncAt: "2026-09-02T11:46:11.753Z",
  coveredThrough: "2026-09-02",
  invoiceCount: 186,
  eligibleInvoiceCount: 16,
  excludedInvoiceCount: 153,
  reconciliationRequiredInvoiceCount: 17,
  openIssueCount: 17,
  activeDealerCount: 93,
  mappedDealerCount: 71,
};

describe("creditNoteOperationsSnapshotSchema", () => {
  it("preserves separate eligible, excluded, and reconciliation-required counts", () => {
    expect(creditNoteOperationsSnapshotSchema.parse(snapshot)).toEqual(
      snapshot,
    );
  });

  it("requires the reconciliation-required count from the API contract", () => {
    const missingCount = {
      ...snapshot,
      reconciliationRequiredInvoiceCount: undefined,
    };

    expect(() =>
      creditNoteOperationsSnapshotSchema.parse(missingCount),
    ).toThrow();
  });
});
