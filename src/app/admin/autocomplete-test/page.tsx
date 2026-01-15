"use client";

import { useState } from "react";

interface AutocompleteResult {
  formatted: string;
  address_line1: string;
  address_line2: string;
  postcode: string;
  city: string;
  county: string;
  state: string;
  country: string;
  street: string;
  housenumber: string;
  lat: number;
  lon: number;
  place_id: string;
  confidence: number;
  result_type: string;
}

export default function AutocompleteTestPage() {
  const [county, setCounty] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  
  const [countySuggestions, setCountySuggestions] = useState<AutocompleteResult[]>([]);
  const [citySuggestions, setCitySuggestions] = useState<AutocompleteResult[]>([]);
  const [addressSuggestions, setAddressSuggestions] = useState<AutocompleteResult[]>([]);
  
  const [showCountySuggestions, setShowCountySuggestions] = useState(false);
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
  
  const [selectedPostalCode, setSelectedPostalCode] = useState<string>("");

  async function searchCountyAutocomplete(text: string) {
    if (text.length < 2) {
      setCountySuggestions([]);
      setShowCountySuggestions(false);
      return;
    }

    try {
      const response = await fetch(`/api/postal-code/autocomplete?text=${encodeURIComponent(text)}&type=county&limit=5`);
      if (response.ok) {
        const data = await response.json();
        setCountySuggestions(data.results || []);
        setShowCountySuggestions(true);
      }
    } catch (error) {
      console.error("Error searching counties:", error);
    }
  }

  async function searchCityAutocomplete(text: string, countyFilter?: string) {
    if (text.length < 2) {
      setCitySuggestions([]);
      setShowCitySuggestions(false);
      return;
    }

    try {
      let url = `/api/postal-code/autocomplete?text=${encodeURIComponent(text)}&type=city&limit=5`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        let results = data.results || [];
        if (countyFilter) {
          results = results.filter((r: AutocompleteResult) => 
            r.county?.toLowerCase().includes(countyFilter.toLowerCase())
          );
        }
        setCitySuggestions(results);
        setShowCitySuggestions(true);
      }
    } catch (error) {
      console.error("Error searching cities:", error);
    }
  }

  async function searchAddressAutocomplete(text: string, cityFilter?: string, countyFilter?: string) {
    if (text.length < 2) {
      setAddressSuggestions([]);
      setShowAddressSuggestions(false);
      return;
    }

    try {
      let searchText = text;
      if (cityFilter) {
        searchText = `${text}, ${cityFilter}`;
      }
      if (countyFilter) {
        searchText = `${searchText}, ${countyFilter}`;
      }

      const response = await fetch(`/api/postal-code/autocomplete?text=${encodeURIComponent(searchText)}&type=street&limit=5`);
      if (response.ok) {
        const data = await response.json();
        setAddressSuggestions(data.results || []);
        setShowAddressSuggestions(true);
      }
    } catch (error) {
      console.error("Error searching addresses:", error);
    }
  }

  function selectCounty(suggestion: AutocompleteResult) {
    setCounty(suggestion.county || suggestion.formatted);
    setSelectedPostalCode(suggestion.postcode || "");
    setCountySuggestions([]);
    setShowCountySuggestions(false);
    setCity("");
  }

  function selectCity(suggestion: AutocompleteResult) {
    setCity(suggestion.city || suggestion.formatted);
    setSelectedPostalCode(suggestion.postcode || "");
    setCitySuggestions([]);
    setShowCitySuggestions(false);
  }

  function selectAddress(suggestion: AutocompleteResult) {
    const fullAddress = suggestion.address_line1 || suggestion.formatted || "";
    setAddress(fullAddress);
    setSelectedPostalCode(suggestion.postcode || "");
    if (!city && suggestion.city) {
      setCity(suggestion.city);
    }
    if (!county && suggestion.county) {
      setCounty(suggestion.county);
    }
    setAddressSuggestions([]);
    setShowAddressSuggestions(false);
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-zinc-900 mb-6">Test Autocomplete API</h1>
      
      <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
        <div className="relative">
          <label className="block text-sm font-medium text-zinc-900 mb-1">
            Județ*
          </label>
          <input
            type="text"
            value={county}
            onChange={(e) => {
              setCounty(e.target.value);
              searchCountyAutocomplete(e.target.value);
            }}
            onFocus={() => {
              if (county.length >= 2) {
                searchCountyAutocomplete(county);
              }
            }}
            onBlur={() => {
              setTimeout(() => setShowCountySuggestions(false), 200);
            }}
            placeholder="Începeți să scrieți județul (ex: Cluj)"
            className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-zinc-900 placeholder:text-zinc-500"
          />
          {showCountySuggestions && countySuggestions.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-zinc-300 rounded-lg shadow-lg max-h-60 overflow-auto">
              {countySuggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => selectCounty(suggestion)}
                  className="w-full text-left px-3 py-2 hover:bg-zinc-50 text-sm text-zinc-900 border-b border-zinc-100 last:border-b-0"
                >
                  <div className="font-medium">{suggestion.county || suggestion.formatted}</div>
                  {suggestion.state && (
                    <div className="text-xs text-zinc-600">{suggestion.state}</div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative">
          <label className="block text-sm font-medium text-zinc-900 mb-1">
            Localitate, comună sau sat*
          </label>
          <input
            type="text"
            value={city}
            onChange={(e) => {
              setCity(e.target.value);
              searchCityAutocomplete(e.target.value, county);
            }}
            onFocus={() => {
              if (city.length >= 2) {
                searchCityAutocomplete(city, county);
              }
            }}
            onBlur={() => {
              setTimeout(() => setShowCitySuggestions(false), 200);
            }}
            placeholder="Începeți să scrieți localitatea (ex: Cluj-Napoca)"
            className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-zinc-900 placeholder:text-zinc-500"
          />
          {showCitySuggestions && citySuggestions.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-zinc-300 rounded-lg shadow-lg max-h-60 overflow-auto">
              {citySuggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => selectCity(suggestion)}
                  className="w-full text-left px-3 py-2 hover:bg-zinc-50 text-sm text-zinc-900 border-b border-zinc-100 last:border-b-0"
                >
                  <div className="font-medium">{suggestion.city || suggestion.formatted}</div>
                  {suggestion.postcode && (
                    <div className="text-xs text-zinc-600">CP: {suggestion.postcode}</div>
                  )}
                  {suggestion.county && (
                    <div className="text-xs text-zinc-500">{suggestion.county}</div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative">
          <label className="block text-sm font-medium text-zinc-900 mb-1">
            Stradă, număr, bloc, scară, ap.*
          </label>
          <input
            type="text"
            value={address}
            onChange={(e) => {
              setAddress(e.target.value);
              searchAddressAutocomplete(e.target.value, city, county);
            }}
            onFocus={() => {
              if (address.length >= 2) {
                searchAddressAutocomplete(address, city, county);
              }
            }}
            onBlur={() => {
              setTimeout(() => setShowAddressSuggestions(false), 200);
            }}
            placeholder="Începeți să scrieți strada (ex: Memorandumului)"
            className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-zinc-900 placeholder:text-zinc-500"
          />
          {showAddressSuggestions && addressSuggestions.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-zinc-300 rounded-lg shadow-lg max-h-60 overflow-auto">
              {addressSuggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => selectAddress(suggestion)}
                  className="w-full text-left px-3 py-2 hover:bg-zinc-50 text-sm text-zinc-900 border-b border-zinc-100 last:border-b-0"
                >
                  <div className="font-medium">{suggestion.address_line1 || suggestion.formatted}</div>
                  {suggestion.postcode && (
                    <div className="text-xs text-emerald-600 font-medium">CP: {suggestion.postcode}</div>
                  )}
                  {suggestion.city && suggestion.county && (
                    <div className="text-xs text-zinc-500">{suggestion.city}, {suggestion.county}</div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedPostalCode && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <div className="text-sm font-medium text-emerald-900">Cod poștal detectat</div>
                <div className="text-lg font-bold text-emerald-700">{selectedPostalCode}</div>
              </div>
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-zinc-200">
          <h3 className="text-sm font-medium text-zinc-700 mb-2">Date completate:</h3>
          <div className="text-sm text-zinc-600 space-y-1">
            <div><strong>Județ:</strong> {county || "-"}</div>
            <div><strong>Localitate:</strong> {city || "-"}</div>
            <div><strong>Adresă:</strong> {address || "-"}</div>
            <div><strong>Cod poștal:</strong> {selectedPostalCode || "-"}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
