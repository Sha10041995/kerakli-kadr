import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPaymentProvider } from "@/features/payments/providers";

// Provider callbacks. Each provider verifies its own signature in parseWebhook().
export async function POST(request: NextRequest, ctx: RouteContext<"/api/payments/[provider]/webhook">) {
  const { provider: providerId } = await ctx.params;
  const provider = getPaymentProvider(providerId);
  if (!provider) return NextResponse.json({ error: "unknown_provider" }, { status: 404 });

  const raw = await request.text();
  if (raw.length > 64 * 1024) return NextResponse.json({ error: "too_large" }, { status: 413 });
  const event = await provider.parseWebhook(request, raw);
  if (!event) return NextResponse.json({ error: "invalid_signature" }, { status: 401 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const { error } =
    event.status === "paid"
      ? await admin.rpc("mark_payment_paid", { p_payment_id: event.paymentId, p_provider_ref: event.providerRef })
      : await admin.rpc("mark_payment_failed", { p_payment_id: event.paymentId, p_status: event.status });
  if (error) return NextResponse.json({ error: "processing_failed" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
