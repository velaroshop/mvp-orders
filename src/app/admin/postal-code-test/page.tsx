"use client";

import { useState } from "react";

interface PostalCodeResult {
  postal_code: string;
  county: string;
  city: string;
  street_type: string;
  street_name: string;
  number: string;
  sector?: string;
  full_address: string;
  confidence: number;
  scores: {
    county: number;
    city: number;
    street: number;
  };
}

export default function PostalCodeTestPage() {
  const [formData, setFormData] = useState({
    county: "",
    city: "",
    street: "",
  });
  const [results, setResults] = useState<PostalCodeResult[]>([]);
  const [totalFound, setTotalFound] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch() {
    if (!formData.county || !formData.city) {
      setError("Completează cel puțin județul și orașul");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResults([]);

    try {
      const response = await fetch('/api/postal-code-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          county: formData.county,
          city: formData.city,
          street: formData.street,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to search postal codes");
      }

      const data = await response.json();
      setResults(data.results || []);
      setTotalFound(data.total_found || 0);
    } catch (err) {
      console.error("Error searching postal codes:", err);
      setError(err instanceof Error ? err.message : "Eroare la căutarea codurilor poștale");
    } finally {
      setIsLoading(false);
    }
  }

  function loadExample(example: "1" | "2" | "3" | "4" | "5" | "6" | "7") {
    const examples = {
      "1": {
        county: "vilcea",
        city: "drgasani",
        street: "str viilor",
      },
      "2": {
        county: "iasi",
        city: "iasi",
        street: "Strada Logovat",
      },
      "3": {
        county: "Cluj",
        city: "Cluj-Napoca",
        street: "Strada Memorandumului",
      },
      "4": {
        county: "VL",
        city: "Ramnicu Valcea",
        street: "",
      },
      "5": {
        county: "Bucuresti",
        city: "Bucuresti",
        street: "Henri Coanda",
      },
      "6": {
        county: "Iasi",
        city: "Boureni",
        street: "",
      },
      "7": {
        county: "Iasi",
        city: "Boureni, Motca",
        street: "",
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
          Testează sistemul de căutare cu fuzzy matching pentru coduri poștale
        </p>
      </header>

      <div className="rounded-lg bg-white shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold text-zinc-900 mb-4">
          Introdu adresa pentru testare
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-900 mb-1">
              Județ*
            </label>
            <input
              type="text"
              value={formData.county}
              onChange={(e) =>
                setFormData({ ...formData, county: e.target.value })
              }
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="ex: Vâlcea, VL, vilcea, Iași, Cluj"
            />
            <p className="mt-1 text-xs text-zinc-500">
              Acceptă abrevieri (VL, MH, B) și variații (vilcea, iasi)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-900 mb-1">
              Localitate / Oraș*
            </label>
            <input
              type="text"
              value={formData.city}
              onChange={(e) =>
                setFormData({ ...formData, city: e.target.value })
              }
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="ex: Drăgășani, Cluj-Napoca, Boureni, Motca"
            />
            <p className="mt-1 text-xs text-zinc-500">
              Acceptă variații, greșeli de scriere. Pentru sate în comune multiple, adaugă comuna: "Sat, Comuna"
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-900 mb-1">
              Stradă (opțional)
            </label>
            <input
              type="text"
              value={formData.street}
              onChange={(e) =>
                setFormData({ ...formData, street: e.target.value })
              }
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="ex: Viilor, Memorandumului, Logovat"
            />
            <p className="mt-1 text-xs text-zinc-500">
              Lasă gol pentru căutare doar după județ și oraș
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleSearch}
              disabled={isLoading}
              className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {isLoading ? "Se caută..." : "Caută coduri poștale"}
            </button>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => loadExample("1")}
                className="px-3 py-2 text-sm bg-zinc-100 text-zinc-700 rounded-md hover:bg-zinc-200"
              >
                Ex 1: Vâlcea
              </button>
              <button
                onClick={() => loadExample("2")}
                className="px-3 py-2 text-sm bg-zinc-100 text-zinc-700 rounded-md hover:bg-zinc-200"
              >
                Ex 2: Iași
              </button>
              <button
                onClick={() => loadExample("3")}
                className="px-3 py-2 text-sm bg-zinc-100 text-zinc-700 rounded-md hover:bg-zinc-200"
              >
                Ex 3: Cluj
              </button>
              <button
                onClick={() => loadExample("4")}
                className="px-3 py-2 text-sm bg-zinc-100 text-zinc-700 rounded-md hover:bg-zinc-200"
              >
                Ex 4: Abreviere
              </button>
              <button
                onClick={() => loadExample("5")}
                className="px-3 py-2 text-sm bg-amber-100 text-amber-800 rounded-md hover:bg-amber-200 font-medium"
              >
                Ex 5: Nume inversat
              </button>
              <button
                onClick={() => loadExample("6")}
                className="px-3 py-2 text-sm bg-blue-100 text-blue-800 rounded-md hover:bg-blue-200 font-medium"
              >
                Ex 6: Sat în comune
              </button>
              <button
                onClick={() => loadExample("7")}
                className="px-3 py-2 text-sm bg-purple-100 text-purple-800 rounded-md hover:bg-purple-200 font-medium"
              >
                Ex 7: Sat, Comună
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
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4">
            <p className="text-sm text-emerald-800">
              <span className="font-medium">Rezultate:</span> Găsite {totalFound} coduri poștale, afișate top 3 cele mai relevante
            </p>
          </div>

          <div className="rounded-lg bg-white shadow-sm p-6">
            <h2 className="text-lg font-semibold text-zinc-900 mb-4">
              Top 3 Coduri Poștale
            </h2>
            <div className="space-y-3">
              {results.map((result, index) => (
                <div
                  key={index}
                  className="border border-zinc-200 rounded-md p-4 hover:bg-zinc-50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-bold text-emerald-600">
                        {result.postal_code}
                      </span>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          result.confidence >= 0.9
                            ? "bg-emerald-100 text-emerald-800"
                            : result.confidence >= 0.7
                            ? "bg-amber-100 text-amber-800"
                            : "bg-orange-100 text-orange-800"
                        }`}
                      >
                        {result.confidence >= 0.9 ? '✓ ' : result.confidence >= 0.7 ? '⚠ ' : '? '}
                        Confidence: {(result.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                    <span className="text-xs bg-zinc-100 text-zinc-600 px-2 py-1 rounded">
                      #{index + 1}
                    </span>
                  </div>

                  <p className="text-sm text-zinc-900 font-medium mb-2">
                    {result.full_address}
                  </p>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-zinc-50 rounded p-2">
                      <span className="text-zinc-500">Județ:</span>
                      <span className="ml-1 font-medium text-zinc-900">{result.county}</span>
                      <span className="ml-2 text-emerald-600">
                        ({(result.scores.county * 100).toFixed(0)}%)
                      </span>
                    </div>
                    <div className="bg-zinc-50 rounded p-2">
                      <span className="text-zinc-500">Oraș:</span>
                      <span className="ml-1 font-medium text-zinc-900">{result.city}</span>
                      <span className="ml-2 text-emerald-600">
                        ({(result.scores.city * 100).toFixed(0)}%)
                      </span>
                    </div>
                    {result.street_name && (
                      <div className="bg-zinc-50 rounded p-2 col-span-2">
                        <span className="text-zinc-500">Stradă:</span>
                        <span className="ml-1 font-medium text-zinc-900">
                          {result.street_type} {result.street_name}
                          {result.number && `, ${result.number}`}
                        </span>
                        <span className="ml-2 text-emerald-600">
                          ({(result.scores.street * 100).toFixed(0)}%)
                        </span>
                      </div>
                    )}
                    {result.sector && (
                      <div className="bg-blue-50 rounded p-2 col-span-2">
                        <span className="text-blue-700 font-medium">
                          Sector {result.sector}, București
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {results.length === 0 && !isLoading && !error && (
        <div className="rounded-lg bg-zinc-50 border border-zinc-200 p-8 text-center">
          <div className="text-zinc-400 text-4xl mb-3">📮</div>
          <p className="text-sm text-zinc-600">
            Completează județ și oraș pentru a căuta coduri poștale
          </p>
          <p className="text-xs text-zinc-500 mt-2">
            Sistemul acceptă abrevieri, greșeli de scriere și variații ale denumirilor
          </p>
        </div>
      )}
    </>
  );
}
