/**
 * Serviciu pentru autocomplete adrese folosind Geoapify Autocomplete API
 * 
 * Folosește Autocomplete API pentru a sugera adrese complete cu coduri poștale corecte
 * https://apidocs.geoapify.com/docs/geocoding/address-autocomplete/
 */

const API_KEY = process.env.GEOAPIFY_API_KEY || "2f1914bf75294bf3868ec63c7b4d043d";
const AUTOCOMPLETE_URL = "https://api.geoapify.com/v1/geocode/autocomplete";

export interface AutocompleteResult {
  formatted: string;
  address_line1: string;
  address_line2: string;
  postcode: string;
  city: string;
  county: string;
  state: string;
  country: string;
  country_code: string;
  street: string;
  housenumber: string;
  lat: number;
  lon: number;
  place_id: string;
  confidence: number;
  result_type: string;
}

export interface AutocompleteResponse {
  results: AutocompleteResult[];
  query: {
    text: string;
    parsed: {
      city?: string;
      expected_type: string;
    };
  };
}

/**
 * Caută sugestii de adrese folosind Autocomplete API
 */
export async function searchAddressAutocomplete(
  text: string,
  options: {
    limit?: number;
    filter?: string;
    bias?: string;
    lang?: string;
  } = {}
): Promise<AutocompleteResult[]> {
  if (!text || text.trim().length < 2) {
    return [];
  }

  const {
    limit = 10,
    filter = "countrycode:ro", // Doar România
    bias,
    lang = "ro",
  } = options;

  try {
    const url = new URL(AUTOCOMPLETE_URL);
    url.searchParams.set("text", text.trim());
    url.searchParams.set("apiKey", API_KEY);
    url.searchParams.set("limit", limit.toString());
    url.searchParams.set("filter", filter);
    url.searchParams.set("lang", lang);
    url.searchParams.set("format", "json");

    if (bias) {
      url.searchParams.set("bias", bias);
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Geoapify Autocomplete] Error:", response.status, errorText);
      throw new Error(`Geoapify API error: ${response.status}`);
    }

    const data: AutocompleteResponse = await response.json();
    return data.results || [];
  } catch (error) {
    console.error("[Geoapify Autocomplete] Error:", error);
    throw error;
  }
}

/**
 * Caută sugestii pentru un câmp specific (județ, localitate, stradă)
 */
export async function searchByType(
  text: string,
  type: "county" | "city" | "street" | "postcode",
  options: {
    limit?: number;
    filter?: string;
    bias?: string;
  } = {}
): Promise<AutocompleteResult[]> {
  const {
    limit = 10,
    filter = "countrycode:ro",
    bias,
  } = options;

  try {
    const url = new URL(AUTOCOMPLETE_URL);
    url.searchParams.set("text", text.trim());
    url.searchParams.set("apiKey", API_KEY);
    url.searchParams.set("type", type);
    url.searchParams.set("limit", limit.toString());
    url.searchParams.set("filter", filter);
    url.searchParams.set("lang", "ro");
    url.searchParams.set("format", "json");

    if (bias) {
      url.searchParams.set("bias", bias);
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Geoapify Autocomplete] Error:", response.status, errorText);
      throw new Error(`Geoapify API error: ${response.status}`);
    }

    const data: AutocompleteResponse = await response.json();
    return data.results || [];
  } catch (error) {
    console.error("[Geoapify Autocomplete] Error:", error);
    throw error;
  }
}
