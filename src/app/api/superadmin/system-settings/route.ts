import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export type HelpshipEnvironment = "development" | "production";

export interface SystemSettings {
  id: string;
  helpshipEnvironment: HelpshipEnvironment;
  createdAt: string;
  updatedAt: string;
}

/**
 * GET /api/superadmin/system-settings - Get system settings (superadmin only)
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as any).activeRole;
    const isSuperadminOrg = (session.user as any).isSuperadminOrg;

    // Check if user is OWNER and from a superadmin organization
    if (userRole !== "owner" || !isSuperadminOrg) {
      return NextResponse.json(
        { error: "Access denied. Superadmin privileges required." },
        { status: 403 }
      );
    }

    // Fetch system settings (should be only one row)
    const { data, error } = await supabaseAdmin
      .from("system_settings")
      .select("*")
      .single();

    if (error) {
      console.error("Error fetching system settings:", error);
      return NextResponse.json(
        { error: "Failed to fetch system settings" },
        { status: 500 }
      );
    }

    const settings = {
      id: data.id,
      helpshipEnvironment: data.helpship_environment as HelpshipEnvironment,
      scoreThresholdGood: (data as any).score_threshold_good ?? 25,
      scoreThresholdPoor: (data as any).score_threshold_poor ?? 50,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Error in GET /api/superadmin/system-settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/superadmin/system-settings - Update system settings (superadmin only)
 */
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as any).activeRole;
    const isSuperadminOrg = (session.user as any).isSuperadminOrg;

    // Check if user is OWNER and from a superadmin organization
    if (userRole !== "owner" || !isSuperadminOrg) {
      return NextResponse.json(
        { error: "Access denied. Superadmin privileges required." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { helpshipEnvironment, scoreThresholdGood, scoreThresholdPoor } = body;

    // Build update fields
    const updateFields: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (helpshipEnvironment !== undefined) {
      if (!["development", "production"].includes(helpshipEnvironment)) {
        return NextResponse.json(
          { error: "Invalid helpship environment. Must be 'development' or 'production'." },
          { status: 400 }
        );
      }
      updateFields.helpship_environment = helpshipEnvironment;
    }

    if (scoreThresholdGood !== undefined) {
      updateFields.score_threshold_good = Math.max(1, Math.min(100, parseInt(scoreThresholdGood) || 25));
    }
    if (scoreThresholdPoor !== undefined) {
      updateFields.score_threshold_poor = Math.max(1, Math.min(100, parseInt(scoreThresholdPoor) || 50));
    }

    // Get the existing settings row ID
    const { data: existingSettings, error: fetchError } = await supabaseAdmin
      .from("system_settings")
      .select("id")
      .single();

    if (fetchError || !existingSettings) {
      console.error("Error fetching existing system settings:", fetchError);
      return NextResponse.json(
        { error: "System settings not found" },
        { status: 404 }
      );
    }

    // Update the settings
    const { data, error } = await supabaseAdmin
      .from("system_settings")
      .update(updateFields)
      .eq("id", existingSettings.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating system settings:", error);
      return NextResponse.json(
        { error: "Failed to update system settings" },
        { status: 500 }
      );
    }

    const settings = {
      id: data.id,
      helpshipEnvironment: data.helpship_environment as HelpshipEnvironment,
      scoreThresholdGood: (data as any).score_threshold_good ?? 25,
      scoreThresholdPoor: (data as any).score_threshold_poor ?? 50,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Error in PUT /api/superadmin/system-settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
