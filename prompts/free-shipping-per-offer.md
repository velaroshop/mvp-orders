# Prompt: Implementare Transport Gratuit per Ofertă

## Context
Aplicația are un sistem de landing pages cu 3 oferte (offer_1, offer_2, offer_3), fiecare cu preț și cantitate diferită. Toate ofertele au același cost de transport (shipping_price), stocat ca un singur câmp global pe landing page. Formularul de comandă (widget) este embedat în iframe pe site-uri externe.

## Ce vreau
Vreau să adaug posibilitatea de a seta **transport gratuit** independent pe fiecare din cele 3 oferte ale unui landing page. 

### Cerințe funcționale:
1. În admin, la editare/creare landing page, vreau **3 checkbox-uri** sub câmpul de Shipping Price: "Transport Gratuit Oferta 1", "Transport Gratuit Oferta 2", "Transport Gratuit Oferta 3"
2. Când o ofertă are transport gratuit bifat, în formularul clientului (widget):
   - Costul de transport devine **0** pentru acea ofertă
   - Oferta este **vizual evidențiată** cu:
     - Border dashed animat verde (SVG marching ants) când nu e selectată
     - Border solid verde 3px când e selectată
     - Glow verde (box-shadow dublu)
     - Fundal verde foarte ștears (rgba 0.08 opacitate)
     - Badge text **"🚚 Transport Gratuit"** cu animație pulse sub preț
   - În rezumatul comenzii: prețul de transport apare tăiat cu linie (line-through) și lângă el scrie **"GRATUIT"** în verde
3. La plasarea comenzii, `shippingCost` trimis la API trebuie să fie **0** dacă oferta selectată are free shipping
4. **Landing page-urile existente nu sunt afectate** — toate câmpurile noi au default `false`

### Cerințe tehnice:

#### Baza de date (migrație SQL):
```sql
ALTER TABLE landing_pages
  ADD COLUMN IF NOT EXISTS free_shipping_offer_1 BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS free_shipping_offer_2 BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS free_shipping_offer_3 BOOLEAN NOT NULL DEFAULT false;
```

#### API-uri de modificat:
- **Create landing page (POST)** — acceptă și salvează `freeShippingOffer1/2/3`
- **Update landing page (PUT)** — acceptă și salvează `free_shipping_offer_1/2/3`
- **Public landing page (GET)** — returnează câmpurile noi (dacă folosești SELECT *, vine automat)

#### Admin forms (new + edit landing page):
- Adaugă 3 checkbox-uri sub câmpul Shipping Price
- Label: "Transport Gratuit"
- Checkbox-uri: "Oferta 1", "Oferta 2", "Oferta 3"
- La edit, mapează câmpurile în payload-ul trimis la PUT API

#### Widget (formularul clientului):
- Adaugă câmpurile noi în interfața/tipul LandingPage:
  ```typescript
  free_shipping_offer_1?: boolean;
  free_shipping_offer_2?: boolean;
  free_shipping_offer_3?: boolean;
  ```
- Funcție helper:
  ```typescript
  function hasFreeShipping() {
    if (selectedOffer === "offer_1") return landingPage.free_shipping_offer_1 || false;
    if (selectedOffer === "offer_2") return landingPage.free_shipping_offer_2 || false;
    if (selectedOffer === "offer_3") return landingPage.free_shipping_offer_3 || false;
    return false;
  }
  
  function getShippingPrice() {
    return hasFreeShipping() ? 0 : (landingPage?.shipping_price || 0);
  }
  ```
- Înlocuiește toate referințele la `landingPage.shipping_price` din calculul totalului și din payload-ul de creare comandă cu `getShippingPrice()`
- Pe fiecare buton de ofertă care are free shipping:
  - Când NU e selectat: border = none (CSS), adaugă SVG overlay cu marching ants verzi, fundal verde ștears
  - Când E selectat: border solid 3px verde, glow verde (box-shadow)
  - Badge sub preț: "🚚 Transport Gratuit" cu animate-pulse
- În rezumatul comenzii (order summary):
  - Dacă `hasFreeShipping()`: afișează prețul de transport cu `line-through` + text "GRATUIT" în verde
  - Altfel: afișează normal

#### SVG Marching Ants (border dashed animat):
Necesită o animație CSS keyframe (poate fi deja definită dacă ai presale upsells cu același efect):
```css
@keyframes marchingAnts {
  0% { stroke-dashoffset: 0; }
  100% { stroke-dashoffset: 20; }
}
```

SVG overlay pe butonul de ofertă (doar când are free shipping și NU e selectat):
```jsx
<svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ borderRadius: '0.5rem' }}>
  <rect x="1.5" y="1.5" width="calc(100% - 3px)" height="calc(100% - 3px)" 
    fill="none" stroke="#10b981" strokeWidth="2.5" strokeDasharray="8 4" rx="8" 
    style={{ animation: 'marchingAnts 1s linear infinite' }} />
</svg>
```

### Ce NU trebuie modificat:
- Câmpul `shipping_price` rămâne — se aplică pe ofertele care NU au free shipping
- Comenzile existente nu sunt afectate
- Formularul clientului funcționează identic pentru landing page-urile fără free shipping activat
- Fluxul de confirmare/sync Helpship nu se schimbă — primește `shippingCost: 0` natural

### Ordinea implementării recomandată:
1. Migrație DB
2. API create + update landing page
3. Admin forms (new + edit)
4. Widget — logică shipping + vizual
5. Testare: creează landing page → bifează free shipping pe oferta 2 → deschide formularul → verifică vizual + plasează comandă → verifică shipping_cost = 0 în DB
