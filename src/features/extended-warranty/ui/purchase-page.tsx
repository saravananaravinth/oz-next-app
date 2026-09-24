// oz-next-app/src/features/extended-warranty/ui/purchase-page.tsx
"use client";

import * as React from "react";
import {
  CheckCircle2,
  Clock3,
  CreditCard,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

import {
  ContentFormActions,
  ContentRoot,
  ContentSection,
  ContentStatus,
} from "@/components/common/content-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
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
  | "unavailable"
  | "error";
type PaymentConfirmationResult = "paid" | "terminal" | "pending";

export function ExtendedWarrantyPurchasePage({
  token,
}: ExtendedWarrantyPurchasePageProps): React.ReactElement {
  const [purchase, setPurchase] =
    React.useState<ExtendedWarrantyPurchase | null>(null);
  const [selectedOptionId, setSelectedOptionId] = React.useState<string>("");
  const [state, setState] = React.useState<ViewState>("loading");
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const lifecycleControllerRef = React.useRef<AbortController | null>(null);

  React.useEffect(() => {
    const controller = new AbortController();
    lifecycleControllerRef.current = controller;

    void loadPurchase(token, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) {
          return;
        }

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
        if (controller.signal.aborted) {
          return;
        }

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

  const handleCheckout = React.useCallback(async (): Promise<void> => {
    const signal = lifecycleControllerRef.current?.signal;

    if (
      selectedOption === null ||
      state === "checkout" ||
      state === "confirming" ||
      state === "pending" ||
      signal === undefined ||
      isAbortRequested(signal)
    ) {
      return;
    }

    setErrorMessage(null);
    setState("checkout");

    try {
      const checkout = await createExtendedWarrantyCheckout({
        token,
        offerOptionId: selectedOption.offerOptionId,
        idempotencyKey: createIdempotencyKey(),
        signal,
      });

      if (isAbortRequested(signal)) {
        return;
      }

      await openRazorpayCheckout(
        checkout,
        () => {
          if (!isAbortRequested(signal)) {
            void resolvePaymentConfirmation(
              token,
              signal,
              setState,
              setErrorMessage,
            );
          }
        },
        () => {
          if (!isAbortRequested(signal)) {
            setState("ready");
          }
        },
      );
    } catch (error: unknown) {
      if (isAbortRequested(signal)) {
        return;
      }

      setErrorMessage(toSafeMessage(error));
      setState(isTerminalPurchaseError(error) ? "unavailable" : "error");
    }
  }, [selectedOption, state, token]);

  const handlePaymentStatusCheck = React.useCallback((): void => {
    const signal = lifecycleControllerRef.current?.signal;

    if (signal === undefined || isAbortRequested(signal)) {
      return;
    }

    void resolvePaymentConfirmation(token, signal, setState, setErrorMessage);
  }, [token]);

  if (state === "loading")
    return (
      <PageState
        title="Loading secure purchase"
        description="Validating your Extended Warranty offer."
        icon={<LoaderCircle className="animate-spin" aria-hidden="true" />}
      />
    );
  if (state === "unavailable")
    return (
      <PageState
        title="Purchase link unavailable"
        description="This secure Extended Warranty link is invalid, expired, revoked, or no longer available."
        icon={<Clock3 aria-hidden="true" />}
      />
    );
  if (state === "paid")
    return (
      <PageState
        title="Payment confirmed"
        description="Your Extended Warranty payment has been verified by the payment provider. Ozotec ERP has recorded the order as paid."
        icon={<CheckCircle2 aria-hidden="true" />}
      />
    );
  if (purchase === null)
    return (
      <PageState
        title="Unable to load purchase"
        description={
          errorMessage ?? "The purchase information could not be loaded."
        }
        icon={<RefreshCw aria-hidden="true" />}
      />
    );

  return (
    <ContentRoot
      width="default"
      density="comfortable"
      className="py-6 sm:py-10"
    >
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Extended Warranty</Badge>
              <Badge variant="outline">
                <ShieldCheck aria-hidden="true" /> Secure purchase
              </Badge>
            </div>
            <CardTitle className="text-2xl sm:text-3xl">
              Protect {purchase.vehicleLabel}
            </CardTitle>
            <CardDescription>
              Select an eligible Extended Warranty kit. Payment is confirmed
              only after Ozotec ERP verifies the provider transaction.
            </CardDescription>
          </CardHeader>
        </Card>

        {state === "confirming" ? (
          <ContentStatus
            title="Confirming payment"
            description="Your payment window reported completion. We are waiting for the verified Razorpay webhook or API reconciliation before marking the order paid."
            icon={<LoaderCircle className="animate-spin" aria-hidden="true" />}
            announce="polite"
          />
        ) : null}

        {state === "pending" ? (
          <ContentStatus
            title="Payment confirmation pending"
            description="The provider confirmation has not reached Ozotec ERP yet. Do not pay again. You can safely check the verified payment status again."
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

        <ContentSection
          title="Choose your coverage kit"
          description={`Offer valid until ${formatDateTime(purchase.expiresAt)}.`}
        >
          <RadioGroup
            value={selectedOptionId}
            onValueChange={(value) => {
              if (!hasActivePurchase) setSelectedOptionId(value);
            }}
            className="grid gap-3"
          >
            {purchase.options.map((option) => (
              <OptionCard
                key={option.offerOptionId}
                option={option}
                selected={option.offerOptionId === selectedOptionId}
                disabled={
                  hasActivePurchase ||
                  state === "checkout" ||
                  state === "confirming" ||
                  state === "pending"
                }
              />
            ))}
          </RadioGroup>
        </ContentSection>

        <ContentFormActions>
          <div className="mr-auto text-sm text-muted-foreground">
            {selectedOption === null
              ? "Select one kit to continue."
              : `Total payable: ${formatMinor(selectedOption.totalAmountMinor, selectedOption.currency)}`}
          </div>
          <Button
            type="button"
            size="lg"
            disabled={
              selectedOption === null ||
              state === "checkout" ||
              state === "confirming" ||
              state === "pending"
            }
            onClick={() => void handleCheckout()}
          >
            {state === "checkout" ? (
              <LoaderCircle className="animate-spin" aria-hidden="true" />
            ) : (
              <CreditCard aria-hidden="true" />
            )}
            {state === "checkout" ? "Preparing checkout" : "Pay securely"}
          </Button>
        </ContentFormActions>
      </div>
    </ContentRoot>
  );
}

function OptionCard({
  option,
  selected,
  disabled,
}: Readonly<{
  option: ExtendedWarrantyPurchaseOption;
  selected: boolean;
  disabled: boolean;
}>): React.ReactElement {
  const inputId = `extended-warranty-option-${option.offerOptionId}`;
  return (
    <Label
      htmlFor={inputId}
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors",
        selected && "border-primary bg-primary/5",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      <RadioGroupItem
        id={inputId}
        value={option.offerOptionId}
        disabled={disabled}
        className="mt-1"
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="font-medium text-foreground">{option.name}</span>
          <span className="font-semibold text-foreground">
            {formatMinor(option.totalAmountMinor, option.currency)}
          </span>
        </div>
        {option.description === null ? null : (
          <p className="mt-1 text-sm text-muted-foreground">
            {option.description}
          </p>
        )}
        {option.coverageSummary === null ? null : (
          <p className="mt-2 text-sm text-foreground/80">
            <span className="font-medium text-foreground">Coverage: </span>
            {option.coverageSummary}
          </p>
        )}
        <div className="mt-2 flex gap-3 text-xs text-muted-foreground">
          <span>
            Base {formatMinor(option.unitAmountMinor, option.currency)}
          </span>
          <span>Tax {formatMinor(option.taxAmountMinor, option.currency)}</span>
        </div>
      </div>
    </Label>
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
    <ContentRoot width="narrow" className="py-12">
      <ContentStatus
        title={title}
        description={description}
        icon={icon}
        announce="polite"
      />
    </ContentRoot>
  );
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

async function resolvePaymentConfirmation(
  token: string,
  signal: AbortSignal,
  setState: React.Dispatch<React.SetStateAction<ViewState>>,
  setErrorMessage: React.Dispatch<React.SetStateAction<string | null>>,
): Promise<void> {
  if (isAbortRequested(signal)) {
    return;
  }

  setState("confirming");

  try {
    const result = await confirmPayment(token, signal);

    if (isAbortRequested(signal)) {
      return;
    }

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
    if (!isAbortRequested(signal)) {
      setState("pending");
    }
  }
}

async function confirmPayment(
  token: string,
  signal: AbortSignal,
): Promise<PaymentConfirmationResult> {
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
    if (isAbortRequested(signal)) {
      return "pending";
    }

    const status = await getExtendedWarrantyPaymentStatus(token, signal);

    if (isPaymentConfirmedOrderStatus(status.order?.status)) {
      return "paid";
    }

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
  if (isAbortRequested(signal)) {
    return Promise.reject(new DOMException("Operation aborted.", "AbortError"));
  }

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

    if (isAbortRequested(signal)) {
      handleAbort();
    }
  });
}

function isAbortRequested(signal: AbortSignal): boolean {
  return signal.aborted;
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
      return "The payment service is temporarily unavailable. Your payment status remains protected; please try again.";
  }
  return "The secure purchase could not be completed. Please try again.";
}

function formatMinor(value: string, currency: string): string {
  const minor = BigInt(value);
  const whole = minor / 100n;
  const fraction = (minor % 100n).toString().padStart(2, "0");
  const grouped = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/gu, ",");
  const symbol = currency === "INR" ? "₹" : `${currency} `;
  return `${symbol}${grouped}.${fraction}`;
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "the stated expiry"
    : new Intl.DateTimeFormat("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
}

async function loadPurchase(
  token: string,
  signal: AbortSignal,
): Promise<ExtendedWarrantyPurchase> {
  return await getExtendedWarrantyPurchase(token, signal);
}
