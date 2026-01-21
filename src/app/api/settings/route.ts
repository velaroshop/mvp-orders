import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

// GET - Retrieve settings for active organization
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

    // Fetch settings for organization
    const { data, error } = await supabaseAdmin
      .from("settings")
      .select("*")
      .eq("organization_id", activeOrganizationId)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = not found, which is OK
      throw new Error(`Failed to fetch settings: ${error.message}`);
    }

    // Fetch duplicate_check_days from organizations table
    const { data: org } = await supabaseAdmin
      .from("organizations")
      .select("duplicate_check_days")
      .eq("id", activeOrganizationId)
      .single();

    // Return settings or empty object if not found
    // Don't return the actual secret value for security
    const hasSecret = !!(data?.helpship_client_secret);

    return NextResponse.json({
      settings: {
        helpship_client_id: data?.helpship_client_id || "",
        helpship_client_secret: hasSecret ? "configured" : "", // Indicator that secret exists
        helpship_token_url: data?.helpship_token_url || "https://helpship-auth-develop.azurewebsites.net/connect/token",
        helpship_api_base_url: data?.helpship_api_base_url || "https://helpship-api-develop.azurewebsites.net",
        duplicate_check_days: org?.duplicate_check_days || 21,
        meta_test_mode: data?.meta_test_mode || false,
        meta_test_event_code: data?.meta_test_event_code || "",
      },
    });
  } catch (error) {
    console.error("Error fetching settings", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// PUT - Update settings for active organization
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
    const { helpshipClientId, helpshipClientSecret, duplicateCheckDays } = body;

    if (!helpshipClientId || !helpshipClientSecret) {
      return NextResponse.json(
        { error: "Client ID and Client Secret are required" },
        { status: 400 },
      );
    }

    // Update duplicate_check_days in organizations table
    if (duplicateCheckDays !== undefined) {
      await supabaseAdmin
        .from("organizations")
        .update({
          duplicate_check_days: duplicateCheckDays,
          updated_at: new Date().toISOString(),
        })
        .eq("id", activeOrganizationId);
    }

    // Check if settings exist
    const { data: existingSettings } = await supabaseAdmin
      .from("settings")
      .select("id")
      .eq("organization_id", activeOrganizationId)
      .single();

    if (existingSettings) {
      // Update existing settings
      const { error } = await supabaseAdmin
        .from("settings")
        .update({
          helpship_client_id: helpshipClientId,
          helpship_client_secret: helpshipClientSecret,
          helpship_token_url: "https://helpship-auth-develop.azurewebsites.net/connect/token",
          helpship_api_base_url: "https://helpship-api-develop.azurewebsites.net",
          updated_at: new Date().toISOString(),
        })
        .eq("organization_id", activeOrganizationId);

      if (error) {
        throw new Error(`Failed to update settings: ${error.message}`);
      }
    } else {
      // Insert new settings
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
    console.error("Error saving settings", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
