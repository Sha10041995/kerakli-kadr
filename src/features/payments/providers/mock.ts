import type { PaymentProvider } from "./types";
import { serverEnv } from "@/lib/env";

/**
 * Development-only provider: shows an internal "pay / cancel" page.
 * Automatically disabled in production (see serverEnv().paymentsMockEnabled).
 */
export const mockProvider: PaymentProvider = {
  id: "mock",
  displayName: "Test toʻlov (faqat development)",
  isEnabled: () => serverEnv().paymentsMockEnabled,
  async createCheckout(req) {
    const url = new URL("/dashboard/billing/mock-checkout", "http://placeholder");
    url.searchParams.set("payment", req.paymentId);
    return { redirectUrl: `${url.pathname}${url.search}`, providerRef: `mock_${req.paymentId}` };
  },
  async parseWebhook() {
    // The mock provider settles payments through a server action, not webhooks.
    return null;
  },
};
