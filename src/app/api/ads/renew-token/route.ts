import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { exchangeForLongLivedToken } from "@/lib/meta-ads";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const activeOrganizationId = (session.user as any).activeOrganizationId;
    let activeRole = (session.user as any).activeRole;

    if (!activeOrganizationId) {
      return NextResponse.json(
        { error: "No active organization" },
        { status: 400 }
      );
    }

    // Fallback: if activeRole is not in session (stale JWT), check DB
    if (!activeRole) {
      const userId = (session.user as any).id;
      const { data: membership } = await supabaseAdmin
        .from("organization_members")
        .select("role")
        .eq("user_id", userId)
        .eq("organization_id", activeOrganizationId)
        .eq("is_active", true)
        .single();
      activeRole = membership?.role;
    }

    if (!["owner", "admin"].includes(activeRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Read current token from settings
    const { data: settings } = await supabaseAdmin
      .from("settings")
      .select("meta_ads_access_token, meta_ads_token_expires_at")
      .eq("organization_id", activeOrganizationId)
      .single();

    if (!settings?.meta_ads_access_token) {
      return NextResponse.json(
        { error: "No Meta Ads token configured." },
        { status: 400 }
      );
    }

    // Exchange current token for a new long-lived token
    const { accessToken, expiresIn } = await exchangeForLongLivedToken(
      settings.meta_ads_access_token
    );

    // Calculate new expiry
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    // Save new token and expiry
    const { error: updateError } = await supabaseAdmin
      .from("settings")
      .update({
        meta_ads_access_token: accessToken,
        meta_ads_token_expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq("organization_id", activeOrganizationId);

    if (updateError) {
      throw new Error(`Failed to save renewed token: ${updateError.message}`);
    }

    return NextResponse.json({
      success: true,
      expiresAt,
      expiresInDays: Math.floor(expiresIn / 86400),
    });
  } catch (error) {
    console.error("Error in POST /api/ads/renew-token:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
