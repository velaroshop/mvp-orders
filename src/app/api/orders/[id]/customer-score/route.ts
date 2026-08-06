import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { HelpshipClient } from "@/lib/helpship";
import { getHelpshipCredentials } from "@/lib/helpship-credentials";

// In-memory cache: helpshipOrderId → { data, timestamp }
const scoreCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 3 * 60 * 60 * 1000; // 3 hours

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const activeOrganizationId = (session.user as any).activeOrganizationId;
    const { id: orderId } = await params;

    // Get order with helpship_order_id
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("helpship_order_id")
      .eq("id", orderId)
      .eq("organization_id", activeOrganizationId)
      .single();

    if (!order?.helpship_order_id) {
      return NextResponse.json({ score: null, level: "NEW", message: "Client nou" });
    }

    const helpshipOrderId = order.helpship_order_id;

    // Check cache
    const cached = scoreCache.get(helpshipOrderId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json(cached.data);
    }

    // Get scoring thresholds from system_settings
    const { data: sysSettings } = await supabaseAdmin
      .from("system_settings")
      .select("score_threshold_good, score_threshold_poor")
      .limit(1)
      .single();

    const thresholdGood = (sysSettings as any)?.score_threshold_good ?? 25;
    const thresholdPoor = (sysSettings as any)?.score_threshold_poor ?? 50;

    // Call Helpship
    const credentials = await getHelpshipCredentials(activeOrganizationId);
    const client = new HelpshipClient(credentials);
    const identity = await client.getCustomerIdentity(helpshipOrderId);

    if (!identity) {
      const result = { score: null, level: "NEW", message: "Client nou" };
      scoreCache.set(helpshipOrderId, { data: result, timestamp: Date.now() });
      return NextResponse.json(result);
    }

    // Determine level based on returnRatePercent
    const rate = Math.round((identity.returnRatePercent || 0) * 100) / 100;
    let level: string;
    if (identity.ordersList12Months === 0) {
      level = "NEW";
    } else if (rate === 0) {
      level = "PERFECT";
    } else if (rate <= thresholdGood) {
      level = "GOOD";
    } else if (rate <= thresholdPoor) {
      level = "POOR";
    } else {
      level = "BAD";
    }

    const ordersList12 = identity.ordersList12Months
      || ((identity.resolvedLast12Months || 0) + (identity.returnedLast12Months || 0))
      || 0;

    const result = {
      score: rate,
      level,
      totalOrders: identity.totalOrders,
      ordersList12Months: ordersList12,
      resolvedLast12Months: identity.resolvedLast12Months || 0,
      returnedLast12Months: identity.returnedLast12Months || 0,
      returnRatePercent: identity.returnRatePercent,
      firstOrderAt: identity.firstOrderAt,
      lastOrderAt: identity.lastOrderAt,
      phone: identity.phone,
    };

    // Cache
    scoreCache.set(helpshipOrderId, { data: result, timestamp: Date.now() });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching customer score:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
