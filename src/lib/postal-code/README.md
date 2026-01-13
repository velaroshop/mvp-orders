# Postal Code Service

Serviciu pentru căutarea codurilor poștale folosind Geoapify API.

## Structură

- `types.ts` - Tipuri TypeScript pentru rezultatele API
- `geoapify.ts` - Implementarea serviciului de căutare coduri poștale
- `README.md` - Acest fișier

## Utilizare

Serviciul este folosit automat în modalul de confirmare comandă (`ConfirmOrderModal.tsx`).

### API Route

Endpoint-ul `/api/postal-code/search` protejează API key-ul și nu îl expune în frontend.

### Variabile de mediu

Adaugă în `.env.local`:
```
GEOAPIFY_API_KEY=2f1914bf75294bf3868ec63c7b4d043d
```

Dacă nu este setat, se folosește valoarea hardcodată (doar pentru MVP).

## Funcționalități

- Căutare automată când se deschide modalul de confirmare
- Buton "Reload" pentru reîncărcare manuală
- Afișare coduri poștale recomandate cu adrese complete
- Selectare cod poștal prin click
- Filtrare doar pentru România
