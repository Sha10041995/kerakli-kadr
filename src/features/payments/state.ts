// Payment state machine (mirrors public.payment_transition_allowed in SQL).
import type { Enums } from "@/types/database";

export type PaymentStatus = Enums<"payment_status">;

const TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  pending: ["paid", "failed", "cancelled"],
  paid: ["refunded"],
  failed: ["pending"],
  refunded: [],
  cancelled: [],
};

export function canTransitionPayment(from: PaymentStatus, to: PaymentStatus): boolean {
  return from === to || TRANSITIONS[from].includes(to);
}

export function isFinalPayment(status: PaymentStatus): boolean {
  return TRANSITIONS[status].length === 0;
}
