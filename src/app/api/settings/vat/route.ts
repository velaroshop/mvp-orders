import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * PUT /api/settings/vat
 * Update VAT settings (vat_enabled)
 */
export async function PUT(request: Request) {
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

    const body = await request.json();
    const { vatEnabled } = body;

    if (typeof vatEnabled !== "boolean") {
      return NextResponse.json(
        { error: "vatEnabled must be a boolean" },
        { status: 400 }
      );
    }

    // Check if settings exist
    const { data: existingSettings } = await supabaseAdmin
      .from("settings")
      .select("id")
      .eq("organization_id", activeOrganizationId)
      .single();

    const updateData = {
      vat_enabled: vatEnabled,
      updated_at: new Date().toISOString(),
    };

    if (existingSettings) {
      const { error } = await supabaseAdmin
        .from("settings")
        .update(updateData)
        .eq("organization_id", activeOrganizationId);

      if (error) {
        throw new Error(`Failed to update VAT settings: ${error.message}`);
      }
    } else {
      const { error } = await supabaseAdmin
        .from("settings")
        .insert({
          organization_id: activeOrganizationId,
          ...updateData,
        });

      if (error) {
        throw new Error(`Failed to create VAT settings: ${error.message}`);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving VAT settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
