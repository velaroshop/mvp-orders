import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

// PUT - Update only Helpship credentials
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
        { status: 400 },
      );
    }

    const body = await request.json();
    const { helpshipClientId, helpshipClientSecret } = body;

    if (!helpshipClientId || !helpshipClientSecret) {
      return NextResponse.json(
        { error: "Client ID and Client Secret are required" },
        { status: 400 },
      );
    }

    // Check if settings exist
    const { data: existingSettings } = await supabaseAdmin
      .from("settings")
      .select("id")
      .eq("organization_id", activeOrganizationId)
      .single();

    if (existingSettings) {
      // Update existing settings - only credentials
      const { error } = await supabaseAdmin
        .from("settings")
        .update({
          helpship_client_id: helpshipClientId,
          helpship_client_secret: helpshipClientSecret,
          updated_at: new Date().toISOString(),
        })
        .eq("organization_id", activeOrganizationId);

      if (error) {
        throw new Error(`Failed to update credentials: ${error.message}`);
      }
    } else {
      // Insert new settings with credentials and default URLs
      const { error } = await supabaseAdmin
        .from("settings")
        .insert({
          organization_id: activeOrganizationId,
          helpship_client_id: helpshipClientId,
          helpship_client_secret: helpshipClientSecret,
          helpship_token_url: "https://helpship-auth-develop.azurewebsites.net/connect/token",
          helpship_api_base_url: "https://helpship-api-develop.azurewebsites.net",
        });

      if (error) {
        throw new Error(`Failed to create settings: ${error.message}`);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving credentials", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
