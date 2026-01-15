import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import type { OrderStatus } from "@/lib/types";

export async function GET() {
  try {
    // Obține session-ul utilizatorului
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Obține organization_id activ din session
    const activeOrganizationId = (session.user as any).activeOrganizationId;

    if (!activeOrganizationId) {
      return NextResponse.json(
        { error: "No active organization" },
        { status: 400 },
      );
    }

    // Folosim supabaseAdmin pentru a bypassa RLS și filtrăm manual după organization_id
    const { data, error } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("organization_id", activeOrganizationId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to list orders: ${error.message}`);
    }

    // Map Supabase rows to Order type
    const orders = (data || []).map((row) => ({
      id: row.id,
      landingKey: row.landing_key,
      offerCode: row.offer_code,
      phone: row.phone,
      fullName: row.full_name,
      county: row.county,
      city: row.city,
      address: row.address,
      postalCode: row.postal_code ?? undefined,
      upsells: row.upsells,
      subtotal: parseFloat(row.subtotal.toString()),
      shippingCost: parseFloat(row.shipping_cost.toString()),
      total: parseFloat(row.total.toString()),
      status: row.status as OrderStatus,
      helpshipOrderId: row.helpship_order_id ?? undefined,
      orderNumber: row.order_number ?? undefined,
      orderNote: row.order_note ?? undefined,
      createdAt: row.created_at,
    }));

    return NextResponse.json({ orders });
  } catch (error) {
    console.error("Error listing orders", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

