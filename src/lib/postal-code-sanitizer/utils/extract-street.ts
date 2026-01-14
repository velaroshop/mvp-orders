/**
 * Utilitare pentru extragerea numărului din adresă și normalizarea străzii
 */

/**
 * Extrage numărul din adresă și returnează strada fără număr
 * Ex: "str viilor numaru 5a" -> { street: "str viilor", number: "5a" }
 * Ex: "Strada Logovat nr. 3" -> { street: "Strada Logovat", number: "3" }
 */
export function extractStreetAndNumber(address: string): { street: string; number?: string } {
  if (!address) return { street: address };

  // Pattern-uri comune pentru număr: "nr. 5", "număr 5", "nr 5", "5", "5a", etc.
  const patterns = [
    /\s+(nr|număr|numar|no|#)\s*\.?\s*(\d+[a-z]?)\s*$/i,  // "nr. 5", "număr 5a"
    /\s+(\d+[a-z]?)\s*$/,                                    // "5", "5a" la sfârșit
  ];

  for (const pattern of patterns) {
    const match = address.match(pattern);
    if (match) {
      const number = match[2] || match[1]; // Prima grupă sau a doua
      const street = address.substring(0, match.index).trim();
      return { street, number };
    }
  }

  // Dacă nu găsește pattern, returnează adresa completă
  return { street: address.trim() };
}

/**
 * Normalizează numele străzii (capitalizează prima literă, elimină spații multiple)
 */
export function normalizeStreetName(street: string): string {
  if (!street) return street;

  return street
    .split(/\s+/)
    .map(word => {
      // Păstrează abrevierea "str" lowercase
      if (word.toLowerCase() === "str" || word.toLowerCase() === "str.") {
        return "str";
      }
      // Capitalizează prima literă
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}
