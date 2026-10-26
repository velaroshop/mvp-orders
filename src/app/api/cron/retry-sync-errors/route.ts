import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { syncOrderToHelpship, HELPSHIP_UNAVAILABLE_MESSAGE } from "@/lib/helpship-sync";

export const maxDuration = 120;

const MAX_AGE_MS = 48 * 60 * 60 * 1000;
const BATCH_LIMIT = 20;

/**
 * Cron: retries orders that failed to sync because Helpship returned 503.
 * Only 503 is safe to retry: the request was not processed, so no duplicate order in Helpship.
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: orders, error } = await supabaseAdmin
    .from("orders")
    .select("id")
    .eq("status", "sync_error")
    .is("helpship_order_id", null)
    .eq("sync_error_message", HELPSHIP_UNAVAILABLE_MESSAGE)
    .gte("created_at", new Date(Date.now() - MAX_AGE_MS).toISOString())
    .order("created_at", { ascending: true })
    .limit(BATCH_LIMIT);

  if (error) {
    console.error("[Cron RetrySync] Fetch failed:", error.message);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }

  let synced = 0;
  let failed = 0;
  for (const order of orders || []) {
    const result = await syncOrderToHelpship(order.id);
    if (result.success) synced++;
    else failed++;
  }

  if ((orders || []).length > 0) {
    console.log(`[Cron RetrySync] Retried ${orders!.length}: ${synced} synced, ${failed} failed`);
  }

  return NextResponse.json({ success: true, retried: (orders || []).length, synced, failed });
}
