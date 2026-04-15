import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const activeOrganizationId = (session.user as any).activeOrganizationId;
    const activeRole = (session.user as any).activeRole;

    if (!activeOrganizationId) {
      return NextResponse.json({ error: "No active organization" }, { status: 400 });
    }

    // Only owner and admin can view activity logs
    if (!["owner", "admin"].includes(activeRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get("entity_type");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from("audit_log")
      .select("*", { count: "exact" })
      .eq("organization_id", activeOrganizationId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (entityType) {
      query = query.eq("entity_type", entityType);
    }

    if (startDate) {
      query = query.gte("created_at", `${startDate}T00:00:00.000+03:00`);
    }

    if (endDate) {
      query = query.lte("created_at", `${endDate}T23:59:59.999+03:00`);
    }

    const { data: logs, error, count } = await query;

    if (error) {
      console.error("[ActivityLogs] Error fetching:", error);
      return NextResponse.json({ error: "Failed to fetch activity logs" }, { status: 500 });
    }

    return NextResponse.json({
      logs: logs || [],
      total: count || 0,
      page,
      limit,
    });
  } catch (error) {
    console.error("[ActivityLogs] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
