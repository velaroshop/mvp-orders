import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * PUT /api/settings/meta-test
 * Update Meta test mode settings
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
    const { metaTestMode, metaTestEventCode } = body;

    // Check if settings exist
    const { data: existingSettings } = await supabaseAdmin
      .from("settings")
      .select("id")
      .eq("organization_id", activeOrganizationId)
      .single();

    const updateData: any = {
      meta_test_mode: metaTestMode,
      meta_test_event_code: metaTestEventCode || null,
      updated_at: new Date().toISOString(),
    };

    if (existingSettings) {
      // Update existing settings
      const { error } = await supabaseAdmin
        .from("settings")
        .update(updateData)
        .eq("organization_id", activeOrganizationId);

      if (error) {
        throw new Error(`Failed to update Meta test settings: ${error.message}`);
      }
    } else {
      // Insert new settings
      const { error } = await supabaseAdmin
        .from("settings")
        .insert({
          organization_id: activeOrganizationId,
          ...updateData,
        });

      if (error) {
        throw new Error(`Failed to create Meta test settings: ${error.message}`);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving Meta test settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
