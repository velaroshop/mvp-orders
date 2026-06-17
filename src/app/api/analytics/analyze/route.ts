import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import OpenAI from "openai";

/**
 * POST /api/analytics/analyze — AI analysis of analytics sessions (superadmin only)
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as any)?.activeRole;
    const isSuperadminOrg = (session.user as any)?.isSuperadminOrg;
    if (!(userRole === "owner" && isSuperadminOrg)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 });
    }

    const body = await request.json();
    const { summary, landingPageName, dateRange } = body;

    if (!summary) {
      return NextResponse.json({ error: "Summary data is required" }, { status: 400 });
    }

    const prompt = `You are a conversion rate optimization (CRO) expert specializing in Romanian e-commerce (COD - Cash on Delivery model). Analyze the following visitor behavior data from a landing page and provide actionable insights.

IMPORTANT: Respond in Romanian language.

Landing Page: ${landingPageName || "N/A"}
Date range: ${dateRange?.startDate || "N/A"} to ${dateRange?.endDate || "N/A"}

Visitor Behavior Summary:
- Total Sessions: ${summary.totalSessions}
- Purchased: ${summary.purchased} (${summary.conversionRate}%)
- Abandoned: ${summary.abandoned}
- Form Started: ${summary.formStarted} (${summary.formStartRate}% din total)
- Avg Time on Page: ${summary.avgTimeOnPage} seconds
- Avg Scroll Depth: ${summary.avgScrollMax}%

Abandon Fields (where visitors stopped filling the form):
${Object.entries(summary.abandonFields || {}).map(([field, count]) => `- ${field}: ${count} abandonuri`).join("\n") || "No data"}

Offer Distribution (which offer was selected):
${Object.entries(summary.offerDistribution || {}).map(([offer, count]) => `- ${offer}: ${count} selecții`).join("\n") || "No data"}

Device Breakdown:
${Object.entries(summary.deviceBreakdown || {}).map(([device, count]) => `- ${device}: ${count} sesiuni`).join("\n") || "No data"}

Provide your analysis in this structure:
1. **Performanță Generală** (2-3 sentences — conversion rate assessment, comparison to industry benchmarks for COD e-commerce in Romania)
2. **Probleme Identificate** (top 3 issues causing drop-offs, based on the data)
3. **Analiza Formularului** (which fields cause most abandonment and why, time analysis)
4. **Analiza Ofertelor** (which offer performs best, which is ignored, pricing insights)
5. **Recomandări Concrete** (max 5 specific, actionable steps to improve conversion rate, ordered by expected impact)

Be specific and data-driven. Reference actual numbers from the data. Focus on the most impactful changes.`;

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const analysis = completion.choices[0]?.message?.content || "No analysis generated.";

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error("Error in POST /api/analytics/analyze:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
