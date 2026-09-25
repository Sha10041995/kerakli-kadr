import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ status: "ok", database: isSupabaseConfigured() ? "configured" : "not_configured", time: new Date().toISOString() });
}
