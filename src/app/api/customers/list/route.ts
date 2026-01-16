import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const activeOrganizationId = (session.user as any).activeOrganizationId;

    if (!activeOrganizationId) {
      return NextResponse.json(
        { error: "No active organization" },
        { status: 400 },
      );
    }

    // Get customers for this organization
    const { data, error } = await supabaseAdmin
      .from("customers")
      .select("*")
      .eq("organization_id", activeOrganizationId)
      .order("total_orders", { ascending: false });

    if (error) {
      throw new Error(`Failed to list customers: ${error.message}`);
    }

    // Map to Customer type
    const customers = (data || []).map((row) => ({
      id: row.id,
      organizationId: row.organization_id,
      phone: row.phone,
      firstOrderDate: row.first_order_date,
      lastOrderDate: row.last_order_date,
      totalOrders: row.total_orders || 0,
      totalSpent: parseFloat(row.total_spent?.toString() || "0"),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return NextResponse.json({ customers });
  } catch (error) {
    console.error("Error listing customers", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
