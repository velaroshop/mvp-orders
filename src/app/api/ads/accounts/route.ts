import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { fetchAdAccounts } from "@/lib/meta-ads";

export async function GET(request: NextRequest) {
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

    // Allow passing token as query param (for testing before saving)
    const tokenParam = request.nextUrl.searchParams.get("token");
    let accessToken = tokenParam || "";

    if (!accessToken) {
      // Read from settings
      const { data: settings } = await supabaseAdmin
        .from("settings")
        .select("meta_ads_access_token")
        .eq("organization_id", activeOrganizationId)
        .single();

      accessToken = settings?.meta_ads_access_token || "";
    }

    if (!accessToken) {
      return NextResponse.json(
        { error: "Meta Ads access token not configured. Go to Settings to add it." },
        { status: 400 }
      );
    }

    const accounts = await fetchAdAccounts(accessToken);

    return NextResponse.json({ accounts });
  } catch (error) {
    console.error("Error in GET /api/ads/accounts:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
