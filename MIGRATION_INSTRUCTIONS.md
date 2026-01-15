# Instrucțiuni pentru Aplicarea Migrației 006

## Pași pentru aplicarea migrației SQL

1. **Accesează Supabase Dashboard**
   - Intră în proiectul tău Supabase
   - Navighează la secțiunea "SQL Editor"

2. **Rulează migrația 006-add-sync-error-status.sql**
   - Copiază conținutul fișierului `migrations/006-add-sync-error-status.sql`
   - Lipește în SQL Editor
   - Execută query-ul

3. **Verificare**
   - După execuție, ar trebui să vezi mesajul de succes
   - Constraint-ul `orders_status_check` va permite valorile: 'pending', 'confirmed', 'cancelled', 'hold', 'sync_error'

## Ce face această migrație

Adaugă suport pentru noul status **`sync_error`** în tabelul `orders`. Acest status este folosit când:
- O comandă este creată cu succes în baza de date locală
- Dar nu poate fi sincronizată cu Helpship API (eroare de rețea, credențiale invalide, etc.)

## Impactul în aplicație

După aplicarea migrației, comenzile care eșuează la sincronizare cu Helpship vor fi marcate automat cu status `sync_error` și vor apărea în interfața admin cu un badge roșu distinct (rose-100/rose-900).

Comenzile cu `sync_error` pot fi re-sincronizate manual sau prin funcționalitate de retry (de implementat în viitor, dacă este necesar).
