import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

// GET - List refund requests for active organization
export async function GET(request: Request) {
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

    if (!["owner", "admin"].includes(activeRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const countOnly = searchParams.get("count_only");

    // Count-only mode for badge
    if (countOnly === "new") {
      const { count, error } = await supabaseAdmin
        .from("refund_requests")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", activeOrganizationId)
        .eq("status", "new");

      if (error) throw new Error(error.message);

      return NextResponse.json({ count: count || 0 });
    }

    let query = supabaseAdmin
      .from("refund_requests")
      .select("*")
      .eq("organization_id", activeOrganizationId)
      .order("created_at", { ascending: false });

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    if (search) {
      query = query.or(
        `full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%,ticket_number.ilike.%${search}%,order_number.ilike.%${search}%`
      );
    }

    const { data, error } = await query;

    if (error) throw new Error(error.message);

    return NextResponse.json({ refunds: data || [] });
  } catch (error) {
    console.error("Error fetching refunds:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
