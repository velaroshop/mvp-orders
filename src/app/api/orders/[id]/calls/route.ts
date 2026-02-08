import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * Fetch phone call history for an order.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const [session, { id: orderId }] = await Promise.all([
      getServerSession(authOptions),
      params,
    ]);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const activeOrganizationId = (session.user as any).activeOrganizationId;

    if (!activeOrganizationId) {
      return NextResponse.json(
        { error: "No active organization" },
        { status: 400 },
      );
    }

    // Verify the order belongs to this organization
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("id")
      .eq("id", orderId)
      .eq("organization_id", activeOrganizationId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Fetch all phone calls for this order
    const { data: calls, error: callsError } = await supabaseAdmin
      .from("phone_calls")
      .select(
        "id, vapi_call_id, attempt_number, status, result, duration_seconds, transcript, summary, structured_data, recording_url, cost, created_at, ended_at",
      )
      .eq("order_id", orderId)
      .eq("organization_id", activeOrganizationId)
      .order("created_at", { ascending: false });

    if (callsError) {
      console.error("[Calls API] Error fetching calls:", callsError);
      return NextResponse.json(
        { error: "Failed to fetch calls" },
        { status: 500 },
      );
    }

    return NextResponse.json({ calls: calls || [] });
  } catch (error) {
    console.error("[Calls API] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
