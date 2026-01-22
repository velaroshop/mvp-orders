import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getHelpshipCredentials } from "@/lib/helpship-credentials";
import { HelpshipClient } from "@/lib/helpship";

/**
 * Cron job pentru confirmarea comenzilor programate
 * Se rulează zilnic la ora 05:00 AM
 * Procesează toate comenzile cu status="scheduled" și scheduled_date <= TODAY
 */
export async function GET(request: NextRequest) {
  try {
    // Verificare autorizare cron job (Vercel trimite header Authorization: Bearer <CRON_SECRET>)
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    console.log(`[Cron] Starting scheduled orders confirmation for date: ${today}`);

    // Găsește toate comenzile programate pentru astăzi sau anterior
    const { data: scheduledOrders, error: fetchError } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("status", "scheduled")
      .lte("scheduled_date", today);

    if (fetchError) {
      console.error("[Cron] Error fetching scheduled orders:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch scheduled orders" },
        { status: 500 },
      );
    }

    if (!scheduledOrders || scheduledOrders.length === 0) {
      console.log("[Cron] No scheduled orders to process");
      return NextResponse.json({
        success: true,
        message: "No scheduled orders to process",
        processed: 0,
      });
    }

    console.log(`[Cron] Found ${scheduledOrders.length} scheduled orders to process`);

    const results = {
      total: scheduledOrders.length,
      success: 0,
      failed: 0,
      errors: [] as Array<{ orderId: string; error: string }>,
    };

    // Procesează fiecare comandă
    for (const order of scheduledOrders) {
      try {
        console.log(`[Cron] Processing order ${order.id} (scheduled for ${order.scheduled_date})`);

        // Dacă comanda are helpship_order_id, trebuie să actualizăm statusul în Helpship
        if (order.helpship_order_id) {
          try {
            // Obține credențialele Helpship pentru organizație
            const credentials = await getHelpshipCredentials(order.organization_id);
            const helpshipClient = new HelpshipClient(credentials);

            // Verificăm statusul comenzii în Helpship
            const orderStatus = await helpshipClient.getOrderStatus(order.helpship_order_id);

            if (!orderStatus) {
              console.warn(`[Cron] Could not verify order status in Helpship for order ${order.id}`);
            } else {
              const statusName = orderStatus.statusName;
              console.log(`[Cron] Order ${order.helpship_order_id} has status ${statusName} in Helpship`);

              // Dacă comanda nu mai este OnHold în Helpship, doar logăm warning
              if (statusName !== "OnHold" && statusName !== "Pending") {
                console.warn(
                  `[Cron] Order ${order.id} is ${statusName} in Helpship, not OnHold. Confirming in MVP anyway.`
                );
              } else {
                // Actualizăm comanda în Helpship doar dacă e OnHold
                if (statusName === "OnHold") {
                  await helpshipClient.updateOrder(order.helpship_order_id, {
                    status: "PENDING",
                    paymentStatus: "Pending",
                  });
                  console.log(`[Cron] Order ${order.helpship_order_id} updated to PENDING in Helpship`);
                }
              }
            }
          } catch (helpshipError) {
            console.error(`[Cron] Failed to update order in Helpship:`, helpshipError);
            // Nu aruncăm eroarea, continuăm să actualizăm în DB
            const errorMessage = helpshipError instanceof Error ? helpshipError.message : "Unknown error";
            console.warn(`[Cron] Proceeding with DB update despite Helpship error: ${errorMessage}`);
          }
        }

        // Actualizează statusul în DB
        const { error: updateError } = await supabaseAdmin
          .from("orders")
          .update({ status: "confirmed" })
          .eq("id", order.id);

        if (updateError) {
          throw updateError;
        }

        console.log(`[Cron] Order ${order.id} confirmed successfully`);
        results.success++;
      } catch (error) {
        console.error(`[Cron] Error processing order ${order.id}:`, error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        results.failed++;
        results.errors.push({
          orderId: order.id,
          error: errorMessage,
        });
      }
    }

    console.log(
      `[Cron] Finished processing scheduled orders. Success: ${results.success}, Failed: ${results.failed}`
    );

    return NextResponse.json({
      success: true,
      message: "Scheduled orders processed",
      results,
    });
  } catch (error) {
    console.error("[Cron] Error in scheduled orders confirmation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
