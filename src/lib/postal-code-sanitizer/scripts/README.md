# Scripturi pentru procesarea datelor

## Procesare CSV

Pentru a popula sistemul cu date din CSV:

1. **Pune CSV-ul în folderul proiectului** (ex: `data/localities.csv`)

2. **Format CSV așteptat**:
   ```csv
   county,locality
   Vâlcea,Drăgășani
   Vâlcea,Râmnicu Vâlcea
   Iași,Iași
   ...
   ```

   Sau:
   ```csv
   judet,localitate
   Vâlcea,Drăgășani
   ...
   ```

3. **Rulează scriptul** (va fi creat un script Node.js sau poți folosi funcțiile direct):
   ```typescript
   import { updateLocalitiesFromCSV } from './process-csv';
   
   updateLocalitiesFromCSV(
     './data/localities.csv',
     './src/lib/postal-code-sanitizer/data/localities.ts'
   );
   ```

## Funcționalități

- ✅ Detectează automat header-ul CSV (county/judet, locality/localitate)
- ✅ Normalizează numele județelor pentru matching cu lista oficială
- ✅ Elimină duplicatele
- ✅ Sortează localitățile alfabetic
- ✅ Generează cod TypeScript valid
- ✅ Păstrează funcțiile helper existente

## Notă

După procesare, verifică manual fișierul generat pentru a te asigura că totul este corect.
