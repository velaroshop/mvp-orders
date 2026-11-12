import { NextRequest, NextResponse } from "next/server";
import { AnafError, lookupCompany, normalizeCui } from "@/lib/anaf";
import { cuiAlreadyRegistered } from "@/lib/org-cui";
import { checkRateLimit, getClientIP } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/anaf?cui=... - CUI check for the sign-up form (public).
 * Answers with a status: verified (with the company name), not_found, inactive, duplicate or unavailable.
 * Only the company name and VAT status are returned; the address is taken again on the server when the account is created.
 */
export async function GET(request: NextRequest) {
  const rate = checkRateLimit(`auth-anaf:${getClientIP(request)}`, { limit: 15, windowSeconds: 60 });
  if (!rate.allowed) {
    return NextResponse.json({ status: "unavailable", error: "Prea multe încercări. Așteaptă un minut." }, { status: 429 });
  }

  const cui = normalizeCui(request.nextUrl.searchParams.get("cui"));
  if (!cui) {
    return NextResponse.json({ status: "invalid" }, { status: 400 });
  }

  try {
    const company = await lookupCompany(cui);
    if (!company) return NextResponse.json({ status: "not_found" });
    // TEMPORARILY OFF: companies inactive at ANAF may register
    // if (company.isInactive) return NextResponse.json({ status: "inactive" });
    if (await cuiAlreadyRegistered(cui)) return NextResponse.json({ status: "duplicate" });
    return NextResponse.json({ status: "verified", cui, companyName: company.companyName, isVatPayer: company.isVatPayer });
  } catch (error) {
    if (!(error instanceof AnafError)) console.error("Error in GET /api/auth/anaf:", error);
    return NextResponse.json({ status: "unavailable" });
  }
}
