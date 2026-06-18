import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

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

    if (!activeOrganizationId) {
      return NextResponse.json(
        { error: "No active organization" },
        { status: 400 }
      );
    }

    const { id } = await params;

    // Get the partial order to check (including landing_key for store lookup)
    const { data: partialOrder, error: partialError } = await supabaseAdmin
      .from("partial_orders")
      .select("phone, landing_key")
      .eq("id", id)
      .eq("organization_id", activeOrganizationId)
      .single();

    if (partialError || !partialOrder) {
      return NextResponse.json(
        { error: "Partial order not found" },
        { status: 404 }
      );
    }

    const phone = partialOrder.phone;

    if (!phone) {
      return NextResponse.json({
        hasOrders: false,
        hasPartials: false,
        ordersCount: 0,
        partialsCount: 0,
      });
    }

    // Get store settings for duplicate check days via landing page
    let duplicateCheckDays = 14; // Default value
    if (partialOrder.landing_key) {
      const { data: landingPage } = await supabaseAdmin
        .from("landing_pages")
        .select("store_id")
        .eq("slug", partialOrder.landing_key)
        .single();

      if (landingPage?.store_id) {
        const { data: store } = await supabaseAdmin
          .from("stores")
          .select("duplicate_order_days")
          .eq("id", landingPage.store_id)
          .single();

        if (store?.duplicate_order_days) {
          duplicateCheckDays = store.duplicate_order_days;
        }
      }
    }
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - duplicateCheckDays);

    // Check for existing orders with same phone in last X days
    const { data: orders, error: ordersError } = await supabaseAdmin
      .from("orders")
      .select("id, created_at, status, order_number")
      .eq("organization_id", activeOrganizationId)
      .eq("phone", phone)
      .gte("created_at", cutoffDate.toISOString())
      .order("created_at", { ascending: false });

    return NextResponse.json({
      hasOrders: (orders?.length || 0) > 0,
      ordersCount: orders?.length || 0,
      orders: orders || [],
      duplicateCheckDays,
    });
  } catch (error) {
    console.error("Error in GET /api/partial-orders/[id]/check-duplicates:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
