import { NextResponse, type NextRequest } from "next/server";
import { getDistricts, getMahallas, getSettlements } from "@/features/locations/queries";
import { checkRateLimit } from "@/lib/request";
import { RATE_LIMITS } from "@/lib/rate-limit";
import { toPositiveInt } from "@/lib/utils";

// Children of a location level for the cascading location picker.
// GET /api/locations?level=districts&parent=6
export async function GET(request: NextRequest) {
  const limited = await checkRateLimit("locations", RATE_LIMITS.search);
  if (!limited.ok) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } });
  }
  const level = request.nextUrl.searchParams.get("level");
  const parent = toPositiveInt(request.nextUrl.searchParams.get("parent"));
  const settlement = toPositiveInt(request.nextUrl.searchParams.get("settlement"));
  if (!parent || !level) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  let items;
  if (level === "districts") items = await getDistricts(parent);
  else if (level === "settlements") items = await getSettlements(parent);
  else if (level === "mahallas") items = await getMahallas(parent, settlement);
  else return NextResponse.json({ error: "bad_request" }, { status: 400 });

  return NextResponse.json(
    items.map((i) => ({ id: i.id, name: i.name, kind: i.kind ?? null })),
    { headers: { "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400" } },
  );
}
