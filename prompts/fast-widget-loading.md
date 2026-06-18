# Prompt: Optimizare Încărcare Rapidă Widget / Formular Embedat

## Context
Aplicația are un formular de comandă (widget) care se încarcă într-un iframe pe landing page-uri externe. Widget-ul este o pagină Next.js care face fetch la un API public pentru datele landing page-ului (prețuri, oferte, produse, setări). Pe conexiuni lente sau la cold start serverless, formularul poate avea un delay de 3-5 secunde, afișând un spinner "Se încarcă formularul...".

## Ce vreau
Vreau să optimizez încărcarea widget-ului astfel încât formularul să apară vizual instant și datele să se populeze cât mai rapid. Trei optimizări complementare:

### 1. Edge Runtime pe API-ul public
Mută API-ul public care servește datele landing page-ului pe Edge Runtime pentru a elimina cold starts (0ms în loc de 1-3s).

**Implementare:**
Adaugă în fișierul API route (`/api/landing-pages/public/[slug]/route.ts`):
```typescript
// Adaugă imediat după importuri
export const runtime = "edge";
```

**Note:**
- Edge Runtime nu suportă toate Node.js APIs — verifică că dependențele sunt compatibile
- Supabase JS client funcționează pe Edge fără probleme
- Nu necesită modificări pe Vercel — se detectează automat

### 2. Cache cu stale-while-revalidate
Adaugă cache headers pe răspunsul API-ului public. Datele landing page-ului nu se schimbă frecvent, deci pot fi cached la CDN.

**Implementare:**
Pe response-ul JSON din API-ul public, adaugă headers:
```typescript
return NextResponse.json(data, {
  headers: {
    "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
  },
});
```

**Ce face:**
- `s-maxage=60` — CDN-ul servește din cache primele 60 secunde fără a contacta serverul
- `stale-while-revalidate=300` — între 60s și 360s, CDN-ul servește din cache DAR verifică în background dacă datele s-au schimbat
- Vizitatorii primesc răspuns instant din CDN, zero round-trip la server

**Purge cache la edit:**
Când se editează un landing page, cache-ul trebuie invalidat ca ofertele noi să apară instant. Adaugă `revalidatePath` în API-ul de update landing page:

```typescript
import { revalidatePath } from "next/cache";

// După update-ul reușit în DB:
try {
  revalidatePath(`/api/landing-pages/public/${landingPage.slug}`);
} catch (e) {
  // Non-fatal: cache will expire naturally after 60s
}
```

**Fără purge:** dacă nu implementezi purge, datele vechi se vor afișa maxim 60 secunde după o modificare, apoi cache-ul se revalidează automat. Acceptabil în majoritatea cazurilor.

### 3. Skeleton Placeholder
Înlocuiește spinner-ul de loading ("Se încarcă formularul...") cu un skeleton care seamănă vizual cu formularul real. Userul percepe că formularul e deja acolo, doar se populează.

**Implementare:**
Înlocuiește blocul de loading din widget cu un skeleton:

```tsx
if (loading) {
  return (
    <div className="bg-gradient-to-br from-zinc-50 to-zinc-100 py-4 sm:py-8 px-3 sm:px-4">
      <div className="max-w-xl mx-auto">
        {/* Skeleton Header */}
        <div className="rounded-lg p-3 pt-5 mb-3 bg-zinc-200 animate-pulse">
          <div className="h-6 w-32 bg-zinc-300 rounded-full mx-auto mb-3" />
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="h-6 w-24 bg-zinc-300 rounded" />
            <div className="h-6 w-4 bg-zinc-300 rounded" />
            <div className="h-8 w-28 bg-zinc-300 rounded" />
          </div>
          <div className="h-4 w-20 bg-zinc-300 rounded mx-auto mb-1" />
          <div className="h-3 w-48 bg-zinc-300 rounded mx-auto" />
        </div>
        {/* Skeleton Form Card */}
        <div className="bg-white rounded-lg shadow-lg p-4">
          <div className="h-5 w-48 bg-zinc-200 rounded mx-auto mb-4 animate-pulse" />
          {/* Skeleton fields */}
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="mb-3 animate-pulse">
              <div className="h-3 w-24 bg-zinc-200 rounded mb-1.5" />
              <div className="h-10 bg-zinc-100 border border-zinc-200 rounded-lg" />
            </div>
          ))}
          {/* Skeleton offers */}
          <div className="border-t border-zinc-200 pt-3 mt-3">
            <div className="h-5 w-44 bg-zinc-200 rounded mx-auto mb-3 animate-pulse" />
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-zinc-100 border border-zinc-200 rounded-lg animate-pulse" />
              ))}
            </div>
          </div>
          {/* Skeleton button */}
          <div className="mt-4 h-12 bg-zinc-200 rounded-lg animate-pulse" />
        </div>
      </div>
    </div>
  );
}
```

**Aplică și pe `<Suspense fallback>`** — dacă widget-ul e wrapped în Suspense, pune același skeleton ca fallback.

## Impactul combinat

| Optimizare | Fără | Cu |
|---|---|---|
| Cold start | 1-3s | 0ms (Edge) |
| API response | 200-500ms | <50ms (cache hit) |
| Percepție vizuală | Spinner = "nu funcționează" | Skeleton = "se încarcă rapid" |
| **Total load time** | **3-5s** | **<500ms** |

## Ce NU se modifică
- Funcționalitatea formularului — identică
- Fluxul de creare comandă — identic
- Datele trimise la Helpship/Meta — identice
- Landing page-urile existente — nicio schimbare

## Ordinea implementării
1. Edge Runtime (1 linie de cod)
2. Cache headers (3 linii pe response)
3. Purge la edit (5 linii în update API)
4. Skeleton placeholder (înlocuiește blocul de loading)
5. Testare: deschide widget-ul pe mobile → verifică că apare skeleton instant → datele se populează rapid
