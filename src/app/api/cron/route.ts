import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { safeEqual } from "@/lib/security/secrets";
import { CHANNELS } from "@/features/notifications/channels";
import { dispatchPending } from "@/features/notifications/dispatch";

export const dynamic = "force-dynamic";

// Hourly maintenance: expiry reminders, expirations, paid placement cleanup and
// external notification delivery. Protected by CRON_SECRET
// (Vercel Cron sends "Authorization: Bearer <CRON_SECRET>").
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!secret || !safeEqual(token, secret)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const { data: jobs, error } = await admin.rpc("run_scheduled_jobs");
  if (error) return NextResponse.json({ error: "jobs_failed" }, { status: 500 });
  const delivery = await dispatchPending(admin, CHANNELS);
  return NextResponse.json({ ok: true, jobs, delivery });
}
