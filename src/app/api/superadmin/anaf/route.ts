import { NextResponse } from "next/server";
import { requireSuperadmin } from "@/lib/billing-server";
import { AnafError, lookupCompany, normalizeCui } from "@/lib/anaf";

export const dynamic = "force-dynamic";

/**
 * GET /api/superadmin/anaf?cui=... - Company data from the public ANAF VAT register (superadmin only)
 */
export async function GET(request: Request) {
  try {
    const auth = await requireSuperadmin();
    if ("error" in auth) return auth.error;

    const cui = normalizeCui(new URL(request.url).searchParams.get("cui"));
    if (!cui) {
      return NextResponse.json({ error: "CUI invalid." }, { status: 400 });
    }

    const company = await lookupCompany(cui);
    if (!company) {
      return NextResponse.json({ found: false });
    }
    return NextResponse.json({ found: true, ...company });
  } catch (error) {
    console.error("Error in GET /api/superadmin/anaf:", error);
    const message = error instanceof AnafError ? error.message : "Nu s-au putut prelua datele de la ANAF.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
