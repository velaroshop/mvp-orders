import { NextResponse } from "next/server";
import { requireSuperadmin } from "@/lib/billing-server";
import { todayRo } from "@/lib/billing";

export const dynamic = "force-dynamic";

const ANAF_URL = "https://webservicesp.anaf.ro/api/PlatitorTvaRest/v9/tva";

// ANAF returns the old cedilla forms of ș/ț
function fixDiacritics(value: string): string {
  return value.replace(/ş/g, "ș").replace(/Ş/g, "Ș").replace(/ţ/g, "ț").replace(/Ţ/g, "Ț");
}

function titleCase(value: string): string {
  return fixDiacritics(value)
    .toLocaleLowerCase("ro")
    .replace(/(^|[\s-])(\p{L})/gu, (_m, sep: string, ch: string) => sep + ch.toLocaleUpperCase("ro"));
}

/**
 * GET /api/superadmin/anaf?cui=... - Company data from the public ANAF VAT register (superadmin only)
 * Called from the server because ANAF does not allow requests from the browser.
 */
export async function GET(request: Request) {
  try {
    const auth = await requireSuperadmin();
    if ("error" in auth) return auth.error;

    const cui = (new URL(request.url).searchParams.get("cui") || "").replace(/\D/g, "");
    if (cui.length < 2 || cui.length > 10) {
      return NextResponse.json({ error: "CUI invalid." }, { status: 400 });
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    let response: Response;
    try {
      response = await fetch(ANAF_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([{ cui: Number(cui), data: todayRo() }]),
        signal: controller.signal,
        cache: "no-store",
      });
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      return NextResponse.json({ error: "ANAF nu răspunde. Încearcă din nou peste puțin." }, { status: 502 });
    }
    const json = await response.json().catch(() => null);
    const found = json?.found?.[0];
    if (!found) {
      return NextResponse.json({ found: false });
    }

    const general = found.date_generale || {};
    const seat = found.adresa_sediu_social || {};

    const streetParts = [seat.sdenumire_Strada, seat.snumar_Strada ? `nr. ${seat.snumar_Strada}` : "", seat.sdetalii_Adresa]
      .map((p: string) => String(p || "").trim())
      .filter(Boolean);
    const address = streetParts.length > 0 ? streetParts.join(", ") : String(general.adresa || "");

    return NextResponse.json({
      found: true,
      cui: String(general.cui || cui),
      companyName: fixDiacritics(String(general.denumire || "")),
      address: fixDiacritics(address),
      city: fixDiacritics(String(seat.sdenumire_Localitate || "")),
      county: titleCase(String(seat.sdenumire_Judet || "")),
      postalCode: String(seat.scod_Postal || general.codPostal || ""),
      regCom: String(general.nrRegCom || ""),
      isVatPayer: !!found.inregistrare_scop_Tva?.scpTVA,
      isInactive: !!found.stare_inactiv?.statusInactivi,
    });
  } catch (error) {
    console.error("Error in GET /api/superadmin/anaf:", error);
    const aborted = error instanceof Error && error.name === "AbortError";
    return NextResponse.json(
      { error: aborted ? "ANAF nu a răspuns la timp. Încearcă din nou." : "Nu s-au putut prelua datele de la ANAF." },
      { status: 502 }
    );
  }
}
