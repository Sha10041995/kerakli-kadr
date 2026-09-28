"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { fail, toUserMessage, type ActionResult } from "@/lib/errors";
import { getDefaultPaymentProvider, getPaymentProvider } from "@/features/payments/providers";
import { uuidSchema } from "@/validations/common";

const checkoutSchema = z.object({
  purpose: z.enum(["subscription", "service"]),
  code: z.string().regex(/^[A-Za-z_]{2,40}$/),
  vacancyId: uuidSchema.optional(),
});

export async function checkoutAction(input: unknown): Promise<ActionResult<{ redirectUrl: string }>> {
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) return fail("errors.badRequest");
  const provider = getDefaultPaymentProvider();
  if (!provider) return fail("errors.paymentsUnavailable");

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (!userId) return fail("errors.loginRequired");

  const { data: membership } = await supabase
    .from("company_members")
    .select("company_id")
    .eq("user_id", userId)
    .eq("member_role", "owner")
    .limit(1)
    .maybeSingle();
  const needsCompany = parsed.data.purpose === "subscription" || parsed.data.code === "featured_employer";

  // Amount is computed in the database from admin-managed prices.
  const { data: paymentId, error } = await supabase.rpc("create_payment_intent", {
    p_purpose: parsed.data.purpose,
    p_code: parsed.data.code,
    p_provider: provider.id,
    p_company_id: needsCompany ? (membership?.company_id ?? null) : null,
    p_vacancy_id: parsed.data.vacancyId ?? null,
  });
  if (error || !paymentId) return fail(toUserMessage(error));

  const { data: payment } = await supabase.from("payments").select("amount_uzs").eq("id", paymentId).single();
  const checkout = await provider.createCheckout({
    paymentId,
    amountUzs: payment?.amount_uzs ?? 0,
    description: `KADR TOP UZ: ${parsed.data.code}`,
    returnUrl: `${env.siteUrl}/dashboard/billing?payment=${paymentId}`,
  });
  return { ok: true, data: { redirectUrl: checkout.redirectUrl } };
}

/** Development-only: settle a mock payment. */
export async function completeMockPaymentAction(paymentId: string, outcome: "paid" | "cancelled"): Promise<ActionResult> {
  if (!uuidSchema.safeParse(paymentId).success || !["paid", "cancelled"].includes(outcome)) return fail("errors.badRequest");
  if (!getPaymentProvider("mock")) return fail("errors.mockDisabled");
  const supabase = await createClient();
  const { data: payment } = await supabase.from("payments").select("id, provider, status").eq("id", paymentId).maybeSingle();
  if (!payment || payment.provider !== "mock") return fail("errors.paymentNotFound");
  if (payment.status !== "pending") return fail("errors.paymentFinished");
  const admin = createAdminClient();
  if (!admin) return fail("errors.serviceRoleMissing");
  const { error } =
    outcome === "paid"
      ? await admin.rpc("mark_payment_paid", { p_payment_id: paymentId, p_provider_ref: `mock_${paymentId}` })
      : await admin.rpc("mark_payment_failed", { p_payment_id: paymentId, p_status: "cancelled" });
  if (error) return fail(toUserMessage(error));
  revalidatePath("/dashboard", "layout");
  return { ok: true };
}
