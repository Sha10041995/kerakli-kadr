import "server-only";
import { serverEnv } from "@/lib/env";
import { mockProvider } from "./mock";
import type { PaymentProvider } from "./types";

// Register real providers here once integrated (requires credentials + review):
//   import { clickProvider } from "./click";  import { paymeProvider } from "./payme";
const PROVIDERS: Record<string, PaymentProvider> = {
  [mockProvider.id]: mockProvider,
};

export function getPaymentProvider(id: string): PaymentProvider | null {
  const provider = PROVIDERS[id];
  return provider && provider.isEnabled() ? provider : null;
}

export function getDefaultPaymentProvider(): PaymentProvider | null {
  return getPaymentProvider(serverEnv().paymentProvider);
}
