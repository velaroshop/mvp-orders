import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { verifyOrderOwnership } from "@/lib/auth-helpers";

/**
 * POST /api/orders/[id]/note - Update order note
 * Note has max 2 lines, 20 characters per line
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // PARALLELIZED: Run session, params, and body parsing concurrently
    const [session, { id: orderId }, body] = await Promise.all([
      getServerSession(authOptions),
      params,
      request.json(),
    ]);

    const { note } = body;

    // Verify authentication
    if (!session?.user?.activeOrganizationId) {
      return NextResponse.json(
        { error: "Unauthorized: Please log in" },
        { status: 401 },
      );
    }

    // Verify order belongs to user's organization
    const ownership = await verifyOrderOwnership(orderId, session.user.activeOrganizationId);
    if (!ownership.valid) {
      return NextResponse.json(
        { error: ownership.error || "Access denied" },
        { status: 403 },
      );
    }

    // Validate note format (max 2 lines, 20 chars each)
    if (note) {
      const lines = note.split("\n");
      if (lines.length > 2) {
        return NextResponse.json(
          { error: "Note can have maximum 2 lines" },
          { status: 400 },
        );
      }
      for (const line of lines) {
        if (line.length > 20) {
          return NextResponse.json(
            { error: "Each line can have maximum 20 characters" },
            { status: 400 },
          );
        }
      }
    }

    // Update order note
    const { error: updateError } = await supabaseAdmin
      .from("orders")
      .update({
        order_note: note?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    if (updateError) {
      console.error("Failed to update order note:", updateError);
      return NextResponse.json(
        { error: "Failed to update order note" },
        { status: 500 },
      );
    }

    console.log(`[Note] Order ${orderId} note updated: ${note || "(cleared)"}`);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error updating order note:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
