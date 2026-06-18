# Prompt: Implementare Sistem de Analytics pentru Vizitatori Landing Page

## Context
Aplicația are formulare de comandă (widget) embedate prin iframe pe landing page-uri externe, via un script `embed.js`. Vreau un sistem de analytics care urmărește comportamentul vizitatorilor pe tot landing page-ul (nu doar iframe-ul), stochează datele eficient (un rând per sesiune), și oferă analiză AI a datelor.

## Ce vreau

### Feature-uri:
1. **Tracking per landing page** — activat/dezactivat de superadmin per LP (toggle)
2. **Colectare date din landing page** (embed.js): scroll depth, timp activ pe pagină, clicks, vizibilitate formular
3. **Colectare date din formular** (widget/iframe): câmpuri completate, timp per câmp, câmp de abandon, ofertă selectată, upsells selectate/deselectate, erori de validare
4. **Un rând per sesiune** în DB — JSONB bogat, nu events individuale (~1-2KB per sesiune)
5. **Dashboard** cu KPI-uri, funnel metrics, breakdown-uri
6. **Analiză AI** on-demand cu OpenAI (GPT-4o)
7. **Ștergere manuală** a sesiunilor per LP

### Date colectate per sesiune:
```json
{
  "session_id": "sess_xxx",
  "landing_page_id": "uuid",
  "device": "mobile",
  "browser": "Chrome",
  "screen_size": "390x844",
  "referrer": "facebook.com",
  "time_on_page": 127,
  "scroll_max": 85,
  "scroll_to_form": true,
  "clicks_on_page": 12,
  "form_started": true,
  "fields_completed": ["phone", "fullName", "county", "city", "address"],
  "field_abandoned_at": null,
  "time_per_field": { "phone": 4, "fullName": 6, "county": 3, "city": 5, "address": 12 },
  "validation_errors": ["phone_invalid"],
  "offer_selected": "offer_2",
  "offer_changes": ["offer_1", "offer_2"],
  "upsells_viewed": 3,
  "upsells_selected": ["id-1"],
  "upsells_deselected": ["id-2"],
  "outcome": "purchased",
  "order_id": "uuid",
  "total_value": 134.00
}
```

## Cerințe tehnice

### 1. Baza de date (migrație SQL)

```sql
-- Toggle pe landing pages
ALTER TABLE landing_pages
  ADD COLUMN IF NOT EXISTS analytics_tracking BOOLEAN NOT NULL DEFAULT false;

-- Tabel sesiuni
CREATE TABLE IF NOT EXISTS analytics_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  landing_page_id UUID NOT NULL REFERENCES landing_pages(id) ON DELETE CASCADE,
  device TEXT,
  browser TEXT,
  screen_size TEXT,
  referrer TEXT,
  time_on_page INTEGER,
  scroll_max INTEGER,
  scroll_to_form BOOLEAN DEFAULT false,
  clicks_on_page INTEGER DEFAULT 0,
  form_started BOOLEAN DEFAULT false,
  fields_completed TEXT[] DEFAULT '{}',
  field_abandoned_at TEXT,
  time_per_field JSONB DEFAULT '{}',
  validation_errors TEXT[] DEFAULT '{}',
  offer_selected TEXT,
  offer_changes TEXT[] DEFAULT '{}',
  upsells_viewed INTEGER DEFAULT 0,
  upsells_selected TEXT[] DEFAULT '{}',
  upsells_deselected TEXT[] DEFAULT '{}',
  outcome TEXT NOT NULL DEFAULT 'abandoned',
  order_id UUID,
  total_value NUMERIC(10, 2),
  postsale_shown BOOLEAN DEFAULT false,
  postsale_accepted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_sessions_org ON analytics_sessions(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_lp ON analytics_sessions(landing_page_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_sessions_session ON analytics_sessions(session_id);

ALTER TABLE analytics_sessions ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON analytics_sessions TO service_role;
```

### 2. API Endpoints

#### POST /api/analytics/sessions (public, apelat de embed.js)
- Acceptă atât `application/json` cât și `text/plain` (sendBeacon trimite text/plain pentru a evita CORS preflight)
- Insert or update bazat pe `session_id`
- Verifică dacă LP-ul are `analytics_tracking = true`
- CORS headers pentru cross-origin

```typescript
// Parsare body (text/plain + application/json)
let body: any;
const contentType = request.headers.get("content-type") || "";
if (contentType.includes("application/json")) {
  body = await request.json();
} else {
  const text = await request.text();
  body = JSON.parse(text);
}
```

#### GET /api/analytics/sessions (autentificat, superadmin only)
- Filtrare: `landingPageId`, `startDate`, `endDate`, `limit`, `offset`
- Returnează: sesiuni + summary calculat (totalSessions, purchased, abandoned, formStarted, conversionRate, formStartRate, avgTimeOnPage, avgScrollMax, abandonFields breakdown, offerDistribution, deviceBreakdown)

#### DELETE /api/analytics/sessions (autentificat, superadmin only)
- Șterge toate sesiunile per LP (`?landingPageId=xxx`)

#### POST /api/analytics/analyze (autentificat, superadmin only)
- Primește summary-ul calculat de GET
- Trimite la OpenAI GPT-4o cu prompt CRO specialist
- Returnează analiza în română

### 3. Tracking în embed.js (landing page parent)

**Fluxul:**
1. Widget (iframe) încarcă datele LP → dacă `analytics_tracking = true` → trimite postMessage `analytics-config` la parent (embed.js)
2. embed.js primește mesajul → pornește tracking-ul: generează session_id, înregistrează scroll/click/visibility listeners
3. embed.js trimite session_id înapoi la widget prin postMessage `analytics-session`
4. Datele se salvează periodic (5s inițial, apoi la 30s) + la `beforeunload`

**Tracking timp activ (nu total):**
```javascript
let analyticsActiveTime = 0;
let analyticsLastActiveAt = Date.now();

// La visibilitychange:
if (document.visibilityState === 'hidden') {
  analyticsActiveTime += Date.now() - analyticsLastActiveAt;
} else {
  analyticsLastActiveAt = Date.now();
}

// time_on_page:
time_on_page: Math.round((analyticsActiveTime + (Date.now() - analyticsLastActiveAt)) / 1000)
```

**Prevenire suprascrierea "purchased" de beforeunload:**
```javascript
let analyticsFinalOutcome = null;

// La purchase:
analyticsFinalOutcome = 'purchased';

// La beforeunload:
if (analyticsFinalOutcome !== 'purchased') {
  sendAnalyticsSession('abandoned');
}
```

**Trimitere date cu sendBeacon (text/plain pentru a evita CORS preflight):**
```javascript
navigator.sendBeacon(
  WIDGET_DOMAIN + '/api/analytics/sessions',
  new Blob([JSON.stringify(data)], { type: 'text/plain' })
);
```

### 4. Tracking în Widget (iframe)

**State-uri (useRef pentru a nu cauza re-renders):**
```typescript
const analyticsSessionId = useRef<string | null>(null);
const analyticsFieldTimes = useRef<Record<string, number>>({});
const analyticsFieldStart = useRef<string | null>(null);
const analyticsFieldStartTime = useRef<number>(0);
const analyticsFieldsCompleted = useRef<string[]>([]);
const analyticsOfferChanges = useRef<string[]>(["offer_1"]);
const analyticsUpsellsSelected = useRef<string[]>([]);
const analyticsUpsellsDeselected = useRef<string[]>([]);
```

**Field tracking — pe fiecare input:**
```typescript
onFocus={() => analyticsOnFieldFocus("fieldName")}
onBlur={() => analyticsOnFieldBlur("fieldName")}
```

**Funcții helper:**
```typescript
function analyticsOnFieldFocus(fieldName: string) {
  analyticsFieldStart.current = fieldName;
  analyticsFieldStartTime.current = Date.now();
  if (!analyticsFieldsCompleted.current.includes(fieldName)) {
    analyticsFieldsCompleted.current.push(fieldName);
  }
}

function analyticsOnFieldBlur(fieldName: string) {
  if (analyticsFieldStart.current === fieldName) {
    const elapsed = Math.round((Date.now() - analyticsFieldStartTime.current) / 1000);
    analyticsFieldTimes.current[fieldName] = (analyticsFieldTimes.current[fieldName] || 0) + elapsed;
  }
  analyticsFieldStart.current = null;
}
```

**Trimitere form data la parent (embed.js) care trimite la API:**
```typescript
function analyticsSendFormUpdate(extraData?: Record<string, any>) {
  const isPurchased = extraData?.outcome === 'purchased';
  window.parent.postMessage({
    type: 'analytics-form-update',
    formData: {
      form_started: analyticsFieldsCompleted.current.length > 0,
      fields_completed: analyticsFieldsCompleted.current,
      field_abandoned_at: isPurchased ? null : lastField,
      time_per_field: analyticsFieldTimes.current,
      offer_selected: selectedOffer,
      offer_changes: analyticsOfferChanges.current,
      upsells_selected: analyticsUpsellsSelected.current,
      ...extraData,
    },
  }, '*');
}
```

**Apeluri:**
- La submit formular (înainte de API call): `analyticsSendFormUpdate({ outcome: 'submitting' })`
- La succes comandă: `analyticsSendFormUpdate({ outcome: 'purchased', order_id: orderId, total_value: total })`

### 5. Dashboard Admin (pagină Analytics, superadmin only)

**Sidebar:** Link "🔍 Analytics" vizibil doar pentru superadmini.

**Pagina conține:**
- **Filtre:** dropdown LP (doar cele cu analytics activat), start date, end date, buton Refresh, buton Șterge sesiunile (roșu, cu confirmare)
- **KPI Cards:** Total Sesiuni, Conversie %, Form Started %, Abandonuri
- **Metrics:** Timp mediu pe pagină, Scroll mediu, Device breakdown
- **Abandon Fields:** Bar chart cu câmpurile unde se opresc vizitatorii (progress bars)
- **Offer Distribution:** Bar chart cu distribuția ofertelor selectate
- **AI Analysis:** Buton "Generează Analiză" → OpenAI interpretează datele → afișează raport în română
- **Tabel sesiuni recente:** Device, Scroll, Time, Form fields, Abandon at, Offer, Outcome, Date

### 6. AI Analysis Prompt (OpenAI)

```
You are a conversion rate optimization (CRO) expert specializing in Romanian e-commerce (COD model). Analyze visitor behavior data and provide:
1. Performanță Generală (conversion rate vs industry benchmarks)
2. Probleme Identificate (top 3 drop-off causes)
3. Analiza Formularului (abandon fields, time analysis)
4. Analiza Ofertelor (which performs best, pricing insights)
5. Recomandări Concrete (max 5 actionable steps)
```

## Estimare storage (Supabase Free Plan)

| Metric | Valoare |
|---|---|
| Size per sesiune | ~1-2 KB |
| 1.000 vizitatori/zi | ~1.5 MB/zi |
| 30 zile | ~45 MB |
| Cu date existente | ~145 MB din 500 MB free |

Încape confortabil pe free plan.

## Ce NU se modifică
- Funcționalitatea formularului — identică
- Performanța paginii — tracking-ul e asincron (sendBeacon), zero impact pe rendering
- Comenzile — nesocate de analytics
- Landing page-urile fără toggle activat — zero overhead

## Ordinea implementării
1. Migrație DB (tabel + coloană)
2. API endpoints (POST/GET/DELETE sessions + POST analyze)
3. Toggle pe admin landing pages (superadmin)
4. embed.js — tracking landing page (scroll, time, clicks, sendBeacon)
5. Widget — field tracking (focus/blur timing, offer changes, upsells)
6. Dashboard Analytics + sidebar link
7. Testare: activează toggle → vizitează LP → verifică sesiune în dashboard → generează AI analysis
