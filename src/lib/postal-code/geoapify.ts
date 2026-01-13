/**
 * Serviciu pentru căutarea codurilor poștale folosind Geoapify API
 */

import type { PostalCodeResult, GeoapifyResponse } from "./types";

const API_KEY = process.env.GEOAPIFY_API_KEY || "2f1914bf75294bf3868ec63c7b4d043d";
const API_URL = "https://api.geoapify.com/v1/geocode/search";

/**
 * Construiește adresa completă pentru căutare
 */
function buildSearchAddress(
  address: string,
  city: string,
  county: string,
  country: string = "Romania"
): string {
  const parts = [address, city, county, country].filter(Boolean);
  return parts.join(", ");
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
    url.searchParams.set("text", searchText);
    url.searchParams.set("apiKey", API_KEY);
    url.searchParams.set("limit", "10"); // Limitează la 10 rezultate
    url.searchParams.set("filter", "countrycode:ro"); // Filtrează doar România

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

    // Extrage codurile poștale unice din rezultate
    const postalCodeMap = new Map<string, PostalCodeResult>();

    for (const feature of data.features) {
      const props = feature.properties;
      const postcode = props.postcode;

      if (!postcode) continue;

      // Dacă avem deja acest cod poștal, păstrăm cel cu confidence mai mare
      const existing = postalCodeMap.get(postcode);
      const confidence = props.rank?.confidence || 0;

      if (!existing || confidence > existing.confidence) {
        postalCodeMap.set(postcode, {
          postcode,
          formatted: props.formatted || `${postcode}, ${props.city || city}, ${props.county || county}`,
          address: {
            street: props.street,
            city: props.city || city,
            county: props.county || county,
            country: props.country || country,
          },
          confidence: confidence,
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
