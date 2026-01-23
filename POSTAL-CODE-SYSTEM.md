# Postal Code Search System

## Overview
This system provides fuzzy matching for Romanian postal codes based on county, city, and street address. It handles common data quality issues like:
- Abbreviated county names (VL → Vâlcea, MH → Mureș)
- Spelling variations and typos
- Missing diacritics (vilcea → Vâlcea)
- Vague locality names (sat, comună)
- Approximate street names

## Data Source
- **Source**: [data.gov.ro](https://data.gov.ro/dataset/3eb7dc31-e53e-4c09-b2e2-87c909e68fb6)
- **File**: infocod-cu-siruta-mai-2016.xls
- **Total Records**: 55,407 postal codes
- **Sheets**:
  1. București (12,400 rows) - Bucharest street-level data
  2. Localități peste 50,000 loc (29,204 rows) - Large cities with streets
  3. Localități sub 50,000 loc (13,803 rows) - Small cities (no street data)

## Data Structure

### Normalized Format
Each entry contains:
```typescript
{
  county: string;              // Full county name (e.g., "Vâlcea")
  county_normalized: string;   // Normalized for search (e.g., "valcea")
  city: string;                // Full city name (e.g., "Drăgășani")
  city_normalized: string;     // Normalized for search
  street_type: string;         // e.g., "Stradă", "Șosea"
  street_name: string;         // Street name
  street_normalized: string;   // Normalized for search
  number: string;              // Street number/block
  postal_code: string;         // 6-digit postal code
  sector?: string;             // Bucharest sector (1-6)
  siruta: string | number;     // Official SIRUTA code
  sheet: string;               // Source sheet identifier
}
```

## API Endpoint

### POST /api/postal-code-search

**Request Body:**
```json
{
  "county": "vilcea",           // Required
  "city": "drgasani",          // Required
  "street": "str viilor"       // Optional
}
```

**Response:**
```json
{
  "query": {
    "county": "vilcea",
    "city": "drgasani",
    "street": "str viilor"
  },
  "results": [
    {
      "postal_code": "245300",
      "county": "Vâlcea",
      "city": "Drăgășani",
      "street_type": "Stradă",
      "street_name": "Viilor",
      "number": "nr. 5A",
      "full_address": "Stradă Viilor, nr. 5A, Drăgășani, Vâlcea",
      "confidence": 0.95,
      "scores": {
        "county": 0.98,
        "city": 0.93,
        "street": 0.95
      }
    }
  ],
  "total_found": 15
}
```

## Matching Algorithm

### 1. Text Normalization
- Remove diacritics (ă, â, î, ș, ț)
- Convert to lowercase
- Trim whitespace

### 2. County Expansion
Abbreviated counties are expanded:
- VL → valcea
- MH → mures
- B → bucuresti
- CJ → cluj
- etc.

### 3. Fuzzy Matching (Levenshtein Distance)
- Calculates edit distance between strings
- Returns similarity score (0-1)

### 3.5. Word-Order Flexibility for Streets
- Handles reversed street names (e.g., "Henri Coandă" vs "Coandă Henri")
- Splits street names into words
- Filters out common street type words (strada, str, sosea, etc.)
- Matches words in any order with typo tolerance
- Returns ratio of matched words

### 4. Parenthesis Handling for Cities
- Handles villages in multiple communes (e.g., "Boureni" in "Boureni (Balş)" and "Boureni (Moţca)")
- Extracts base city name before parenthesis
- Matches against both full name and base name
- Uses best score from both methods
- Results preserve full city name with commune identifier

### 5. Filtering Thresholds
- County: ≥ 0.7 similarity required
- City: ≥ 0.6 similarity required
- Street: Partial matches preferred

### 6. Scoring
**With street:**
- County: 20% weight
- City: 30% weight
- Street: 50% weight

**Without street:**
- County: 30% weight
- City: 70% weight

### 7. Results
- Returns top 3 matches
- Sorted by confidence score (highest first)
- Includes individual component scores

## Test Page

Located at: `/admin/postal-code-test`

### Features:
- Interactive form with county, city, street inputs
- 4 example scenarios
- Visual confidence indicators:
  - ✓ Green (≥90%): High confidence
  - ⚠ Amber (70-89%): Medium confidence
  - ? Orange (<70%): Low confidence
- Individual score breakdown for each component
- Full address display with sector info (for București)

### Test Examples:

1. **Vâlcea with typos**:
   - County: "vilcea"
   - City: "drgasani"
   - Street: "str viilor"

2. **Iași standard**:
   - County: "iasi"
   - City: "iasi"
   - Street: "Strada Logovat"

3. **Cluj proper names**:
   - County: "Cluj"
   - City: "Cluj-Napoca"
   - Street: "Strada Memorandumului"

4. **Abbreviated county**:
   - County: "VL"
   - City: "Ramnicu Valcea"
   - Street: (empty)

5. **Reversed street name**:
   - County: "Bucuresti"
   - City: "Bucuresti"
   - Street: "Henri Coanda" (DB has "Coandă Henri")

6. **Village in multiple communes**:
   - County: "Iasi"
   - City: "Boureni" (exists in both Balș and Moțca communes)
   - Will return both: "Boureni (Balş)" and "Boureni (Moţca)"

## Files

### Data Files
- `src/data/postal-codes-normalized.json` (17MB) - Main search data
- `src/data/postal-codes.json` (13MB) - Raw converted data (not used in prod)

### Source Code
- `src/app/api/postal-code-search/route.ts` - API endpoint with fuzzy matching
- `src/app/admin/postal-code-test/page.tsx` - Test UI

### Configuration
- County abbreviation map in API route
- Normalization function (removes diacritics)
- Levenshtein distance algorithm
- Similarity scoring system

## Performance Considerations

- 55K+ records searched on each request
- Linear search through all entries
- Filtering applied early to reduce comparisons
- Top 3 results limit reduces response size

### Optimization Opportunities (Future):
1. Index by normalized county for faster lookup
2. Use a proper search engine (Elasticsearch, Typesense)
3. Cache common queries
4. Precompute normalized values
5. Use Web Workers for client-side search

## Integration Guide

To integrate into the confirmation modal:

```typescript
// 1. Call API
const response = await fetch('/api/postal-code-search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    county: formData.county,
    city: formData.city,
    street: formData.address,
  }),
});

const data = await response.json();

// 2. Show top 3 results to user
const postalCodes = data.results; // Array of max 3 results

// 3. Let user select one or verify data
postalCodes.forEach(pc => {
  console.log(pc.postal_code, pc.confidence);
});
```

## Next Steps

1. ✅ Set up postal code test page
2. ✅ Implement fuzzy matching API
3. ✅ Test with various inputs
4. 🔄 Integrate into order confirmation modal
5. 🔄 Add validation and error handling
6. 🔄 Monitor performance and optimize if needed
