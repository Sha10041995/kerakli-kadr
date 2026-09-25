import { describe, expect, it } from "vitest";
import { canTransition, candidateCanWithdraw, nextStatuses } from "@/features/applications/status";
import { canTransitionPayment, isFinalPayment } from "@/features/payments/state";
import { verificationBadges, verificationLevel } from "@/features/verification/levels";

describe("application status transitions (mirror of SQL)", () => {
  it("follows the pipeline", () => {
    expect(canTransition("applied", "viewed")).toBe(true);
    expect(canTransition("viewed", "shortlisted")).toBe(true);
    expect(canTransition("interview", "hired")).toBe(true);
    expect(canTransition("offered", "hired")).toBe(true);
  });
  it("forbids skipping to hired and leaving final states", () => {
    expect(canTransition("applied", "hired")).toBe(false);
    expect(canTransition("hired", "rejected")).toBe(false);
    expect(canTransition("rejected", "viewed")).toBe(false);
    expect(canTransition("withdrawn", "applied")).toBe(false);
  });
  it("employers cannot withdraw on behalf of candidates", () => {
    expect(canTransition("applied", "withdrawn")).toBe(false);
  });
  it("lists next statuses", () => {
    expect(nextStatuses("shortlisted")).toEqual(["interview", "offered", "rejected"]);
    expect(nextStatuses("hired")).toEqual([]);
  });
  it("candidate can withdraw only open applications", () => {
    expect(candidateCanWithdraw("interview")).toBe(true);
    expect(candidateCanWithdraw("hired")).toBe(false);
  });
});

describe("payment state machine", () => {
  it("allows provider outcomes from pending", () => {
    expect(canTransitionPayment("pending", "paid")).toBe(true);
    expect(canTransitionPayment("pending", "failed")).toBe(true);
    expect(canTransitionPayment("paid", "refunded")).toBe(true);
  });
  it("forbids reverting settled payments", () => {
    expect(canTransitionPayment("paid", "pending")).toBe(false);
    expect(canTransitionPayment("refunded", "paid")).toBe(false);
    expect(canTransitionPayment("cancelled", "paid")).toBe(false);
    expect(isFinalPayment("refunded")).toBe(true);
    expect(isFinalPayment("pending")).toBe(false);
  });
});

describe("verification levels", () => {
  it("computes the highest level", () => {
    expect(verificationLevel({})).toBe(0);
    expect(verificationLevel({ phoneVerified: true })).toBe(1);
    expect(verificationLevel({ phoneVerified: true, identityVerified: true })).toBe(2);
    expect(verificationLevel({ certificateVerified: true })).toBe(3);
    expect(verificationLevel({ companyVerified: true })).toBe(4);
  });
  it("lists badges", () => {
    expect(verificationBadges({ phoneVerified: true, identityVerified: true })).toEqual([
      "Telefon tasdiqlangan",
      "Shaxs tasdiqlangan",
    ]);
  });
});
