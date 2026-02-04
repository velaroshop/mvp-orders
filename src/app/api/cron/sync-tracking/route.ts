import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getHelpshipCredentials } from "@/lib/helpship-credentials";
import { HelpshipClient } from "@/lib/helpship";

/**
 * Cron job pentru sincronizarea tracking status din Helpship
 * Se rulează la fiecare oră
 * Procesează comenzile confirmate din ultimele 14 zile care au helpship_order_id
 */
export async function GET(request: NextRequest) {
  try {
    // Verificare autorizare cron job (Vercel trimite header Authorization: Bearer <CRON_SECRET>)
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Calculăm data de acum 14 zile
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    const cutoffDate = fourteenDaysAgo.toISOString();

    console.log(`[Cron Tracking] Starting tracking sync for orders since ${cutoffDate}`);

    // Găsește toate comenzile confirmate cu helpship_order_id din ultimele 14 zile
    // Excludem comenzile care au deja tracking_status "Delivered" sau "Returned" (statusuri finale)
    // Note: We filter out final statuses in code since Supabase .not("in") excludes NULLs
    const { data: allOrders, error: fetchError } = await supabaseAdmin
      .from("orders")
      .select("id, helpship_order_id, organization_id, tracking_status")
      .eq("status", "confirmed")
      .not("helpship_order_id", "is", null)
      .gte("created_at", cutoffDate)
      .order("created_at", { ascending: false });

    // Filter out final statuses in code (Delivered, Returned) to properly handle NULLs
    const orders = (allOrders || []).filter(
      (o) => o.tracking_status !== "Delivered" && o.tracking_status !== "Returned"
    );

    if (fetchError) {
      console.error("[Cron Tracking] Error fetching orders:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch orders" },
        { status: 500 },
      );
    }

    if (!orders || orders.length === 0) {
      console.log("[Cron Tracking] No orders to sync");
      return NextResponse.json({
        success: true,
        message: "No orders to sync",
        processed: 0,
      });
    }

    console.log(`[Cron Tracking] Found ${orders.length} orders to sync`);

    const results = {
      total: orders.length,
      updated: 0,
      unchanged: 0,
      failed: 0,
      errors: [] as Array<{ orderId: string; error: string }>,
    };

    // Grupăm comenzile după organization_id pentru a folosi credențiale corecte
    const ordersByOrg = new Map<string, typeof orders>();
    for (const order of orders) {
      const orgId = order.organization_id;
      if (!ordersByOrg.has(orgId)) {
        ordersByOrg.set(orgId, []);
      }
      ordersByOrg.get(orgId)!.push(order);
    }

    // Procesăm fiecare organizație
    for (const [orgId, orgOrders] of ordersByOrg) {
      try {
        // Obține credențialele Helpship pentru organizație
        const credentials = await getHelpshipCredentials(orgId);
        const helpshipClient = new HelpshipClient(credentials);

        // Obținem tracking status pentru toate comenzile din această organizație
        const helpshipOrderIds = orgOrders.map(o => o.helpship_order_id!);
        const trackingResults = await helpshipClient.getTrackingStatusBatch(helpshipOrderIds);

        // Actualizăm fiecare comandă
        for (const order of orgOrders) {
          try {
            const tracking = trackingResults.get(order.helpship_order_id!);

            if (!tracking) {
              console.log(`[Cron Tracking] No tracking info for order ${order.id}`);
              results.unchanged++;
              continue;
            }

            // Verificăm dacă tracking status s-a schimbat
            if (tracking.trackingStatus === order.tracking_status) {
              results.unchanged++;
              continue;
            }

            // Actualizăm în DB
            const { error: updateError } = await supabaseAdmin
              .from("orders")
              .update({
                tracking_status: tracking.trackingStatus,
                tracking_updated_at: new Date().toISOString(),
              })
              .eq("id", order.id);

            if (updateError) {
              throw updateError;
            }

            console.log(`[Cron Tracking] Order ${order.id}: ${order.tracking_status || 'null'} -> ${tracking.trackingStatus}`);
            results.updated++;
          } catch (error) {
            console.error(`[Cron Tracking] Error updating order ${order.id}:`, error);
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            results.failed++;
            results.errors.push({
              orderId: order.id,
              error: errorMessage,
            });
          }
        }
      } catch (orgError) {
        console.error(`[Cron Tracking] Error processing org ${orgId}:`, orgError);
        // Mark all orders from this org as failed
        for (const order of orgOrders) {
          results.failed++;
          results.errors.push({
            orderId: order.id,
            error: `Org error: ${orgError instanceof Error ? orgError.message : "Unknown"}`,
          });
        }
      }
    }

    console.log(
      `[Cron Tracking] Finished. Updated: ${results.updated}, Unchanged: ${results.unchanged}, Failed: ${results.failed}`
    );

    return NextResponse.json({
      success: true,
      message: "Tracking sync completed",
      results,
    });
  } catch (error) {
    console.error("[Cron Tracking] Error in tracking sync:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
