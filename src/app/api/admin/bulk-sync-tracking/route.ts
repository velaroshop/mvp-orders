import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { getHelpshipCredentials } from "@/lib/helpship-credentials";
import { HelpshipClient } from "@/lib/helpship";

// Allow up to 300s on Vercel Pro — needed for large order volumes
export const maxDuration = 300;

// Statuses that are final — won't change, no need to re-sync
const FINAL_STATUSES = ["Returned", "Delivered", "Cancelled"];

const BATCH_SIZE = 20;
const DELAY_MS = 400; // between batches — 400ms balances speed vs Helpship rate limits

/**
 * POST /api/admin/bulk-sync-tracking
 * One-time (or repeated) endpoint that syncs tracking_status for all orders
 * that have a helpship_order_id but no final tracking_status.
 * Processes in batches to avoid rate-limiting Helpship.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const organizationId = (session.user as any).activeOrganizationId;
    if (!organizationId) {
      return NextResponse.json({ error: "No organization" }, { status: 400 });
    }

    // Fetch all orders via pagination (Supabase caps at 1000 rows per request)
    const PAGE_SIZE = 1000;
    let allOrders: { id: string; helpship_order_id: string; tracking_status: string | null }[] = [];
    let from = 0;

    while (true) {
      const { data: page, error } = await supabaseAdmin
        .from("orders")
        .select("id, helpship_order_id, tracking_status")
        .eq("organization_id", organizationId)
        .not("helpship_order_id", "is", null)
        .not("status", "in", '("testing","queue","cancelled")')
        .order("created_at", { ascending: false })
        .range(from, from + PAGE_SIZE - 1);

      if (error) {
        return NextResponse.json({ error: "DB error" }, { status: 500 });
      }
      if (!page || page.length === 0) break;
      allOrders = allOrders.concat(page);
      if (page.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
    }

    // Filter out already-final statuses — these won't change, skip them
    const toSync = allOrders.filter(
      (o) => !o.tracking_status || !FINAL_STATUSES.includes(o.tracking_status)
    );

    if (toSync.length === 0) {
      return NextResponse.json({ synced: 0, skipped: 0, errors: 0, message: "Nimic de sincronizat." });
    }

    const credentials = await getHelpshipCredentials(organizationId);
    const helpshipClient = new HelpshipClient(credentials);

    let synced = 0;
    let errors = 0;

    // Process in batches
    for (let i = 0; i < toSync.length; i += BATCH_SIZE) {
      const batch = toSync.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(async (order) => {
          try {
            const tracking = await helpshipClient.getTrackingStatus(order.helpship_order_id);
            if (!tracking?.trackingStatus) return;

            await supabaseAdmin
              .from("orders")
              .update({
                tracking_status: tracking.trackingStatus,
                tracking_updated_at: new Date().toISOString(),
              })
              .eq("id", order.id);

            synced++;
          } catch {
            errors++;
          }
        })
      );

      // Delay between batches (except last)
      if (i + BATCH_SIZE < toSync.length) {
        await new Promise((r) => setTimeout(r, DELAY_MS));
      }
    }

    return NextResponse.json({
      synced,
      errors,
      skipped: allOrders.length - toSync.length,
      total: allOrders.length,
    });
  } catch (err) {
    console.error("[BulkSyncTracking] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
