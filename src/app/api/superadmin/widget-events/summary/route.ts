import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

const EVENT_TYPES = [
  "form_loaded",
  "submit_attempt",
  "submit_blocked_validation",
  "submit_sent",
  "submit_success",
  "submit_error",
  "redirect_sent",
] as const;

/**
 * GET /api/superadmin/widget-events/summary
 * Returns event counts, error breakdown, and validation breakdown.
 * Accepts: organizationId, startDate, endDate
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
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }

    const { searchParams } = request.nextUrl;
    const organizationId = searchParams.get("organizationId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const startDateTime = startDate
      ? new Date(`${startDate}T00:00:00.000+03:00`).toISOString()
      : null;
    const endDateTime = endDate
      ? new Date(`${endDate}T23:59:59.999+03:00`).toISOString()
      : null;

    function buildBase() {
      let q = supabaseAdmin.from("widget_events").select("*", { count: "exact", head: true });
      if (organizationId && organizationId !== "all") q = q.eq("organization_id", organizationId);
      if (startDateTime) q = q.gte("created_at", startDateTime);
      if (endDateTime) q = q.lte("created_at", endDateTime);
      return q;
    }

    // 1. Parallel count queries per event type
    const countResults = await Promise.all(
      EVENT_TYPES.map(type => buildBase().eq("event_type", type))
    );

    const counts: Record<string, number> = {};
    EVENT_TYPES.forEach((type, i) => {
      counts[type] = countResults[i].count || 0;
    });

    // 2. Error breakdown — fetch all submit_error events and group by message+code
    let errorQuery = supabaseAdmin
      .from("widget_events")
      .select("error_message, error_code")
      .eq("event_type", "submit_error")
      .limit(500);
    if (organizationId && organizationId !== "all") errorQuery = errorQuery.eq("organization_id", organizationId);
    if (startDateTime) errorQuery = errorQuery.gte("created_at", startDateTime);
    if (endDateTime) errorQuery = errorQuery.lte("created_at", endDateTime);

    const { data: errorEvents } = await errorQuery;

    const errorMap: Record<string, { message: string; code: number | null; count: number }> = {};
    (errorEvents || []).forEach((ev: any) => {
      const key = `${ev.error_code ?? "?"}-${ev.error_message ?? "unknown"}`;
      if (!errorMap[key]) {
        errorMap[key] = { message: ev.error_message || "Eroare necunoscută", code: ev.error_code || null, count: 0 };
      }
      errorMap[key].count++;
    });

    const errorBreakdown = Object.values(errorMap).sort((a, b) => b.count - a.count);

    // 3. Validation breakdown — aggregate field_errors from submit_blocked_validation
    let validationQuery = supabaseAdmin
      .from("widget_events")
      .select("field_errors")
      .eq("event_type", "submit_blocked_validation")
      .not("field_errors", "is", null)
      .limit(500);
    if (organizationId && organizationId !== "all") validationQuery = validationQuery.eq("organization_id", organizationId);
    if (startDateTime) validationQuery = validationQuery.gte("created_at", startDateTime);
    if (endDateTime) validationQuery = validationQuery.lte("created_at", endDateTime);

    const { data: validationEvents } = await validationQuery;

    const validationMap: Record<string, number> = {};
    (validationEvents || []).forEach((ev: any) => {
      if (ev.field_errors && typeof ev.field_errors === "object") {
        Object.keys(ev.field_errors).forEach(field => {
          validationMap[field] = (validationMap[field] || 0) + 1;
        });
      }
    });

    const validationBreakdown = Object.entries(validationMap)
      .map(([field, count]) => ({ field, count }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({ counts, errorBreakdown, validationBreakdown });
  } catch (error) {
    console.error("[Widget Events Summary] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
