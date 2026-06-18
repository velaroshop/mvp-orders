# Prompt: Fix Actions Dropdown Clipped by Overflow

## Context
Aplicația are tabele cu un buton "Actions" per rând care deschide un dropdown menu. Dropdown-ul folosește `position: absolute` și este tăiat/ascuns de containerul tabelului care are `overflow-hidden` sau `overflow-x-auto`. Problema e vizibilă mai ales pe rândurile de jos unde dropdown-ul nu are loc să se deschidă în josul paginii.

## Problema
Dropdown-urile cu `position: absolute` sunt limitate de primul parent cu `position: relative` sau `overflow: hidden`. Când tabelul are overflow sau dropdown-ul e aproape de marginea de jos a viewport-ului, meniul e tăiat și nu se vede complet.

## Soluția
Înlocuiește `position: absolute` cu `position: fixed` și calculează coordonatele pe baza poziției butonului în viewport. Dropdown-ul se deschide în jos dacă are loc, sau în sus dacă e aproape de marginea de jos.

## Implementare

### 1. Adaugă state pentru poziția dropdown-ului
```typescript
const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, openUp: false });
```

### 2. Calculează poziția la click pe butonul Actions
```tsx
<button
  onClick={(e) => {
    if (openDropdown === item.id) {
      setOpenDropdown(null);
    } else {
      const rect = e.currentTarget.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUp = spaceBelow < 300; // prag: dacă sunt mai puțin de 300px sub buton, deschide în sus
      setDropdownPos({
        top: openUp ? rect.top : rect.bottom + 4,
        left: rect.right - 192, // 192px = lățimea dropdown-ului (w-48 = 12rem = 192px)
        openUp,
      });
      setOpenDropdown(item.id);
    }
  }}
>
  Actions ▼
</button>
```

### 3. Dropdown-ul folosește position: fixed
```tsx
{openDropdown === item.id && (
  <div
    style={{
      position: 'fixed',
      top: dropdownPos.openUp ? undefined : dropdownPos.top,
      bottom: dropdownPos.openUp ? (window.innerHeight - dropdownPos.top) + 4 : undefined,
      left: Math.max(4, dropdownPos.left), // Math.max(4, ...) previne ieșirea din viewport pe stânga
    }}
    className="w-48 bg-zinc-700 border border-zinc-600 rounded-md shadow-lg z-50"
  >
    {/* dropdown content */}
  </div>
)}
```

### 4. Close la click în afara dropdown-ului
Dacă nu ai deja, adaugă un event listener:
```typescript
useEffect(() => {
  function handleClickOutside(e: MouseEvent) {
    if (openDropdown && !(e.target as Element)?.closest(".actions-dropdown")) {
      setOpenDropdown(null);
    }
  }
  document.addEventListener("mousedown", handleClickOutside);
  return () => document.removeEventListener("mousedown", handleClickOutside);
}, [openDropdown]);
```
Și pune clasa `actions-dropdown` pe div-ul parent al butonului + dropdown.

## Note importante
- **Pragul de 300px** pentru `openUp` poate fi ajustat în funcție de înălțimea dropdown-ului
- **Lățimea dropdown** (192px pentru `w-48`, 176px pentru `w-44`) trebuie scăzută din `rect.right` pentru aliniere la dreapta
- **`Math.max(4, ...)`** pe `left` previne ca dropdown-ul să iasă din viewport pe stânga
- **z-50** (sau mai mare) e necesar ca dropdown-ul să fie deasupra altor elemente
- **Nu uita** să pui `onClick={(e) => e.stopPropagation()}` pe `<td>`-ul cu Actions dacă rândul tabelului are click handler (ex: deschidere modal la click pe rând)

## Verificare
Caută în proiect toate dropdown-urile cu `position: absolute` în tabele:
```
grep -r "absolute.*right-0.*bg-zinc" src/app/admin/
grep -r "openDropdown" src/app/admin/
```
Și aplică fix-ul pe fiecare.
