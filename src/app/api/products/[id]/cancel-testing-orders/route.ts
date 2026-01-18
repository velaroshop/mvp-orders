import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * POST /api/products/[id]/cancel-testing-orders
 * Bulk cancel all testing orders for a product
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await params;

    console.log("[Bulk Cancel] Cancelling all testing orders for product:", productId);

    // Get all landing pages for this product
    const { data: landingPages, error: lpError } = await supabaseAdmin
      .from("landing_pages")
      .select("id")
      .eq("product_id", productId);

    if (lpError) {
      console.error("[Bulk Cancel] Error fetching landing pages:", lpError);
      return NextResponse.json(
        { error: "Failed to fetch landing pages" },
        { status: 500 }
      );
    }

    if (!landingPages || landingPages.length === 0) {
      return NextResponse.json({
        success: true,
        count: 0,
        message: "No landing pages found for this product",
      });
    }

    const landingPageIds = landingPages.map((lp) => lp.id);

    // Get all testing orders for these landing pages
    const { data: testingOrders, error: ordersError } = await supabaseAdmin
      .from("orders")
      .select("id")
      .eq("status", "testing")
      .in("landing_page_id", landingPageIds);

    if (ordersError) {
      console.error("[Bulk Cancel] Error fetching testing orders:", ordersError);
      return NextResponse.json(
        { error: "Failed to fetch testing orders" },
        { status: 500 }
      );
    }

    if (!testingOrders || testingOrders.length === 0) {
      return NextResponse.json({
        success: true,
        count: 0,
        message: "No testing orders found for this product",
      });
    }

    console.log(`[Bulk Cancel] Found ${testingOrders.length} testing orders to cancel`);

    // Update all testing orders to cancelled status
    const { error: updateError } = await supabaseAdmin
      .from("orders")
      .update({
        status: "cancelled",
        updated_at: new Date().toISOString(),
      })
      .in("id", testingOrders.map((o) => o.id));

    if (updateError) {
      console.error("[Bulk Cancel] Failed to cancel orders:", updateError);
      return NextResponse.json(
        { error: "Failed to cancel orders" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      count: testingOrders.length,
      message: `Successfully cancelled ${testingOrders.length} testing orders`,
    });
  } catch (error) {
    console.error("[Bulk Cancel] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
