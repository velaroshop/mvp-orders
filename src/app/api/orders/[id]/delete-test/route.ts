import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * DELETE /api/orders/[id]/delete-test
 * Permanently deletes a test order from the database.
 * Only works on orders with status "testing".
 * SUPERADMIN ONLY.
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as any).activeRole;
    const isSuperadminOrg = (session.user as any).isSuperadminOrg;
    if (userRole !== "owner" || !isSuperadminOrg) {
      return NextResponse.json({ error: "Superadmin access required" }, { status: 403 });
    }

    const orderId = params.id;

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("id, status")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.status !== "testing") {
      return NextResponse.json(
        { error: "Only test orders can be deleted. Mark as test first." },
        { status: 400 }
      );
    }

    const { error: deleteError } = await supabaseAdmin
      .from("orders")
      .delete()
      .eq("id", orderId);

    if (deleteError) {
      console.error("[DeleteTest] Failed to delete order:", deleteError);
      return NextResponse.json({ error: "Failed to delete order" }, { status: 500 });
    }

    console.log(`[DeleteTest] Order ${orderId} permanently deleted`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DeleteTest] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
