# Sistem de Sanitizare și Căutare Coduri Poștale

Sistem simplu și eficient pentru sanitizarea adreselor românești și căutarea codurilor poștale folosind Geoapify API.

## ✅ Caracteristici

- **Sanitizare în cascadă**: Județ → Localitate → Stradă
- **Fuzzy matching**: Corectează automat erorile de scriere (ex: "vilcea" → "Vâlcea")
- **Extragere număr**: Separă numărul de stradă automat
- **Integrare Geoapify**: Folosește API-ul Geoapify pentru căutare precisă
- **API endpoint**: Gata de folosit în aplicația de ecom
- **Localități complete**: Peste 200+ localități principale pentru toate județele

## 📁 Structură

```
postal-code-sanitizer/
├── index.ts              # API principal
├── sanitizer.ts          # Logica de sanitizare
├── types.ts              # TypeScript types
├── data/
│   ├── counties.ts      # Lista de județe (42 județe)
│   └── localities.ts    # Lista de localități per județ (200+ localități)
└── utils/
    ├── normalize.ts     # Normalizare text
    ├── fuzzy-match.ts   # Fuzzy matching (Levenshtein)
    └── extract-street.ts # Extragere număr din adresă
```

## 🚀 Utilizare

### În cod (TypeScript)

```typescript
import { findPostalCodes } from "@/lib/postal-code-sanitizer";

// Caută coduri poștale pentru o adresă
const results = await findPostalCodes(
  "vilcea",           // Județ (va fi corectat la "Vâlcea")
  "drgasani",         // Localitate (va fi corectat la "Drăgășani")
  "str viilor numaru 5a" // Stradă (va fi corectat la "Str Viilor", număr: "5a")
);

// Rezultatele conțin:
// - postcode: codul poștal
// - formatted: adresa formatată
// - confidence: nivel de încredere (0-1)
// - sanitizedAddress: adresa sanitizată (județ, localitate, stradă corectate)
```

### În aplicația de ecom (API endpoint)

```javascript
// GET /api/postal-code/sanitize?county=vilcea&city=drgasani&address=str%20viilor%20numaru%205a

fetch('/api/postal-code/sanitize?county=vilcea&city=drgasani&address=str%20viilor%20numaru%205a')
  .then(res => res.json())
  .then(data => {
    console.log(data.postalCodes);      // Lista de coduri poștale
    console.log(data.sanitized);        // Adresa sanitizată
    // {
    //   county: "Vâlcea",
    //   city: "Drăgășani",
    //   street: "Str Viilor",
    //   number: "5a"
    // }
  });
```

## 📊 Exemple

### Exemplu 1: Corectare erori de scriere

```typescript
Input:
  county: "vilcea"
  city: "drgasani"
  address: "str viilor numaru 5a"

Output sanitizat:
  county: "Vâlcea"
  city: "Drăgășani"
  street: "Str Viilor"
  number: "5a"
```

### Exemplu 2: Fără număr

```typescript
Input:
  county: "Cluj"
  city: "Cluj-Napoca"
  address: "Strada Memorandumului"

Output sanitizat:
  county: "Cluj"
  city: "Cluj-Napoca"
  street: "Strada Memorandumului"
  number: undefined
```

## 🔧 Adăugare date din PDF

Pentru a adăuga datele complete din PDF-ul cu coduri poștale:

1. **Procesează PDF-ul** și extrage:
   - Lista completă de județe (deja avem toate cele 42)
   - Lista completă de localități per județ

2. **Actualizează `data/localities.ts`**:
   - Adaugă toate localitățile din PDF în `LOCALITIES_BY_COUNTY`
   - Poți folosi `utils/pdf-processor.ts` pentru generare automată

3. **Testează** cu exemple reale pentru a verifica acuratețea

## ⚡ Performanță

- **Fuzzy matching**: O(n*m) pentru Levenshtein, optimizat cu match exact și match parțial
- **Caching**: Datele de județe/localități sunt în memorie (rapid)
- **API calls**: Doar un call la Geoapify per căutare

## 🎯 Cum funcționează

1. **Sanitizare județ**:
   - Normalizează input (lowercase, elimină diacritice)
   - Fuzzy match cu lista oficială de județe
   - Threshold: 0.6 (permite erori mici)

2. **Sanitizare localitate**:
   - Filtrează localitățile după județ sanitizat
   - Fuzzy match cu localitățile din județ
   - Threshold: 0.7 (mai strict)
   - Fallback: returnează input normalizat dacă nu găsește match

3. **Sanitizare stradă**:
   - Extrage numărul (ex: "nr. 5", "5a")
   - Normalizează numele străzii (capitalizează prima literă)
   - Păstrează abrevierea "str" lowercase

4. **Căutare cod poștal**:
   - Folosește adresa sanitizată cu Geoapify
   - Returnează coduri poștale sortate după relevanță

## 🔑 Configurare

Nu necesită configurare suplimentară. Folosește automat:
- `GEOAPIFY_API_KEY` din environment variables
- Datele hardcodate din `data/` (actualizabile cu PDF-ul)

## 📝 Status

✅ Sistem complet implementat
✅ 42 județe complete
✅ 200+ localități principale
✅ API endpoint funcțional
✅ Gata pentru integrare în aplicația de ecom

**Următorul pas**: Adaugă datele complete din PDF pentru acoperire 100% a localităților.
