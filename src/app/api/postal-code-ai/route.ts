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
    const { address, city, county, suggestions } = body;
    // suggestions = array of { postalCode, fullAddress, confidence } from existing system

    if (!city || !county) {
      return NextResponse.json({ error: "Orașul și județul sunt obligatorii" }, { status: 400 });
    }

    const addressParts = [address, city, `județul ${county}`].filter(Boolean).join(", ");

    // Build context from existing system suggestions
    let suggestionsContext = "";
    if (suggestions && suggestions.length > 0) {
      const lines = suggestions
        .slice(0, 3)
        .map((s: any, i: number) =>
          `  ${i + 1}. ${s.postalCode} — ${s.fullAddress} (${Math.round(s.confidence * 100)}% confidence)`
        )
        .join("\n");
      suggestionsContext = `\nSistemul nostru intern a identificat aceste variante pentru această adresă:\n${lines}\n`;
    }

    const prompt = `Ești un expert în coduri poștale din România (Poșta Română).
Adresă: ${addressParts}.
${suggestionsContext}
Analizează adresa și sugestiile de mai sus. Alege codul poștal cel mai potrivit și explică pe scurt de ce (max 2 propoziții).
Dacă sugestiile par corecte, confirmă-le. Dacă observi o problemă, explică.
Răspunde DOAR cu JSON valid, fără markdown:
{"postalCode":"XXXXXX","explanation":"explicatie in romana","confidence":"high|medium|low"}`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 512,
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                postalCode: { type: "STRING" },
                explanation: { type: "STRING" },
                confidence: { type: "STRING", enum: ["high", "medium", "low"] },
              },
              required: ["postalCode", "explanation", "confidence"],
            },
          },
        }),
      }
    );

    if (!geminiRes.ok) {
      const err = await geminiRes.json().catch(() => ({}));
      console.error("Gemini API error:", err);
      const errMsg = err?.error?.message || err?.error?.status || JSON.stringify(err);
      return NextResponse.json({ error: `Gemini: ${errMsg}` }, { status: 502 });
    }

    const geminiData = await geminiRes.json();
    const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!rawText) {
      const finishReason = geminiData?.candidates?.[0]?.finishReason;
      return NextResponse.json({ error: `Răspuns gol (motiv: ${finishReason || "unknown"})` }, { status: 502 });
    }

    let parsed: any;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      return NextResponse.json({ error: `Răspuns neparsabil: ${rawText.slice(0, 200)}` }, { status: 502 });
    }

    const postalCode = String(parsed.postalCode || "").replace(/\D/g, "").slice(0, 6);
    const explanation = String(parsed.explanation || "");
    const confidence = ["high", "medium", "low"].includes(parsed.confidence)
      ? parsed.confidence as "high" | "medium" | "low"
      : "medium";

    if (!postalCode || postalCode.length !== 6) {
      return NextResponse.json({ error: "Nu s-a putut determina un cod poștal valid" }, { status: 422 });
    }

    return NextResponse.json({ postalCode, explanation, confidence });
  } catch (error) {
    console.error("Error in POST /api/postal-code-ai:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
