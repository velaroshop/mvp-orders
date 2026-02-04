import { NextRequest, NextResponse } from "next/server";
import postalCodesData from "@/data/postal-codes-normalized.json";

interface PostalCodeEntry {
  county: string;
  county_normalized: string;
  city: string;
  city_normalized: string;
  street_type: string;
  street_name: string;
  street_normalized: string;
  number: string;
  postal_code: string;
  sector?: string;
  siruta: string | number;
  sheet: string;
}

// County abbreviation map for normalization
const countyAbbrevMap: Record<string, string> = {
  'vl': 'valcea',
  'vilcea': 'valcea',
  'mh': 'mures',
  'b': 'bucuresti',
  'if': 'ilfov',
  'cj': 'cluj',
  'tm': 'timis',
  'is': 'iasi',
  'ct': 'constanta',
  'bv': 'brasov',
  'br': 'braila',
  'db': 'dambovita',
  'dj': 'dolj',
  'gl': 'galati',
  'ph': 'prahova',
  'sb': 'sibiu',
  'bh': 'bihor',
  'bc': 'bacau',
  'ar': 'arad',
  'ag': 'arges',
  'ab': 'alba',
  'bt': 'botosani',
  'cv': 'covasna',
  'cs': 'caras-severin',
  'cl': 'calarasi',
  'gj': 'gorj',
  'hr': 'harghita',
  'hd': 'hunedoara',
  'il': 'ialomita',
  'mm': 'maramures',
  'ms': 'mures',
  'nt': 'neamt',
  'ot': 'olt',
  'sm': 'satu mare',
  'sj': 'salaj',
  'sv': 'suceava',
  'tr': 'teleorman',
  'vs': 'vaslui',
  'vn': 'vrancea',
};

// Normalize text (remove diacritics, lowercase)
function normalize(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ş/g, 's')
    .replace(/ș/g, 's')
    .replace(/ţ/g, 't')
    .replace(/ț/g, 't')
    .replace(/ă/g, 'a')
    .replace(/â/g, 'a')
    .replace(/î/g, 'i')
    .trim();
}

// Common city abbreviations map
const cityAbbrevMap: Record<string, string> = {
  'rm': 'ramnicu',
  'rm.': 'ramnicu',
  'sf': 'sfantu',
  'sf.': 'sfantu',
  'tg': 'targu',
  'tg.': 'targu',
  'dr': 'drobeta',
  'dr.': 'drobeta',
  'turnu': 'turnu',
};

// Parse village/commune from input like "Sat.candesti Com. Dumbrăveni" or "Candesti, Dumbraveni"
// Returns { village, commune } where village is the main locality name and commune is optional context
interface VillageCommuneParsed {
  village: string;      // The main locality name (sat/oraș)
  commune: string | null; // The commune name if provided
}

function parseVillageCommune(text: string): VillageCommuneParsed {
  if (!text) return { village: '', commune: null };

  const normalized = text.toLowerCase().trim();

  // Pattern 1: "sat.X com.Y" or "sat X com Y" or "satul X comuna Y"
  // Matches: "sat.candesti com. dumbraveni", "sat candesti com dumbraveni", "satul boureni comuna bals"
  const satComMatch = normalized.match(/(?:sat(?:ul)?\.?\s*)([^,]+?)(?:\s+com(?:una)?\.?\s*)(.+)/i);
  if (satComMatch) {
    return {
      village: satComMatch[1].trim(),
      commune: satComMatch[2].trim(),
    };
  }

  // Pattern 2: "X, Y" (comma separated) - first is village, second is commune
  if (normalized.includes(',')) {
    const parts = normalized.split(',').map(p => p.trim());
    if (parts.length >= 2 && parts[0] && parts[1]) {
      return {
        village: parts[0],
        commune: parts[1],
      };
    }
  }

  // Pattern 3: "X (Y)" - village with commune in parentheses
  const parenMatch = normalized.match(/^([^(]+)\s*\(([^)]+)\)/);
  if (parenMatch) {
    return {
      village: parenMatch[1].trim(),
      commune: parenMatch[2].trim(),
    };
  }

  // No commune info detected - return just the cleaned village name
  return { village: normalized, commune: null };
}

// Clean city input by removing common locality prefixes
// Examples: "sat boureni" -> "boureni", "com. motca" -> "motca"
// Also expands abbreviations: "rm valcea" -> "ramnicu valcea"
function cleanCityInput(text: string): string {
  if (!text) return '';

  // List of common prefixes to remove
  const prefixes = [
    'satul',
    'sat',
    'comuna',
    'com.',
    'com',
    'oras',
    'orasul',
    'municipiu',
    'municipiul',
  ];

  let cleaned = text;

  // Remove prefixes (case insensitive, with word boundaries)
  for (const prefix of prefixes) {
    // Match prefix at start or after comma/space
    const regex = new RegExp(`(^|,\\s*|\\s+)${prefix}\\s+`, 'gi');
    cleaned = cleaned.replace(regex, '$1');
  }

  // Expand city abbreviations (rm -> ramnicu, tg -> targu, etc.)
  const words = cleaned.split(/\s+/);
  const expandedWords = words.map(word => {
    const lowerWord = word.toLowerCase();
    return cityAbbrevMap[lowerWord] || word;
  });
  cleaned = expandedWords.join(' ');

  // Clean up extra spaces and commas
  cleaned = cleaned.replace(/\s+/g, ' ').replace(/,\s*,/g, ',').trim();

  return cleaned;
}

// Calculate Levenshtein distance for fuzzy matching
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[len1][len2];
}

// Calculate similarity score (0-1, higher is better)
function similarityScore(str1: string, str2: string): number {
  const distance = levenshteinDistance(str1, str2);
  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return 1;
  return 1 - distance / maxLen;
}

// Map user input street type words (normalized, no diacritics) to DB street_type values
// DB uses: Stradă, Bulevard, Splai, Aleea, Şosea/Șosea, Calea, Piaţă/Piață, Intrare, Prelungire, Drum, Fundătură
const streetTypeMap: Record<string, string> = {
  // Stradă
  'strada': 'strada', 'str': 'strada', 'strad': 'strada', 'strd': 'strada',
  // Bulevard
  'bulevardul': 'bulevard', 'bulevard': 'bulevard', 'blvd': 'bulevard', 'blv': 'bulevard',
  'bld': 'bulevard', 'bul': 'bulevard', 'bd': 'bulevard',
  // Splai
  'splaiul': 'splai', 'splai': 'splai',
  // Aleea
  'aleea': 'aleea', 'alee': 'aleea',
  // Șosea
  'soseaua': 'sosea', 'sosea': 'sosea', 'sos': 'sosea',
  // Calea
  'calea': 'calea', 'cal': 'calea',
  // Piața
  'piata': 'piata', 'p-ta': 'piata',
  // Intrarea
  'intrarea': 'intrare', 'intr': 'intrare',
  // Prelungirea
  'prelungirea': 'prelungire', 'prel': 'prelungire',
  // Drumul
  'drumul': 'drum', 'drum': 'drum',
  // Fundătura
  'fundatura': 'fundatura', 'fund': 'fundatura',
};

// All street type words to ignore in word matching (after type has been extracted)
const streetTypeWords = new Set(Object.keys(streetTypeMap));

// Extract street type from normalized user input and return { type, cleanedStreet }
// Handles cases like "Strada Splaiul Unirii" where the real type is "Splaiul" (2nd word)
function extractStreetType(streetNorm: string): { userType: string | null; cleanedStreet: string } {
  const words = streetNorm.split(/\s+/);
  if (words.length === 0) return { userType: null, cleanedStreet: streetNorm };

  const firstType = streetTypeMap[words[0]];

  // If first word is "strada" and second word is a more specific type (splai, bulevard, etc.),
  // use the second word as the real type. "Strada Splaiul Unirii" -> type = "splai"
  if (firstType === 'strada' && words.length > 1 && streetTypeMap[words[1]] && streetTypeMap[words[1]] !== 'strada') {
    return {
      userType: streetTypeMap[words[1]],
      cleanedStreet: words.slice(2).join(' '),
    };
  }

  // Standard case: first word is the type
  if (firstType) {
    return {
      userType: firstType,
      cleanedStreet: words.slice(1).join(' '),
    };
  }

  return { userType: null, cleanedStreet: streetNorm };
}

// Normalize a DB street_type for comparison (remove diacritics, lowercase)
function normalizeStreetType(dbType: string): string {
  return normalize(dbType);
}

// Extract street number from user input
// Examples: "splaiul unirii 165" → 165, "str mihai eminescu nr 42" → 42, "unirii nr. 10A" → 10
function extractStreetNumber(streetNorm: string): number | null {
  // Try "nr" / "nr." / "numar" followed by a number
  const nrMatch = streetNorm.match(/(?:nr\.?|numar|no\.?)\s*(\d+)/i);
  if (nrMatch) return parseInt(nrMatch[1], 10);

  // Try a standalone number at the end of the string (e.g., "unirii 165")
  const endMatch = streetNorm.match(/\s(\d+)\s*$/);
  if (endMatch) return parseInt(endMatch[1], 10);

  // Try a standalone number anywhere (last resort, pick last number that's not a street type word neighbor)
  const allNumbers = [...streetNorm.matchAll(/(?:^|\s)(\d+)(?:\s|$)/g)];
  if (allNumbers.length > 0) {
    return parseInt(allNumbers[allNumbers.length - 1][1], 10);
  }

  return null;
}

// Parse DB number field into a numeric range
// Formats: "nr. 159-171" → {min:159, max:171}, "nr. 8" → {min:8, max:8},
//          "nr. 633-T" → {min:633, max:Infinity} (open-ended)
function parseNumberRange(numberField: string): { min: number; max: number } | null {
  if (!numberField) return null;

  // Match "nr. X-Y" or "nr. X - Y" (standard range)
  const rangeMatch = numberField.match(/(\d+)\s*-\s*(\d+)/);
  if (rangeMatch) {
    return { min: parseInt(rangeMatch[1], 10), max: parseInt(rangeMatch[2], 10) };
  }

  // Match "nr. X-T" (open-ended, T = terminus)
  const openEndMatch = numberField.match(/(\d+)\s*-\s*T/i);
  if (openEndMatch) {
    return { min: parseInt(openEndMatch[1], 10), max: Infinity };
  }

  // Match single number "nr. X"
  const singleMatch = numberField.match(/(\d+)/);
  if (singleMatch) {
    return { min: parseInt(singleMatch[1], 10), max: parseInt(singleMatch[1], 10) };
  }

  return null;
}

// Check if street names match with word order flexibility
// Example: "henri coanda" matches "coanda henri"
function streetWordsMatch(userStreet: string, dbStreet: string): number {
  // Split into words and filter out street type words and number markers
  const ignoreWords = new Set([
    // Number markers
    'nr', 'nr.', 'numar', 'numar', 'no',
    // Block/apartment markers (sometimes included in address)
    'bl', 'bloc', 'sc', 'scara', 'et', 'etaj', 'ap', 'apartament',
  ]);

  const userWords = userStreet
    .split(/\s+/)
    .filter(w => w.length > 2 && !ignoreWords.has(w) && !streetTypeWords.has(w) && !/^\d+[-]?\d*[a-z]?$/i.test(w));

  const dbWords = dbStreet
    .split(/\s+/)
    .filter(w => w.length > 2 && !ignoreWords.has(w) && !streetTypeWords.has(w) && !/^\d+[-]?\d*[a-z]?$/i.test(w));

  if (userWords.length === 0 || dbWords.length === 0) {
    return 0;
  }

  // Count how many user words are found in DB street (in any position)
  let matchedWords = 0;
  for (const userWord of userWords) {
    for (const dbWord of dbWords) {
      // Check if words are similar (handles typos)
      const wordSimilarity = similarityScore(userWord, dbWord);
      if (wordSimilarity >= 0.8) {
        matchedWords++;
        break;
      }
    }
  }

  // Return ratio of matched words
  return matchedWords / userWords.length;
}

/**
 * POST /api/postal-code-search
 * Search for postal codes based on county, city, and street
 * Returns top 3 matches with confidence scores
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { county, city, street } = body;

    if (!county || !city) {
      return NextResponse.json(
        { error: "County and city are required" },
        { status: 400 }
      );
    }

    // Clean and normalize inputs
    let countyNorm = normalize(county);
    const cityClean = cleanCityInput(city); // Remove "sat", "com.", etc.
    const cityNorm = normalize(cityClean);
    const streetNorm = street ? normalize(street) : '';

    // Parse village/commune from city input (handles "Sat.X Com.Y", "X, Y", "X (Y)" formats)
    const parsedCity = parseVillageCommune(city);
    const userVillage = normalize(parsedCity.village);
    const userCommune = parsedCity.commune ? normalize(parsedCity.commune) : null;

    // Check if county is abbreviated and expand it
    if (countyAbbrevMap[countyNorm]) {
      countyNorm = countyAbbrevMap[countyNorm];
    }

    // Extract street type from user input (e.g., "splaiul" -> "splai")
    const { userType: userStreetType, cleanedStreet: streetWithoutType } = extractStreetType(streetNorm);

    // Extract street number from user input (e.g., "splaiul unirii 165" -> 165)
    const userStreetNumber = extractStreetNumber(streetNorm);

    console.log('Search params:', { county, city, street });
    console.log('Cleaned city:', cityClean);
    console.log('Parsed village/commune:', { village: userVillage, commune: userCommune });
    console.log('Normalized:', { countyNorm, cityNorm, streetNorm, userStreetType, userStreetNumber });

    const data = postalCodesData as PostalCodeEntry[];
    const matches: Array<{
      entry: PostalCodeEntry;
      score: number;
      countyScore: number;
      cityScore: number;
      streetScore: number;
    }> = [];

    // Search through all entries
    for (const entry of data) {
      // County matching
      const countyScore = similarityScore(countyNorm, entry.county_normalized);
      if (countyScore < 0.7) continue; // Skip if county doesn't match well

      // City matching with village/commune handling
      // Uses parseVillageCommune() to handle formats like:
      // - "Sat.candesti Com. Dumbrăveni" → village="candesti", commune="dumbraveni"
      // - "Candesti, Dumbraveni" → village="candesti", commune="dumbraveni"
      // - "Candesti" → village="candesti", commune=null
      //
      // DB format note: "Village (Commune)" only when village exists in multiple communes
      // If village is unique in Romania, it's stored as just "Village"
      let cityScore = 0;
      const dbCityNorm = entry.city_normalized;

      // Check if DB city has parenthesis (e.g., "candesti (dumbraveni)")
      // This means the village name exists in multiple communes
      const dbHasParenthesis = dbCityNorm.includes('(');

      if (dbHasParenthesis) {
        // Extract village and commune from DB: "candesti (dumbraveni)" -> "candesti", "dumbraveni"
        const dbVillage = dbCityNorm.split('(')[0].trim();
        const dbCommune = dbCityNorm.split('(')[1]?.replace(')', '').trim() || '';

        // Match village name
        const villageScore = similarityScore(userVillage, dbVillage);

        if (userCommune) {
          // User provided commune info - check if it matches DB commune
          const communeScore = similarityScore(userCommune, dbCommune);

          if (communeScore >= 0.7) {
            // Commune matches: high priority - this is THE village we want
            // Weight village 50%, commune 50%, ensure minimum 0.95 if both match well
            cityScore = Math.max(villageScore * 0.5 + communeScore * 0.5, villageScore >= 0.7 ? 0.95 : 0.8);
          } else {
            // Commune doesn't match: PENALIZE - this is a different village with same name
            // Even if village name matches perfectly, wrong commune is bad
            cityScore = villageScore * 0.5;
          }
        } else {
          // No commune in user input - match on village name only
          // Can't verify which commune, so use village match score
          cityScore = villageScore;
        }
      } else {
        // DB has no parenthesis - village name is unique in Romania
        // Standard matching: just compare against the village name
        const villageScore = similarityScore(userVillage, dbCityNorm);

        // Also try full normalized city input in case parsing removed something
        const fullScore = similarityScore(cityNorm, dbCityNorm);

        // If user provided commune, check if it appears in DB city (some entries might be communes)
        let communeBonus = 0;
        if (userCommune) {
          // Check if user's commune is contained in or matches the DB entry
          const communeMatch = similarityScore(userCommune, dbCityNorm);
          if (communeMatch >= 0.7) {
            // The DB entry might be the commune itself
            communeBonus = 0.1;
          }
        }

        cityScore = Math.max(villageScore, fullScore) + communeBonus;
        cityScore = Math.min(cityScore, 1.0);
      }

      if (cityScore < 0.6) continue; // Skip if city doesn't match well

      // Street matching (if provided and entry has street data)
      let streetScore = 1.0;
      if (streetNorm && entry.street_normalized) {
        // Compare street name (without type) against DB street_normalized
        const streetToCompare = streetWithoutType || streetNorm;

        // Method 1: Check if street name is contained or vice versa
        if (entry.street_normalized.includes(streetToCompare) || streetToCompare.includes(entry.street_normalized)) {
          streetScore = 0.95; // High score for partial match
        } else {
          // Method 2: Try word-by-word matching (handles reversed names like "henri coanda" vs "coanda henri")
          const wordMatchScore = streetWordsMatch(streetNorm, entry.street_normalized);

          // Method 3: Full string similarity (use cleaned street without type for better comparison)
          const fullSimilarity = Math.max(
            similarityScore(streetNorm, entry.street_normalized),
            similarityScore(streetToCompare, entry.street_normalized)
          );

          // Use the best score from both methods
          streetScore = Math.max(wordMatchScore, fullSimilarity);
        }

        // Street type comparison: boost matching types, penalize mismatches
        if (userStreetType && entry.street_type) {
          const dbTypeNorm = normalizeStreetType(entry.street_type);
          // Check if user's street type matches DB street_type
          // e.g., userStreetType="splai" vs dbTypeNorm="splai" → match
          // e.g., userStreetType="splai" vs dbTypeNorm="bulevard" → mismatch
          if (dbTypeNorm.includes(userStreetType) || userStreetType.includes(dbTypeNorm)) {
            // Type matches: boost score
            streetScore = Math.min(streetScore * 1.3, 1.0);
          } else {
            // Type mismatch: penalize significantly
            streetScore = streetScore * 0.5;
          }
        }

        // Street number matching: boost entries where user's number falls within the DB range
        if (userStreetNumber && entry.number) {
          const range = parseNumberRange(entry.number);
          if (range) {
            if (userStreetNumber >= range.min && userStreetNumber <= range.max) {
              // Number falls within range: significant boost
              streetScore = Math.min(streetScore * 1.4, 1.0);
            } else {
              // Number doesn't match range: slight penalty to push non-matching ranges down
              const distance = Math.min(
                Math.abs(userStreetNumber - range.min),
                Math.abs(userStreetNumber - (range.max === Infinity ? range.min : range.max))
              );
              // Penalty scales with distance: nearby ranges penalized less
              const penalty = Math.max(0.7, 1 - distance / 1000);
              streetScore = streetScore * penalty;
            }
          }
        }
      } else if (streetNorm && !entry.street_normalized) {
        // User provided street but entry has no street data (small city)
        streetScore = 0.5; // Lower confidence
      }

      // Calculate overall score (weighted average)
      let overallScore = streetNorm
        ? (countyScore * 0.2 + cityScore * 0.3 + streetScore * 0.5)
        : (countyScore * 0.3 + cityScore * 0.7);

      // BOOST/PENALIZE: Prioritize results where the village matches exactly the user's input
      // This fixes the issue where "Baia Mare" (big city with many streets) ranks higher
      // than "Baia Sprie" (the actual city from the order) due to better street matches
      const dbVillageBase = entry.city_normalized.split('(')[0].trim();
      const exactVillageMatch = dbVillageBase === userVillage || dbVillageBase === cityNorm;
      if (exactVillageMatch) {
        // Give a 25% boost for exact village match
        overallScore = Math.min(overallScore * 1.25, 1.0);
      } else {
        // Penalize results from different villages by 20%
        // This ensures the order's actual village always ranks higher
        overallScore = overallScore * 0.80;
      }

      matches.push({
        entry,
        score: overallScore,
        countyScore,
        cityScore,
        streetScore,
      });
    }

    // Sort by score (highest first) and take top 3
    matches.sort((a, b) => b.score - a.score);
    const topMatches = matches.slice(0, 3);

    console.log(`Found ${matches.length} total matches, returning top 3`);
    console.log('Top scores:', topMatches.map(m => m.score.toFixed(2)));

    // Format results
    const results = topMatches.map((match) => {
      const e = match.entry;
      const fullAddress = e.street_name
        ? `${e.street_type} ${e.street_name}${e.number ? ', ' + e.number : ''}, ${e.city}${e.sector ? ', Sector ' + e.sector : ''}, ${e.county}`
        : `${e.city}, ${e.county}`;

      return {
        postal_code: e.postal_code,
        county: e.county,
        city: e.city,
        street_type: e.street_type,
        street_name: e.street_name,
        number: e.number,
        sector: e.sector,
        full_address: fullAddress,
        confidence: match.score,
        scores: {
          county: match.countyScore,
          city: match.cityScore,
          street: match.streetScore,
        },
      };
    });

    return NextResponse.json({
      query: { county, city, street },
      results,
      total_found: matches.length,
    });
  } catch (error) {
    console.error("Error in POST /api/postal-code-search:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
