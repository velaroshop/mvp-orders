/**
 * Exemple de test pentru sistemul de sanitizare
 * 
 * Acest fișier conține exemple pentru a testa funcționalitatea
 */

import { sanitizeAddress, findPostalCodes } from "./index";

/**
 * Exemple de adrese cu erori comune pentru testare
 */
export const TEST_EXAMPLES = [
  {
    description: "Corectare județ și localitate",
    input: {
      county: "vilcea",
      city: "drgasani",
      address: "str viilor numaru 5a",
    },
    expected: {
      county: "Vâlcea",
      city: "Drăgășani",
      street: "Str Viilor",
      number: "5a",
    },
  },
  {
    description: "Corectare județ cu diacritice",
    input: {
      county: "iasi",
      city: "iasi",
      address: "Strada Logovat nr 3",
    },
    expected: {
      county: "Iași",
      city: "Iași",
      street: "Strada Logovat",
      number: "3",
    },
  },
  {
    description: "Adresă fără număr",
    input: {
      county: "Cluj",
      city: "Cluj-Napoca",
      address: "Strada Memorandumului",
    },
    expected: {
      county: "Cluj",
      city: "Cluj-Napoca",
      street: "Strada Memorandumului",
      number: undefined,
    },
  },
];

/**
 * Rulează testele de sanitizare
 */
export async function runSanitizationTests() {
  console.log("🧪 Running sanitization tests...\n");

  for (const example of TEST_EXAMPLES) {
    console.log(`Test: ${example.description}`);
    console.log(`Input:`, example.input);

    const result = sanitizeAddress(
      example.input.county,
      example.input.city,
      example.input.address
    );

    console.log(`Result:`, result);
    console.log(`Expected:`, example.expected);

    const passed =
      result.county === example.expected.county &&
      result.city === example.expected.city &&
      result.street === example.expected.street &&
      result.number === example.expected.number;

    console.log(passed ? "✅ PASSED" : "❌ FAILED");
    console.log("---\n");
  }
}

/**
 * Testează căutarea codurilor poștale (necesită API key Geoapify)
 */
export async function testPostalCodeSearch() {
  console.log("🔍 Testing postal code search...\n");

  const example = TEST_EXAMPLES[0];
  console.log(`Searching for:`, example.input);

  try {
    const results = await findPostalCodes(
      example.input.county,
      example.input.city,
      example.input.address
    );

    console.log(`Found ${results.length} postal codes:`);
    results.forEach((result, index) => {
      console.log(`${index + 1}. ${result.postcode} - ${result.formatted} (confidence: ${result.confidence})`);
    });

    console.log(`\nSanitized address:`, results[0]?.sanitizedAddress);
  } catch (error) {
    console.error("Error:", error);
  }
}
