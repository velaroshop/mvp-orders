/**
 * Tipuri pentru sistemul de sanitizare și căutare coduri poștale
 */

export interface SanitizedAddress {
  county: string;      // Județ sanitizat
  city: string;        // Localitate sanitizată
  street: string;      // Stradă sanitizată (fără număr)
  number?: string;     // Număr (dacă există)
  original: {
    county: string;
    city: string;
    address: string;
  };
}

export interface PostalCodeSearchResult {
  postcode: string;
  formatted: string;
  confidence: number;
  sanitizedAddress: SanitizedAddress;
}
