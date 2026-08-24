# Raport complet: Cum se trackuiesc conversiile de Purchase pentru pixelul Meta și ce s-a schimbat (2021 → 2026)

> Scop: să înțelegi exact *de ce* îți pot scădea „vânzările” raportate fără ca vânzările reale să scadă, ce mecanism stă în spate, ce s-a modificat concret în ultimele luni, cum funcționează aplicații de tracking gen wetracked.io și ce ai de făcut ca să diagnostichezi corect problema.
>
> Concluzia pe scurt este la final (secțiunea 9), dar te încurajez să citești mecanica, pentru că diferența dintre „mi-au scăzut vânzările” și „mi-a scăzut raportarea vânzărilor” valorează, de obicei, bani.

---

## 1. Distincția fundamentală pe care se sparge totul

Înainte de orice, trebuie separate două lucruri pe care panica le confundă mereu:

- **Vânzări reale** = banii care intră efectiv în cont / comenzile reale din Shopify / WooCommerce / CRM.
- **Conversii raportate** = câte dintre acele vânzări reușește Meta să *vadă*, să le *atribuie* unei reclame și să le *afișeze* în Ads Manager.

ROAS-ul din Ads Manager = `venit atribuit ÷ cheltuială`. Dacă numărătorul (venitul atribuit) scade pentru că **măsurarea** s-a stricat, ROAS-ul afișat scade chiar dacă afacerea ta merge la fel. Iar problema nu se oprește la raport: **algoritmul Meta învață din exact aceleași date pe care le vezi tu**. Dacă el „vede” 40% din conversii în loc de 90%, optimizează prost, livrează reclamele către oameni mai puțin potriviți și atunci **vânzările reale chiar încep să scadă** — ca efect secundar al raportării proaste. Așa o problemă de măsurare devine o problemă reală de business. Acesta este miezul a ceea ce ți se întâmplă, cel mai probabil.

---

## 2. Cum funcționează, mecanic, tracking-ul de Purchase

### 2.1. Pixelul (browser-side / client-side)

Pixelul Meta este un fragment de JavaScript pus în `<head>`-ul site-ului. La încărcarea paginii încarcă o bibliotecă de funcții de pe serverele Meta și declanșează evenimente (`PageView`, `ViewContent`, `AddToCart`, `InitiateCheckout`, `Purchase`). Fiecare eveniment pleacă spre Meta ca o cerere HTTP care duce cu ea:

- numele evenimentului și parametrii (`currency`, `value`, `content_ids`, `content_type`);
- **cookie-urile de identificare**: `_fbp` (browser pixel) și `_fbc` (click-ul de reclamă, derivat din `fbclid`);
- `user-agent` și adresa IP (vin automat cu requestul);
- dacă ai **Advanced Matching** activat, date hash-uite despre utilizator (email, telefon, nume), atunci când există pe pagină.

Meta primește requestul și încearcă să **potrivească** evenimentul cu un profil de utilizator din sistemul lui. Această potrivire e materia primă pentru sistemele de optimizare ale Meta (în documentația și comunicarea recentă apar sub numele de cod **Andromeda** — etapa de „retrieval”, ce reclame intră în licitație — și **GEM** — etapa de ranking). Cu alte cuvinte: pixelul nu mai e „chestia care numără conversii”, e **sursa de date care hrănește algoritmul**.

**Unde se rupe lanțul (de ce pixelul singur pierde 20–60% din conversii):**

- **Safari ITP (Intelligent Tracking Prevention):** limitează cookie-urile first-party setate prin JavaScript la 7 zile. `_fbp` dispare înainte ca un client cu decizie lentă să cumpere → atribuirea se pierde.
- **iOS 26 – Advanced Fingerprinting Protection** (activă by default în Safari de la 15 septembrie 2025): printre altele, curăță click-ID-urile (`fbclid`) din linkurile deschise în Mail și Messages. Dacă traficul tău trece prin email sau mesagerie, o parte vine fără `fbclid` → click-ul nu se atribuie.
- **Ad blockere:** 25–30% dintre utilizatorii web rulează un ad blocker care taie requestul pixelului înainte să ajungă la Meta.
- **In-app browsers** (browserul intern din Facebook/Instagram): execută JS inconsistent și restricționează cookie-urile.
- **Checkout pe domeniu terț** (Stripe Hosted, PayPal, anumite checkout-uri): se pierde contextul de browser, iar `Purchase` poate să nu se mai declanșeze deloc.

### 2.2. Conversions API – CAPI (server-side)

CAPI trimite evenimentele **direct de pe serverul tău către serverul Meta**, ocolind complet browserul. De aceea e imun la ad blockere, ITP, cookie-uri și in-app browsers. Pentru evenimentul critic (`Purchase`), care apare în backend-ul magazinului oricum, CAPI e mult mai fiabil.

### 2.3. Cum lucrează cele două împreună: deduplicarea

Ideea NU e „CAPI în loc de pixel”, ci **pixel + CAPI simultan** (Meta numește asta „evenimente redundante”). Același `Purchase` ajunge de două ori: o dată din browser, o dată din server. Ca să nu fie numărat dublu, Meta folosește un **`event_id`** identic pe ambele canale și le colapsează într-o singură conversie. Dacă `event_id`-urile nu se potrivesc → ori dublezi conversiile, ori Meta le aruncă. Erorile de deduplicare sunt printre cele mai frecvente și cele mai trecute cu vederea cauze de raportare greșită.

### 2.4. Event Match Quality (EMQ) – metrica pe care nu o privești și ar trebui

EMQ (scor 0–10) spune cât de sigur poate Meta să lege un eveniment de o persoană reală. Crește când trimiți identificatori first-party (email, telefon, IP, user-agent, `fbc`, `fbp`). **În 2026 contează mai mult calitatea decât cantitatea**: puține evenimente bine-potrivite bat multe evenimente slabe. Pragul recomandat e peste 7, ideal 8+. Un EMQ mic limitează optimizarea chiar dacă evenimentele „se declanșează”.

### 2.5. AEM și SKAN (pentru utilizatorii care refuză tracking-ul)

- **AEM (Aggregated Event Measurement):** protocolul prin care Meta *modelează* (estimează statistic, agregat) conversiile utilizatorilor iOS care au dat opt-out din ATT. Nu sunt date reale individuale — sunt estimări.
- **SKAdNetwork (SKAN):** mecanismul Apple pentru atribuirea instalărilor de aplicații (relevant pentru app installs, nu pentru web-ul clasic).

Important: **nici CAPI, nici un tool terț nu „recuperează” complet** ce ascunde Apple prin ATT. O parte rămâne modelată prin AEM. Cine îți promite „100% acuratețe” vinde marketing, nu fizică.

---

## 3. Cum se făcea raportarea ÎNAINTE vs. cum se face ACUM

Aici e răspunsul direct la întrebarea ta „ce s-a modificat exact”. Le-am pus pe cronologie pentru că scăderea ta „de câteva luni” se suprapune peste partea de jos a acestei liste.

### Epoca „de aur” (înainte de aprilie 2021)
- Ferestre de atribuire generoase: **28 zile click + 28 zile view** (default).
- Pixelul vedea aproape tot; defalcări demografice complete; retargeting pool mare.
- Tracking individual, nu modelat.

### Aprilie 2021 — iOS 14.5 + App Tracking Transparency (ATT)
Momentul zero al degradării:
- Apple cere fiecărei aplicații consimțământ explicit pentru tracking cross-app. **~75% dintre utilizatorii iOS au dat opt-out.**
- Fereastra default scade la **7 zile click + 1 zi view**.
- Apare **AEM** + **limita de 8 evenimente per domeniu** (trebuiau prioritizate; doar evenimentul de rang maxim se raporta pentru un user opt-out → atribuirea devine, practic, „last-event”).
- Value Optimization consuma 4 din cele 8 evenimente; întârziere de raportare de până la 3 zile; pool-uri de retargeting mai mici.
- **Efect cumulat în ~18 luni: acuratețea atribuirii a scăzut cu 40–60%.**

### Iunie 2025 — AEM se automatizează
- Meta **elimină limita de 8 evenimente** și prioritizarea manuală. Tab-ul de configurare AEM dispare; toate evenimentele eligibile se agregă automat. (O ușurare, dar nu rezolvă pierderea de semnal de la browser.)

### 15 septembrie 2025 — iOS 26
- **Advanced Fingerprinting Protection** activă by default (vezi 2.1): mai puține `fbclid` care supraviețuiesc.

### ⚠️ 12 ianuarie 2026 — momentul-cheie pentru tine
Meta **a eliminat permanent ferestrele 7-day-view și 28-day-view** din Insights API (anunțat în octombrie 2024, cu ~3 luni preaviz pe care mulți l-au ratat). Consecințe:
- **Scădere de 15–40% a conversiilor raportate peste noapte**, fără ca performanța reală să se schimbe.
  - Cei pe 7-day-view au pierdut tipic **15–30%**.
  - Cei pe 28-day-view au pierdut **30–40%**.
- Dispar disproporționat **conversiile cu decizie lungă** (omul care a văzut reclama, s-a gândit, a revenit peste câteva zile) — adică deseori clienții cu coș mai mare / valoare mai mare.
- Capcană tehnică perfidă: **ferestrele dezactivate întorc date goale „în tăcere”, fără eroare**. Tool-uri de raportare (Looker Studio, Google Sheets cu API Meta, Supermetrics, Funnel.io, dashboards custom) pot afișa brusc zerouri sau cifre rupte fără niciun avertisment.

### 13 ianuarie 2026 — Shopify schimbă default-ul
- Shopify a comutat partajarea datelor din app-pixel de la **„Always on” la „Optimized”**. Pixelurile care trimit puține evenimente sunt **ponderate mai slab** în antrenarea algoritmului → optimizarea se înrăutățește sau nu mai „pornește”.

### ⚠️ 3 martie 2026 — Meta reconstruiește atribuirea pe click
- **Click-through** numără de acum **doar click-uri pe link**.
- Interacțiunile sociale (like, reacții, comentarii, share, save, vizionări angajate) trec într-o categorie nouă, **„engage-through”**, cu fereastră proprie de **1 zi**, activă by default.
- Fereastra de engagement pentru video/Reels s-a scurtat de la 10s la 5s (46% din conversiile pe Reels apar în primele 2 secunde).
- **Efect: scădere raportată de 40–60% pe multe conturi** — dar **majoritatea e reclasificare, NU pierdere reală**. Numărul „total conversii” (click + engage) e mult mai aproape de cel vechi decât pare la prima vedere.

### Default-uri 2026
- Fereastra standard: **7 zile click + 1 zi view (+ 1 zi engage-through)**.
- Acces la date istorice **plafonat**: 13 luni pentru unique counts, 6 luni pentru frequency.

### 15 aprilie 2026 — Meta îți întinde o mână
- **CAPI „one-click” / Meta-enabled**: configurare CAPI aproape fără cod, găzduită de Meta, fără server propriu și fără cost suplimentar de infrastructură.
- **Pixel cu enrichment prin AI**: pixelul „citește” site-ul și atașează singur context (nume produs, disponibilitate, detalii business) la evenimente, fără cod.
- Schimbare de terminologie: în Events Manager, **„Pixel” devine „Dataset”**.
- (În paralel, Google a lansat **Tag Gateway** în ianuarie 2026 — echivalentul one-click pentru Google.)

### Februarie 2026 — context legal (UE/GDPR)
- **Tribunalul Regional Superior Dresda** a decis că integrarea Meta Business Tools (inclusiv Pixel și CAPI) **fără o bază legală validă sub GDPR** constituie colectare ilegală de date. Relevant dacă ai trafic UE și mai ales dacă folosești tool-uri bazate pe „fingerprinting”.

> **Citește această cronologie ca pe diagnosticul tău.** Dacă scăderea a început în ianuarie și s-a accentuat în martie–aprilie 2026, suprapunerea peste 12 ian + 3 mar + comutarea Shopify este prea exactă ca să fie coincidență. O bună parte din „scăderea vânzărilor” este, foarte probabil, **scădere de raportare + degradare de optimizare** declanșată de aceste schimbări — peste o eroziune de fundal (ITP/ad blockere) pe care o ai de ani de zile.

---

## 4. Cum funcționează aplicațiile de tracking gen wetracked.io

### 4.1. Ce fac, conceptual

Toate aceste tool-uri rezolvă aceeași durere: **pixelul din browser pierde semnal**. Ele mută colectarea **server-side / first-party** și împing evenimente curate, complete, înapoi în Ads Managerul tău prin CAPI (sau prin echivalentul fiecărei platforme). Diferența dintre ele e *cât* fac dincolo de simpla „țeavă” CAPI.

Trei mari categorii:

1. **„Țeavă” CAPI / infrastructură sGTM** (ex. Stape, Taggrs, Addingwell): îți găzduiesc containerul server-side Google Tag Manager. Ieftine, dar **tu rămâi responsabil de configurare, debugging, mentenanță**. Nu sunt soluție completă „din cutie”.
2. **Tool-uri de tracking „done-for-you” pentru e-commerce** (ex. wetracked.io, Elevar, Littledata, Trackify, Tracklution, SignalBridge, ServerTrack.io, WeltPixel, CustomerLabs): no-code sau low-code, integrare directă Shopify/WooCommerce, dedup gestionat, push automat în ad managers.
3. **Platforme de atribuire / analytics** (ex. Hyros, Triple Whale, RedTrack, Cometly, Able CDP): pun accent pe *raportare* multi-canal, customer journey, profit/LTV — uneori cu tracking server-side inclus, dar nu ăsta e focusul principal.

### 4.2. wetracked.io în concret

Din materialele lor și din review-uri (Capterra, GetApp, SoftwareAdvice):

- **Ce e:** soluție de tracking server-side, „adblock-proof”, axată pe e-commerce (Shopify, WooCommerce, Funnelish, Checkify, CheckoutChamp, BetterCart, UnifyCheckout, Sticky.io + integrări custom).
- **Canale:** Meta, TikTok, X, Pinterest, Snapchat, Google Ads.
- **Mecanism declarat:** „360° Data Enrichment Engine” care construiește un **„digital fingerprint” cookieless**, lipește („stitches”) sesiunile server-side și trimite înapoi în pixelul tău nativ datele formatate exact cum cere API-ul fiecărei platforme („suntem invizibili pentru ad platforms”). Susțin **date reale, fără modeling**, și **acuratețe 95–100%** vs. ~40% baseline.
- **Setup:** ~2–5 minute, fără cod, fără UTM-uri, fără dashboard separat (datele merg direct în ad manager). Suport 24/7 lăudat constant în review-uri.
- **Preț (aprox., verifică la sursă):** Starter ~$39.20/lună, Business ~$119.20/lună, Scale-up ~$199.20/lună, + plan custom. Trial 14 zile. (Cifrele „.20” sugerează un discount aplicat în pagina văzută.)
- **Limitări de reținut:** GetApp notează că **nu oferă API public**; scope-ul e centrat pe Meta + e-commerce; pe Google Ads acoperirea e mai subțire decât pe Meta.

### 4.3. Tabel comparativ orientativ (verifică prețurile la sursă, se schimbă des)

| Tool | Tip | Setup | Preț orientativ | Cel mai potrivit pentru |
|---|---|---|---|---|
| **CAPI one-click (Meta)** | Oficial, găzduit de Meta | 1 click în Events Manager | Gratuit | Oricine vrea baza CAPI, doar Meta |
| **Meta CAPI Gateway** | Oficial, server-side | Mediu (partener ajută) | Gratuit | Doar Facebook/Instagram |
| **wetracked.io** | Done-for-you, server-side + enrichment | ~5 min, no-code | ~$39–199/lună | Shopify/WooCommerce care vor Meta/TikTok fiabil, fără tehnic |
| **Stape** | Hosting sGTM | Necesită GTM | ~$17–20+/lună + per pixel | Dezvoltatori/agenții care stăpânesc GTM |
| **Elevar** | Server-side Shopify, identity resolution | Mediu | ~$200–1.000+/lună | Branduri DTC high-volume cu dev/agenție |
| **Littledata** | GA4-first, abonamente | Mediu | ~$109–1.900+/lună | Magazine pe Recharge / subscription |
| **Trackify** | Pixel Meta + TikTok | Ușor | ~$30–95/lună | Cine face reclame doar pe Meta + TikTok |
| **Tracklution** | Managed, no-code | 5–30 min | ~€31+/lună | Marketeri fără developer |
| **SignalBridge** | Server-side + bot filtering + funnel analytics | ~5 min | ~$29+/lună | SMB care vor tracking + analytics + filtrare boți |
| **ServerTrack.io** | CAPI ieftin | ~60s (plugin WP) | de la ~$10/lună (free 10k ev.) | Buget mic, WordPress/WooCommerce |
| **Able CDP / Hyros / Triple Whale / RedTrack** | Atribuire + analytics | Variabil | de la ~$49 până la enterprise | Cine vrea atribuire multi-touch / LTV, nu doar livrare CAPI |

---

## 5. Capcanele despre care vânzătorii de tool-uri nu vorbesc

Astea sunt esențiale ca să nu „rezolvi” problema înrăutățind-o:

1. **Mitul „100% acuratețe”.** Atâta timp cât ATT/AEM/SKAN modelează utilizatorii iOS opt-out și Apple suprimă intenționat o parte din semnal, **nimeni nu poate recupera literalmente totul**. Server-side recuperează tipic **15–40%** din ce pierde browserul — semnificativ, dar nu „100%”.

2. **Contaminarea cu boți (riscul ascuns al server-side).** Un container server-side care trimite „încrezător” evenimente cu EMQ sănătos poate împinge în Meta și **conversii de la boți**. Un experiment de tip honeypot a găsit ~84% înscrieri frauduloase, dintre care sute de la un singur fingerprint de dispozitiv. Dacă astfel de evenimente intră în CAPI, **otrăvești setul de antrenare al algoritmului** — exact opusul a ce vrei. Tool-urile bune au **filtrare de boți** la ingestie (de aceea SignalBridge & co. o evidențiază).

3. **Fingerprinting vs. GDPR.** „Cookieless digital fingerprint” sună grozav tehnic, dar post-decizia Dresda (feb. 2026) e o zonă cu **risc legal real în UE**. Tratează promisiunea „GDPR-compliant” cu prudență și, pentru trafic UE, verifică baza legală / consimțământul.

4. **Deduplicarea prost făcută** dublează sau aruncă conversii. Orice tool alegi, `event_id` + timestamp trebuie să se potrivească între pixel și server.

5. **Tool-ul nu repară decizia Meta pe ferestre.** Conversiile view-through tăiate pe 12 ianuarie **nu se mai întorc** prin niciun tool — aia e politica Meta. Server-side repară **blocarea** (cele 15–30% pierdute la browser) și **calitatea semnalului**, nu metodologia de atribuire.

---

## 6. Cum verifici dacă PROBLEMA TA e raportarea (diagnostic pas cu pas)

Fă-le în ordinea asta înainte să schimbi bugete sau să cumperi ceva:

1. **Reconciliază realul cu raportatul.** Pune lângă: comenzi reale din Shopify/CRM/bancă pentru o lună vs. `Purchase` raportat în Meta. Mărimea gap-ului îți spune cât e „pierdere de măsurare” și cât (dacă e) e scădere reală.
2. **Verifică fereastra de atribuire** la nivel de cont/eveniment. Orice comparație care traversează **12 ianuarie** sau **martie 2026** compară două lucruri diferite — marcheaz-o explicit în rapoarte.
3. **Events Manager → Overview:** evenimentele sunt etichetate **Browser**, **Server** sau **Browser + Server**? Au sosit în ultimele 24h? Dacă vezi doar „Browser”, **n-ai CAPI funcțional**.
4. **Events Manager → Diagnostics:** caută erori de **deduplicare**, parametri lipsă, evenimente „dropped”. Acolo sunt, de obicei, vinovații tăcuți.
5. **EMQ:** uită-te la scorul de match quality pe `Purchase`. Sub 7 = optimizare slabă chiar dacă evenimentele „se trimit”.
6. **CAPI live + `event_id`:** confirmă că sursa server e activă, fără erori de token, și că `event_id` se potrivește între pixel și server.
7. **Shopify „Optimized” vs „Always on”:** verifică dacă default-ul ți-a fost comutat în 13 ianuarie și dacă vrei să-l reactivezi.
8. **Tool-uri de raportare „mute”:** verifică dacă Looker Studio / Sheets / Supermetrics etc. mai cer ferestrele dezactivate (ar întoarce zerouri silențios).
9. **Test Events:** rulează un checkout real în mod test și vezi dacă `InitiateCheckout` și `Purchase` apar în timp real, din ambele surse.

---

## 7. Ce ai de făcut, în ordinea priorității

1. **Pixel + CAPI rulând împreună, cu deduplicare corectă** — nu mai e opțional în 2026, e baza. Dacă n-ai CAPI, ăsta e primul lucru (poți porni chiar cu **CAPI one-click Meta**, gratuit, ca să oprești hemoragia, apoi decizi dacă vrei un tool mai bun).
2. **Maximizează Advanced Matching / EMQ:** trimite email, telefon, nume hash-uite, `fbc`, `fbp`, IP, user-agent la fiecare eveniment. E cea mai mare pârghie pe calitatea semnalului.
3. **Setează fereastra realist:** pentru majoritatea e-commerce, **7 zile click + 1 zi view (+ engage-through)**. Pentru produse de impuls, 1-day click dă date mai curate.
4. **Reconstruiește baseline-ul de comparație** post-martie 2026 (nu compara cu decembrie 2025 ca și cum ar fi același sistem de măsură).
5. **Dacă vrei un tool dedicat:** alege în funcție de stack și buget (vezi tabelul). Pentru un magazin Shopify/WooCommerce non-tehnic, opțiunile done-for-you (wetracked.io, Elevar, SignalBridge, Tracklution etc.) îți scutesc mentenanța; pentru control total și buget mic, Stape/ServerTrack. **Cere filtrare de boți** și verifică partea de GDPR dacă ai trafic UE.
6. **Nu tăia bugetul pe baza rapoartelor stricate** și nu pune campanii pe pauză două săptămâni doar pentru că „arată” mai prost după martie — urmărește **venitul real**, nu doar atribuirea.

---

## 8. Răspuns direct la cele trei întrebări ale tale

**„Cum se trackuiesc conversiile de Purchase pentru pixel?”** → Browser-side (pixel JS) și/sau server-side (CAPI), cu deduplicare prin `event_id`, calitate dată de EMQ, și o parte modelată prin AEM pentru iOS opt-out. În 2026 standardul real e **pixel + CAPI**, nu pixel singur.

**„Cum se făcea înainte vs. acum?”** → Înainte: ferestre 28+28 zile, tracking individual, pixel care vedea aproape tot. Acum: ferestre tăiate (7 click + 1 view), **eliminarea view-through pe 12 ian 2026**, **reclasificarea click-ului pe 3 mar 2026**, AEM/modeling pentru iOS, default Shopify comutat, terminologie „Dataset”, plus presiune legală GDPR în UE. Net: raportezi mai puțin și algoritmul vede mai puțin decât în „epoca de aur”.

**„Cum funcționează aplicații gen wetracked.io?”** → Mută colectarea server-side/first-party, îmbogățesc datele, gestionează dedup și împing evenimente curate înapoi în ad managers prin CAPI. Recuperează semnal real pierdut la browser (15–40%), dar **nu fac „100%”** și pot introduce risc de boți / GDPR dacă nu sunt bine implementate.

---

## 9. Concluzia

Cel mai probabil scenariu pentru tine **nu** este „afacerea s-a prăbușit”, ci un **cumul**: (a) schimbările Meta din ianuarie–martie 2026 ți-au tăiat o felie din conversiile *raportate* (mai ales cele view-through, cu decizie lungă, deseori comenzile mari), (b) Shopify ți-a slăbit ponderarea semnalului, și (c) dacă rulezi **pixel-only**, pierzi oricum 20–60% la browser, ceea ce a **înrăutățit optimizarea** și a transformat o problemă de măsurare într-una de vânzări reale.

Ordinea corectă: **întâi diagnostichezi** (reconciliere real vs. raportat, Diagnostics, EMQ, etichetă Browser/Server) → **apoi repari semnalul** (pixel + CAPI + Advanced Matching + dedup) → **abia apoi** decizi dacă un tool terț îți aduce destul peste CAPI-ul gratuit ca să-și merite banii. Nu cumpăra „100% accuracy” pe încredere; cere-le filtrare de boți, dovada match quality și claritate pe GDPR.

---

### Surse principale consultate
Documentația Meta for Developers (Meta Pixel, Conversion Tracking); ghiduri 2026 de la affectgroup, DOJO AI, DataCops, Conversios, Lucid Media, Cometly, lionelz, Shopify, Practical Ecommerce; materialele și review-urile wetracked.io (site oficial, Capterra, GetApp, SoftwareAdvice, SaaSworthy); comparative de tool-uri server-side (Tracklution, SignalBridge, AdManage, CustomerLabs, ServerTrack, WeltPixel, Medium); explicații AEM/iOS 14.5 (Conversios, Funnel.io, Jon Loomer, Finch). Cifrele și prețurile se schimbă des — verifică la sursă înainte de decizii.

*Acest material e informativ, nu consultanță juridică. Pentru partea GDPR (mai ales fingerprinting pe trafic UE), validează cu un specialist.*
