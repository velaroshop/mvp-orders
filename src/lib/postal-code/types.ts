/**
 * Tipuri pentru serviciul de căutare coduri poștale
 */

export interface PostalCodeResult {
  postcode: string;
  formatted: string;
  address: {
    street?: string;
    city?: string;
    county?: string;
    country?: string;
  };
  confidence: number;
  lat?: number;
  lon?: number;
}

// Tipuri pentru Geocoding API response
export interface GeoapifyGeocodingResponse {
  type: string;
  features: Array<{
    type: string;
    properties: {
      formatted?: string;
      street?: string;
      city?: string;
      county?: string;
      country?: string;
      country_code?: string;
      postcode?: string; // Codul poștal direct din geocoding
      lat?: number;
      lon?: number;
      rank?: {
        confidence?: number; // Confidence score pentru rezultat (0-1)
        confidence_city_level?: number; // City-level confidence (0-1)
        confidence_street_level?: number; // Street-level confidence (0-1)
        confidence_building_level?: number; // Building-level confidence (0-1)
        match_type?: string; // full_match, inner_part, match_by_building, match_by_street, match_by_postcode, etc.
      };
      result_type?: string; // unknown, amenity, building, street, suburb, district, postcode, city, county, state, country
    };
    geometry: {
      type: string;
      coordinates: [number, number]; // [lon, lat]
    };
  }>;
  query: {
    text: string;
  };
}

// Tipuri pentru Postcode Search API response (poate returna direct un array sau un obiect cu results)
export interface GeoapifyPostcodeResponse {
  results?: Array<{
    postcode: string;
    country: string;
    country_code: string;
    city?: string;
    county?: string;
    state?: string;
    lat: number;
    lon: number;
    formatted?: string;
    street?: string;
  }>;
  // Sau poate returna direct un array (GeoJSON FeatureCollection)
  type?: string;
  features?: Array<{
    type: string;
    properties: {
      postcode?: string;
      country?: string;
      country_code?: string;
      city?: string;
      county?: string;
      state?: string;
      lat?: number;
      lon?: number;
      formatted?: string;
      street?: string;
    };
    geometry: {
      type: string;
      coordinates: [number, number];
    };
  }>;
}
