/**
 * Serviciu pentru căutarea codurilor poștale folosind Geoapify API
 */

import type { PostalCodeResult, GeoapifyResponse } from "./types";

const API_KEY = process.env.GEOAPIFY_API_KEY || "2f1914bf75294bf3868ec63c7b4d043d";
const API_URL = "https://api.geoapify.com/v1/geocode/search";

/**
 * Extrage numele străzii din adresă (fără număr)
 */
function extractStreetName(address: string): string {
  // Elimină numerele și cuvintele comune legate de numere (nr, număr, etc.)
  // Ex: "logovat nr 3" -> "logovat"
  // Ex: "strada principală 25" -> "strada principală"
  const cleaned = address
    .replace(/\s*(nr|număr|numar|no|#)\s*\d+.*$/i, "") // Elimină "nr 3", "număr 25", etc.
    .replace(/\s+\d+.*$/, "") // Elimină orice număr la sfârșit
    .trim();
  
  return cleaned || address; // Dacă nu găsește nimic, returnează adresa originală
}

/**
 * Construiește adresa completă pentru căutare
 * Format: "Strada, Oraș, Județ, România"
 */
function buildSearchAddress(
  address: string,
  city: string,
  county: string,
  country: string = "Romania"
): string {
  // Extrage numele străzii (fără număr)
  const streetName = extractStreetName(address);
  
  // Construiește adresa în format: "Strada, Oraș, Județ, România"
  // Prioritizăm: Strada -> Oraș -> Județ -> Țară
  const parts = [streetName, city, county, country].filter(Boolean);
  const searchText = parts.join(", ");
  
  console.log("[Geoapify] Address parsing:", {
    original: address,
    streetName,
    city,
    county,
    searchText,
  });
  
  return searchText;
}

/**
 * Caută coduri poștale pentru o adresă dată
 */
export async function searchPostalCodes(
  address: string,
  city: string,
  county: string,
  country: string = "Romania"
): Promise<PostalCodeResult[]> {
  const searchText = buildSearchAddress(address, city, county, country);
  
  console.log("[Geoapify] Searching postal codes for:", searchText);

  try {
    const url = new URL(API_URL);
    
    // Construim query-ul mai specific pentru adrese românești
    // Încercăm mai întâi cu adresa completă structurată
    const streetName = extractStreetName(address);
    
    // Construim query-ul cu prioritizare: Strada + Oraș + Județ
    // Format: "Strada, Oraș, Județ, România"
    const structuredQuery = `${streetName}, ${city}, ${county}, Romania`;
    
    url.searchParams.set("text", structuredQuery);
    url.searchParams.set("apiKey", API_KEY);
    url.searchParams.set("limit", "10"); // Limitează la 10 rezultate
    url.searchParams.set("filter", "countrycode:ro"); // Filtrează doar România
    url.searchParams.set("lang", "ro"); // Limba română pentru rezultate mai bune
    
    console.log("[Geoapify] Query:", structuredQuery);

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Geoapify API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const data: GeoapifyResponse = await response.json();

    // Normalizează numele pentru comparație (fără diacritice, lowercase)
    function normalizeName(name: string): string {
      return name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Elimină diacriticele
        .trim();
    }

    const normalizedCity = normalizeName(city);
    const normalizedCounty = normalizeName(county);

    // Extrage codurile poștale unice din rezultate
    const postalCodeMap = new Map<string, PostalCodeResult>();

    for (const feature of data.features) {
      const props = feature.properties;
      const postcode = props.postcode;

      if (!postcode) continue;

      // Verifică dacă rezultatul se potrivește cu orașul sau județul
      const resultCity = normalizeName(props.city || "");
      const resultCounty = normalizeName(props.county || "");
      
      // Filtrează rezultatele care nu se potrivesc cu orașul sau județul
      // (dar acceptă dacă nu avem informații despre oraș/județ în rezultat)
      const cityMatch = !resultCity || resultCity.includes(normalizedCity) || normalizedCity.includes(resultCity);
      const countyMatch = !resultCounty || resultCounty.includes(normalizedCounty) || normalizedCounty.includes(resultCounty);
      
      // Dacă nu se potrivește nici cu orașul, nici cu județul, skip
      if (resultCity && resultCounty && !cityMatch && !countyMatch) {
        console.log(`[Geoapify] Skipping result - city/county mismatch:`, {
          resultCity: props.city,
          resultCounty: props.county,
          expectedCity: city,
          expectedCounty: county,
        });
        continue;
      }

      // Dacă avem deja acest cod poștal, păstrăm cel cu confidence mai mare
      const existing = postalCodeMap.get(postcode);
      const confidence = props.rank?.confidence || 0;

      // Bonus pentru potrivirea cu orașul/județul
      let adjustedConfidence = confidence;
      if (cityMatch) adjustedConfidence += 0.1;
      if (countyMatch) adjustedConfidence += 0.1;

      if (!existing || adjustedConfidence > existing.confidence) {
        postalCodeMap.set(postcode, {
          postcode,
          formatted: props.formatted || `${postcode}, ${props.city || city}, ${props.county || county}`,
          address: {
            street: props.street,
            city: props.city || city,
            county: props.county || county,
            country: props.country || country,
          },
          confidence: adjustedConfidence,
          lat: props.lat || feature.geometry.coordinates[1],
          lon: props.lon || feature.geometry.coordinates[0],
        });
      }
    }

    // Sortează după confidence (descrescător)
    const results = Array.from(postalCodeMap.values()).sort(
      (a, b) => b.confidence - a.confidence
    );

    console.log(`[Geoapify] Found ${results.length} unique postal codes`);
    return results;
  } catch (error) {
    console.error("[Geoapify] Error searching postal codes:", error);
    throw error;
  }
}
