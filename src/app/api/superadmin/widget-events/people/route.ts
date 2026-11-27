import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { bucharestDayEndIso, bucharestDayStartIso } from "@/lib/romania-time";
import { computePeopleStats } from "@/lib/widget-people";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const CACHE_MS = 60_000;
const cache = new Map<string, { at: number; data: unknown }>();

/**
 * GET /api/superadmin/widget-events/people?organizationId&startDate&endDate&landingKey
 * The widget events counted per person (unique session). Read-only and loaded separately from the summary, so the
 * order flow and the existing screen are not affected. Cached for a minute against repeated reloads.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = session.user as any;
    if (user.activeRole !== "owner" || !user.isSuperadminOrg) return NextResponse.json({ error: "Access denied." }, { status: 403 });

    const { searchParams } = request.nextUrl;
    const organizationId = searchParams.get("organizationId");
    const landingKey = searchParams.get("landingKey");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const cacheKey = [organizationId, landingKey, startDate, endDate].join("|");
    const hit = cache.get(cacheKey);
    if (hit && Date.now() - hit.at < CACHE_MS) return NextResponse.json(hit.data);

    const data = await computePeopleStats({
      organizationId,
      landingKey,
      startIso: startDate ? bucharestDayStartIso(startDate) : null,
      endIso: endDate ? bucharestDayEndIso(endDate) : null,
    });
    cache.set(cacheKey, { at: Date.now(), data });
    return NextResponse.json(data);
  } catch (error) {
    console.error("[Widget Events People] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
