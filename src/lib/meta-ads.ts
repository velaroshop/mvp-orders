const META_API_VERSION = "v21.0";
const META_API_BASE = `https://graph.facebook.com/${META_API_VERSION}`;

export interface MetaAdAccount {
  id: string;
  name: string;
  account_status: number;
  currency: string;
}

export interface MetaCampaignInsightRow {
  campaignId: string;
  campaignName: string;
  campaignObjective: string;
  campaignStatus: string;
  date: string;
  spend: number;
  impressions: number;
  linkClicks: number;
  cpm: number;
  ctr: number;
  cpc: number;
  metaPurchases: number;
  metaPurchaseValue: number;
}

export async function validateAccessToken(accessToken: string): Promise<boolean> {
  try {
    const res = await fetch(`${META_API_BASE}/me?access_token=${accessToken}`);
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchAdAccounts(accessToken: string): Promise<MetaAdAccount[]> {
  const url = `${META_API_BASE}/me/adaccounts?fields=name,account_status,currency&limit=100&access_token=${accessToken}`;
  const res = await fetch(url);

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    const msg = error?.error?.message || `HTTP ${res.status}`;
    if (error?.error?.code === 190) {
      throw new Error("Access token has expired. Please update it in Settings.");
    }
    throw new Error(`Failed to fetch ad accounts: ${msg}`);
  }

  const data = await res.json();
  return (data.data || []).map((acc: any) => ({
    id: acc.id,
    name: acc.name,
    account_status: acc.account_status,
    currency: acc.currency,
  }));
}

export async function fetchCampaignInsights({
  accessToken,
  adAccountId,
  since,
  until,
}: {
  accessToken: string;
  adAccountId: string;
  since: string;
  until: string;
}): Promise<MetaCampaignInsightRow[]> {
  // Fetch campaign statuses
  const campaignStatuses = await fetchCampaignStatuses(accessToken, adAccountId);

  // Fetch insights with daily breakdown
  const fields = [
    "campaign_id",
    "campaign_name",
    "objective",
    "spend",
    "impressions",
    "inline_link_clicks",
    "cpm",
    "ctr",
    "cpc",
    "actions",
    "action_values",
  ].join(",");

  const timeRange = JSON.stringify({ since, until });
  let url = `${META_API_BASE}/${adAccountId}/insights?level=campaign&fields=${fields}&time_range=${encodeURIComponent(timeRange)}&time_increment=1&limit=500&access_token=${accessToken}`;

  const allRows: MetaCampaignInsightRow[] = [];

  // Follow pagination
  while (url) {
    const res = await fetch(url);

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      const msg = error?.error?.message || `HTTP ${res.status}`;
      if (error?.error?.code === 190) {
        throw new Error("Access token has expired. Please update it in Settings.");
      }
      if (res.status === 429) {
        throw new Error("Meta API rate limit reached. Please try again in a few minutes.");
      }
      throw new Error(`Failed to fetch campaign insights: ${msg}`);
    }

    const data = await res.json();

    for (const row of data.data || []) {
      const purchases = extractActionValue(row.actions, "purchase");
      const purchaseValue = extractActionValue(row.action_values, "purchase");

      allRows.push({
        campaignId: row.campaign_id,
        campaignName: row.campaign_name,
        campaignObjective: row.objective || "",
        campaignStatus: campaignStatuses[row.campaign_id] || "UNKNOWN",
        date: row.date_start,
        spend: parseFloat(row.spend || "0"),
        impressions: parseInt(row.impressions || "0", 10),
        linkClicks: parseInt(row.inline_link_clicks || "0", 10),
        cpm: parseFloat(row.cpm || "0"),
        ctr: parseFloat(row.ctr || "0"),
        cpc: parseFloat(row.cpc || "0"),
        metaPurchases: purchases,
        metaPurchaseValue: purchaseValue,
      });
    }

    url = data.paging?.next || "";
  }

  return allRows;
}

async function fetchCampaignStatuses(
  accessToken: string,
  adAccountId: string
): Promise<Record<string, string>> {
  const statuses: Record<string, string> = {};
  let url = `${META_API_BASE}/${adAccountId}/campaigns?fields=id,effective_status&limit=500&access_token=${accessToken}`;

  while (url) {
    const res = await fetch(url);
    if (!res.ok) break;

    const data = await res.json();
    for (const campaign of data.data || []) {
      statuses[campaign.id] = campaign.effective_status || "UNKNOWN";
    }
    url = data.paging?.next || "";
  }

  return statuses;
}

function extractActionValue(actions: any[] | undefined, actionType: string): number {
  if (!actions || !Array.isArray(actions)) return 0;
  const action = actions.find((a: any) => a.action_type === actionType);
  return action ? parseFloat(action.value || "0") : 0;
}

/**
 * Debug a token to get its expiration timestamp.
 * Returns the expires_at Unix timestamp (seconds), or null if unable to determine.
 */
export async function debugToken(accessToken: string): Promise<number | null> {
  try {
    const res = await fetch(
      `${META_API_BASE}/debug_token?input_token=${accessToken}&access_token=${accessToken}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.data?.expires_at || null;
  } catch {
    return null;
  }
}

/**
 * Exchange a valid long-lived token for a new long-lived token (~60 days).
 * Requires META_APP_ID and META_APP_SECRET env vars.
 * Returns { accessToken, expiresIn } or throws on error.
 */
export async function exchangeForLongLivedToken(
  currentToken: string
): Promise<{ accessToken: string; expiresIn: number }> {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;

  if (!appId || !appSecret) {
    throw new Error("META_APP_ID and META_APP_SECRET environment variables are required for token renewal.");
  }

  const url = `${META_API_BASE}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${currentToken}`;
  const res = await fetch(url);

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    const msg = error?.error?.message || `HTTP ${res.status}`;
    if (error?.error?.code === 190) {
      throw new Error("Token-ul a expirat. Trebuie generat un token nou din Meta Business Suite.");
    }
    throw new Error(`Failed to exchange token: ${msg}`);
  }

  const data = await res.json();
  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
  };
}
