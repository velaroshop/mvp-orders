import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import type { PartialOrderStatus } from "@/lib/types";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const activeOrganizationId = (session.user as any).activeOrganizationId;

    if (!activeOrganizationId) {
      return NextResponse.json(
        { error: "No active organization" },
        { status: 400 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json({ error: "Status is required" }, { status: 400 });
    }

    // Validate status
    const validStatuses: PartialOrderStatus[] = [
      "pending",
      "accepted",
      "refused",
      "unanswered",
      "call_later",
      "duplicate",
    ];

    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    // Update the partial order status
    const { data, error } = await supabaseAdmin
      .from("partial_orders")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("organization_id", activeOrganizationId)
      .select()
      .single();

    if (error) {
      console.error("Error updating partial order status:", error);
      return NextResponse.json(
        { error: "Failed to update partial order status" },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Partial order not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ partialOrder: data });
  } catch (error) {
    console.error("Error in PATCH /api/partial-orders/[id]/status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
