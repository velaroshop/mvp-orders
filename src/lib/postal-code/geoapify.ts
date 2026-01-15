/**
 * Serviciu pentru căutarea codurilor poștale folosind Geoapify API
 * 
 * Abordare simplă:
 * 1. Folosește Geocoding API pentru a obține coordonatele (lat/lon) din adresă
 * 2. Folosește Postcode Search API cu coordonatele pentru a obține codul poștal
 */

import type { PostalCodeResult, GeoapifyGeocodingResponse, GeoapifyPostcodeResponse } from "./types";

const API_KEY = process.env.GEOAPIFY_API_KEY || "2f1914bf75294bf3868ec63c7b4d043d";
const GEOCODING_URL = "https://api.geoapify.com/v1/geocode/search";
const POSTCODE_SEARCH_URL = "https://api.geoapify.com/v1/postcode/search";

/**
 * Obține coordonatele (lat/lon) pentru o adresă folosind Geocoding API
 */
async function getCoordinates(
  address: string,
  city: string,
  county: string,
  country: string = "Romania",
  houseNumber?: string
): Promise<{ lat: number; lon: number } | null> {
  // Construiește adresa completă pentru geocoding
  let searchText: string;
  if (houseNumber) {
    searchText = `${address} ${houseNumber}, ${city}, ${county}, ${country}`;
  } else {
    searchText = `${address}, ${city}, ${county}, ${country}`;
  }
  
  console.log("[Geoapify] Geocoding address:", searchText);

  try {
    const url = new URL(GEOCODING_URL);
    url.searchParams.set("text", searchText);
    url.searchParams.set("apiKey", API_KEY);
    url.searchParams.set("limit", "1"); // Ne interesează doar primul rezultat
    url.searchParams.set("filter", "countrycode:ro");
    url.searchParams.set("lang", "ro");
    url.searchParams.set("format", "json");

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Geoapify Geocoding API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const data: GeoapifyGeocodingResponse = await response.json();

    if (!data.features || data.features.length === 0) {
      console.warn("[Geoapify] No coordinates found for address:", searchText);
      return null;
    }

    const feature = data.features[0];
    const coordinates = feature.geometry.coordinates;
    const lat = coordinates[1];
    const lon = coordinates[0];

    console.log("[Geoapify] Found coordinates:", { lat, lon });

    return { lat, lon };
  } catch (error) {
    console.error("[Geoapify] Error getting coordinates:", error);
    throw error;
  }
}

/**
 * Caută coduri poștale pentru o adresă dată
 * 
 * Abordare:
 * 1. Obține coordonatele (lat/lon) din adresă folosind Geocoding API
 * 2. Folosește Postcode Search API cu coordonatele pentru a obține codurile poștale
 */
export async function searchPostalCodes(
  address: string,
  city: string,
  county: string,
  country: string = "Romania",
  houseNumber?: string
): Promise<PostalCodeResult[]> {
  console.log("[Geoapify] Searching postal codes for:", { address, city, county, houseNumber });

  try {
    // Pasul 1: Obține coordonatele pentru adresă
    const coordinates = await getCoordinates(address, city, county, country, houseNumber);
    
    if (!coordinates) {
      console.warn("[Geoapify] Could not get coordinates, returning empty results");
      return [];
    }

    // Pasul 2: Folosește Postcode Search API cu coordonatele
    console.log("[Geoapify] Searching postcodes with coordinates:", coordinates);

    const url = new URL(POSTCODE_SEARCH_URL);
    url.searchParams.set("apiKey", API_KEY);
    url.searchParams.set("lat", coordinates.lat.toString());
    url.searchParams.set("lon", coordinates.lon.toString());
    url.searchParams.set("countrycode", "ro"); // Doar România
    url.searchParams.set("limit", "5"); // Maxim 5 rezultate
    url.searchParams.set("geometry", "original");
    url.searchParams.set("lang", "ro");
    url.searchParams.set("format", "json");

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Geoapify Postcode API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const data: any = await response.json();

    // Postcode Search API returnează JSON cu `results` array
    let postcodeResults: Array<any> = [];
    
    if (data.results && Array.isArray(data.results)) {
      postcodeResults = data.results;
    } else if (data.features && Array.isArray(data.features)) {
      // Fallback pentru GeoJSON format
      postcodeResults = data.features.map((f: any) => ({
        ...f.properties,
        lat: f.geometry.coordinates[1],
        lon: f.geometry.coordinates[0],
      }));
    }

    if (postcodeResults.length === 0) {
      console.warn("[Geoapify] No postcodes found for coordinates:", coordinates);
      return [];
    }

    // Transformă rezultatele în formatul nostru
    const results: PostalCodeResult[] = postcodeResults.map((result: any) => {
      const postcode = result.postcode || result.ref || "";
      const formatted = result.formatted || `${postcode} ${result.city || ""}, ${result.country || ""}`.trim();
      
      return {
        postcode,
        formatted,
        address: {
          street: result.street,
          city: result.city,
          county: result.county,
          country: result.country,
        },
        confidence: 0.9, // Confidence ridicat pentru rezultate din Postcode Search API
        lat: result.lat,
        lon: result.lon,
      };
    });

    // Elimină duplicatele după cod poștal
    const uniqueResults = Array.from(
      new Map(results.map(r => [r.postcode, r])).values()
    );

    console.log(`[Geoapify] Found ${uniqueResults.length} unique postal codes`);
    return uniqueResults.slice(0, 3); // Returnează maxim 3 variante
  } catch (error) {
    console.error("[Geoapify] Error searching postal codes:", error);
    throw error;
  }
}
