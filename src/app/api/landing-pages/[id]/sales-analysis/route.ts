import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

/**
 * GET /api/landing-pages/[id]/sales-analysis?period=7
 * Returns offer distribution stats for a landing page.
 * Includes all orders except "testing". Shows confirmed count separately.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.activeOrganizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: landingPageId } = await params;
    const organizationId = session.user.activeOrganizationId;

    // Parse period in days (default 7). period=0 means "today" (from midnight local time).
    const periodDays = parseInt(request.nextUrl.searchParams.get("period") || "7");
    const since = periodDays === 0
      ? (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.toISOString(); })()
      : new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000).toISOString();

    // Fetch the landing page to get its slug and verify ownership
    const { data: landingPage, error: lpError } = await supabase
      .from("landing_pages")
      .select("id, slug, name, price_1, price_2, price_3, quantity_offer_1, quantity_offer_2, quantity_offer_3")
      .eq("id", landingPageId)
      .eq("organization_id", organizationId)
      .single();

    if (lpError || !landingPage) {
      return NextResponse.json({ error: "Landing page not found" }, { status: 404 });
    }

    // Fetch all orders for this landing page in the period, excluding testing
    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select("offer_code, status, total")
      .eq("organization_id", organizationId)
      .eq("landing_key", landingPage.slug)
      .neq("status", "testing")
      .gte("created_at", since);

    if (ordersError) {
      return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
    }

    const allOrders = orders || [];
    const totalOrders = allOrders.length;

    // Group by offer_code
    const offerCodes = ["offer_1", "offer_2", "offer_3"] as const;
    const offerLabels: Record<string, string> = {
      offer_1: landingPage.quantity_offer_1
        ? `${landingPage.quantity_offer_1} buc × ${landingPage.price_1 ?? "?"} lei`
        : `Oferta 1`,
      offer_2: landingPage.quantity_offer_2
        ? `${landingPage.quantity_offer_2} buc × ${landingPage.price_2 ?? "?"} lei`
        : `Oferta 2`,
      offer_3: landingPage.quantity_offer_3
        ? `${landingPage.quantity_offer_3} buc × ${landingPage.price_3 ?? "?"} lei`
        : `Oferta 3`,
    };

    const confirmedStatuses = ["confirmed", "scheduled"];

    const offerStats = offerCodes.map((code) => {
      const offerOrders = allOrders.filter((o) => o.offer_code === code);
      const confirmedOrders = offerOrders.filter((o) =>
        confirmedStatuses.includes(o.status)
      );
      const totalRevenue = offerOrders.reduce(
        (sum, o) => sum + parseFloat((o.total || 0).toString()),
        0
      );
      const confirmedRevenue = confirmedOrders.reduce(
        (sum, o) => sum + parseFloat((o.total || 0).toString()),
        0
      );
      const aov =
        offerOrders.length > 0 ? totalRevenue / offerOrders.length : 0;

      return {
        code,
        label: offerLabels[code],
        count: offerOrders.length,
        confirmedCount: confirmedOrders.length,
        pct: totalOrders > 0 ? (offerOrders.length / totalOrders) * 100 : 0,
        confirmedPct:
          offerOrders.length > 0
            ? (confirmedOrders.length / offerOrders.length) * 100
            : 0,
        totalRevenue,
        confirmedRevenue,
        aov,
      };
    });

    const totalConfirmed = allOrders.filter((o) =>
      confirmedStatuses.includes(o.status)
    ).length;
    const totalRevenue = allOrders.reduce(
      (sum, o) => sum + parseFloat((o.total || 0).toString()),
      0
    );
    const globalAov = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    return NextResponse.json({
      period: periodDays,
      since,
      totalOrders,
      totalConfirmed,
      totalRevenue,
      globalAov,
      offerStats,
    });
  } catch (error) {
    console.error("Error in GET /api/landing-pages/[id]/sales-analysis:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
