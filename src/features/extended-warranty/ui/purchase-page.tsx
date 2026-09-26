// oz-next-app/src/features/extended-warranty/ui/purchase-page.tsx
"use client";

/* eslint-disable @next/next/no-img-element -- Theme-aware local logos and token-authorized same-origin kit images intentionally use raw image elements. */

import * as React from "react";
import {
  BatteryCharging,
  CheckCircle2,
  Clock3,
  CreditCard,
  LoaderCircle,
  MapPin,
  PackageCheck,
  RefreshCw,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { ContentRoot, ContentStatus } from "@/components/common/content-shell";
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
import { Skeleton } from "@/components/ui/skeleton";
import { isApiHttpError } from "@/lib/api/problem";
import { idempotencyKey as createIdempotencyKey } from "@/lib/security/request-identifiers";
import { cn } from "@/lib/utils";
import {
  createExtendedWarrantyCheckout,
  getExtendedWarrantyPaymentStatus,
  getExtendedWarrantyPurchase,
} from "@/features/extended-warranty/api/purchase.client";
import type {
  ExtendedWarrantyCheckout,
  ExtendedWarrantyPurchase,
  ExtendedWarrantyPurchaseOption,
} from "@/features/extended-warranty/contracts/purchase.schema";

const RAZORPAY_SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js";
const POLL_INTERVAL_MS = 1_500;
const MAX_POLL_ATTEMPTS = 24;
const PAYMENT_CONFIRMED_ORDER_STATUSES = new Set<string>([
  "PAID",
  "SALES_ORDER_PENDING",
  "SALES_ORDER_CREATED",
  "PROCESSING",
  "INVOICED",
  "PACKED",
  "SHIPPED",
  "DELIVERED",
  "INSTALLATION_PENDING",
  "REVIEW_PENDING",
  "REJECTED",
  "APPROVED",
  "ACTIVATION_PENDING",
  "ACTIVE",
]);

export type ExtendedWarrantyPurchasePageProps = Readonly<{ token: string }>;

type ViewState =
  | "loading"
  | "ready"
  | "checkout"
  | "confirming"
  | "pending"
  | "paid"
  | "address-update"
  | "unavailable"
  | "error";
type PaymentConfirmationResult = "paid" | "terminal" | "pending";

type WarrantyCoverage =
  ExtendedWarrantyPurchaseOption["warranty"]["coverageGroups"][number]["standard"];

export function ExtendedWarrantyPurchasePage({
  token,
}: ExtendedWarrantyPurchasePageProps): React.ReactElement {
  const [purchase, setPurchase] =
    React.useState<ExtendedWarrantyPurchase | null>(null);
  const [selectedOptionId, setSelectedOptionId] = React.useState<string>("");
  const [state, setState] = React.useState<ViewState>("loading");
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [addressDialogOpen, setAddressDialogOpen] = React.useState(false);
  const lifecycleControllerRef = React.useRef<AbortController | null>(null);

  React.useEffect(() => {
    const controller = new AbortController();
    lifecycleControllerRef.current = controller;

    void loadPurchase(token, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;

        setPurchase(result);
        setSelectedOptionId(
          result.order !== null &&
            !isUnpaidTerminalOrderStatus(result.order.status)
            ? result.order.offerOptionId
            : (result.options[0]?.offerOptionId ?? ""),
        );
        setState(
          isPaymentConfirmedOrderStatus(result.order?.status)
            ? "paid"
            : "ready",
        );
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        if (isTerminalPurchaseError(error)) {
          setState("unavailable");
          return;
        }
        setErrorMessage(toSafeMessage(error));
        setState("error");
      });

    return () => {
      controller.abort();
      lifecycleControllerRef.current = null;
    };
  }, [token]);

  const selectedOption =
    purchase?.options.find(
      (option) => option.offerOptionId === selectedOptionId,
    ) ?? null;
  const hasActivePurchase =
    purchase?.order !== null &&
    purchase?.order !== undefined &&
    !isUnpaidTerminalOrderStatus(purchase.order.status);

  const beginCheckout = React.useCallback(async (): Promise<void> => {
    const signal = lifecycleControllerRef.current?.signal;
    if (
      selectedOption === null ||
      state === "checkout" ||
      state === "confirming" ||
      state === "pending" ||
      signal === undefined ||
      signal.aborted
    ) {
      return;
    }

    setAddressDialogOpen(false);
    setErrorMessage(null);
    setState("checkout");

    try {
      const checkout = await createExtendedWarrantyCheckout({
        token,
        offerOptionId: selectedOption.offerOptionId,
        idempotencyKey: createIdempotencyKey(),
        signal,
      });
      if (isAbortSignalAborted(signal)) return;

      setPurchase((current) =>
        current === null
          ? current
          : {
              ...current,
              order: {
                orderId: checkout.orderId,
                orderNumber: checkout.orderNumber,
                offerOptionId: selectedOption.offerOptionId,
                status: checkout.orderStatus,
              },
            },
      );

      await openRazorpayCheckout(
        checkout,
        () => {
          if (!signal.aborted) {
            void resolvePaymentConfirmation(
              token,
              signal,
              setState,
              setErrorMessage,
            );
          }
        },
        () => {
          if (!signal.aborted) setState("ready");
        },
      );
    } catch (error: unknown) {
      if (isAbortSignalAborted(signal)) return;
      setErrorMessage(toSafeMessage(error));
      setState(isTerminalPurchaseError(error) ? "unavailable" : "error");
    }
  }, [selectedOption, state, token]);

  const handlePaymentStatusCheck = React.useCallback((): void => {
    const signal = lifecycleControllerRef.current?.signal;
    if (signal === undefined || signal.aborted) return;
    void resolvePaymentConfirmation(token, signal, setState, setErrorMessage);
  }, [token]);

  if (state === "loading") {
    return <PurchasePageSkeleton />;
  }

  if (state === "unavailable") {
    return (
      <PageState
        title="Purchase link unavailable"
        description="This secure Extended Warranty link is invalid, expired, revoked, or no longer available."
        icon={<Clock3 aria-hidden="true" />}
      />
    );
  }

  if (state === "paid") {
    return (
      <PageState
        title="Payment confirmed"
        description="Your payment has been verified. Ozotec will now continue the SPD kit fulfillment and Extended Warranty process."
        icon={<CheckCircle2 aria-hidden="true" />}
      />
    );
  }

  if (state === "address-update") {
    return <AddressUpdateThankYou />;
  }

  if (purchase === null) {
    return (
      <PageState
        title="Unable to load purchase"
        description={
          errorMessage ?? "The purchase information could not be loaded."
        }
        icon={<RefreshCw aria-hidden="true" />}
      />
    );
  }

  return (
    <ContentRoot
      width="narrow"
      density="comfortable"
      className="min-h-dvh bg-muted/20 px-0 py-0"
    >
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-background shadow-sm">
        <PurchaseHeader expiresAt={purchase.linkExpiresAt} />

        <main className="flex flex-1 flex-col gap-3 px-3 pb-28 pt-3">
          <section className="rounded-2xl border border-border/70 bg-card p-4 shadow-xs">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Extended Warranty</Badge>
              <Badge variant="outline">
                <ShieldCheck aria-hidden="true" className="size-3.5" />
                Secure purchase
              </Badge>
            </div>
            <h1 className="mt-3 text-xl font-semibold tracking-tight text-foreground">
              Extend your battery protection
            </h1>
            <p className="mt-1 text-sm leading-6 text-muted-readable">
              Purchase and install the SPD kit to add Extended Warranty
              protection to the battery on {purchase.vehicleLabel}.
            </p>
          </section>

          {state === "confirming" ? (
            <ContentStatus
              title="Confirming payment"
              description="We are waiting for verified provider confirmation before marking this purchase paid."
              icon={
                <LoaderCircle className="animate-spin" aria-hidden="true" />
              }
              announce="polite"
            />
          ) : null}

          {state === "pending" ? (
            <ContentStatus
              title="Payment confirmation pending"
              description="Do not pay again. You can safely check the verified payment status."
              icon={<Clock3 aria-hidden="true" />}
              actions={
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePaymentStatusCheck}
                >
                  <RefreshCw aria-hidden="true" />
                  Check payment status
                </Button>
              }
              announce="polite"
            />
          ) : null}

          {state === "error" && errorMessage !== null ? (
            <ContentStatus
              variant="destructive"
              title="Purchase could not continue"
              description={errorMessage}
              announce="assertive"
            />
          ) : null}

          <BuyerSection purchase={purchase} />

          <section className="rounded-2xl border border-border/70 bg-card p-4 shadow-xs">
            <SectionHeading
              icon={<PackageCheck aria-hidden="true" />}
              title="SPD kit"
            />
            <div
              className="mt-3 grid gap-3"
              role="group"
              aria-label="Available SPD kits"
            >
              {purchase.options.map((option) => (
                <ItemOptionCard
                  key={option.offerOptionId}
                  token={token}
                  option={option}
                  selected={option.offerOptionId === selectedOptionId}
                  disabled={
                    hasActivePurchase ||
                    state === "checkout" ||
                    state === "confirming" ||
                    state === "pending"
                  }
                  onSelect={() => {
                    if (!hasActivePurchase)
                      setSelectedOptionId(option.offerOptionId);
                  }}
                />
              ))}
            </div>

            {selectedOption === null ? null : (
              <PriceSummary option={selectedOption} />
            )}
          </section>

          {selectedOption === null ? null : (
            <WarrantyBenefits option={selectedOption} />
          )}
        </main>

        <div className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-md border-t border-border/80 bg-background/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] backdrop-blur-xl">
          <Button
            type="button"
            size="lg"
            className="min-h-12 w-full rounded-xl text-base"
            disabled={
              selectedOption === null ||
              state === "checkout" ||
              state === "confirming" ||
              state === "pending"
            }
            onClick={() => {
              setAddressDialogOpen(true);
            }}
          >
            {state === "checkout" ? (
              <LoaderCircle className="animate-spin" aria-hidden="true" />
            ) : (
              <CreditCard aria-hidden="true" />
            )}
            {selectedOption === null
              ? "Select a kit"
              : state === "checkout"
                ? "Preparing payment"
                : `Pay ${formatMinor(selectedOption.totalAmountMinor, selectedOption.currency)}`}
          </Button>
          <p className="mt-1.5 text-center text-[11px] leading-4 text-muted-readable">
            Payment starts only after you confirm the delivery address.
          </p>
        </div>

        <DeliveryAddressDialog
          open={addressDialogOpen}
          onOpenChange={setAddressDialogOpen}
          address={formatAddress(
            purchase.buyer.shippingAddress ?? purchase.buyer.billingAddress,
          )}
          busy={state === "checkout"}
          onConfirm={() => void beginCheckout()}
          onUpdateAddress={() => {
            setAddressDialogOpen(false);
            setState("address-update");
          }}
        />
      </div>
    </ContentRoot>
  );
}

function PurchaseHeader({
  expiresAt,
}: Readonly<{ expiresAt: string }>): React.ReactElement {
  return (
    <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between gap-3 border-b border-border/70 bg-background/95 px-4 py-3 backdrop-blur-xl">
      <div className="min-w-0">
        <img
          src="/logo-light.svg"
          alt="Ozotec EV"
          className="h-7 w-auto dark:hidden"
        />
        <img
          src="/logo-dark.svg"
          alt="Ozotec EV"
          className="hidden h-7 w-auto dark:block"
        />
      </div>
      <div className="shrink-0 text-right">
        <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-readable">
          Offer Ends
        </p>
        <time
          dateTime={expiresAt}
          aria-label={`Offer ends on ${formatExpiryDate(expiresAt)}`}
          className="mt-0.5 block text-sm font-semibold tabular-nums text-foreground"
        >
          {formatExpiryDate(expiresAt)}
        </time>
      </div>
    </header>
  );
}

function BuyerSection({
  purchase,
}: Readonly<{ purchase: ExtendedWarrantyPurchase }>): React.ReactElement {
  const buyer = purchase.buyer;
  return (
    <section className="rounded-2xl border border-border/70 bg-card p-4 shadow-xs">
      <SectionHeading
        icon={<UserRound aria-hidden="true" />}
        title="Buyer details"
      />
      <dl className="mt-3 grid gap-3 text-sm">
        <DetailRow label="Name" value={buyer.name} />
        {buyer.maskedPhone === null ? null : (
          <DetailRow label="Mobile" value={buyer.maskedPhone} />
        )}
        {buyer.addressesAreSame ? (
          <DetailRow
            label="Address"
            value={
              formatAddress(buyer.shippingAddress ?? buyer.billingAddress) ||
              "Not available"
            }
            multiline
          />
        ) : (
          <>
            <DetailRow
              label="Billing address"
              value={formatAddress(buyer.billingAddress) || "Not available"}
              multiline
            />
            <DetailRow
              label="Delivery address"
              value={
                formatAddress(buyer.shippingAddress ?? buyer.billingAddress) ||
                "Not available"
              }
              multiline
            />
          </>
        )}
        {buyer.customerType === "BUSINESS" && buyer.gstin !== null ? (
          <DetailRow label="GSTIN" value={buyer.gstin} />
        ) : null}
      </dl>
    </section>
  );
}

function ItemOptionCard({
  token,
  option,
  selected,
  disabled,
  onSelect,
}: Readonly<{
  token: string;
  option: ExtendedWarrantyPurchaseOption;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
}>): React.ReactElement {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-[border-color,background-color,box-shadow] duration-[var(--motion-duration-fast)] ease-enterprise",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        selected && "border-primary bg-primary/5 ring-1 ring-primary/20",
        disabled
          ? "cursor-default opacity-70"
          : "cursor-pointer hover:border-primary/55 hover:bg-primary/[0.025]",
      )}
    >
      <div className="size-20 shrink-0 overflow-hidden rounded-xl border border-border/70 bg-muted/40">
        {option.imageAvailable ? (
          <img
            src={purchaseImageRoute(token, option.offerOptionId)}
            alt={`${option.name} SPD kit`}
            loading="lazy"
            decoding="async"
            className="size-full object-contain"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-muted-readable">
            <PackageCheck aria-hidden="true" className="size-7" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold leading-5 text-foreground">{option.name}</p>
        {option.description === null ? null : (
          <p className="mt-1 line-clamp-3 text-xs leading-5 text-muted-readable">
            {option.description}
          </p>
        )}
        <p className="mt-2 text-sm font-semibold text-foreground">
          {formatMinor(option.unitAmountMinor, option.currency)}
        </p>
      </div>
    </button>
  );
}

function PriceSummary({
  option,
}: Readonly<{ option: ExtendedWarrantyPurchaseOption }>): React.ReactElement {
  return (
    <div className="mt-4 border-t border-border/70 pt-3">
      <div className="grid gap-2 text-sm">
        <MoneyRow
          label="Taxable value"
          value={formatMinor(option.unitAmountMinor, option.currency)}
        />
        {option.tax.kind === "CGST_SGST" &&
        option.tax.cgstRateBps !== null &&
        option.tax.cgstAmountMinor !== null &&
        option.tax.sgstRateBps !== null &&
        option.tax.sgstAmountMinor !== null ? (
          <>
            <MoneyRow
              label={`CGST (${formatBasisPoints(option.tax.cgstRateBps)})`}
              value={formatMinor(option.tax.cgstAmountMinor, option.currency)}
            />
            <MoneyRow
              label={`SGST (${formatBasisPoints(option.tax.sgstRateBps)})`}
              value={formatMinor(option.tax.sgstAmountMinor, option.currency)}
            />
          </>
        ) : option.tax.kind === "IGST" &&
          option.tax.igstRateBps !== null &&
          option.tax.igstAmountMinor !== null ? (
          <MoneyRow
            label={`IGST (${formatBasisPoints(option.tax.igstRateBps)})`}
            value={formatMinor(option.tax.igstAmountMinor, option.currency)}
          />
        ) : (
          <MoneyRow
            label={`GST (${formatBasisPoints(option.taxRateBps)})`}
            value={formatMinor(option.tax.totalAmountMinor, option.currency)}
          />
        )}
        <MoneyRow
          label="Shipping charges"
          value={formatMinor(option.shippingAmountMinor, option.currency)}
        />
        <MoneyRow
          label="Payment gateway fees"
          value={formatMinor(option.paymentGatewayFeeMinor, option.currency)}
        />
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-dashed border-border pt-3">
        <span className="font-semibold text-foreground">Total payable</span>
        <span className="text-lg font-bold tabular-nums text-foreground">
          {formatMinor(option.totalAmountMinor, option.currency)}
        </span>
      </div>
    </div>
  );
}

function WarrantyBenefits({
  option,
}: Readonly<{ option: ExtendedWarrantyPurchaseOption }>): React.ReactElement {
  const groups = option.warranty.coverageGroups;
  return (
    <section className="rounded-2xl border border-border/70 bg-card p-4 shadow-xs">
      <SectionHeading
        icon={<BatteryCharging aria-hidden="true" />}
        title="Battery warranty benefits"
      />
      <p className="mt-2 text-sm leading-6 text-muted-readable">
        Once you purchase this SPD kit and have it installed, the Extended
        Warranty below is added after the existing Standard Warranty for your
        battery.
      </p>

      {groups.length === 0 ? (
        <p className="mt-4 rounded-xl border border-border/70 bg-muted/30 p-3 text-sm text-muted-readable">
          Battery coverage details are not available for this offer. The
          checkout amount is unaffected.
        </p>
      ) : (
        <div className="mt-4 grid gap-4">
          {groups.map((group, index) => (
            <div
              key={`${group.standard.coverageStartDate}-${String(index)}`}
              className="grid gap-3"
            >
              {groups.length > 1 ? (
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-readable">
                  Coverage group {String(index + 1)} ·{" "}
                  {String(group.componentCount)} battery{" "}
                  {group.componentCount === 1 ? "pack" : "packs"}
                </p>
              ) : null}
              <CoverageCard
                title="Existing Standard Warranty"
                coverage={group.standard}
              />
              {group.extended === null ? null : (
                <CoverageCard
                  title="Extended Warranty"
                  coverage={group.extended}
                  highlight
                />
              )}
              {group.total === null ? null : (
                <div className="rounded-xl border border-primary/25 bg-primary/5 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                    Total battery protection
                  </p>
                  <div className="mt-2 grid gap-1.5 text-sm">
                    {group.total.durationMonths === null ? null : (
                      <CoverageLine
                        label="Time coverage"
                        value={`${String(group.total.durationMonths)} months`}
                      />
                    )}
                    {group.total.coverageEndDate === null ? null : (
                      <CoverageLine
                        label="Coverage period"
                        value={`${formatCalendarDate(group.total.coverageStartDate)} – ${formatCalendarDate(group.total.coverageEndDate)}`}
                      />
                    )}
                    <CoverageLine
                      label="Battery coverage"
                      value={`Covers ${String(group.componentCount)} installed battery ${group.componentCount === 1 ? "pack" : "packs"}`}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function CoverageCard({
  title,
  coverage,
  highlight = false,
}: Readonly<{
  title: string;
  coverage: WarrantyCoverage;
  highlight?: boolean;
}>): React.ReactElement {
  return (
    <div
      className={cn(
        "rounded-xl border p-3",
        highlight && "border-primary/20 bg-primary/[0.03]",
      )}
    >
      <p className="font-semibold text-foreground">{title}</p>
      <div className="mt-2 grid gap-1.5 text-sm">
        {coverage.durationMonths === null ? null : (
          <CoverageLine
            label="Duration"
            value={`${String(coverage.durationMonths)} months`}
          />
        )}
        {coverage.distanceLimitKm === null ? null : (
          <CoverageLine
            label="Distance limit"
            value={`${formatIndianNumber(coverage.distanceLimitKm)} km`}
          />
        )}
        {coverage.cycleLimit === null ? null : (
          <CoverageLine
            label="Cycle limit"
            value={formatIndianNumber(coverage.cycleLimit)}
          />
        )}
        {coverage.sohThresholdPercent === null ? null : (
          <CoverageLine
            label="SOH protection"
            value={`≥ ${trimDecimal(coverage.sohThresholdPercent)}%`}
          />
        )}
        {coverage.coverageEndDate === null ? null : (
          <CoverageLine
            label="Coverage period"
            value={`${formatCalendarDate(coverage.coverageStartDate)} – ${formatCalendarDate(coverage.coverageEndDate)}`}
          />
        )}
      </div>
    </div>
  );
}

function DeliveryAddressDialog({
  open,
  onOpenChange,
  address,
  busy,
  onConfirm,
  onUpdateAddress,
}: Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  address: string;
  busy: boolean;
  onConfirm: () => void;
  onUpdateAddress: () => void;
}>): React.ReactElement {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent height="compact" showCloseButton={!busy}>
        <DialogHeader>
          <DialogTitle>Confirm delivery address</DialogTitle>
          <DialogDescription>
            Your SPD kit will be delivered to the address below. Please confirm
            it is correct before continuing to payment.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <div className="rounded-xl border border-border/70 bg-muted/30 p-3">
            <div className="flex items-start gap-2.5">
              <MapPin
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0 text-primary"
              />
              <p className="text-sm leading-6 text-foreground">
                {address || "Delivery address is not available."}
              </p>
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={onUpdateAddress}
          >
            Update Address
          </Button>
          <Button
            type="button"
            disabled={busy || address.trim().length === 0}
            onClick={onConfirm}
          >
            {busy ? (
              <LoaderCircle className="animate-spin" aria-hidden="true" />
            ) : (
              <CreditCard aria-hidden="true" />
            )}
            Confirm & Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SectionHeading({
  icon,
  title,
}: Readonly<{ icon: React.ReactNode; title: string }>): React.ReactElement {
  return (
    <div className="flex items-center gap-2">
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary [&>svg]:size-4">
        {icon}
      </span>
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
    </div>
  );
}

function DetailRow({
  label,
  value,
  multiline = false,
}: Readonly<{
  label: string;
  value: string;
  multiline?: boolean;
}>): React.ReactElement {
  return (
    <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-3">
      <dt className="text-muted-readable">{label}</dt>
      <dd
        className={cn(
          "min-w-0 text-right font-medium text-foreground",
          multiline && "whitespace-normal leading-5",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function MoneyRow({
  label,
  value,
}: Readonly<{ label: string; value: string }>): React.ReactElement {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-readable">{label}</span>
      <span className="font-medium tabular-nums text-foreground">{value}</span>
    </div>
  );
}

function CoverageLine({
  label,
  value,
}: Readonly<{ label: string; value: string }>): React.ReactElement {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-muted-readable">{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  );
}

function AddressUpdateThankYou(): React.ReactElement {
  return (
    <ContentRoot width="narrow" className="min-h-dvh bg-muted/20 px-4 py-6">
      <div className="mx-auto flex min-h-[calc(100dvh-3rem)] w-full max-w-md items-center justify-center">
        <section
          aria-labelledby="address-update-title"
          className="w-full rounded-2xl border border-border/70 bg-card p-6 text-center shadow-sm motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-3 motion-safe:zoom-in-95 motion-safe:duration-500 motion-reduce:animate-none"
        >
          <div className="relative mx-auto flex size-16 items-center justify-center motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-50 motion-safe:duration-700 motion-reduce:animate-none">
            <span
              aria-hidden="true"
              className="absolute inset-0 rounded-full border border-primary/15 bg-primary/5"
            />
            <span className="relative flex size-14 items-center justify-center rounded-full border border-primary/25 bg-primary/10 text-primary shadow-sm">
              <MapPin aria-hidden="true" className="size-7" />
            </span>
          </div>
          <h1
            id="address-update-title"
            className="mt-5 text-xl font-semibold tracking-tight text-foreground"
          >
            Thanks for letting us know
          </h1>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-readable">
            To make sure your SPD kit reaches the correct address, please
            contact your Authorized Ozotec EV Dealer and ask them to update your
            delivery address. No payment has been started. Once the address is
            updated, reopen this secure purchase link to continue.
          </p>
          <div className="mx-auto mt-5 flex w-fit items-center gap-2 rounded-full border border-border/70 bg-muted/35 px-3 py-1.5 text-xs font-medium text-muted-readable">
            <ShieldCheck aria-hidden="true" className="size-3.5 text-primary" />
            No payment was started
          </div>
        </section>
      </div>
    </ContentRoot>
  );
}

function PurchasePageSkeleton(): React.ReactElement {
  return (
    <ContentRoot
      width="narrow"
      density="comfortable"
      className="min-h-dvh bg-muted/20 px-0 py-0"
    >
      <div
        className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-background shadow-sm"
        role="status"
        aria-label="Loading secure Extended Warranty purchase"
      >
        <header className="flex min-h-16 items-center justify-between gap-3 border-b border-border/70 bg-background px-4 py-3">
          <Skeleton className="h-7 w-28 rounded-md" />
          <div className="flex flex-col items-end gap-1.5">
            <Skeleton className="h-2.5 w-14 rounded-md" />
            <Skeleton className="h-4 w-20 rounded-md" />
          </div>
        </header>

        <main className="flex flex-1 flex-col gap-3 px-3 pb-28 pt-3">
          <section className="rounded-2xl border border-border/70 bg-card p-4 shadow-xs">
            <div className="flex gap-2">
              <Skeleton className="h-5 w-28 rounded-full" />
              <Skeleton className="h-5 w-24 rounded-full" />
            </div>
            <Skeleton className="mt-3 h-6 w-64 max-w-[82%] rounded-lg" />
            <Skeleton className="mt-2 h-4 w-full rounded-md" />
            <Skeleton className="mt-1.5 h-4 w-4/5 rounded-md" />
          </section>

          <section className="rounded-2xl border border-border/70 bg-card p-4 shadow-xs">
            <SkeletonSectionHeading />
            <div className="mt-4 grid gap-3">
              <SkeletonDetailRow labelWidth="w-10" valueWidth="w-28" />
              <SkeletonDetailRow labelWidth="w-12" valueWidth="w-24" />
              <SkeletonDetailRow
                labelWidth="w-24"
                valueWidth="w-48"
                multiline
              />
              <SkeletonDetailRow
                labelWidth="w-24"
                valueWidth="w-52"
                multiline
              />
            </div>
          </section>

          <section className="rounded-2xl border border-border/70 bg-card p-4 shadow-xs">
            <SkeletonSectionHeading />
            <div className="mt-3 flex items-start gap-3 rounded-xl border border-border/70 p-3">
              <Skeleton className="size-20 shrink-0 rounded-xl" />
              <div className="min-w-0 flex-1">
                <Skeleton className="h-4 w-4/5 rounded-md" />
                <Skeleton className="mt-2 h-3.5 w-full rounded-md" />
                <Skeleton className="mt-1.5 h-3.5 w-5/6 rounded-md" />
                <Skeleton className="mt-3 h-4 w-20 rounded-md" />
              </div>
            </div>
            <div className="mt-4 grid gap-2 border-t border-border/70 pt-3">
              {Array.from({ length: 5 }, (_, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between gap-3"
                >
                  <Skeleton className="h-3.5 w-28 rounded-md" />
                  <Skeleton className="h-3.5 w-20 rounded-md" />
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-dashed border-border pt-3">
              <Skeleton className="h-4 w-24 rounded-md" />
              <Skeleton className="h-5 w-24 rounded-md" />
            </div>
          </section>

          <section className="rounded-2xl border border-border/70 bg-card p-4 shadow-xs">
            <SkeletonSectionHeading />
            <Skeleton className="mt-3 h-4 w-full rounded-md" />
            <Skeleton className="mt-1.5 h-4 w-5/6 rounded-md" />
            <div className="mt-4 grid gap-3">
              <SkeletonCoverageCard />
              <SkeletonCoverageCard />
              <SkeletonCoverageCard />
            </div>
          </section>
        </main>

        <div className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-md border-t border-border/80 bg-background/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="mx-auto mt-2 h-2.5 w-64 max-w-[80%] rounded-md" />
        </div>
      </div>
    </ContentRoot>
  );
}

function SkeletonSectionHeading(): React.ReactElement {
  return (
    <div className="flex items-center gap-2">
      <Skeleton className="size-8 rounded-lg" />
      <Skeleton className="h-4 w-28 rounded-md" />
    </div>
  );
}

function SkeletonDetailRow({
  labelWidth,
  valueWidth,
  multiline = false,
}: Readonly<{
  labelWidth: string;
  valueWidth: string;
  multiline?: boolean;
}>): React.ReactElement {
  return (
    <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-3">
      <Skeleton className={cn("h-3.5 rounded-md", labelWidth)} />
      <div className="flex flex-col items-end gap-1.5">
        <Skeleton className={cn("h-3.5 max-w-full rounded-md", valueWidth)} />
        {multiline ? (
          <Skeleton className="h-3.5 w-36 max-w-[85%] rounded-md" />
        ) : null}
      </div>
    </div>
  );
}

function SkeletonCoverageCard(): React.ReactElement {
  return (
    <div className="rounded-xl border border-border/70 p-3">
      <Skeleton className="h-4 w-40 rounded-md" />
      <div className="mt-3 grid gap-2">
        <div className="flex justify-between gap-3">
          <Skeleton className="h-3.5 w-20 rounded-md" />
          <Skeleton className="h-3.5 w-24 rounded-md" />
        </div>
        <div className="flex justify-between gap-3">
          <Skeleton className="h-3.5 w-24 rounded-md" />
          <Skeleton className="h-3.5 w-32 rounded-md" />
        </div>
      </div>
    </div>
  );
}

function PageState({
  title,
  description,
  icon,
}: Readonly<{
  title: string;
  description: string;
  icon: React.ReactNode;
}>): React.ReactElement {
  return (
    <ContentRoot width="narrow" className="min-h-dvh px-4 py-12">
      <ContentStatus
        title={title}
        description={description}
        icon={icon}
        announce="polite"
      />
    </ContentRoot>
  );
}

function purchaseImageRoute(token: string, offerOptionId: string): string {
  return `/api/extended-warranty/public/purchase/${encodeURIComponent(token)}/options/${encodeURIComponent(offerOptionId)}/image`;
}

async function openRazorpayCheckout(
  checkout: ExtendedWarrantyCheckout,
  onSuccess: () => void,
  onDismiss: () => void,
): Promise<void> {
  await loadRazorpayScript();
  const Constructor = window.Razorpay;
  if (Constructor === undefined)
    throw new Error("Secure payment checkout could not be loaded.");
  const instance = new Constructor({
    key: checkout.checkout.clientKeyId,
    order_id: checkout.checkout.providerOrderId,
    amount: toRazorpayAmount(checkout.checkout.amountMinor),
    currency: checkout.checkout.currency,
    name: "Ozotec EV",
    description: `Extended Warranty ${checkout.orderNumber}`,
    handler: onSuccess,
    modal: { ondismiss: onDismiss },
  });
  instance.on("payment.failed", onDismiss);
  instance.open();
}

let razorpayScriptPromise: Promise<void> | null = null;
function loadRazorpayScript(): Promise<void> {
  if (window.Razorpay !== undefined) return Promise.resolve();
  if (razorpayScriptPromise !== null) return razorpayScriptPromise;
  razorpayScriptPromise = new Promise<void>((resolve, reject) => {
    const rejectAndReset = (): void => {
      razorpayScriptPromise = null;
      reject(new Error("Secure payment checkout could not be loaded."));
    };
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${RAZORPAY_SCRIPT_URL}"]`,
    );
    if (existing !== null) {
      existing.addEventListener(
        "load",
        () => {
          resolve();
        },
        { once: true },
      );
      existing.addEventListener("error", rejectAndReset, { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = RAZORPAY_SCRIPT_URL;
    script.async = true;
    script.referrerPolicy = "strict-origin-when-cross-origin";
    script.addEventListener(
      "load",
      () => {
        resolve();
      },
      { once: true },
    );
    script.addEventListener("error", rejectAndReset, { once: true });
    document.head.append(script);
  });
  return razorpayScriptPromise;
}

function toRazorpayAmount(value: string): number {
  const amount = BigInt(value);
  if (amount <= 0n || amount > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error(
      "The payment amount is outside the supported checkout range.",
    );
  }
  return Number(amount);
}

function isAbortSignalAborted(signal: AbortSignal): boolean {
  return signal.aborted;
}

async function resolvePaymentConfirmation(
  token: string,
  signal: AbortSignal,
  setState: React.Dispatch<React.SetStateAction<ViewState>>,
  setErrorMessage: React.Dispatch<React.SetStateAction<string | null>>,
): Promise<void> {
  if (signal.aborted) return;
  setState("confirming");
  try {
    const result = await confirmPayment(token, signal);
    if (isAbortSignalAborted(signal)) return;
    if (result === "paid") {
      setState("paid");
      return;
    }
    if (result === "terminal") {
      setErrorMessage(
        "The provider did not confirm this payment. No Extended Warranty activation will occur unless Ozotec ERP records a verified capture.",
      );
      setState("error");
      return;
    }
    setState("pending");
  } catch {
    if (!isAbortSignalAborted(signal)) {
      setState("pending");
    }
  }
}

async function confirmPayment(
  token: string,
  signal: AbortSignal,
): Promise<PaymentConfirmationResult> {
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
    if (signal.aborted) return "pending";
    const status = await getExtendedWarrantyPaymentStatus(token, signal);
    if (isPaymentConfirmedOrderStatus(status.order?.status)) return "paid";
    if (
      status.payment?.intentStatus === "FAILED" ||
      status.payment?.intentStatus === "CANCELLED" ||
      status.payment?.intentStatus === "EXPIRED"
    ) {
      return "terminal";
    }
    await sleep(POLL_INTERVAL_MS, signal);
  }
  return "pending";
}

function isPaymentConfirmedOrderStatus(status: string | undefined): boolean {
  return status !== undefined && PAYMENT_CONFIRMED_ORDER_STATUSES.has(status);
}

function isUnpaidTerminalOrderStatus(status: string): boolean {
  return (
    status === "CANCELLED" ||
    status === "EXPIRED" ||
    status === "FAILED" ||
    status === "REFUNDED"
  );
}

function sleep(milliseconds: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted)
    return Promise.reject(new DOMException("Operation aborted.", "AbortError"));
  return new Promise<void>((resolve, reject) => {
    const handleAbort = (): void => {
      window.clearTimeout(timeoutId);
      reject(new DOMException("Operation aborted.", "AbortError"));
    };
    const timeoutId = window.setTimeout(() => {
      signal.removeEventListener("abort", handleAbort);
      resolve();
    }, milliseconds);
    signal.addEventListener("abort", handleAbort, { once: true });
    if (signal.aborted) handleAbort();
  });
}

function isTerminalPurchaseError(error: unknown): boolean {
  return isApiHttpError(error) && [401, 403, 404, 410].includes(error.status);
}

function toSafeMessage(error: unknown): string {
  if (isApiHttpError(error)) {
    if (error.status === 409)
      return "This purchase has changed or another purchase is already active. Refresh the secure link before trying again.";
    if (error.status === 429)
      return "Too many purchase attempts were received. Wait briefly and try again.";
    if (error.status >= 500)
      return "The purchase service is temporarily unavailable. Your payment status remains protected; please try again.";
  }
  return "The secure purchase could not be completed. Please try again.";
}

function formatAddress(
  address: ExtendedWarrantyPurchase["buyer"]["shippingAddress"],
): string {
  return address === null ? "" : address.lines.join(", ");
}

function formatMinor(value: string, currency: string): string {
  const minor = BigInt(value);
  const whole = minor / 100n;
  const fraction = (minor % 100n).toString().padStart(2, "0");
  const grouped = formatIndianIntegerString(whole.toString());
  const symbol = currency === "INR" ? "₹" : `${currency} `;
  return `${symbol}${grouped}.${fraction}`;
}

function formatIndianIntegerString(value: string): string {
  if (value.length <= 3) return value;
  const lastThree = value.slice(-3);
  const prefix = value.slice(0, -3);
  const groupedPrefix = prefix.replace(/\B(?=(\d{2})+(?!\d))/gu, ",");
  return `${groupedPrefix},${lastThree}`;
}

function formatBasisPoints(value: number): string {
  const percentage = value / 100;
  return `${Number.isInteger(percentage) ? percentage.toFixed(0) : percentage.toFixed(2).replace(/0+$/u, "").replace(/\.$/u, "")}%`;
}

function formatExpiryDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  })
    .format(date)
    .replaceAll("/", "-");
}

function formatCalendarDate(value: string): string {
  const [year, month, day] = value.split("-");
  return year === undefined || month === undefined || day === undefined
    ? value
    : `${day}-${month}-${year}`;
}

function formatIndianNumber(value: number): string {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(
    value,
  );
}

function trimDecimal(value: string): string {
  return value.replace(/\.0+$/u, "").replace(/(\.\d*?[1-9])0+$/u, "$1");
}

async function loadPurchase(
  token: string,
  signal: AbortSignal,
): Promise<ExtendedWarrantyPurchase> {
  return await getExtendedWarrantyPurchase(token, signal);
}
