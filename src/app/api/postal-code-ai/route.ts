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
      return NextResponse.json({ error: "Orașul și județul sunt obligatorii" }, { status: 400 });
    }

    const addressParts = [address, city, `județul ${county}`].filter(Boolean).join(", ");

    // Prompt instructs Gemini to search and return JSON at the very end
    const prompt = `Caută codul poștal corect pentru această adresă din România: ${addressParts}.
Folosește căutarea web pentru a verifica codul exact în baza de date a Poștei Române.
La final, răspunde OBLIGATORIU cu un bloc JSON pe o singură linie în formatul exact de mai jos (fără alte caractere după):
{"postalCode":"XXXXXX","explanation":"explicatie scurta in romana","confidence":"high"}
Unde confidence este: high dacă ești sigur, medium dacă există incertitudine, low dacă adresa e ambiguă.`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          tools: [{ google_search: {} }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 1024,
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

    // Collect all text parts (grounding may split response across parts)
    const parts: any[] = geminiData?.candidates?.[0]?.content?.parts || [];
    const rawText = parts.map((p: any) => p.text || "").join("");
    console.log("[postal-code-ai] Gemini raw response:", rawText);

    if (!rawText) {
      const finishReason = geminiData?.candidates?.[0]?.finishReason;
      return NextResponse.json({ error: `Gemini răspuns gol (motiv: ${finishReason || "unknown"})` }, { status: 502 });
    }

    // Extract JSON object from text — greedy match, last occurrence wins
    const allMatches = [...rawText.matchAll(/\{[^{}]*"postalCode"[^{}]*\}/g)];
    const jsonMatch = allMatches.length > 0 ? allMatches[allMatches.length - 1][0] : null;

    if (!jsonMatch) {
      return NextResponse.json({ error: `Nu am găsit JSON în răspuns: ${rawText.slice(0, 300)}` }, { status: 502 });
    }

    let parsed: any;
    try {
      parsed = JSON.parse(jsonMatch);
    } catch {
      return NextResponse.json({ error: `JSON invalid: ${jsonMatch.slice(0, 200)}` }, { status: 502 });
    }

    const postalCode = String(parsed.postalCode || "").replace(/\D/g, "").slice(0, 6);
    const explanation = String(parsed.explanation || "");
    const confidence = ["high", "medium", "low"].includes(parsed.confidence)
      ? parsed.confidence as "high" | "medium" | "low"
      : "medium";

    if (!postalCode || postalCode.length !== 6) {
      return NextResponse.json({ error: "Gemini nu a putut determina un cod poștal valid" }, { status: 422 });
    }

    return NextResponse.json({ postalCode, explanation, confidence });
  } catch (error) {
    console.error("Error in POST /api/postal-code-ai:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
