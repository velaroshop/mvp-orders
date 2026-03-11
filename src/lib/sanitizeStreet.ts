/**
 * Street Address Sanitizer
 *
 * Normalizes Romanian street addresses with common abbreviations and typos
 * into a standard format: "<Tip> <Nume> nr. <Număr> [<Detalii>]"
 */

// ============================================================================
// TYPE MAPPINGS
// ============================================================================

/**
 * Maps all common abbreviations to their standard full forms
 * Keys are lowercase for case-insensitive matching
 */
const STREET_TYPE_MAP: Record<string, string> = {
  // Strada
  'st': 'Strada',
  'st.': 'Strada',
  'str': 'Strada',
  'str.': 'Strada',
  'strada': 'Strada',
  'strad': 'Strada',
  'strad.': 'Strada',
  'strd': 'Strada',
  'strd.': 'Strada',

  // Bulevardul
  'bd': 'Bulevardul',
  'bd.': 'Bulevardul',
  'bld': 'Bulevardul',
  'bld.': 'Bulevardul',
  'bul': 'Bulevardul',
  'bul.': 'Bulevardul',
  'blv': 'Bulevardul',
  'blv.': 'Bulevardul',
  'bdul': 'Bulevardul',
  'bdul.': 'Bulevardul',
  'b-dul': 'Bulevardul',
  'b-dul.': 'Bulevardul',
  'bulevard': 'Bulevardul',
  'bulevardul': 'Bulevardul',

  // Aleea
  'al': 'Aleea',
  'al.': 'Aleea',
  'alee': 'Aleea',
  'aleea': 'Aleea',

  // Șoseaua (with and without diacritics)
  'sos': 'Șoseaua',
  'sos.': 'Șoseaua',
  'șos': 'Șoseaua',
  'șos.': 'Șoseaua',
  'soseaua': 'Șoseaua',
  'șoseaua': 'Șoseaua',

  // Calea
  'cal': 'Calea',
  'cal.': 'Calea',
  'calea': 'Calea',

  // Piața
  'piata': 'Piața',
  'piața': 'Piața',
  'p-ta': 'Piața',
  'p-ta.': 'Piața',
  'pi.': 'Piața',

  // Intrarea
  'intr': 'Intrarea',
  'intr.': 'Intrarea',
  'intrarea': 'Intrarea',

  // Prelungirea
  'prel': 'Prelungirea',
  'prel.': 'Prelungirea',
  'prelungirea': 'Prelungirea',

  // Drumul
  'dr': 'Drumul',
  'dr.': 'Drumul',
  'drumul': 'Drumul',
};

/**
 * Small words that should remain lowercase in title case
 * (unless they're the first word)
 */
const LOWERCASE_WORDS = new Set([
  'de', 'din', 'și', 'si', 'la', 'cu', 'pe', 'a', 'al', 'ale', 'ai', 'în', 'in'
]);

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Normalizes whitespace: replaces multiple spaces/tabs with single space
 */
function normalizeWhitespace(str: string): string {
  return str.replace(/\s+/g, ' ').trim();
}

/**
 * Removes common separators and replaces them with spaces
 * Handles: commas, semicolons, slashes, multiple dots (but preserves "nr.")
 */
function removeSeparators(str: string): string {
  // Replace separators with space
  let result = str.replace(/[,;/]+/g, ' ');

  // Remove multiple dots but preserve "nr."
  result = result.replace(/\.{2,}/g, ' ');

  return result;
}

/**
 * Applies title case to a word, respecting lowercase word list
 */
function toTitleCase(word: string, isFirst: boolean = false): string {
  const lower = word.toLowerCase();

  // If it's a small word and not the first word, keep it lowercase
  if (!isFirst && LOWERCASE_WORDS.has(lower)) {
    return lower;
  }

  // Otherwise capitalize first letter
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

/**
 * Applies intelligent title case to street name
 */
function titleCaseStreetName(name: string): string {
  const words = name.split(' ');
  return words.map((word, index) => toTitleCase(word, index === 0)).join(' ');
}

// ============================================================================
// MAIN SANITIZATION FUNCTION
// ============================================================================

/**
 * Result type for sanitization with street address, extracted number, and building details
 */
export interface SanitizeResult {
  street: string;
  number: string;
  details: string; // Building details: bloc, scara, etaj, apartament, indicații
}

export function sanitizeStreet(raw: string): SanitizeResult {
  // Step 1: Basic cleanup
  let cleaned = raw.trim();
  if (!cleaned) return { street: '', number: '', details: '' };

  // Step 2: Normalize whitespace and remove separators
  cleaned = normalizeWhitespace(cleaned);
  cleaned = removeSeparators(cleaned);

  // Step 2.5: Separate street type from street name when stuck together (str.1mai -> str. 1mai)
  // Match street type abbreviations followed directly by alphanumeric (no space)
  cleaned = cleaned.replace(/^(str|st|bd|bld|bul|blv|al|sos|șos|cal|intr|prel|dr)\.([a-zA-Z0-9])/gi, '$1. $2');

  // Step 2.6: Separate detail markers from their values when stuck together
  // This handles cases like "Nr.2", "Bl.D5", "Sc.C", "Et1", "Ap4", "sc1"
  // Be careful: only match when followed by digits or single uppercase letters
  cleaned = cleaned.replace(/\b(nr|bloc|bl|scara|sc|etaj|et|apartament|ap)\.?(\d+[a-zA-Z]?)/gi, '$1 $2');
  // Handle letter values like scC, scA (scara with letter)
  cleaned = cleaned.replace(/\b(sc|scara)\.?([a-zA-Z])(?=\s|$)/gi, '$1 $2');

  cleaned = normalizeWhitespace(cleaned); // Again after separator removal

  // Step 3: Tokenize
  const tokens = cleaned.split(' ');
  if (tokens.length === 0) return { street: raw.trim(), number: '', details: '' };

  // Step 4: Detect street type (prefix)
  let streetType = '';
  let startIndex = 0;

  const firstToken = tokens[0].toLowerCase().replace(/\./g, '');
  if (STREET_TYPE_MAP[firstToken]) {
    streetType = STREET_TYPE_MAP[firstToken];
    startIndex = 1;
  }

  // Step 5: Find number marker and split tokens
  let streetNameTokens: string[] = [];
  let numberToken = '';
  let detailsTokens: string[] = [];
  let foundNumber = false;

  // Detail markers to help identify what's NOT a street number
  const detailMarkers = ['bl', 'bloc', 'sc', 'scara', 'et', 'etaj', 'ap', 'apartament', 'interfon'];

  for (let i = startIndex; i < tokens.length; i++) {
    const token = tokens[i];
    const lowerToken = token.toLowerCase().replace(/\./g, '');

    // Check if this is a number marker
    if (['nr', 'numar', 'număr', 'numărul', 'no', 'n'].includes(lowerToken)) {
      foundNumber = true;

      // Next token should be the actual number
      if (i + 1 < tokens.length) {
        numberToken = tokens[i + 1];
        i++; // Skip the number token

        // Check if next token is a single letter (like "B" in "nr.64 B") - combine it
        if (i + 1 < tokens.length) {
          const nextToken = tokens[i + 1];
          if (/^[A-Za-z]$/.test(nextToken) && !detailMarkers.includes(nextToken.toLowerCase())) {
            numberToken += nextToken.toUpperCase();
            i++; // Skip the letter token
          }
        }

        // Collect remaining tokens as details
        detailsTokens = tokens.slice(i + 1);
        break;
      }
    } else if (foundNumber) {
      // We already found number, rest are details
      detailsTokens.push(token);
    } else {
      // Check if this is a detail marker (bl, sc, etc.) - if so, everything from here is details
      if (detailMarkers.includes(lowerToken)) {
        // This and everything after is details
        detailsTokens = tokens.slice(i);
        break;
      }

      // Still part of street name
      streetNameTokens.push(token);
    }
  }

  // Step 6: If no explicit number marker found, look for a numeric token in streetNameTokens
  if (!foundNumber && streetNameTokens.length > 0) {
    const lastToken = streetNameTokens[streetNameTokens.length - 1];
    // Check if last token is a number (simplest case: "str florilor 8")
    if (/^\d+[A-Za-z]?$/.test(lastToken) || /^\d+-\d+$/.test(lastToken)) {
      numberToken = lastToken;
      streetNameTokens.pop();
    } else {
      // Scan for a numeric token followed by non-numeric text (e.g. "florilor 12 Medicaltest")
      // The numeric token is the street number, and everything after is extra info
      for (let i = 0; i < streetNameTokens.length; i++) {
        const t = streetNameTokens[i];
        if (/^\d+[A-Za-z]?$/.test(t) || /^\d+-\d+$/.test(t)) {
          numberToken = t;
          // Everything after the number goes to details (will be captured as extra notes)
          detailsTokens = [...streetNameTokens.slice(i + 1), ...detailsTokens];
          streetNameTokens = streetNameTokens.slice(0, i);
          break;
        }
      }
    }
  }

  // Step 7: Normalize number format (12A, 12-14, etc.)
  if (numberToken) {
    // Remove spaces around dash: "12 - 14" -> "12-14"
    numberToken = numberToken.replace(/\s*-\s*/g, '-');
    // Uppercase any letter: "12a" -> "12A"
    numberToken = numberToken.replace(/([0-9])([a-z])$/i, (_, num, letter) => num + letter.toUpperCase());
  }

  // Step 8: Parse details (bl, sc, et, ap) and collect unrecognized tokens
  const { details, extraNotes } = parseDetails(detailsTokens);

  // Step 8.5: Extract parenthetical notes from original input (e.g., "(Scoala Spectrum)")
  const parenthesesMatch = raw.match(/\(([^)]+)\)/);
  const parenthesesNote = parenthesesMatch ? parenthesesMatch[0] : '';

  // Combine extra notes from details parsing with parenthetical notes
  // Extra notes are unrecognized tokens after the number (e.g. company names, landmarks)
  // Filter out tokens that are part of parenthetical content (already captured above)
  const cleanedExtraNotes = extraNotes
    .map(t => t.replace(/[()]/g, '').trim())
    .filter(t => t.length > 0);
  // Remove tokens that were part of the parenthetical content to avoid duplication
  const parenthesesWords = parenthesesMatch
    ? parenthesesMatch[1].toLowerCase().split(/\s+/)
    : [];
  const filteredExtraNotes = parenthesesWords.length > 0
    ? cleanedExtraNotes.filter(t => !parenthesesWords.includes(t.toLowerCase()))
    : cleanedExtraNotes;

  const allNotes: string[] = [];
  if (filteredExtraNotes.length > 0) {
    allNotes.push(titleCaseStreetName(filteredExtraNotes.join(' ')));
  }
  if (parenthesesMatch) {
    allNotes.push(parenthesesMatch[1]);
  }
  const combinedNote = allNotes.length > 0 ? `(${allNotes.join(' - ')})` : '';

  // Step 9: Build output — street (address) separate from details
  const streetParts: string[] = [];

  // Add street type if found
  if (streetType) {
    streetParts.push(streetType);
  }

  // Add street name with title case
  if (streetNameTokens.length > 0) {
    const streetName = titleCaseStreetName(streetNameTokens.join(' '));
    streetParts.push(streetName);
  }

  // Add number to street address (no comma — details go to separate field)
  if (numberToken) {
    streetParts.push('nr. ' + numberToken);
  }

  const street = streetParts.join(' ') || raw.trim();

  // Build details string (bloc, scara, etaj, apt + notes)
  const detailsParts: string[] = [];
  if (details) {
    detailsParts.push(details);
  }
  if (combinedNote) {
    detailsParts.push(combinedNote);
  }
  const detailsString = detailsParts.join(' ');

  return {
    street,
    number: numberToken,
    details: detailsString,
  };
}

/**
 * Parses detail tokens (bl, sc, et, ap) into normalized format with full words
 */
interface ParseDetailsResult {
  details: string;
  extraNotes: string[];
}

function parseDetails(tokens: string[]): ParseDetailsResult {
  const details: { type: string; value: string }[] = [];
  const extraNotes: string[] = [];

  let i = 0;
  while (i < tokens.length) {
    const token = tokens[i].toLowerCase().replace(/\./g, '');

    let detailType = '';
    let detailValue = '';

    // Match detail type - recognize various abbreviations
    if (['bl', 'blc', 'bloc'].includes(token)) {
      detailType = 'bloc';
      // Next token is the value
      if (i + 1 < tokens.length) {
        detailValue = tokens[i + 1].toUpperCase(); // Uppercase for blocks
        i++;
      }
    } else if (['sc', 'scara'].includes(token)) {
      detailType = 'scara';
      if (i + 1 < tokens.length) {
        detailValue = tokens[i + 1].toUpperCase();
        i++;
      }
    } else if (['et', 'etj', 'etaj'].includes(token)) {
      detailType = 'etaj';
      if (i + 1 < tokens.length) {
        detailValue = tokens[i + 1];
        i++;
      }
    } else if (['ap', 'apt', 'apart', 'apartament'].includes(token)) {
      detailType = 'apartament';
      if (i + 1 < tokens.length) {
        detailValue = tokens[i + 1];
        i++;
      }
    } else if (['interfon'].includes(token)) {
      detailType = 'interfon';
      if (i + 1 < tokens.length) {
        detailValue = tokens[i + 1];
        i++;
      }
    } else {
      // Unrecognized token - preserve as extra note (e.g. company name, landmark)
      extraNotes.push(tokens[i]);
    }

    if (detailType && detailValue) {
      details.push({ type: detailType, value: detailValue });
    }

    i++;
  }

  // Build details string in standard order: scara -> bloc -> etaj -> ap.
  // Interfon is excluded from output (not needed for Helpship)
  const order = ['scara', 'bloc', 'etaj', 'apartament'];
  const sorted = details
    .filter(d => d.type !== 'interfon')
    .sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type));

  const DETAIL_LABEL: Record<string, string> = {
    'bloc': 'bloc',
    'scara': 'scara',
    'etaj': 'etaj',
    'apartament': 'ap.',
  };

  return {
    details: sorted.map(d => `${DETAIL_LABEL[d.type] || d.type} ${d.value}`).join(', '),
    extraNotes,
  };
}

// ============================================================================
// TESTS
// ============================================================================

interface TestCase {
  input: string;
  expectedStreet: string;
  expectedNumber: string;
  description?: string;
}

const TEST_CASES: TestCase[] = [
  // Basic street type normalization
  { input: 'str florilor 8', expectedStreet: 'Strada Florilor nr. 8', expectedNumber: '8', description: 'Basic str -> Strada' },
  { input: 'str. florilor 8', expectedStreet: 'Strada Florilor nr. 8', expectedNumber: '8', description: 'str. with dot' },
  { input: 'strada florilor 8', expectedStreet: 'Strada Florilor nr. 8', expectedNumber: '8', description: 'Full strada' },

  // Boulevard variations
  { input: 'bd mihai viteazu 12', expectedStreet: 'Bulevardul Mihai Viteazu nr. 12', expectedNumber: '12', description: 'Boulevard bd' },
  { input: 'blv unirii 5', expectedStreet: 'Bulevardul Unirii nr. 5', expectedNumber: '5', description: 'Boulevard blv' },
  { input: 'bulevardul republicii 20', expectedStreet: 'Bulevardul Republicii nr. 20', expectedNumber: '20', description: 'Full bulevardul' },

  // Șoseaua (with/without diacritics)
  { input: 'sos kiseleff 10', expectedStreet: 'Șoseaua Kiseleff nr. 10', expectedNumber: '10', description: 'Șoseaua sos' },
  { input: 'șos pantelimon 15', expectedStreet: 'Șoseaua Pantelimon nr. 15', expectedNumber: '15', description: 'Șoseaua with diacritic' },

  // Other street types
  { input: 'al teiului 3', expectedStreet: 'Aleea Teiului nr. 3', expectedNumber: '3', description: 'Aleea' },
  { input: 'cal victoriei 100', expectedStreet: 'Calea Victoriei nr. 100', expectedNumber: '100', description: 'Calea' },
  { input: 'piata unirii 1', expectedStreet: 'Piața Unirii nr. 1', expectedNumber: '1', description: 'Piața' },
  { input: 'intr salciilor 7', expectedStreet: 'Intrarea Salciilor nr. 7', expectedNumber: '7', description: 'Intrarea' },

  // Number variations
  { input: 'str florilor nr 8', expectedStreet: 'Strada Florilor nr. 8', expectedNumber: '8', description: 'Explicit nr' },
  { input: 'str florilor nr. 8', expectedStreet: 'Strada Florilor nr. 8', expectedNumber: '8', description: 'Explicit nr.' },
  { input: 'str florilor nr8', expectedStreet: 'Strada Florilor nr. 8', expectedNumber: '8', description: 'nr8 stuck together' },
  { input: 'str florilor numar 8', expectedStreet: 'Strada Florilor nr. 8', expectedNumber: '8', description: 'numar instead of nr' },
  { input: 'str florilor 12a', expectedStreet: 'Strada Florilor nr. 12A', expectedNumber: '12A', description: 'Number with letter' },
  { input: 'str florilor 12 a', expectedStreet: 'Strada Florilor nr. 12A', expectedNumber: '12A', description: 'Number with spaced letter' },
  { input: 'str florilor 12-14', expectedStreet: 'Strada Florilor nr. 12-14', expectedNumber: '12-14', description: 'Number range' },

  // Details (bl, sc, et, ap) - THE CRITICAL TEST!
  { input: 'str florilor 8 bl a', expectedStreet: 'Strada Florilor nr. 8, bl. A', expectedNumber: '8', description: 'With bloc' },
  { input: 'str florilor 8 bloc a sc 2', expectedStreet: 'Strada Florilor nr. 8, sc. 2 bl. A', expectedNumber: '8', description: 'Bloc and scara' },
  { input: 'str florilor 8 bl a sc 2 et 3 ap 10', expectedStreet: 'Strada Florilor nr. 8, sc. 2 bl. A et. 3 ap. 10', expectedNumber: '8', description: 'Full details' },
  { input: 'Strada Daciei Nr.2 Bloc 2 Sc C Et1 Ap4', expectedStreet: 'Strada Daciei nr. 2, sc. C bl. 2 et. 1 ap. 4', expectedNumber: '2', description: 'Real case: Nr.2 stuck, Et1/Ap4 stuck' },
  { input: 'st ficusului 8, scara a bloc 2', expectedStreet: 'Strada Ficusului nr. 8, sc. A bl. 2', expectedNumber: '8', description: 'St abbreviation with scara and bloc' },

  // Title case with prepositions
  { input: 'str unirea din 1918 nr 5', expectedStreet: 'Strada Unirea din 1918 nr. 5', expectedNumber: '5', description: 'Preposition "din" lowercase' },
  { input: 'bd carol i 10', expectedStreet: 'Bulevardul Carol I nr. 10', expectedNumber: '10', description: 'Roman numeral uppercase' },

  // Messy input with multiple separators
  { input: 'str,, florilor,  8', expectedStreet: 'Strada Florilor nr. 8', expectedNumber: '8', description: 'Multiple commas' },
  { input: 'str. florilor / 8', expectedStreet: 'Strada Florilor nr. 8', expectedNumber: '8', description: 'Slash separator' },
  { input: 'str   florilor   8', expectedStreet: 'Strada Florilor nr. 8', expectedNumber: '8', description: 'Multiple spaces' },

  // No street type
  { input: 'florilor 8', expectedStreet: 'Florilor nr. 8', expectedNumber: '8', description: 'No street type prefix' },
  { input: 'mihai viteazu 12', expectedStreet: 'Mihai Viteazu nr. 12', expectedNumber: '12', description: 'No type, multi-word name' },

  // No number
  { input: 'str florilor', expectedStreet: 'Strada Florilor', expectedNumber: '', description: 'No number at all' },

  // Extra notes (company name, landmark) preserved in parentheses
  { input: 'Spiru Haret Nr 8 Medicaltest', expectedStreet: 'Spiru Haret nr. 8, (Medicaltest)', expectedNumber: '8', description: 'Company name after number preserved' },
  { input: 'str florilor 8 bl a Medicaltest', expectedStreet: 'Strada Florilor nr. 8, bloc A (Medicaltest)', expectedNumber: '8', description: 'Landmark after details preserved' },
  { input: 'str florilor 12 Magazin Central', expectedStreet: 'Strada Florilor nr. 12, (Magazin Central)', expectedNumber: '12', description: 'Extra text after implicit number' },

  // Edge cases
  { input: '', expectedStreet: '', expectedNumber: '', description: 'Empty string' },
  { input: '   ', expectedStreet: '', expectedNumber: '', description: 'Only whitespace' },
  { input: 'str', expectedStreet: 'Strada', expectedNumber: '', description: 'Only street type' },
];

/**
 * Runs all test cases and logs results
 */
export function runTests(): void {
  console.log('🧪 Running Street Sanitizer Tests...\n');

  let passed = 0;
  let failed = 0;

  TEST_CASES.forEach((test, index) => {
    const result = sanitizeStreet(test.input);
    const isPassStreet = result.street === test.expectedStreet;
    const isPassNumber = result.number === test.expectedNumber;
    const isPass = isPassStreet && isPassNumber;

    if (isPass) {
      passed++;
      console.log(`✅ Test ${index + 1}: PASS`);
    } else {
      failed++;
      console.log(`❌ Test ${index + 1}: FAIL`);
      console.log(`   Description: ${test.description || 'N/A'}`);
      console.log(`   Input:           "${test.input}"`);
      if (!isPassStreet) {
        console.log(`   Expected Street: "${test.expectedStreet}"`);
        console.log(`   Got Street:      "${result.street}"`);
      }
      if (!isPassNumber) {
        console.log(`   Expected Number: "${test.expectedNumber}"`);
        console.log(`   Got Number:      "${result.number}"`);
      }
    }
  });

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed (${TEST_CASES.length} total)`);

  if (failed === 0) {
    console.log('🎉 All tests passed!');
  }
}

// Uncomment to run tests in Node.js
// runTests();
