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

// Clean city input by removing common locality prefixes
// Examples: "sat boureni" -> "boureni", "com. motca" -> "motca"
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

// Check if street names match with word order flexibility
// Example: "henri coanda" matches "coanda henri"
function streetWordsMatch(userStreet: string, dbStreet: string): number {
  // Split into words and filter out common street type words and number markers
  const ignoreWords = [
    // Street types
    'strada', 'str', 'stradă', 'sosea', 'şosea', 'șosea', 'calea', 'bulevardul', 'bd', 'aleea',
    // Number markers
    'nr', 'nr.', 'numar', 'număr', 'no',
    // Block/apartment markers (sometimes included in address)
    'bl', 'bloc', 'sc', 'scara', 'et', 'etaj', 'ap', 'apartament',
  ];

  const userWords = userStreet
    .split(/\s+/)
    .filter(w => w.length > 2 && !ignoreWords.includes(w) && !/^\d+[-]?\d*[a-z]?$/i.test(w));

  const dbWords = dbStreet
    .split(/\s+/)
    .filter(w => w.length > 2 && !ignoreWords.includes(w) && !/^\d+[-]?\d*[a-z]?$/i.test(w));

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

    // Check if county is abbreviated and expand it
    if (countyAbbrevMap[countyNorm]) {
      countyNorm = countyAbbrevMap[countyNorm];
    }

    console.log('Search params:', { county, city, street });
    console.log('Cleaned city:', cityClean);
    console.log('Normalized:', { countyNorm, cityNorm, streetNorm });

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

      // City matching with parenthesis handling
      // Example: "Boureni" should match "Boureni (Balş)"
      // Also handles: "Boureni, Bals" or "Boureni Bals" to prioritize specific commune
      let cityScore = 0;
      const dbCityNorm = entry.city_normalized;

      // Check if user included commune info (comma or space separated)
      // Examples: "boureni, bals", "boureni bals", "boureni(bals)"
      const hasCommaSeparator = cityNorm.includes(',');
      const hasParenthesisInInput = cityNorm.includes('(');

      let userCityBase = cityNorm;
      let userCommune = '';

      if (hasCommaSeparator) {
        // Split by comma: "boureni, bals" -> ["boureni", "bals"]
        const parts = cityNorm.split(',').map(p => p.trim());
        userCityBase = parts[0];
        userCommune = parts[1] || '';
      } else if (hasParenthesisInInput) {
        // Split by parenthesis: "boureni(bals)" -> ["boureni", "bals"]
        const parts = cityNorm.split('(');
        userCityBase = parts[0].trim();
        userCommune = parts[1] ? parts[1].replace(')', '').trim() : '';
      } else if (cityNorm.includes(' ')) {
        // Check if last word might be commune (heuristic: if 2-3 words)
        const words = cityNorm.split(/\s+/);
        if (words.length === 2 || words.length === 3) {
          // Try treating last word as commune
          userCityBase = words.slice(0, -1).join(' ');
          userCommune = words[words.length - 1];
        }
      }

      // Check if DB city has parenthesis (e.g., "boureni (bals)")
      const hasParenthesis = dbCityNorm.includes('(');

      if (hasParenthesis) {
        // Extract city name and commune from DB
        const dbCityBase = dbCityNorm.split('(')[0].trim();
        const dbCommune = dbCityNorm.split('(')[1]?.replace(')', '').trim() || '';

        // Try matching both the full name and the base name
        const fullScore = similarityScore(cityNorm, dbCityNorm);
        const baseScore = similarityScore(userCityBase, dbCityBase);

        // If user provided commune info, check if it matches
        if (userCommune) {
          const communeScore = similarityScore(userCommune, dbCommune);

          // If commune matches well, give huge boost
          if (communeScore >= 0.7) {
            cityScore = Math.max(baseScore * 0.5 + communeScore * 0.5, 0.95);
          } else {
            // Commune doesn't match, use base score but penalize
            cityScore = baseScore * 0.8;
          }
        } else {
          // No commune provided, use the better score
          cityScore = Math.max(fullScore, baseScore);
        }
      } else {
        // No parenthesis in DB, standard matching
        cityScore = similarityScore(userCityBase || cityNorm, dbCityNorm);
      }

      if (cityScore < 0.6) continue; // Skip if city doesn't match well

      // Street matching (if provided and entry has street data)
      let streetScore = 1.0;
      if (streetNorm && entry.street_normalized) {
        // Method 1: Check if street is contained or vice versa
        if (entry.street_normalized.includes(streetNorm) || streetNorm.includes(entry.street_normalized)) {
          streetScore = 0.95; // High score for partial match
        } else {
          // Method 2: Try word-by-word matching (handles reversed names like "henri coanda" vs "coanda henri")
          const wordMatchScore = streetWordsMatch(streetNorm, entry.street_normalized);

          // Method 3: Full string similarity
          const fullSimilarity = similarityScore(streetNorm, entry.street_normalized);

          // Use the best score from both methods
          streetScore = Math.max(wordMatchScore, fullSimilarity);
        }
      } else if (streetNorm && !entry.street_normalized) {
        // User provided street but entry has no street data (small city)
        streetScore = 0.5; // Lower confidence
      }

      // Calculate overall score (weighted average)
      const overallScore = streetNorm
        ? (countyScore * 0.2 + cityScore * 0.3 + streetScore * 0.5)
        : (countyScore * 0.3 + cityScore * 0.7);

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
