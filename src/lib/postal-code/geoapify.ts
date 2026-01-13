/**
 * Serviciu pentru căutarea codurilor poștale folosind Geoapify API
 * 
 * Abordare:
 * 1. Folosește Geocoding API pentru a obține coordonatele (lat/lon) din adresă
 * 2. Folosește Postcode API cu coordonatele pentru a obține codurile poștale
 */

import type { PostalCodeResult, GeoapifyGeocodingResponse, GeoapifyPostcodeResponse } from "./types";

const API_KEY = process.env.GEOAPIFY_API_KEY || "2f1914bf75294bf3868ec63c7b4d043d";
const GEOCODING_URL = "https://api.geoapify.com/v1/geocode/search";
const POSTCODE_SEARCH_URL = "https://api.geoapify.com/v1/postcode/search";
const POSTCODE_LIST_URL = "https://api.geoapify.com/v1/postcode/list";

/**
 * Obține coordonatele (lat/lon) pentru o adresă folosind Geocoding API
 */
async function getCoordinates(
  address: string,
  city: string,
  county: string,
  country: string = "Romania"
): Promise<{ lat: number; lon: number } | null> {
  // Construiește adresa completă pentru geocoding
  const searchText = `${address}, ${city}, ${county}, ${country}`;
  
  console.log("[Geoapify] Geocoding address:", searchText);

  try {
    const url = new URL(GEOCODING_URL);
    url.searchParams.set("text", searchText);
    url.searchParams.set("apiKey", API_KEY);
    url.searchParams.set("limit", "1"); // Ne interesează doar primul rezultat
    url.searchParams.set("filter", "countrycode:ro");
    url.searchParams.set("lang", "ro");

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
 * 2. Folosește Postcode API cu coordonatele pentru a obține codurile poștale din apropiere
 */
export async function searchPostalCodes(
  address: string,
  city: string,
  county: string,
  country: string = "Romania"
): Promise<PostalCodeResult[]> {
  console.log("[Geoapify] Searching postal codes for:", { address, city, county });

  try {
    // Pasul 1: Obține coordonatele pentru adresă
    const coordinates = await getCoordinates(address, city, county, country);
    
    if (!coordinates) {
      console.warn("[Geoapify] Could not get coordinates, returning empty results");
      return [];
    }

    // Pasul 2: Folosește Postcode Search API cu coordonatele direct
    // Încercăm mai întâi cu Postcode Search API (mai precis)
    console.log("[Geoapify] Searching postcodes with coordinates:", coordinates);

    let url = new URL(POSTCODE_SEARCH_URL);
    url.searchParams.set("apiKey", API_KEY);
    url.searchParams.set("lat", coordinates.lat.toString());
    url.searchParams.set("lon", coordinates.lon.toString());
    url.searchParams.set("countrycode", "ro"); // Doar România
    url.searchParams.set("limit", "10"); // Maxim 10 rezultate
    url.searchParams.set("geometry", "original");
    url.searchParams.set("lang", "ro");

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

    let data: GeoapifyPostcodeResponse = await response.json();

    // Postcode Search API poate returna fie ca `results` array, fie ca GeoJSON `features`
    let postcodeResults: Array<any> = [];
    
    if (data.results && Array.isArray(data.results)) {
      postcodeResults = data.results;
    } else if (data.features && Array.isArray(data.features)) {
      // Convertim GeoJSON features în format results
      postcodeResults = data.features.map((feature) => ({
        postcode: feature.properties.postcode,
        country: feature.properties.country,
        country_code: feature.properties.country_code,
        city: feature.properties.city,
        county: feature.properties.county,
        state: feature.properties.state,
        lat: feature.properties.lat || feature.geometry.coordinates[1],
        lon: feature.properties.lon || feature.geometry.coordinates[0],
        formatted: feature.properties.formatted,
        street: feature.properties.street,
      }));
    }

    console.log(`[Geoapify] Postcode Search API returned ${postcodeResults.length} results`);

    // Dacă Postcode Search API nu returnează rezultate, încercăm cu Postcode List API cu filter circular
    if (postcodeResults.length === 0) {
      console.log("[Geoapify] Postcode Search API returned no results, trying Postcode List API with circle filter...");
      
      // Mărim raza la 5000m (5km) pentru a găsi mai multe rezultate
      const radius = 5000; // metri
      const filter = `circle:${coordinates.lon},${coordinates.lat},${radius}`;
      
      url = new URL(POSTCODE_LIST_URL);
      url.searchParams.set("apiKey", API_KEY);
      url.searchParams.set("countrycode", "ro");
      url.searchParams.set("limit", "10");
      url.searchParams.set("geometry", "original");
      url.searchParams.set("filter", filter);
      url.searchParams.set("lang", "ro");

      const listResponse = await fetch(url.toString(), {
        method: "GET",
        headers: {
          "Accept": "application/json",
        },
      });

      if (listResponse.ok) {
        const listData: GeoapifyPostcodeResponse = await listResponse.json();
        
        // Convertim și rezultatele din List API
        if (listData.results && Array.isArray(listData.results)) {
          postcodeResults = listData.results;
        } else if (listData.features && Array.isArray(listData.features)) {
          postcodeResults = listData.features.map((feature) => ({
            postcode: feature.properties.postcode,
            country: feature.properties.country,
            country_code: feature.properties.country_code,
            city: feature.properties.city,
            county: feature.properties.county,
            state: feature.properties.state,
            lat: feature.properties.lat || feature.geometry.coordinates[1],
            lon: feature.properties.lon || feature.geometry.coordinates[0],
            formatted: feature.properties.formatted,
            street: feature.properties.street,
          }));
        }
        
        console.log(`[Geoapify] Postcode List API returned ${postcodeResults.length} results`);
      }
    }

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

    // Extrage codurile poștale din rezultate
    const postalCodeMap = new Map<string, PostalCodeResult>();

    if (postcodeResults.length > 0) {
      for (const result of postcodeResults) {
        const postcode = result.postcode;

        if (!postcode) continue;

        // Verifică dacă rezultatul se potrivește cu orașul sau județul
        const resultCity = normalizeName(result.city || "");
        const resultCounty = normalizeName(result.county || "");
        
        // Filtrează rezultatele care nu se potrivesc cu orașul sau județul
        const cityMatch = !resultCity || resultCity.includes(normalizedCity) || normalizedCity.includes(resultCity);
        const countyMatch = !resultCounty || resultCounty.includes(normalizedCounty) || normalizedCounty.includes(resultCounty);
        
        // Dacă nu se potrivește nici cu orașul, nici cu județul, skip
        if (resultCity && resultCounty && !cityMatch && !countyMatch) {
          console.log(`[Geoapify] Skipping result - city/county mismatch:`, {
            resultCity: result.city,
            resultCounty: result.county,
            expectedCity: city,
            expectedCounty: county,
          });
          continue;
        }

        // Dacă avem deja acest cod poștal, păstrăm primul (sau cel mai apropiat)
        if (!postalCodeMap.has(postcode)) {
          postalCodeMap.set(postcode, {
            postcode,
            formatted: result.formatted || `${postcode}, ${result.city || city}, ${result.county || county}`,
            address: {
              street: result.street,
              city: result.city || city,
              county: result.county || county,
              country: result.country || country,
            },
            confidence: cityMatch && countyMatch ? 1.0 : 0.8, // Confidence mai mare dacă se potrivește
            lat: result.lat,
            lon: result.lon,
          });
        }
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
