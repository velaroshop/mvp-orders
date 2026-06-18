# Prompt: Implementare Varianta 2 de Formular / Widget

## Context
Aplicația are un formular de comandă (widget) embedat pe landing page-uri cu 3 oferte (offer_1, offer_2, offer_3), câmpuri de livrare, upsells și rezumat comandă. Structura curentă (V1) este: Header preț → Date livrare → Selectare ofertă → Upsells → Rezumat → Submit.

## Ce vreau
Vreau să adaug o a doua variantă de formular (V2) care schimbă ordinea secțiunilor și headerul. Varianta se selectează per landing page din admin (doar pentru superadmini). Varianta 1 rămâne default și neatinsă.

### Diferențe V2 față de V1:

**Header V2 — Preț vechi / Preț nou explicit:**
- În loc de simplu `SRP → price`, afișează două blocuri cu labels:
  - "Preț vechi" (line-through, opacitate redusă) + valoarea SRP
  - "Preț nou" (bold, mare) + valoarea price_1 (fixă, nu se schimbă cu oferta selectată)
- Badge REDUCERE X% calculat fix din SRP și price_1 (nu dinamic cu oferta selectată)
- Dacă oferta selectată are transport gratuit, afișează "🚚 TRANSPORT GRATUIT" sub prețuri
- Social proof text: "Peste 10.000 de clienți din România sunt mulțumiți de acest produs"
- Spații mai compacte decât V1

**Ordine secțiuni V2:**
1. Header cu preț vechi/nou
2. **Selectare ofertă** (mutat SUS, înainte de date livrare)
3. **Date livrare** (mutat JOS, după oferte)
4. Presale upsells (neschimbat)
5. Rezumat comandă (neschimbat)
6. Buton submit (neschimbat)

**Indicator ofertă selectată:**
- Pe V2, oferta activă are textul "✓ Oferta selectată" în partea de jos, în culoarea primară a store-ului
- Apare doar pe V2, nu pe V1

### Cerințe tehnice:

#### Baza de date (migrație SQL):
```sql
ALTER TABLE landing_pages
  ADD COLUMN IF NOT EXISTS form_variant INTEGER NOT NULL DEFAULT 1;
```

#### API-uri de modificat:
- **Update landing page (PUT)** — acceptă și salvează `form_variant`:
  ```typescript
  if (body.form_variant !== undefined) updateData.form_variant = body.form_variant;
  ```
- **Public landing page (GET)** — returnează `form_variant` (dacă folosești SELECT *, vine automat)

#### Admin landing pages (superadmin only):
Adaugă un selector dropdown pe cardul landing page-ului, vizibil doar pentru superadmini:
```tsx
{isSuperadmin && (
  <div className="flex items-center gap-2">
    <span className="text-xs text-zinc-400">📋 Form Variant</span>
    <select
      value={(page as any).form_variant || 1}
      onChange={async (e) => {
        const newVariant = parseInt(e.target.value);
        await fetch(`/api/landing-pages/${page.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ form_variant: newVariant }),
        });
        // Refresh local state
      }}
      className="px-2 py-0.5 bg-zinc-900 border border-zinc-700 rounded text-xs text-white"
    >
      <option value={1}>V1 — Classic</option>
      <option value={2}>V2 — Oferte sus</option>
    </select>
  </div>
)}
```

#### Widget — interfață LandingPage:
Adaugă câmpul în interfața TypeScript:
```typescript
interface LandingPage {
  // ... câmpuri existente
  form_variant?: number;
}
```

#### Widget — variabila de control:
La începutul rendering-ului:
```typescript
const isV2 = landingPage.form_variant === 2;
const discountV2 = landingPage ? Math.round(((landingPage.srp - landingPage.price_1) / landingPage.srp) * 100) : 0;
```

#### Widget — Header V2 (rendering condițional):
```tsx
{/* V2 Header */}
{isV2 && (
  <div className="relative rounded-lg shadow-lg p-2.5 pt-5 mb-2 sm:mb-3" style={{ backgroundColor }}>
    {/* Discount Badge */}
    <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
      <span className="px-3 py-1 text-white rounded-full text-sm sm:text-base font-bold whitespace-nowrap shadow-lg"
        style={{ background: 'linear-gradient(135deg, #ef4444 0%, #f97316 100%)' }}>
        REDUCERE {discountV2}%
      </span>
    </div>
    
    <div className="flex items-center justify-center gap-3 sm:gap-4 mb-1.5">
      <div className="text-center">
        <p className="text-[10px] sm:text-xs uppercase tracking-wide mb-0.5" style={{ color: textOnDarkColor, opacity: 0.6 }}>Preț vechi</p>
        <span className="text-lg sm:text-xl font-bold line-through" style={{ color: textOnDarkColor, opacity: 0.5 }}>
          {landingPage.srp.toFixed(2)} Lei
        </span>
      </div>
      <span className="text-xl sm:text-2xl" style={{ color: textOnDarkColor, opacity: 0.7 }}>→</span>
      <div className="text-center">
        <p className="text-[10px] sm:text-xs uppercase tracking-wide mb-0.5" style={{ color: textOnDarkColor, opacity: 0.8 }}>Preț nou</p>
        <span className="text-2xl sm:text-3xl font-black" style={{ color: textOnDarkColor }}>
          {landingPage.price_1.toFixed(2)} LEI
        </span>
      </div>
    </div>
    
    {hasFreeShipping() && (
      <div className="text-center mb-1">
        <span className="text-sm font-bold text-emerald-400 animate-pulse">🚚 TRANSPORT GRATUIT</span>
      </div>
    )}
    
    <div className="flex items-center justify-center" style={{ color: textOnDarkColor, opacity: 0.9 }}>
      <span className="text-yellow-400 text-sm sm:text-base">⭐⭐⭐⭐⭐</span>
    </div>
    <div className="flex items-center justify-center text-[10px] sm:text-xs mt-0.5" style={{ color: textOnDarkColor, opacity: 0.9 }}>
      <span className="font-medium">Peste 10.000 de clienți din România sunt mulțumiți de acest produs</span>
    </div>
  </div>
)}

{/* V1 Header — neschimbat, wrapped cu {!isV2 && (...)} */}
{!isV2 && (
  // ... header-ul original V1
)}
```

#### Widget — Reordonare secțiuni cu CSS Flexbox:
Cea mai simplă abordare: containerul unified card devine flex column pe V2, și fiecare secțiune primește `order` CSS:

```tsx
{/* Unified Card */}
<div className={`bg-white rounded-lg shadow-lg overflow-hidden ${isV2 ? "flex flex-col" : ""}`}>

  {/* Delivery Information — order 2 pe V2 */}
  <div className={isV2 ? "p-2.5 sm:p-3" : "p-3 sm:p-4"} style={isV2 ? { order: 2 } : undefined}>
    ...
  </div>

  {/* Offers Selection — order 1 pe V2, fără border-top pe V2 */}
  <div className={`${isV2 ? "" : "border-t"} border-zinc-200 ${isV2 ? "p-2.5 sm:p-3" : "p-3 sm:p-4"}`} 
       style={isV2 ? { order: 1 } : undefined}>
    ...
  </div>

  {/* Presale Upsells — order 3 pe V2 */}
  <div className="border-t border-zinc-200 p-3 sm:p-4" style={isV2 ? { order: 3 } : undefined}>
    ...
  </div>

  {/* Order Summary — order 4 pe V2 */}
  <div className="p-2.5 sm:p-3" style={isV2 ? { backgroundColor, order: 4 } : { backgroundColor }}>
    ...
  </div>
</div>
```

#### Widget — Indicator "Oferta selectată":
Pe fiecare buton de ofertă, după badge-ul de preț/free shipping:
```tsx
{isV2 && selectedOffer === "offer_X" && (
  <div className="mt-1 text-[8px] sm:text-[9px] font-bold uppercase" style={{ color: primaryColor }}>
    ✓ Oferta selectată
  </div>
)}
```

### Label "Nume complet":
Schimbă label-ul câmpului fullName din "Nume și Prenume" în "Nume complet" (pentru ambele variante sau doar V2 — la alegere).

## Impact pe funcționalitate existentă
- **Zero** — V1 rămâne default, neatinsă
- Toate landing page-urile existente au `form_variant = 1` (default din migrație)
- Embed code identic — varianta se determină automat din DB
- Fluxul de creare comandă — identic indiferent de variantă

## Ordinea implementării
1. Migrație DB (o coloană nouă)
2. API update (acceptă form_variant)
3. Admin selector (superadmin dropdown)
4. Widget — `isV2` variabilă + header V2 condițional
5. Widget — reordonare secțiuni cu CSS order
6. Widget — indicator "Oferta selectată"
7. Testare: selectează V2 pe un LP → deschide formularul → verifică ordinea secțiunilor, header-ul cu preț vechi/nou, indicatorul de ofertă selectată
