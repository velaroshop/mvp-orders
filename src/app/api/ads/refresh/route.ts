import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { fetchCampaignInsights } from "@/lib/meta-ads";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const activeOrganizationId = (session.user as any).activeOrganizationId;
    const activeRole = (session.user as any).activeRole;

    console.log("[ads/refresh] session.user:", JSON.stringify({
      id: (session.user as any).id,
      email: session.user.email,
      activeRole,
      activeOrganizationId,
    }));

    if (!activeOrganizationId) {
      return NextResponse.json(
        { error: "No active organization" },
        { status: 400 }
      );
    }

    if (!["owner", "admin"].includes(activeRole)) {
      console.log("[ads/refresh] Forbidden - activeRole:", activeRole);
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { startDate, endDate, adAccountId } = body as {
      startDate: string;
      endDate: string;
      adAccountId?: string;
    };

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "startDate and endDate are required" },
        { status: 400 }
      );
    }

    // Read settings
    const { data: settings } = await supabaseAdmin
      .from("settings")
      .select("meta_ads_access_token, meta_ads_account_id")
      .eq("organization_id", activeOrganizationId)
      .single();

    if (!settings?.meta_ads_access_token) {
      return NextResponse.json(
        { error: "Meta Ads not configured. Go to Settings to connect your account." },
        { status: 400 }
      );
    }

    // Use provided adAccountId or fall back to settings
    const accountId = adAccountId || settings.meta_ads_account_id;
    if (!accountId) {
      return NextResponse.json(
        { error: "No ad account selected" },
        { status: 400 }
      );
    }

    // Fetch from Meta Marketing API
    const insights = await fetchCampaignInsights({
      accessToken: settings.meta_ads_access_token,
      adAccountId: accountId,
      since: startDate,
      until: endDate,
    });

    if (insights.length === 0) {
      return NextResponse.json({
        success: true,
        campaignsUpdated: 0,
        daysUpdated: 0,
        message: "No campaign data found for this period",
      });
    }

    // UPSERT into ad_campaign_insights
    const rows = insights.map((row) => ({
      organization_id: activeOrganizationId,
      ad_account_id: accountId,
      campaign_id: row.campaignId,
      campaign_name: row.campaignName,
      campaign_status: row.campaignStatus,
      campaign_objective: row.campaignObjective,
      date: row.date,
      spend: row.spend,
      impressions: row.impressions,
      link_clicks: row.linkClicks,
      cpm: row.cpm,
      ctr: row.ctr,
      cpc: row.cpc,
      meta_purchases: row.metaPurchases,
      meta_purchase_value: row.metaPurchaseValue,
      fetched_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    const { error: upsertError } = await supabaseAdmin
      .from("ad_campaign_insights")
      .upsert(rows, {
        onConflict: "organization_id,ad_account_id,campaign_id,date",
      });

    if (upsertError) {
      console.error("Error upserting campaign insights:", upsertError);
      return NextResponse.json(
        { error: "Failed to save campaign data" },
        { status: 500 }
      );
    }

    const uniqueCampaigns = new Set(insights.map((r) => r.campaignId)).size;
    const uniqueDays = new Set(insights.map((r) => r.date)).size;

    return NextResponse.json({
      success: true,
      campaignsUpdated: uniqueCampaigns,
      daysUpdated: uniqueDays,
    });
  } catch (error) {
    console.error("Error in POST /api/ads/refresh:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
