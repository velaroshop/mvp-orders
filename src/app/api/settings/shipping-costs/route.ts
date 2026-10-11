import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * PUT /api/settings/shipping-costs
 * Update courier_cost and packaging_cost for the active organization.
 */
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const activeOrganizationId = (session.user as any).activeOrganizationId;
    if (!activeOrganizationId) {
      return NextResponse.json({ error: "No active organization" }, { status: 400 });
    }

    const body = await request.json();
    const courierCost   = body.courierCost   === "" || body.courierCost   === null ? null : parseFloat(body.courierCost);
    const packagingCost = body.packagingCost === "" || body.packagingCost === null ? null : parseFloat(body.packagingCost);

    if (
      (courierCost   !== null && (isNaN(courierCost)   || courierCost   < 0)) ||
      (packagingCost !== null && (isNaN(packagingCost) || packagingCost < 0))
    ) {
      return NextResponse.json({ error: "Valorile trebuie să fie numere pozitive" }, { status: 400 });
    }

    const updateData = {
      courier_cost:   courierCost,
      packaging_cost: packagingCost,
      updated_at: new Date().toISOString(),
    };

    const { data: existingSettings } = await supabaseAdmin
      .from("settings")
      .select("id")
      .eq("organization_id", activeOrganizationId)
      .single();

    if (existingSettings) {
      const { error } = await supabaseAdmin
        .from("settings")
        .update(updateData)
        .eq("organization_id", activeOrganizationId);
      if (error) throw new Error(`Failed to update: ${error.message}`);
    } else {
      const { error } = await supabaseAdmin
        .from("settings")
        .insert({ organization_id: activeOrganizationId, ...updateData });
      if (error) throw new Error(`Failed to create: ${error.message}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving shipping costs:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
