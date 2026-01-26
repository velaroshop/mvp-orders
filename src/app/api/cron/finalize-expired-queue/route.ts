import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { syncOrderToHelpship } from "@/lib/helpship-sync";
import { sendMetaPurchaseEvent } from "@/lib/meta-tracking";

/**
 * Cron job pentru finalizarea comenzilor expirate din queue
 * Se rulează la fiecare 5 minute
 * Procesează comenzile cu status="queue" și queue_expires_at <= NOW()
 */
export async function GET(request: NextRequest) {
  try {
    // Verificare autorizare cron job (Vercel trimite header Authorization: Bearer <CRON_SECRET>)
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[Cron] Starting expired queue orders finalization");

    // Găsește toate comenzile din queue care au expirat
    const { data: expiredOrders, error: fetchError } = await supabaseAdmin
      .from("orders")
      .select("id, landing_key, event_source_url")
      .eq("status", "queue")
      .lt("queue_expires_at", new Date().toISOString());

    if (fetchError) {
      console.error("[Cron] Error fetching expired queue orders:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch expired queue orders" },
        { status: 500 }
      );
    }

    if (!expiredOrders || expiredOrders.length === 0) {
      console.log("[Cron] No expired queue orders to process");
      return NextResponse.json({
        success: true,
        message: "No expired queue orders to process",
        processed: 0,
      });
    }

    console.log(`[Cron] Found ${expiredOrders.length} expired queue orders to finalize`);

    const results = {
      total: expiredOrders.length,
      success: 0,
      failed: 0,
      errors: [] as Array<{ orderId: string; error: string }>,
    };

    // Procesează fiecare comandă
    for (const order of expiredOrders) {
      try {
        console.log(`[Cron] Finalizing expired order ${order.id}`);

        // Sync to Helpship (will update status to 'pending' on success)
        const syncResult = await syncOrderToHelpship(order.id);

        if (!syncResult.success) {
          throw new Error(syncResult.error || "Failed to sync to Helpship");
        }

        // Send Meta CAPI Purchase event (if landing page has Meta tracking configured)
        try {
          if (order.landing_key) {
            const { data: landingPage } = await supabaseAdmin
              .from("landing_pages")
              .select("fb_pixel_id, fb_conversion_token, organization_id")
              .eq("slug", order.landing_key)
              .single();

            // Only send if landing page has Meta tracking configured
            if (landingPage?.fb_pixel_id && landingPage?.fb_conversion_token) {
              // Get test mode settings from organization settings
              const { data: settings } = await supabaseAdmin
                .from("settings")
                .select("meta_test_mode, meta_test_event_code")
                .eq("organization_id", landingPage.organization_id)
                .single();

              console.log("[Cron] Sending Meta Purchase event for order:", order.id);

              await sendMetaPurchaseEvent({
                orderId: order.id,
                pixelId: landingPage.fb_pixel_id,
                accessToken: landingPage.fb_conversion_token,
                eventSourceUrl: order.event_source_url || "https://mvp-orders.vercel.app/widget",
                testEventCode: settings?.meta_test_mode ? settings.meta_test_event_code : undefined,
              });
            }
          }
        } catch (metaError) {
          // Don't fail the request if Meta tracking fails
          console.error("[Cron] Meta CAPI error (non-fatal):", metaError);
        }

        console.log(`[Cron] Order ${order.id} finalized successfully`);
        results.success++;
      } catch (error) {
        console.error(`[Cron] Error finalizing order ${order.id}:`, error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        results.failed++;
        results.errors.push({
          orderId: order.id,
          error: errorMessage,
        });
      }
    }

    console.log(
      `[Cron] Finished finalizing expired queue orders. Success: ${results.success}, Failed: ${results.failed}`
    );

    return NextResponse.json({
      success: true,
      message: "Expired queue orders processed",
      results,
    });
  } catch (error) {
    console.error("[Cron] Error in expired queue finalization:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
