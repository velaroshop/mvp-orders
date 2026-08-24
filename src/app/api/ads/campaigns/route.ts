import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import type { AdsKPIs, AdsCampaignRow } from "@/lib/types";

export const dynamic = "force-dynamic";

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

    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const adAccountId = searchParams.get("adAccountId");
    const landingKey = searchParams.get("landingKey") || null;

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "startDate and endDate are required" },
        { status: 400 }
      );
    }

    // Use provided adAccountId or fall back to settings
    let accountId = adAccountId;
    if (!accountId) {
      const { data: settings } = await supabaseAdmin
        .from("settings")
        .select("meta_ads_account_id")
        .eq("organization_id", activeOrganizationId)
        .single();
      accountId = settings?.meta_ads_account_id || null;
    }

    if (!accountId) {
      return NextResponse.json(
        { error: "Meta Ads not configured" },
        { status: 400 }
      );
    }

    // Fetch cached campaign insights
    const { data: insights, error: insightsError } = await supabaseAdmin
      .from("ad_campaign_insights")
      .select("*")
      .eq("organization_id", activeOrganizationId)
      .eq("ad_account_id", accountId)
      .gte("date", startDate)
      .lte("date", endDate);

    if (insightsError) {
      console.error("Error fetching campaign insights:", insightsError);
      return NextResponse.json(
        { error: "Failed to fetch campaign data" },
        { status: 500 }
      );
    }

    // Fetch orders for revenue calculation (same pattern as dashboard/stats)
    // Use Romania timezone offset (UTC+3 summer time) for proper local date filtering
    const startDateTime = new Date(`${startDate}T00:00:00.000+03:00`).toISOString();
    const endDateTime = new Date(`${endDate}T23:59:59.999+03:00`).toISOString();

    let ordersQuery = supabaseAdmin
      .from("orders")
      .select("total")
      .eq("organization_id", activeOrganizationId)
      .neq("status", "cancelled")
      .neq("status", "testing")
      .gte("created_at", startDateTime)
      .lte("created_at", endDateTime);

    if (landingKey) {
      ordersQuery = ordersQuery.eq("landing_key", landingKey);
    }

    const { data: orders } = await ordersQuery;

    const totalRevenue = (orders || []).reduce(
      (sum, order: any) => sum + (order.total || 0),
      0
    );
    const orderCount = (orders || []).length;

    // Aggregate campaign data
    const campaignMap: Record<string, AdsCampaignRow> = {};

    for (const row of insights || []) {
      const key = row.campaign_id;
      if (!campaignMap[key]) {
        campaignMap[key] = {
          campaignId: row.campaign_id,
          campaignName: row.campaign_name,
          campaignStatus: row.campaign_status || "UNKNOWN",
          campaignObjective: row.campaign_objective || "",
          spend: 0,
          impressions: 0,
          linkClicks: 0,
          cpm: 0,
          ctr: 0,
          cpc: 0,
          metaPurchases: 0,
          metaPurchaseValue: 0,
          metaRoas: null,
        };
      }
      campaignMap[key].spend += Number(row.spend) || 0;
      campaignMap[key].impressions += Number(row.impressions) || 0;
      campaignMap[key].linkClicks += Number(row.link_clicks) || 0;
      campaignMap[key].metaPurchases += Number(row.meta_purchases) || 0;
      campaignMap[key].metaPurchaseValue += Number(row.meta_purchase_value) || 0;
    }

    // Calculate derived metrics per campaign
    const campaigns = Object.values(campaignMap).map((c) => ({
      ...c,
      cpm: c.impressions > 0 ? (c.spend / c.impressions) * 1000 : 0,
      ctr: c.impressions > 0 ? (c.linkClicks / c.impressions) * 100 : 0,
      cpc: c.linkClicks > 0 ? c.spend / c.linkClicks : 0,
      metaRoas: c.spend > 0 ? c.metaPurchaseValue / c.spend : null,
    }));

    // Calculate aggregate KPIs
    const totalSpend = campaigns.reduce((sum, c) => sum + c.spend, 0);
    const totalImpressions = campaigns.reduce((sum, c) => sum + c.impressions, 0);
    const totalLinkClicks = campaigns.reduce((sum, c) => sum + c.linkClicks, 0);
    const totalMetaRevenue = campaigns.reduce((sum, c) => sum + c.metaPurchaseValue, 0);

    const kpis: AdsKPIs = {
      adSpend: totalSpend,
      revenue: totalRevenue,
      roas: totalSpend > 0 ? totalRevenue / totalSpend : null,
      metaRevenue: totalMetaRevenue,
      metaRoas: totalSpend > 0 ? totalMetaRevenue / totalSpend : null,
      cpa: orderCount > 0 ? totalSpend / orderCount : null,
      cpm: totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0,
      ctr: totalImpressions > 0 ? (totalLinkClicks / totalImpressions) * 100 : 0,
      cpc: totalLinkClicks > 0 ? totalSpend / totalLinkClicks : 0,
      impressions: totalImpressions,
      linkClicks: totalLinkClicks,
      orders: orderCount,
    };

    // Get last fetched time
    const lastFetchedAt = (insights || []).reduce((latest: string | null, row: any) => {
      if (!latest || row.fetched_at > latest) return row.fetched_at;
      return latest;
    }, null);

    return NextResponse.json({
      kpis,
      campaigns: campaigns.sort((a, b) => b.spend - a.spend),
      lastFetchedAt,
    });
  } catch (error) {
    console.error("Error in GET /api/ads/campaigns:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
