// oz-next-app/src/types/razorpay.d.ts
type RazorpayCheckoutOptions = Readonly<{
  key: string;
  order_id: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  handler: () => void;
  modal: Readonly<{
    ondismiss: () => void;
  }>;
}>;

type RazorpayInstance = Readonly<{
  open: () => void;
  on: (eventName: "payment.failed", handler: () => void) => void;
}>;

type RazorpayConstructor = new (
  options: RazorpayCheckoutOptions,
) => RazorpayInstance;

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
  }
}

export {};
