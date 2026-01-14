/**
 * Helper pentru procesarea PDF-ului cu coduri poștale
 * 
 * Acest fișier conține funcții helper pentru a procesa datele din PDF
 * și a le transforma în formatul necesar pentru sistem
 */

/**
 * Interfață pentru o intrare din PDF (județ + localitate + cod poștal)
 */
export interface PostalCodeEntry {
  county: string;
  locality: string;
  postcode: string;
}

/**
 * Transformă datele procesate din PDF în formatul pentru localities.ts
 * 
 * @param entries Array de intrări din PDF
 * @returns String TypeScript pentru a fi copiat în localities.ts
 */
export function generateLocalitiesCode(entries: PostalCodeEntry[]): string {
  // Grupează localitățile pe județe
  const byCounty: Record<string, Set<string>> = {};
  
  for (const entry of entries) {
    if (!byCounty[entry.county]) {
      byCounty[entry.county] = new Set();
    }
    byCounty[entry.county].add(entry.locality);
  }

  // Generează codul TypeScript
  let code = "export const LOCALITIES_BY_COUNTY: Record<string, string[]> = {\n";
  
  for (const [county, localities] of Object.entries(byCounty)) {
    const localitiesArray = Array.from(localities).sort();
    code += `  "${county}": [\n`;
    for (const locality of localitiesArray) {
      code += `    "${locality}",\n`;
    }
    code += `  ],\n`;
  }
  
  code += "};\n";
  
  return code;
}

/**
 * Validează că toate județele din entries există în lista oficială
 */
export function validateCounties(
  entries: PostalCodeEntry[],
  officialCounties: readonly string[]
): { valid: PostalCodeEntry[]; invalid: PostalCodeEntry[] } {
  const valid: PostalCodeEntry[] = [];
  const invalid: PostalCodeEntry[] = [];
  
  const officialSet = new Set(officialCounties.map(c => c.toLowerCase()));
  
  for (const entry of entries) {
    if (officialSet.has(entry.county.toLowerCase())) {
      valid.push(entry);
    } else {
      invalid.push(entry);
    }
  }
  
  return { valid, invalid };
}
