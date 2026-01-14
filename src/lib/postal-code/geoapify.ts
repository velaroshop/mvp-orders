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
/**
 * Obține codul poștal direct din Geocoding API (cea mai precisă metodă)
 * Geocoding API returnează codul poștal direct în răspuns pentru adrese complete
 */
async function getPostalCodeFromGeocoding(
  address: string,
  city: string,
  county: string,
  country: string = "Romania",
  houseNumber?: string
): Promise<PostalCodeResult[]> {
  // Construiește adresa completă pentru geocoding
  let searchText: string;
  if (houseNumber) {
    searchText = `${address} ${houseNumber}, ${city}, ${county}, ${country}`;
  } else {
    searchText = `${address}, ${city}, ${county}, ${country}`;
  }
  
  console.log("[Geoapify] Geocoding address for direct postcode:", searchText);

  try {
    const url = new URL(GEOCODING_URL);
    url.searchParams.set("text", searchText);
    url.searchParams.set("apiKey", API_KEY);
    url.searchParams.set("limit", "5"); // Luăm mai multe rezultate pentru a avea variante
    url.searchParams.set("filter", "countrycode:ro");
    url.searchParams.set("lang", "ro");
    url.searchParams.set("format", "geojson");

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
      console.warn("[Geoapify] No results from geocoding:", searchText);
      return [];
    }

    // Normalizează pentru matching
    function normalizeName(name: string): string {
      return (name || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
    }

    function normalizeStreetName(streetName: string): string {
      if (!streetName) return "";
      const normalized = normalizeName(streetName);
      return normalized
        .replace(/^(strada|str|bd|bulevardul|bulevard|calea|cal)\s+/i, "")
        .replace(/\s+/g, " ")
        .trim();
    }

    const normalizedCity = normalizeName(city);
    const normalizedCounty = normalizeName(county);
    const normalizedStreet = normalizeStreetName(address);

    const results: PostalCodeResult[] = [];
    const seenPostcodes = new Map<string, PostalCodeResult>();

    for (const feature of data.features) {
      const props = feature.properties;
      const postcode = props.postcode;

      if (!postcode) {
        continue;
      }

      const resultCity = normalizeName(props.city || "");
      const resultCounty = normalizeName(props.county || "");
      const resultStreet = normalizeStreetName(props.street || "");

      // Verifică matching
      const cityMatch = resultCity === normalizedCity || 
                       (resultCity && normalizedCity && (resultCity.includes(normalizedCity) || normalizedCity.includes(resultCity)));
      const countyMatch = !resultCounty || resultCounty === normalizedCounty || 
                        resultCounty.includes(normalizedCounty) || normalizedCounty.includes(resultCounty);
      const streetMatch = normalizedStreet && resultStreet && (
        resultStreet.includes(normalizedStreet) || 
        normalizedStreet.includes(resultStreet) ||
        resultStreet === normalizedStreet
      );

      // Calculăm confidence bazat pe matching (mai strict pentru geocoding)
      // Pentru geocoding, vrem doar rezultate foarte bune, altfel folosim postcode search
      let confidence = 0.3; // Default mai mic pentru geocoding
      if (streetMatch && cityMatch && countyMatch) {
        confidence = 1.0; // Perfect match - doar acestea sunt acceptabile din geocoding
      } else if (streetMatch && cityMatch) {
        confidence = 0.95;
      } else if (streetMatch && countyMatch) {
        confidence = 0.9;
      } else if (cityMatch && countyMatch && normalizedStreet.length < 5) {
        // Dacă strada este foarte scurtă sau nu am putut face matching, dar orașul și județul se potrivesc
        confidence = 0.85;
      }
      // Dacă nu avem matching bun cu strada, confidence rămâne mic (0.3) și va folosi fallback

      // Dacă avem deja acest cod poștal, păstrăm cel cu confidence mai mare
      const existing = seenPostcodes.get(postcode);
      if (!existing || confidence > existing.confidence) {
        const coordinates = feature.geometry.coordinates;
        
        const result: PostalCodeResult = {
          postcode,
          formatted: `${postcode}, ${city}, ${county}`,
          address: {
            street: props.street || address,
            city: props.city || city,
            county: props.county || county,
            country: props.country || country,
          },
          confidence,
          lat: coordinates[1],
          lon: coordinates[0],
        };

        seenPostcodes.set(postcode, result);
      }
    }

    // Convertim Map în array și sortăm
    const resultsArray = Array.from(seenPostcodes.values());
    resultsArray.sort((a, b) => b.confidence - a.confidence);

    console.log(`[Geoapify] Found ${resultsArray.length} postal codes from geocoding`);
    return resultsArray;
  } catch (error) {
    console.error("[Geoapify] Error getting postal code from geocoding:", error);
    return []; // Return empty array, va folosi fallback
  }
}

async function getCoordinates(
  address: string,
  city: string,
  county: string,
  country: string = "Romania",
  houseNumber?: string
): Promise<{ lat: number; lon: number } | null> {
  // Construiește adresa completă pentru geocoding
  // Include numărul de casă dacă este disponibil pentru precizie mai mare
  let searchText: string;
  if (houseNumber) {
    // Dacă avem număr de casă, îl includem explicit în query pentru precizie mai mare
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
  country: string = "Romania",
  houseNumber?: string
): Promise<PostalCodeResult[]> {
  console.log("[Geoapify] Searching postal codes for:", { address, city, county, houseNumber });

  try {
    // Pasul 1: Încercăm să obținem codul poștal direct din Geocoding API
    // Dar doar dacă avem matching bun (confidence >= 0.9 pentru cel puțin un rezultat)
    const geocodingResults = await getPostalCodeFromGeocoding(address, city, county, country, houseNumber);
    
    // Verificăm dacă avem rezultate cu confidence bun
    const goodResults = geocodingResults.filter(r => r.confidence >= 0.85);
    
    if (goodResults.length > 0) {
      console.log(`[Geoapify] Using postal codes from geocoding (${goodResults.length} high-confidence results)`);
      // Sortăm după confidence și returnăm maxim 3
      const sorted = goodResults.sort((a, b) => b.confidence - a.confidence);
      return sorted.slice(0, 3);
    }

    console.log("[Geoapify] Geocoding results not confident enough, using postcode search API with coordinates...");
    
    // Pasul 2: Folosim metoda cu coordonate → postcode search (mai precisă pentru adrese)
    // Obține coordonatele pentru adresă (include numărul de casă dacă este disponibil)
    const coordinates = await getCoordinates(address, city, county, country, houseNumber);
    
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

    const data: any = await response.json();

    // Postcode Search API returnează GeoJSON format cu `features` array
    let postcodeResults: Array<any> = [];
    
    if (data.results && Array.isArray(data.results)) {
      // Format JSON cu results array
      postcodeResults = data.results;
    } else if (data.features && Array.isArray(data.features)) {
      // Format GeoJSON cu features array
      postcodeResults = data.features.map((feature: any) => {
        const props = feature.properties || {};
        const coords = feature.geometry?.coordinates || [];
        
        return {
          postcode: props.postcode,
          country: props.country,
          country_code: props.country_code,
          city: props.city,
          county: props.county,
          state: props.state,
          // Coordonatele pot fi în properties sau în geometry.coordinates
          lat: props.lat || coords[1] || null,
          lon: props.lon || coords[0] || null,
          formatted: props.formatted || props.address_line1,
          street: props.street,
          distance: props.distance, // Distanța de la coordonatele căutate
        };
      });
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
        const listData: any = await listResponse.json();
        
        // Convertim și rezultatele din List API (poate fi JSON sau GeoJSON)
        if (listData.results && Array.isArray(listData.results)) {
          postcodeResults = listData.results;
        } else if (listData.features && Array.isArray(listData.features)) {
          postcodeResults = listData.features.map((feature: any) => {
            const props = feature.properties || {};
            const coords = feature.geometry?.coordinates || [];
            
            return {
              postcode: props.postcode,
              country: props.country,
              country_code: props.country_code,
              city: props.city,
              county: props.county,
              state: props.state,
              lat: props.lat || coords[1] || null,
              lon: props.lon || coords[0] || null,
              formatted: props.formatted || props.address_line1,
              street: props.street,
              distance: props.distance,
            };
          });
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

    // Normalizează numele străzii pentru matching (elimină prefixe comune)
    function normalizeStreetName(streetName: string): string {
      if (!streetName) return "";
      const normalized = normalizeName(streetName);
      // Elimină prefixe comune: "strada", "str", "bd", "bulevardul", etc.
      return normalized
        .replace(/^(strada|str|bd|bulevardul|bulevard|calea|cal)\s+/i, "")
        .replace(/\s+/g, " ")
        .trim();
    }

    const normalizedCity = normalizeName(city);
    const normalizedCounty = normalizeName(county);
    const normalizedStreet = normalizeStreetName(address);

    // Extrage codurile poștale din rezultate
    const postalCodeMap = new Map<string, PostalCodeResult>();

    if (postcodeResults.length > 0) {
      for (const result of postcodeResults) {
        const postcode = result.postcode;

        if (!postcode) continue;

        // Verifică dacă rezultatul se potrivește cu orașul sau județul
        const resultCity = normalizeName(result.city || "");
        const resultCounty = normalizeName(result.county || "");
        const resultStreet = normalizeStreetName(result.street || "");
        
        // Verificare matching pentru localitate
        const cityMatchExact = resultCity === normalizedCity;
        const cityMatchPartial = resultCity && normalizedCity && (
          resultCity.includes(normalizedCity) || normalizedCity.includes(resultCity)
        );
        const cityMatch = cityMatchExact || cityMatchPartial;
        
        // Verificare matching pentru județ
        const countyMatch = !resultCounty || resultCounty === normalizedCounty || 
                          resultCounty.includes(normalizedCounty) || normalizedCounty.includes(resultCounty);
        
        // Verificare matching pentru stradă (foarte important pentru precizie!)
        const streetMatch = normalizedStreet && resultStreet && (
          resultStreet.includes(normalizedStreet) || 
          normalizedStreet.includes(resultStreet) ||
          resultStreet === normalizedStreet
        );
        
        // IMPORTANT: Nu eliminăm rezultatele care nu se potrivesc cu localitatea
        // Geoapify poate returna codul poștal corect chiar dacă localitatea din rezultat este diferită
        // Eliminăm doar rezultatele care nu se potrivesc nici cu județul
        if (resultCounty && !countyMatch) {
          console.log(`[Geoapify] Skipping result - county mismatch:`, {
            resultCity: result.city,
            resultCounty: result.county,
            expectedCity: city,
            expectedCounty: county,
          });
          continue;
        }

        // Dacă avem deja acest cod poștal, păstrăm cel mai apropiat (cu distanță mai mică)
        // Dar prioritizăm rezultatele care se potrivesc cu localitatea
        const existing = postalCodeMap.get(postcode);
        const distance = result.distance || Infinity;
        
        // Folosim ÎNTOTDEAUNA localitatea sanitizată în formatted, nu cea din rezultatul Geoapify
        // Asta previne situațiile când Geoapify returnează codul postal corect dar cu localitatea greșită
        const useCity = city; // Folosim localitatea căutată/sanitizată
        const useCounty = county; // Folosim județul căutat/sanitizat
        
        // Calculăm confidence: prioritizăm matching-ul străzii!
        // Street match = cel mai important pentru precizie
        let confidence = 0.5; // Default pentru rezultate care se potrivesc doar cu județul
        if (streetMatch && cityMatchExact && countyMatch) {
          confidence = 1.0; // Perfect match: stradă + localitate + județ
        } else if (streetMatch && cityMatch && countyMatch) {
          confidence = 0.95; // Stradă match + partial city match
        } else if (streetMatch && countyMatch) {
          confidence = 0.9; // Stradă match (foarte important!)
        } else if (cityMatchExact && countyMatch) {
          confidence = 0.85; // Perfect city match fără stradă
        } else if (cityMatch && countyMatch) {
          confidence = 0.8; // Partial city match
        } else if (countyMatch) {
          confidence = 0.7; // Only county match
        }
        
        // Dacă nu există deja sau dacă acest rezultat are confidence mai mare sau distanță mai mică
        const shouldReplace = !existing || 
          (confidence > (existing.confidence || 0)) ||
          (confidence === existing.confidence && distance < ((existing as any).distance || Infinity));
        
        if (shouldReplace) {
          postalCodeMap.set(postcode, {
            postcode,
            formatted: `${postcode}, ${useCity}, ${useCounty}`,
            address: {
              street: result.street || address, // Păstrăm strada din rezultat dacă există
              city: useCity,
              county: useCounty,
              country: result.country || country,
            },
            confidence,
            lat: result.lat,
            lon: result.lon,
          });
          
          // Păstrăm distanța și informații despre matching pentru sortare
          (postalCodeMap.get(postcode) as any).distance = distance;
          (postalCodeMap.get(postcode) as any).streetMatch = streetMatch;
        }
      }
    }

    // Sortează după confidence și distanță (mai întâi confidence, apoi distanță)
    const results = Array.from(postalCodeMap.values()).sort((a, b) => {
      // Mai întâi după confidence (descrescător)
      if (b.confidence !== a.confidence) {
        return b.confidence - a.confidence;
      }
      // Apoi după distanță (crescător - mai aproape = mai bun)
      const distA = (a as any).distance || Infinity;
      const distB = (b as any).distance || Infinity;
      return distA - distB;
    });

    // Returnează maxim 3 rezultate (cele mai relevante)
    // Dacă avem mai multe rezultate, le limităm la primele 3 pentru a oferi variante clare
    const limitedResults = results.slice(0, 3);

    console.log(`[Geoapify] Found ${results.length} unique postal codes, returning top ${limitedResults.length}`);
    return limitedResults;
  } catch (error) {
    console.error("[Geoapify] Error searching postal codes:", error);
    throw error;
  }
}
