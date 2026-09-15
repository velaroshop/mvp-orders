import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

const PAGE_SIZE = 50;

/**
 * GET /api/superadmin/widget-events
 * Query params: eventType, organizationId, landingKey, startDate, endDate, page
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as any).activeRole;
    const isSuperadminOrg = (session.user as any).isSuperadminOrg;

    if (userRole !== "owner" || !isSuperadminOrg) {
      return NextResponse.json(
        { error: "Access denied. Superadmin privileges required." },
        { status: 403 }
      );
    }

    const { searchParams } = request.nextUrl;
    const eventType = searchParams.get("eventType");
    const organizationId = searchParams.get("organizationId");
    const landingKey = searchParams.get("landingKey");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const page = parseInt(searchParams.get("page") || "0", 10);

    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabaseAdmin
      .from("widget_events")
      .select(
        `id, created_at, session_id, event_type, landing_key, order_id,
         error_message, error_code, field_errors, metadata,
         organizations(name)`,
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(from, to);

    if (eventType && eventType !== "all") {
      query = query.eq("event_type", eventType);
    }
    if (organizationId && organizationId !== "all") {
      query = query.eq("organization_id", organizationId);
    }
    if (landingKey) {
      query = query.ilike("landing_key", `%${landingKey}%`);
    }
    if (startDate) {
      query = query.gte("created_at", new Date(`${startDate}T00:00:00.000+03:00`).toISOString());
    }
    if (endDate) {
      query = query.lte("created_at", new Date(`${endDate}T23:59:59.999+03:00`).toISOString());
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("[Widget Events] Error fetching:", error);
      return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
    }

    // Fetch all organizations for filter dropdown
    const { data: orgs } = await supabaseAdmin
      .from("organizations")
      .select("id, name")
      .order("name");

    return NextResponse.json({
      events: data || [],
      total: count || 0,
      page,
      pageSize: PAGE_SIZE,
      organizations: orgs || [],
    });
  } catch (error) {
    console.error("[Widget Events] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
