import { supabaseAdmin } from "./supabase";
import { syncOrderToHelpship } from "./helpship-sync";

/**
 * Cleanup expired queue orders (lazy cleanup on API calls)
 * Processes max 10 orders at a time to avoid blocking requests
 */
export async function cleanupExpiredQueueOrders(): Promise<{
  processed: number;
  errors: number;
}> {
  try {
    // Find expired queue orders (max 10 to avoid long execution)
    const { data: expiredOrders, error } = await supabaseAdmin
      .from("orders")
      .select("id, queue_expires_at, created_at")
      .eq("status", "queue")
      .lt("queue_expires_at", new Date().toISOString())
      .order("created_at", { ascending: true })
      .limit(10);

    if (error) {
      console.error("[Cleanup] Error finding expired orders:", error);
      return { processed: 0, errors: 1 };
    }

    if (!expiredOrders || expiredOrders.length === 0) {
      return { processed: 0, errors: 0 };
    }

    console.log(`[Cleanup] Found ${expiredOrders.length} expired queue orders to finalize`);

    let processed = 0;
    let errors = 0;

    // Finalize each expired order
    for (const order of expiredOrders) {
      try {
        console.log(`[Cleanup] Finalizing expired order ${order.id}`);
        const result = await syncOrderToHelpship(order.id);

        if (result.success) {
          processed++;
          console.log(`[Cleanup] ✓ Order ${order.id} finalized successfully`);
        } else {
          errors++;
          console.error(`[Cleanup] ✗ Order ${order.id} failed:`, result.error);
        }
      } catch (err) {
        errors++;
        console.error(`[Cleanup] ✗ Order ${order.id} exception:`, err);
      }
    }

    console.log(`[Cleanup] Completed: ${processed} processed, ${errors} errors`);
    return { processed, errors };
  } catch (err) {
    console.error("[Cleanup] Fatal error:", err);
    return { processed: 0, errors: 1 };
  }
}
