// Company data from the public ANAF VAT register (no key needed).
// Must be called from the server: ANAF does not allow requests from the browser.

import { todayRo } from "@/lib/billing";

const ANAF_URL = "https://webservicesp.anaf.ro/api/PlatitorTvaRest/v9/tva";
const TIMEOUT_MS = 10000;

export interface AnafCompany {
  cui: string; // digits only
  companyName: string;
  address: string; // street, number, details
  city: string;
  county: string;
  postalCode: string;
  regCom: string;
  isVatPayer: boolean;
  isInactive: boolean;
}

export class AnafError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AnafError";
  }
}

/** Digits of a CUI typed by a person ("RO 123 456" -> "123456"); null when the length is not valid. */
export function normalizeCui(value: unknown): string | null {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits.length >= 2 && digits.length <= 10 ? digits : null;
}

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
 * Looks a company up by CUI. Returns null when ANAF does not know the CUI and throws AnafError
 * when ANAF cannot be reached (so callers can tell "not found" from "unavailable").
 */
export async function lookupCompany(cui: string): Promise<AnafCompany | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(ANAF_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{ cui: Number(cui), data: todayRo() }]),
      signal: controller.signal,
      cache: "no-store",
    });
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    throw new AnafError(aborted ? "ANAF nu a răspuns la timp." : "Nu s-a putut contacta ANAF.");
  } finally {
    clearTimeout(timer);
  }

  // For an unknown CUI ANAF answers HTTP 404 with a valid body ({ found: [], notFound: [...] }),
  // so the body decides, not the status code
  const json = await response.json().catch(() => null);
  if (!json || !Array.isArray(json.found)) throw new AnafError("ANAF nu răspunde.");

  const found = json.found[0];
  if (!found) return null;

  const general = found.date_generale || {};
  const seat = found.adresa_sediu_social || {};
  const streetParts = [seat.sdenumire_Strada, seat.snumar_Strada ? `nr. ${seat.snumar_Strada}` : "", seat.sdetalii_Adresa]
    .map((p: string) => String(p || "").trim())
    .filter(Boolean);
  const address = streetParts.length > 0 ? streetParts.join(", ") : String(general.adresa || "");

  return {
    cui: String(general.cui || cui),
    companyName: fixDiacritics(String(general.denumire || "")),
    address: fixDiacritics(address),
    city: fixDiacritics(String(seat.sdenumire_Localitate || "")),
    county: titleCase(String(seat.sdenumire_Judet || "")),
    postalCode: String(seat.scod_Postal || general.codPostal || ""),
    regCom: String(general.nrRegCom || ""),
    isVatPayer: !!found.inregistrare_scop_Tva?.scpTVA,
    isInactive: !!found.stare_inactiv?.statusInactivi,
  };
}
