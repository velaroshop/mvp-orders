"use client";

import { useState } from "react";

interface PostalCodeResult {
  postcode: string;
  formatted: string;
  confidence: number;
  sanitizedAddress: {
    county: string;
    city: string;
    street: string;
    number?: string;
    original: {
      county: string;
      city: string;
      address: string;
    };
  };
}

export default function PostalCodeTestPage() {
  const [formData, setFormData] = useState({
    county: "",
    city: "",
    address: "",
  });
  const [results, setResults] = useState<PostalCodeResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch() {
    if (!formData.county || !formData.city || !formData.address) {
      setError("Completează toate câmpurile");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResults([]);

    try {
      const params = new URLSearchParams({
        county: formData.county,
        city: formData.city,
        address: formData.address,
      });

      const response = await fetch(`/api/postal-code/sanitize?${params.toString()}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to search postal codes");
      }

      const data = await response.json();
      setResults(data.postalCodes || []);
    } catch (err) {
      console.error("Error searching postal codes:", err);
      setError(err instanceof Error ? err.message : "Eroare la căutarea codurilor poștale");
    } finally {
      setIsLoading(false);
    }
  }

  function loadExample(example: "1" | "2" | "3") {
    const examples = {
      "1": {
        county: "vilcea",
        city: "drgasani",
        address: "str viilor numaru 5a",
      },
      "2": {
        county: "iasi",
        city: "iasi",
        address: "Strada Logovat nr 3",
      },
      "3": {
        county: "Cluj",
        city: "Cluj-Napoca",
        address: "Strada Memorandumului",
      },
    };

    setFormData(examples[example]);
  }

  return (
    <>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900">
          Test Sistem Coduri Poștale
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Testează sistemul de sanitizare și căutare coduri poștale
        </p>
      </header>

        <div className="rounded-lg bg-white shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-zinc-900 mb-4">
            Introdu adresa pentru testare
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-900 mb-1">
                Județ
              </label>
              <input
                type="text"
                value={formData.county}
                onChange={(e) =>
                  setFormData({ ...formData, county: e.target.value })
                }
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="ex: vilcea, iasi, Cluj"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-900 mb-1">
                Localitate / Oraș
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) =>
                  setFormData({ ...formData, city: e.target.value })
                }
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="ex: drgasani, iasi, Cluj-Napoca"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-900 mb-1">
                Stradă și număr
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="ex: str viilor numaru 5a, Strada Logovat nr 3"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSearch}
                disabled={isLoading}
                className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {isLoading ? "Se caută..." : "Caută coduri poștale"}
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => loadExample("1")}
                  className="px-3 py-2 text-sm bg-zinc-100 text-zinc-700 rounded-md hover:bg-zinc-200"
                >
                  Exemplu 1
                </button>
                <button
                  onClick={() => loadExample("2")}
                  className="px-3 py-2 text-sm bg-zinc-100 text-zinc-700 rounded-md hover:bg-zinc-200"
                >
                  Exemplu 2
                </button>
                <button
                  onClick={() => loadExample("3")}
                  className="px-3 py-2 text-sm bg-zinc-100 text-zinc-700 rounded-md hover:bg-zinc-200"
                >
                  Exemplu 3
                </button>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-4 mb-6">
            <p className="text-sm text-red-800 font-medium">Eroare</p>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-4">
            <div className="rounded-lg bg-white shadow-sm p-6">
              <h2 className="text-lg font-semibold text-zinc-900 mb-4">
                Adresa sanitizată
              </h2>
              <div className="bg-zinc-50 rounded-md p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-zinc-600 w-24">
                    Județ:
                  </span>
                  <span className="text-sm text-zinc-900">
                    {results[0].sanitizedAddress.county}
                    {results[0].sanitizedAddress.county !==
                      results[0].sanitizedAddress.original.county && (
                      <span className="text-zinc-500 ml-2">
                        (era: {results[0].sanitizedAddress.original.county})
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-zinc-600 w-24">
                    Localitate:
                  </span>
                  <span className="text-sm text-zinc-900">
                    {results[0].sanitizedAddress.city}
                    {results[0].sanitizedAddress.city !==
                      results[0].sanitizedAddress.original.city && (
                      <span className="text-zinc-500 ml-2">
                        (era: {results[0].sanitizedAddress.original.city})
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-zinc-600 w-24">
                    Stradă:
                  </span>
                  <span className="text-sm text-zinc-900">
                    {results[0].sanitizedAddress.street}
                    {results[0].sanitizedAddress.street !==
                      results[0].sanitizedAddress.original.address && (
                      <span className="text-zinc-500 ml-2">
                        (era: {results[0].sanitizedAddress.original.address})
                      </span>
                    )}
                  </span>
                </div>
                {results[0].sanitizedAddress.number && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-zinc-600 w-24">
                      Număr:
                    </span>
                    <span className="text-sm text-zinc-900">
                      {results[0].sanitizedAddress.number}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-lg bg-white shadow-sm p-6">
              <h2 className="text-lg font-semibold text-zinc-900 mb-4">
                Coduri poștale găsite ({results.length})
              </h2>
              <div className="space-y-3">
                {results.map((result, index) => (
                  <div
                    key={index}
                    className="border border-zinc-200 rounded-md p-4 hover:bg-zinc-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-lg font-bold text-emerald-600">
                            {result.postcode}
                          </span>
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${
                              result.confidence >= 0.9
                                ? "bg-emerald-100 text-emerald-800"
                                : result.confidence >= 0.7
                                ? "bg-amber-100 text-amber-800"
                                : "bg-zinc-100 text-zinc-800"
                            }`}
                          >
                            Confidence: {(result.confidence * 100).toFixed(0)}%
                          </span>
                        </div>
                        <p className="text-sm text-zinc-600">
                          {result.formatted}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {results.length === 0 && !isLoading && !error && (
          <div className="rounded-lg bg-zinc-50 border border-zinc-200 p-6 text-center">
            <p className="text-sm text-zinc-600">
              Completează adresa și apasă "Caută coduri poștale" pentru a testa sistemul
            </p>
          </div>
        )}
    </>
  );
}
