# Prompt: Build EMS Landing Page

## Context

Build a **single-file static HTML landing page** for **EMS — Ecom Made Simple**, a SaaS order management platform for Romanian e-commerce operators. The page must be fully self-contained (inline CSS + JS, no external dependencies except Google Fonts and optionally a CDN icon set like Lucide or Heroicons via CDN).

No CTA buttons. No sign-up. No pricing. Just a clean, visually rich presentation of what the product does.

---

## Brand & Visual Identity

### Name & Tagline
- **Product name**: EMS — Ecom Made Simple
- **Tagline**: "Gestionează comenzile. Înțelege-ți afacerea."
- **Language**: Romanian throughout

### Color Palette (match exactly)
```
Background:        #09090B   (zinc-950)
Surface cards:     #18181B   (zinc-900)
Card border:       rgba(63,63,70,0.6)  (zinc-700/60)
Primary accent:    #4F46E5   (indigo-600)
Accent hover:      #4338CA   (indigo-700)
Text primary:      #FFFFFF
Text muted:        #A1A1AA   (zinc-400)
Text faint:        #71717A   (zinc-500)
Green success:     #16A34A
Red:               #DC2626
Orange:            #EA580C
```

### Typography
- Font: **Inter** (Google Fonts)
- Headings: font-weight 700–800, tight letter-spacing
- Body: font-weight 400, line-height 1.6
- Labels/badges: font-weight 600, uppercase, letter-spacing 0.08em

### Design Language
- Dark theme only
- Rounded corners: 12px for cards, 8px for badges/buttons
- Subtle box shadows on cards: `0 1px 3px rgba(0,0,0,0.4)`
- Border: `1px solid rgba(63,63,70,0.6)`
- No pure black — always zinc-950 as darkest background
- Indigo as the only bright accent color
- Generous whitespace between sections

---

## Page Structure

The page has **5 sections**, flowing top to bottom. No sticky nav, no footer navigation. Keep it concise.

---

### Section 1 — Hero

Full-width, centered. Dark background (zinc-950).

**Content:**
- Small badge above the title: `● Platformă pentru e-commerce românesc` (indigo dot + zinc-700 pill)
- Main heading (large, 2–3 lines max):  
  `Gestionează comenzile.`  
  `Înțelege-ți afacerea.`
- Subheading (zinc-400, max 2 lines):  
  `EMS centralizeaza comenzile, tracking-ul, echipa și performanța campaniilor — totul într-un singur loc.`
- Below the text: a **visual mockup suggestion** — a dark "browser window" or "phone frame" shape (pure CSS, no image needed) showing a simplified table of orders with colored status badges (Queue → violet, Confirmed → indigo/green, Pending → yellow, Cancelled → red). Use inline SVG or pure CSS to suggest a data table. Keep it abstract — no real data needed, just colored dots + placeholder bars to evoke an order list.

**Interaction**: On page load, the order rows in the mockup animate in one-by-one with a subtle fade+slide-up (CSS `@keyframes`, staggered `animation-delay`).

---

### Section 2 — Features Grid

3-column grid on desktop, 1-column on mobile. Each card: zinc-900 background, indigo icon, title, short description (2 lines max).

**6 feature cards:**

1. **Comenzi în timp real**  
   Icon: shopping cart  
   Desc: `Vizualizează, confirmă și gestionează comenzile din toate landing page-urile într-un singur dashboard.`

2. **Tracking clienți**  
   Icon: user  
   Desc: `Istoric complet per client, scor de încredere, comenzi anterioare și alertă automată pentru duplicate.`

3. **Landing Pages integrate**  
   Icon: file-text  
   Desc: `Conectează orice landing page la platformă. Datele vin automat, fără integrare manuală.`

4. **Meta Pixel + CAPI**  
   Icon: trending-up  
   Desc: `Tracking complet al funnelului — de la vizită la comandă confirmată — cu server-side events pentru acuratețe maximă.`

5. **ROAS & Performanță**  
   Icon: bar-chart  
   Desc: `Monitorizează cheltuielile publicitare față de venitul generat. Câte comenzi, cât ai cheltuit, cât ai câștigat.`

6. **Echipă & Roluri**  
   Icon: users  
   Desc: `Adaugă agenți, admini și manageri. Fiecare vede și poate face exact cât îi este permis.`

**Interaction**: Each card has a hover state — border color transitions to indigo-600 with a subtle glow (`box-shadow: 0 0 0 1px #4F46E5, 0 4px 20px rgba(79,70,229,0.15)`). Smooth `transition: all 0.2s ease`.

---

### Section 3 — Order Lifecycle Visual

Full-width section, zinc-900 background. Shows the **order status flow** as a horizontal pipeline.

**Content:**
- Section label (small, indigo, uppercase): `FLUXUL COMENZII`
- Title: `De la lead la livrare, fiecare pas vizibil`
- Below: a horizontal flow diagram with 6 steps connected by arrows:

```
Queue → Pending → Confirmed → Scheduled → Delivered
                     ↓
                  Cancelled / Hold
```

Each step is a pill/badge with its color:
- Queue: violet `#7C3AED`
- Pending: amber `#D97706`
- Confirmed: green `#16A34A`
- Scheduled: cyan `#0891B2`
- Delivered: indigo `#4F46E5`
- Cancelled: red `#DC2626`
- Hold: orange `#EA580C`

On mobile, the flow wraps into 2 rows.

**Interaction**: On scroll into view (IntersectionObserver), each badge animates in sequentially with a fade+scale from 0.8 to 1.

---

### Section 4 — Stats / Social Proof

3 large stat blocks, centered, zinc-950 background.

**Stats (illustrative, not real):**
- `+12.000` — Comenzi procesate lunar
- `~3 min` — De la plasare la confirmare
- `4 magazine` — Gestionate simultan

Each stat: very large number in white (font-size ~3.5rem, font-weight 800), label below in zinc-400. Separated by thin zinc-800 vertical dividers on desktop.

**Interaction**: When scrolled into view, numbers count up from 0 to their value using a JS counter animation (requestAnimationFrame, ~800ms duration, ease-out).

---

### Section 5 — Closing Statement

Minimal. Centered. zinc-950 background.

**Content:**
- Large heading (2 lines):  
  `Construit pentru echipe`  
  `care vând în România.`
- Subtext (zinc-400):  
  `EMS este optimizat pentru operatorii de e-commerce care folosesc landing pages, livrare prin curierat și campanii Meta Ads.`
- Below: 3 small inline tags (zinc-800 pills, zinc-300 text):  
  `🇷🇴 Interfață în română` · `📦 Integrat cu Helpship` · `📊 Meta CAPI nativ`

No CTA button.

---

## Responsiveness

- Mobile-first CSS
- Breakpoints: 640px (sm), 1024px (lg)
- Hero mockup: hide on screens < 640px or scale down
- Feature grid: 1 col mobile → 2 col tablet → 3 col desktop
- Stats: stack vertically on mobile, remove dividers
- Order flow: wrap to 2 rows on mobile

---

## Interactions Summary

All interactions must be **pure CSS or vanilla JS** (no libraries):

| Element | Interaction |
|---|---|
| Hero order rows | Staggered fade+slide-up on page load |
| Feature cards | Indigo border glow on hover |
| Order status badges | Fade+scale on scroll into view (IntersectionObserver) |
| Stat numbers | Count-up animation on scroll into view |
| General | Smooth scroll behavior (`scroll-behavior: smooth`) |

---

## Technical Requirements

- Single `.html` file, everything inline
- Google Fonts: `Inter` weights 400, 600, 700, 800
- Icons: use inline SVG paths (no external icon library required — draw simple paths directly)
- No frameworks (no Tailwind, no Bootstrap, no React)
- Valid HTML5, semantic tags (`<section>`, `<header>`, `<main>`, `<article>`)
- CSS custom properties (variables) for colors at `:root` level
- Minified JS is fine but keep CSS readable
- Page should load fast — no external images, no heavy assets
- `lang="ro"` on `<html>` tag

---

## Tone & Copy Notes

- Romanian language throughout
- Professional but approachable — not corporate
- Short sentences, active voice
- Avoid buzzwords like "revoluționar", "unic", "best-in-class"
- Focus on practical benefits for e-commerce operators

---

## What to avoid

- No navigation bar / hamburger menu
- No footer with links
- No CTA buttons or sign-up forms
- No pricing section
- No testimonials / fake quotes
- No stock photos or placeholder image URLs
- No external CSS files
- No jQuery or third-party JS
