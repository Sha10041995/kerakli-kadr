// Provider-independent payment abstraction. Local providers (Click, Payme,
// Uzum, …) implement this interface; the rest of the app never talks to a
// provider directly. Card data never touches our servers or database.

export type CheckoutRequest = {
  paymentId: string;
  amountUzs: number;
  description: string;
  returnUrl: string;
};

export type CheckoutResponse = {
  /** Where to send the user to complete payment (provider-hosted page). */
  redirectUrl: string;
  /** Provider-side reference if known at creation time. */
  providerRef?: string;
};

export type PaymentWebhookEvent = {
  paymentId: string;
  providerRef: string;
  status: "paid" | "failed" | "cancelled" | "refunded";
};

export interface PaymentProvider {
  readonly id: string;
  readonly displayName: string;
  isEnabled(): boolean;
  createCheckout(req: CheckoutRequest): Promise<CheckoutResponse>;
  /** Verifies signature/authenticity and parses a provider callback. Returns null when invalid. */
  parseWebhook(request: Request, rawBody: string): Promise<PaymentWebhookEvent | null>;
}
