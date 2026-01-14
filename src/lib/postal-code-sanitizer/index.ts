/**
 * Sistem de sanitizare și căutare coduri poștale
 * 
 * API principal pentru aplicația de ecom
 */

import { sanitizeAddress } from "./sanitizer";
import { searchPostalCodes } from "../postal-code/geoapify";
import type { SanitizedAddress, PostalCodeSearchResult } from "./types";
import type { PostalCodeResult } from "../postal-code/types";

/**
 * Caută coduri poștale pentru o adresă dată
 * 
 * Proces:
 * 1. Sanitizează adresa (județ, localitate, stradă)
 * 2. Caută coduri poștale folosind Geoapify cu adresa sanitizată
 * 3. Returnează rezultatele sortate după relevanță
 */
export async function findPostalCodes(
  county: string,
  city: string,
  address: string
): Promise<PostalCodeSearchResult[]> {
  // Pasul 1: Sanitizează adresa
  const sanitized = sanitizeAddress(county, city, address);

  // Pasul 2: Construiește adresa pentru Geoapify
  // Folosim strada + număr (dacă există) pentru căutare mai precisă
  const fullAddress = sanitized.number
    ? `${sanitized.street} ${sanitized.number}`
    : sanitized.street;

  // Pasul 3: Caută coduri poștale folosind Geoapify
  const geoapifyResults = await searchPostalCodes(
    fullAddress,
    sanitized.city,
    sanitized.county,
    "Romania"
  );

  // Pasul 4: Transformă rezultatele și adaugă informații despre sanitizare
  const results: PostalCodeSearchResult[] = geoapifyResults.map((result) => ({
    postcode: result.postcode,
    formatted: result.formatted,
    confidence: result.confidence,
    sanitizedAddress: sanitized,
  }));

  return results;
}

/**
 * Exportă funcțiile de sanitizare pentru utilizare separată
 */
export { sanitizeAddress, sanitizeCounty, sanitizeCity, sanitizeStreet } from "./sanitizer";
export type { SanitizedAddress, PostalCodeSearchResult } from "./types";
