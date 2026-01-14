/**
 * Sistem de sanitizare pentru adrese românești
 * 
 * Logica:
 * 1. Sanitizează județul (fuzzy match cu lista oficială)
 * 2. Sanitizează localitatea (fuzzy match cu localitățile din județ)
 * 3. Sanitizează strada (extrage număr, normalizează nume)
 * 4. Returnează adresă sanitizată pentru căutare cod poștal
 */

import { ROMANIAN_COUNTIES } from "./data/counties";
import { getLocalitiesForCounty, getAllLocalities } from "./data/localities";
import { normalizeText, cleanText } from "./utils/normalize";
import { findBestMatch } from "./utils/fuzzy-match";
import { extractStreetAndNumber, normalizeStreetName } from "./utils/extract-street";
import type { SanitizedAddress } from "./types";

/**
 * Sanitizează județul folosind fuzzy matching
 */
export function sanitizeCounty(input: string): string | null {
  if (!input) return null;

  const cleaned = cleanText(input);
  const match = findBestMatch(cleaned, [...ROMANIAN_COUNTIES], 0.6); // Threshold mai mic pentru județe

  return match?.match || null;
}

/**
 * Sanitizează localitatea în funcție de județ
 */
export function sanitizeCity(county: string | null, input: string): string | null {
  if (!input) return null;

  const cleaned = cleanText(input);
  let localities: string[];

  if (county) {
    // Caută doar în localitățile din județ
    localities = getLocalitiesForCounty(county);
  } else {
    // Dacă nu avem județ, caută în toate localitățile
    localities = getAllLocalities();
  }

  if (localities.length === 0) {
    // Dacă nu avem localități pentru județ, returnează input-ul normalizat
    return normalizeStreetName(input);
  }

  const match = findBestMatch(cleaned, localities, 0.7);
  return match?.match || normalizeStreetName(input); // Fallback la input normalizat
}

/**
 * Sanitizează strada și extrage numărul
 */
export function sanitizeStreet(input: string): { street: string; number?: string } {
  if (!input) return { street: input };

  const { street, number } = extractStreetAndNumber(input);
  const normalizedStreet = normalizeStreetName(street);

  return { street: normalizedStreet, number };
}

/**
 * Sanitizează o adresă completă (județ, localitate, stradă)
 */
export function sanitizeAddress(
  county: string,
  city: string,
  address: string
): SanitizedAddress {
  // Pasul 1: Sanitizează județul
  const sanitizedCounty = sanitizeCounty(county) || county;

  // Pasul 2: Sanitizează localitatea (în funcție de județ)
  const sanitizedCity = sanitizeCity(sanitizedCounty, city) || city;

  // Pasul 3: Sanitizează strada și extrage numărul
  const { street, number } = sanitizeStreet(address);

  return {
    county: sanitizedCounty,
    city: sanitizedCity,
    street,
    number,
    original: {
      county,
      city,
      address,
    },
  };
}
