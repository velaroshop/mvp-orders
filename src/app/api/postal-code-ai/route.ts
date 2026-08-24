import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const activeOrganizationId = (session.user as any).activeOrganizationId;
    if (!activeOrganizationId) {
      return NextResponse.json({ error: "No active organization" }, { status: 400 });
    }

    // Fetch Gemini API key from settings (never exposed to client)
    const { data: settings } = await supabaseAdmin
      .from("settings")
      .select("gemini_api_key")
      .eq("organization_id", activeOrganizationId)
      .single();

    const geminiApiKey = settings?.gemini_api_key;
    if (!geminiApiKey) {
      return NextResponse.json({ error: "Gemini API key not configured" }, { status: 400 });
    }

    const body = await request.json();
    const { address, city, county } = body;

    if (!city || !county) {
      return NextResponse.json({ error: "City and county are required" }, { status: 400 });
    }

    const addressStr = address ? `strada ${address}, ` : "";
    const prompt = `Ești un expert în coduri poștale din România.
Adresă: ${addressStr}orașul/comuna ${city}, județul ${county}.
Sugerează cel mai probabil cod poștal pentru această adresă.
Răspunde DOAR cu un obiect JSON valid (fără markdown, fără explicații în afara JSON-ului):
{"postalCode":"XXXXXX","explanation":"explicație scurtă în română (max 2 propoziții)","confidence":"high|medium|low"}`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 256 },
        }),
      }
    );

    if (!geminiRes.ok) {
      const err = await geminiRes.json().catch(() => ({}));
      console.error("Gemini API error:", err);
      return NextResponse.json({ error: "Gemini API error" }, { status: 502 });
    }

    const geminiData = await geminiRes.json();
    const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Parse JSON from response (strip markdown fences if present)
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Could not parse Gemini response" }, { status: 502 });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const postalCode = String(parsed.postalCode || "").replace(/\D/g, "").slice(0, 6);
    const explanation = String(parsed.explanation || "");
    const confidence = ["high", "medium", "low"].includes(parsed.confidence)
      ? parsed.confidence
      : "medium";

    if (!postalCode || postalCode.length !== 6) {
      return NextResponse.json({ error: "Gemini could not determine a postal code" }, { status: 422 });
    }

    return NextResponse.json({ postalCode, explanation, confidence });
  } catch (error) {
    console.error("Error in POST /api/postal-code-ai:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
