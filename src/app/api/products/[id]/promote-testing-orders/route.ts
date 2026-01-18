import { NextRequest, NextResponse } from "next/server";
import { syncOrderToHelpship } from "@/lib/helpship-sync";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * POST /api/products/[id]/promote-testing-orders
 * Bulk promote all testing orders for a product to real orders
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await params;

    console.log("[Bulk Promote] Promoting all testing orders for product:", productId);

    // Get all landing page slugs for this product
    const { data: landingPages, error: lpError } = await supabaseAdmin
      .from("landing_pages")
      .select("slug")
      .eq("product_id", productId);

    if (lpError) {
      console.error("[Bulk Promote] Error fetching landing pages:", lpError);
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

    const landingSlugs = landingPages.map((lp) => lp.slug);

    // Get all testing orders for these landing pages (using landing_key)
    const { data: testingOrders, error: ordersError } = await supabaseAdmin
      .from("orders")
      .select("id")
      .eq("status", "testing")
      .in("landing_key", landingSlugs);

    if (ordersError) {
      console.error("[Bulk Promote] Error fetching testing orders:", ordersError);
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

    console.log(`[Bulk Promote] Found ${testingOrders.length} testing orders to promote`);

    // Update all testing orders to mark as promoted from testing
    const { error: updateError } = await supabaseAdmin
      .from("orders")
      .update({
        promoted_from_testing: true,
        notes: `🧪 Promoted from testing mode on ${new Date().toLocaleDateString("ro-RO")}`,
        updated_at: new Date().toISOString(),
      })
      .in("id", testingOrders.map((o) => o.id));

    if (updateError) {
      console.error("[Bulk Promote] Failed to update orders:", updateError);
      return NextResponse.json(
        { error: "Failed to update orders" },
        { status: 500 }
      );
    }

    // Sync all orders to Helpship (which will update status to 'pending')
    const syncPromises = testingOrders.map((order) =>
      syncOrderToHelpship(order.id)
    );

    const syncResults = await Promise.allSettled(syncPromises);

    // Count successful syncs
    const successCount = syncResults.filter(
      (result) => result.status === "fulfilled" && result.value.success
    ).length;

    const failedCount = testingOrders.length - successCount;

    if (failedCount > 0) {
      console.warn(`[Bulk Promote] ${failedCount} orders failed to sync`);
    }

    return NextResponse.json({
      success: true,
      count: successCount,
      failed: failedCount,
      message: `Successfully promoted ${successCount} testing orders to real orders`,
    });
  } catch (error) {
    console.error("[Bulk Promote] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
