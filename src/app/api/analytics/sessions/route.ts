import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

/**
 * POST /api/analytics/sessions — Insert or update a session (public endpoint, called by embed.js/widget)
 */
export async function POST(request: NextRequest) {
  try {
    // Accept both application/json and text/plain (sendBeacon uses text/plain to avoid CORS preflight)
    let body: any;
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      body = await request.json();
    } else {
      const text = await request.text();
      body = JSON.parse(text);
    }
    const { sessionId, landingPageId, ...sessionData } = body;

    if (!sessionId || !landingPageId) {
      return NextResponse.json(
        { error: "Missing sessionId or landingPageId" },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // Verify landing page exists and has analytics enabled
    const { data: lp } = await supabaseAdmin
      .from("landing_pages")
      .select("id, organization_id, analytics_tracking")
      .eq("id", landingPageId)
      .single();

    if (!lp || !lp.analytics_tracking) {
      return NextResponse.json(
        { error: "Analytics not enabled" },
        { status: 404, headers: CORS_HEADERS }
      );
    }

    // Check if session already exists (update vs insert)
    const { data: existing } = await supabaseAdmin
      .from("analytics_sessions")
      .select("id")
      .eq("session_id", sessionId)
      .single();

    if (existing) {
      // Update existing session with new data
      const { error } = await supabaseAdmin
        .from("analytics_sessions")
        .update({
          ...sessionData,
        })
        .eq("session_id", sessionId);

      if (error) {
        console.error("[Analytics] Update error:", error);
        return NextResponse.json({ error: "Failed to update session" }, { status: 500, headers: CORS_HEADERS });
      }
    } else {
      // Insert new session
      const { error } = await supabaseAdmin
        .from("analytics_sessions")
        .insert({
          session_id: sessionId,
          organization_id: lp.organization_id,
          landing_page_id: landingPageId,
          ...sessionData,
        });

      if (error) {
        console.error("[Analytics] Insert error:", error);
        return NextResponse.json({ error: "Failed to create session" }, { status: 500, headers: CORS_HEADERS });
      }
    }

    return NextResponse.json({ success: true }, { headers: CORS_HEADERS });
  } catch (error) {
    console.error("[Analytics] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: CORS_HEADERS });
  }
}

/**
 * GET /api/analytics/sessions — Read sessions for dashboard (authenticated, superadmin only)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as any)?.activeRole;
    const isSuperadminOrg = (session.user as any)?.isSuperadminOrg;
    if (!(userRole === "owner" && isSuperadminOrg)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const activeOrganizationId = (session.user as any).activeOrganizationId;
    const { searchParams } = new URL(request.url);
    const landingPageId = searchParams.get("landingPageId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");

    let query = supabaseAdmin
      .from("analytics_sessions")
      .select("*", { count: "exact" })
      .eq("organization_id", activeOrganizationId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (landingPageId) query = query.eq("landing_page_id", landingPageId);
    if (startDate) query = query.gte("created_at", startDate);
    if (endDate) query = query.lte("created_at", endDate + "T23:59:59.999Z");

    const { data, error, count } = await query;

    if (error) {
      console.error("[Analytics] Read error:", error);
      return NextResponse.json({ error: "Failed to fetch sessions" }, { status: 500 });
    }

    // Compute summary stats
    const sessions = data || [];
    const totalSessions = count || 0;
    const purchased = sessions.filter(s => s.outcome === "purchased").length;
    const abandoned = sessions.filter(s => s.outcome === "abandoned").length;
    const formStarted = sessions.filter(s => s.form_started).length;
    const avgTimeOnPage = sessions.length > 0
      ? Math.round(sessions.reduce((sum, s) => sum + (s.time_on_page || 0), 0) / sessions.length)
      : 0;
    const avgScrollMax = sessions.length > 0
      ? Math.round(sessions.reduce((sum, s) => sum + (s.scroll_max || 0), 0) / sessions.length)
      : 0;

    // Abandon field breakdown
    const abandonFields: Record<string, number> = {};
    sessions.forEach(s => {
      if (s.field_abandoned_at) {
        abandonFields[s.field_abandoned_at] = (abandonFields[s.field_abandoned_at] || 0) + 1;
      }
    });

    // Offer distribution
    const offerDistribution: Record<string, number> = {};
    sessions.forEach(s => {
      if (s.offer_selected) {
        offerDistribution[s.offer_selected] = (offerDistribution[s.offer_selected] || 0) + 1;
      }
    });

    // Device breakdown
    const deviceBreakdown: Record<string, number> = {};
    sessions.forEach(s => {
      if (s.device) {
        deviceBreakdown[s.device] = (deviceBreakdown[s.device] || 0) + 1;
      }
    });

    return NextResponse.json({
      sessions,
      total: totalSessions,
      summary: {
        totalSessions,
        purchased,
        abandoned,
        formStarted,
        conversionRate: totalSessions > 0 ? ((purchased / totalSessions) * 100).toFixed(1) : "0",
        formStartRate: totalSessions > 0 ? ((formStarted / totalSessions) * 100).toFixed(1) : "0",
        avgTimeOnPage,
        avgScrollMax,
        abandonFields,
        offerDistribution,
        deviceBreakdown,
      },
    });
  } catch (error) {
    console.error("[Analytics] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/analytics/sessions — Delete all sessions for a landing page (superadmin only)
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as any)?.activeRole;
    const isSuperadminOrg = (session.user as any)?.isSuperadminOrg;
    if (!(userRole === "owner" && isSuperadminOrg)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const activeOrganizationId = (session.user as any).activeOrganizationId;
    const landingPageId = request.nextUrl.searchParams.get("landingPageId");

    if (!landingPageId) {
      return NextResponse.json({ error: "landingPageId is required" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("analytics_sessions")
      .delete()
      .eq("organization_id", activeOrganizationId)
      .eq("landing_page_id", landingPageId);

    if (error) {
      console.error("[Analytics] Delete error:", error);
      return NextResponse.json({ error: "Failed to delete sessions" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Analytics] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
