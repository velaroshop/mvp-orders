import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import OpenAI from "openai";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const activeOrganizationId = (session.user as any).activeOrganizationId;
    let activeRole = (session.user as any).activeRole;

    // Fallback: if activeRole is not in session (stale JWT), check DB
    if (!activeRole && activeOrganizationId) {
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

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { kpis, campaigns, dateRange } = body;

    if (!kpis) {
      return NextResponse.json(
        { error: "KPIs data is required" },
        { status: 400 }
      );
    }

    // Build campaign breakdown text
    const campaignLines = (campaigns || [])
      .map(
        (c: any) =>
          `- ${c.campaignName} (${c.campaignStatus}): Spend ${c.spend.toFixed(2)} RON, ${c.impressions} impressions, ${c.linkClicks} clicks, CPM ${c.cpm.toFixed(2)}, CTR ${c.ctr.toFixed(2)}%, CPC ${c.cpc.toFixed(2)} RON`
      )
      .join("\n");

    const prompt = `You are a digital advertising analyst specializing in Romanian e-commerce (COD - Cash on Delivery model). Analyze the following Meta Ads campaign performance data and provide actionable insights.

IMPORTANT: Respond in Romanian language.

Date range: ${dateRange?.startDate || "N/A"} to ${dateRange?.endDate || "N/A"}
Currency: RON (Romanian Leu)

Overall KPIs:
- Ad Spend: ${kpis.adSpend?.toFixed(2)} RON
- Revenue (from real orders): ${kpis.revenue?.toFixed(2)} RON
- ROAS: ${kpis.roas?.toFixed(2) || "N/A"}
- CPA (Cost per Order): ${kpis.cpa?.toFixed(2) || "N/A"} RON
- Orders: ${kpis.orders}
- CPM: ${kpis.cpm?.toFixed(2)} RON
- CTR: ${kpis.ctr?.toFixed(2)}%
- CPC: ${kpis.cpc?.toFixed(2)} RON
- Impressions: ${kpis.impressions}
- Link Clicks: ${kpis.linkClicks}

Campaign Breakdown:
${campaignLines || "No campaigns data"}

Provide your analysis in this structure:
1. **Performanță Generală** (2-3 sentences summary)
2. **Campanii cu Performanță Bună** (top performers and why)
3. **Campanii Subperformante** (underperformers and what to do)
4. **Recomandări de Buget** (budget allocation suggestions)
5. **Acțiuni Concrete** (max 5 specific, actionable steps)

Keep the analysis concise and actionable. Focus on the most impactful insights.`;

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 1500,
    });

    const analysis = completion.choices[0]?.message?.content || "No analysis generated.";

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error("Error in POST /api/ads/analyze:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
