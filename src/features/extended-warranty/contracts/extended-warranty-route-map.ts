// oz-next-app/src/features/extended-warranty/contracts/extended-warranty-route-map.ts
export const EXTENDED_WARRANTY_API_NAMESPACES = {
  payments: "/erp/payments",
  protected: "/erp/extended-warranty",
  public: "/erp/extended-warranty/public",
  paymentWebhookTemplate: "/erp/webhooks/payments/:provider/:endpointKey",
} as const;

export const EXTENDED_WARRANTY_ROUTE_TEMPLATES = {
  home: "/extended-warranty",
  orders: "/extended-warranty/orders",
  orderDetail: "/extended-warranty/orders/[orderId]",
  reviews: "/extended-warranty/reviews",
  payments: "/extended-warranty/payments",
  reconciliation: "/extended-warranty/reconciliation",
  purchase: "/extended-warranty/purchase/[token]",
  orderStatus: "/extended-warranty/order/[token]",
} as const;

function routeSegment(value: string): string {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new Error("Extended Warranty route segment must not be empty.");
  }
  return encodeURIComponent(normalized);
}

export const EXTENDED_WARRANTY_ROUTES = {
  home: EXTENDED_WARRANTY_ROUTE_TEMPLATES.home,
  orders: EXTENDED_WARRANTY_ROUTE_TEMPLATES.orders,
  reviews: EXTENDED_WARRANTY_ROUTE_TEMPLATES.reviews,
  payments: EXTENDED_WARRANTY_ROUTE_TEMPLATES.payments,
  reconciliation: EXTENDED_WARRANTY_ROUTE_TEMPLATES.reconciliation,
  orderDetail: (orderId: string): string =>
    `/extended-warranty/orders/${routeSegment(orderId)}`,
  purchase: (token: string): string =>
    `/extended-warranty/purchase/${routeSegment(token)}`,
  orderStatus: (token: string): string =>
    `/extended-warranty/order/${routeSegment(token)}`,
} as const;
