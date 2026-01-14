/**
 * Script pentru procesarea CSV-ului cu județe și localități
 * 
 * Format CSV așteptat:
 * county,locality
 * Vâlcea,Drăgășani
 * Vâlcea,Râmnicu Vâlcea
 * ...
 * 
 * Sau:
 * judet,localitate
 * Vâlcea,Drăgășani
 * ...
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

interface CSVRow {
  county: string;
  locality: string;
}

/**
 * Procesează un CSV și returnează datele grupate pe județe
 */
export function processCSV(csvContent: string): Record<string, string[]> {
  const lines = csvContent.split("\n").filter(line => line.trim().length > 0);
  
  if (lines.length === 0) {
    throw new Error("CSV-ul este gol");
  }

  // Detectează header-ul (poate fi "county,locality" sau "judet,localitate" sau alt format)
  const header = lines[0].toLowerCase();
  const countyIndex = header.includes("county") || header.includes("judet") ? 0 : 
                     header.includes("județ") ? 0 : -1;
  const localityIndex = header.includes("locality") || header.includes("localitate") ? 1 : 
                       header.includes("city") || header.includes("oras") ? 1 : -1;

  if (countyIndex === -1 || localityIndex === -1) {
    throw new Error("CSV-ul trebuie să aibă coloane pentru județ și localitate");
  }

  const localitiesByCounty: Record<string, Set<string>> = {};

  // Procesează fiecare linie (skip header)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Parsează linia (suportă și virgule în ghilimele)
    const columns = parseCSVLine(line);
    
    if (columns.length < 2) {
      console.warn(`Linia ${i + 1} ignorată (prea puține coloane):`, line);
      continue;
    }

    const county = columns[countyIndex]?.trim();
    const locality = columns[localityIndex]?.trim();

    if (!county || !locality) {
      console.warn(`Linia ${i + 1} ignorată (date incomplete):`, line);
      continue;
    }

    // Normalizează județul (capitalizează prima literă)
    const normalizedCounty = normalizeCountyName(county);
    
    if (!localitiesByCounty[normalizedCounty]) {
      localitiesByCounty[normalizedCounty] = new Set();
    }
    
    localitiesByCounty[normalizedCounty].add(locality);
  }

  // Convertește Set-urile în array-uri și sortează
  const result: Record<string, string[]> = {};
  for (const [county, localities] of Object.entries(localitiesByCounty)) {
    result[county] = Array.from(localities).sort();
  }

  return result;
}

/**
 * Parsează o linie CSV (suportă virgule în ghilimele)
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

/**
 * Normalizează numele județului pentru a se potrivi cu lista oficială
 */
function normalizeCountyName(county: string): string {
  // Lista oficială de județe pentru matching
  const officialCounties = [
    "Alba", "Arad", "Argeș", "Bacău", "Bihor", "Bistrița-Năsăud",
    "Botoșani", "Brașov", "Brăila", "București", "Buzău",
    "Caraș-Severin", "Călărași", "Cluj", "Constanța", "Covasna",
    "Dâmbovița", "Dolj", "Galați", "Giurgiu", "Gorj",
    "Harghita", "Hunedoara", "Ialomița", "Iași", "Ilfov",
    "Maramureș", "Mehedinți", "Mureș", "Neamț", "Olt",
    "Prahova", "Sălaj", "Satu Mare", "Sibiu", "Suceava",
    "Teleorman", "Timiș", "Tulcea", "Vâlcea", "Vaslui", "Vrancea",
  ];

  // Încearcă match exact
  const exactMatch = officialCounties.find(c => 
    c.toLowerCase() === county.toLowerCase()
  );
  if (exactMatch) return exactMatch;

  // Încearcă match fără diacritice
  const normalizedInput = county
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  
  const fuzzyMatch = officialCounties.find(c => {
    const normalizedOfficial = c
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    return normalizedOfficial === normalizedInput;
  });
  
  if (fuzzyMatch) return fuzzyMatch;

  // Dacă nu găsește match, returnează originalul capitalizat
  return county
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Generează codul TypeScript pentru localities.ts
 */
export function generateLocalitiesCode(localitiesByCounty: Record<string, string[]>): string {
  let code = `/**
 * Lista de localități per județ
 * 
 * Generat automat din CSV
 * Actualizat: ${new Date().toISOString().split('T')[0]}
 */

export const LOCALITIES_BY_COUNTY: Record<string, string[]> = {\n`;

  // Sortează județele alfabetic
  const sortedCounties = Object.keys(localitiesByCounty).sort();

  for (const county of sortedCounties) {
    const localities = localitiesByCounty[county];
    code += `  "${county}": [\n`;
    
    for (const locality of localities) {
      // Escape ghilimele dacă există
      const escapedLocality = locality.replace(/"/g, '\\"');
      code += `    "${escapedLocality}",\n`;
    }
    
    code += `  ],\n`;
  }

  code += `};\n\n`;

  code += `/**
 * Obține lista de localități pentru un județ dat
 */
export function getLocalitiesForCounty(county: string): string[] {
  return LOCALITIES_BY_COUNTY[county] || [];
}

/**
 * Obține toate localitățile (pentru căutare globală dacă județul nu e cunoscut)
 */
export function getAllLocalities(): string[] {
  return Object.values(LOCALITIES_BY_COUNTY).flat();
}

/**
 * Verifică dacă o localitate există într-un județ
 */
export function isLocalityInCounty(locality: string, county: string): boolean {
  const localities = getLocalitiesForCounty(county);
  return localities.some(loc => 
    loc.toLowerCase().trim() === locality.toLowerCase().trim()
  );
}
`;

  return code;
}

/**
 * Procesează CSV-ul și actualizează fișierul localities.ts
 */
export function updateLocalitiesFromCSV(csvFilePath: string, outputFilePath: string) {
  try {
    console.log(`Reading CSV from: ${csvFilePath}`);
    const csvContent = readFileSync(csvFilePath, "utf-8");
    
    console.log("Processing CSV...");
    const localitiesByCounty = processCSV(csvContent);
    
    console.log(`Found ${Object.keys(localitiesByCounty).length} counties`);
    console.log(`Total localities: ${Object.values(localitiesByCounty).reduce((sum, arr) => sum + arr.length, 0)}`);
    
    console.log("Generating TypeScript code...");
    const code = generateLocalitiesCode(localitiesByCounty);
    
    console.log(`Writing to: ${outputFilePath}`);
    writeFileSync(outputFilePath, code, "utf-8");
    
    console.log("✅ Successfully updated localities.ts");
    
    // Afișează statistici
    console.log("\nStatistics:");
    for (const [county, localities] of Object.entries(localitiesByCounty)) {
      console.log(`  ${county}: ${localities.length} localities`);
    }
  } catch (error) {
    console.error("Error processing CSV:", error);
    throw error;
  }
}
