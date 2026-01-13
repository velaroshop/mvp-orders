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

export interface GeoapifyResponse {
  type: string;
  features: Array<{
    type: string;
    properties: {
      postcode?: string;
      formatted?: string;
      street?: string;
      city?: string;
      county?: string;
      country?: string;
      country_code?: string;
      lat?: number;
      lon?: number;
      rank?: {
        confidence?: number;
      };
    };
    geometry: {
      type: string;
      coordinates: [number, number];
    };
  }>;
  query: {
    text: string;
  };
}
