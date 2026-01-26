# MVP Orders - Manual de Utilizare

**Versiune:** 1.0
**Data:** Ianuarie 2025
**Aplicație pentru gestionarea comenzilor și integrare WMS**

---

## Cuprins

1. [Introducere](#1-introducere)
2. [Autentificare și Roluri](#2-autentificare-și-roluri)
3. [Dashboard](#3-dashboard)
4. [Comenzi (Orders)](#4-comenzi-orders)
5. [Comenzi Parțiale (Partials)](#5-comenzi-parțiale-partials)
6. [Clienți (Customers)](#6-clienți-customers)
7. [Produse (Products)](#7-produse-products)
8. [Landing Pages](#8-landing-pages)
9. [Upsells](#9-upsells)
10. [Magazine (Stores)](#10-magazine-stores)
11. [Setări (Settings)](#11-setări-settings)
12. [Echipă (Team)](#12-echipă-team)
13. [Superadmin Panel](#13-superadmin-panel)
14. [Widget-ul de Vânzare](#14-widget-ul-de-vânzare)
15. [Integrări](#15-integrări)
16. [Statusuri și Fluxuri](#16-statusuri-și-fluxuri)

---

## 1. Introducere

**MVP Orders** este o aplicație completă pentru gestionarea comenzilor, integrată cu:
- **Helpship WMS** - pentru sincronizarea comenzilor cu warehouse-ul
- **Meta Conversions API (CAPI)** - pentru tracking server-side al conversiilor
- **Facebook Pixel** - pentru tracking client-side

### Tehnologii utilizate:
- **Framework:** Next.js
- **Bază de date:** Supabase (PostgreSQL)
- **Autentificare:** NextAuth.js
- **Stilizare:** Tailwind CSS

---

## 2. Autentificare și Roluri

### 2.1 Roluri disponibile

| Rol | Descriere |
|-----|-----------|
| **Owner** | Acces complet la toate funcționalitățile |
| **Admin** | Acces la majoritatea funcțiilor, fără management echipă |
| **Store Manager** | Acces limitat: doar comenzi, parțiale și clienți |

### 2.2 Permisiuni pe pagini

| Pagină | Owner | Admin | Store Manager |
|--------|-------|-------|---------------|
| Dashboard | ✓ | ✓ | ✓ |
| Orders | ✓ | ✓ | ✓ |
| Partials | ✓ | ✓ | ✓ |
| Customers | ✓ | ✓ | ✓ |
| Products | ✓ | ✓ | ✗ |
| Landing Pages | ✓ | ✓ | ✗ |
| Stores | ✓ | ✓ | ✗ |
| Settings | ✓ | ✓ | ✗ |
| Team | ✓ | ✗ | ✗ |
| Superadmin | ✓* | ✗ | ✗ |

*Doar pentru organizații superadmin

### 2.3 Autentificare

1. Accesați pagina de login
2. Introduceți email și parola
3. Dacă aveți acces la mai multe organizații, selectați organizația dorită

---

## 3. Dashboard

**Locație:** `/admin/dashboard`

Dashboard-ul oferă o vedere de ansamblu asupra performanței business-ului.

### 3.1 KPI-uri principale

- **Total Revenue** - Venitul total în RON
- **Average Order Value (AOV)** - Valoarea medie per comandă
- **Order Count** - Numărul total de comenzi
- **Products Sold** - Numărul de produse vândute
- **Upsell Rate** - Rata de acceptare a upsell-urilor (%)

### 3.2 Filtre disponibile

**Filtre rapide:**
- Today (Astăzi)
- Yesterday (Ieri)
- Last 3 Days (Ultimele 3 zile)
- Week-to-Date (De la începutul săptămânii)
- Month-to-Date (De la începutul lunii)
- All Time (Tot timpul)

**Filtre personalizate:**
- Date Range (Interval de date cu calendar)
- Landing Page Filter (Filtrare pe landing page specifică)

### 3.3 Grafice și analize

- **Revenue Growth Chart** - Grafic de evoluție a veniturilor
- **Orders by Status** - Distribuția comenzilor pe status-uri
- **Partials by Status** - Distribuția comenzilor parțiale
- **Revenue by Product** - Top produse după venituri
- **Upsells Split** - Repartizare Presale vs Postsale
- **Stock Analysis** - Predicție stoc și zile până la epuizare

---

## 4. Comenzi (Orders)

**Locație:** `/admin/orders`

### 4.1 Vizualizare comenzi

Tabelul de comenzi afișează:
- **Order ID** - Identificator unic (ex: VLR-00001)
- **Status** - Statusul curent al comenzii
- **Customer** - Numele și telefonul clientului
- **Order Note** - Notă atașată comenzii
- **Order Source** - Sursa comenzii (landing page + sursă trafic)
- **Price** - Prețul total (subtotal + upsells + livrare)
- **Order Date** - Data și ora comenzii
- **Actions** - Acțiuni disponibile

### 4.2 Status-uri comenzi

| Status | Culoare | Descriere |
|--------|---------|-----------|
| **queue** | Violet | Comandă în coadă (3 min pentru postsale) |
| **testing** | Albastru | Comandă de test |
| **pending** | Galben | Așteaptă confirmare |
| **confirmed** | Verde | Confirmată și sincronizată |
| **scheduled** | Cyan | Programată pentru o dată viitoare |
| **hold** | Portocaliu | Suspendată cu motiv |
| **cancelled** | Roșu | Anulată |
| **sync_error** | Roz | Eroare la sincronizare Helpship |

### 4.3 Căutare și filtrare

- **Căutare:** După telefon, nume, județ, oraș, adresă
- **Filtru perioadă:** 30 zile, 60 zile, 90 zile, Toate
- **Filtru status:** Selectare multiplă a status-urilor
- **Paginare:** 25 comenzi per pagină

### 4.4 Acțiuni pe comenzi

| Acțiune | Disponibil pentru | Efect |
|---------|-------------------|-------|
| **Confirm** | pending, scheduled, hold | Confirmă comanda |
| **Duplicate Check** | pending, hold | Verifică duplicate |
| **Hold** | pending, confirmed | Pune în suspensie |
| **Unhold** | hold | Scoate din suspensie |
| **Cancel** | toate | Anulează comanda |
| **Uncancel** | cancelled | Restaurează comanda |
| **Note** | toate | Adaugă/editează notă |
| **Resync** | sync_error | Re-sincronizează cu Helpship |
| **Finalize** | queue | Finalizează fără postsale |
| **Promote** | testing | Promovează la comandă reală |

### 4.5 Confirmare comandă

La confirmare, se deschide un modal cu:
1. **Date client:** Nume, Telefon
2. **Date livrare:** Județ, Oraș, Adresă
3. **Cod poștal:** Auto-completat din Helpship
4. **Data programată:** Opțional, pentru comenzi programate
5. **Verificare duplicate:** Avertisment dacă există comenzi similare

**Proces:**
1. Verificați și editați datele dacă e necesar
2. Selectați data programată (opțional)
3. Apăsați "Confirmă"
4. Comanda se sincronizează cu Helpship

---

## 5. Comenzi Parțiale (Partials)

**Locație:** `/admin/partials`

Comenzile parțiale sunt formulare incomplete salvate automat de widget.

### 5.1 Status-uri parțiale

| Status | Descriere |
|--------|-----------|
| **pending** | Formularul nu e complet |
| **confirmed** | Client a completat, așteaptă confirmare |
| **refused** | Client a refuzat oferta |
| **unanswered** | Fără răspuns |
| **call_later** | De sunat mai târziu |
| **duplicate** | Duplicat identificat |

### 5.2 Informații afișate

- **Partial Number** - Identificator unic
- **Customer** - Telefon și nume (dacă există)
- **Offer Code** - Oferta selectată
- **Completion %** - Procentul de completare
- **Last Field** - Ultimul câmp completat
- **Total Amount** - Valoarea potențială
- **Time Ago** - Timpul scurs

### 5.3 Acțiuni disponibile

- **Vizualizare detalii** - Vedere completă a datelor
- **Confirmare** - Convertire la comandă reală
- **Actualizare status** - Schimbare status
- **Ștergere** - Eliminare din sistem

---

## 6. Clienți (Customers)

**Locație:** `/admin/customers`

### 6.1 Lista clienților

- **Phone** - Număr de telefon
- **Name** - Numele din ultima comandă
- **First Order** - Data primei comenzi
- **Last Order** - Data ultimei comenzi
- **Total Orders** - Număr total comenzi
- **Total Spent** - Suma totală cheltuită (RON)

### 6.2 Detalii client

La click pe un client, vedeți:
- Informații generale
- Istoric complet al comenzilor
- Timeline cu toate interacțiunile

---

## 7. Produse (Products)

**Locație:** `/admin/products`

### 7.1 Lista produselor

- **Name** - Numele produsului
- **SKU** - Cod de identificare unic
- **Status** - active / testing / inactive
- **Testing Orders** - Număr comenzi de test

### 7.2 Status-uri produse

| Status | Descriere |
|--------|-----------|
| **active** | Disponibil pentru comenzi reale |
| **testing** | Doar pentru comenzi de test |
| **inactive** | Nu mai poate fi folosit |

### 7.3 Creare produs

1. Click pe "New Product"
2. Completați:
   - **Name** - Numele produsului
   - **SKU** - Cod unic de identificare
   - **Status** - Statusul inițial
3. Salvați

### 7.4 Acțiuni speciale

- **Promote Testing Orders** - Convertește toate comenzile de test în reale
- **Cancel Testing Orders** - Anulează toate comenzile de test

---

## 8. Landing Pages

**Locație:** `/admin/landing-pages`

### 8.1 Lista landing pages

- **Name** - Numele paginii
- **Slug** - URL-ul paginii
- **Store** - Magazinul asociat
- **Status** - Draft / Published / Archived

### 8.2 Configurare landing page

**Informații de bază:**
- Name - Numele intern
- Slug - Identificator URL (ex: "oferta-speciala")
- Store - Magazinul asociat
- Product - Produsul principal

**Prețuri și oferte:**
- SRP (Preț recomandat/barat)
- Price 1, 2, 3 (Prețurile pentru cele 3 oferte)
- Shipping Price (Cost livrare)
- Offer Headings (Textele ofertelor)
- Numerals (Cantitățile: 1, 2, 3)

**Post-purchase:**
- Enable Post-Purchase Offer (toggle)
- Thank You Page Path (URL redirect după comandă)

**Tracking:**
- Meta Pixel ID
- Meta Test Mode (pentru testare)
- Client-Side Tracking (toggle)
- Server-Side Tracking CAPI (toggle)

### 8.3 Embed Codes

Pentru integrarea widget-ului:
1. Accesați landing page > Edit
2. Click pe "Get Embed Code"
3. Copiați codul și inserați-l în site

---

## 9. Upsells

### 9.1 Tipuri de upsells

| Tip | Moment afișare | Descriere |
|-----|----------------|-----------|
| **Presale** | Pe formular, înainte de checkout | Oferte adiționale la completarea comenzii |
| **Postsale** | După plasarea comenzii (180 sec) | Popup cu countdown și ofertă specială |

### 9.2 Configurare upsell

- **Title** - Titlul afișat
- **Description** - Descriere scurtă
- **Product** - Produsul oferit
- **Price** - Prețul upsell-ului
- **SRP** - Prețul barat (pentru discount vizual)
- **Image** - Imagine produsului
- **Type** - Presale sau Postsale
- **Status** - Active / Inactive

### 9.3 Gestionare upsells per landing page

1. Accesați Landing Page > Edit
2. Tab "Upsells"
3. Adăugați/Editați/Ștergeți upsells

---

## 10. Magazine (Stores)

**Locație:** `/admin/store`

### 10.1 Configurare magazin

**Informații de bază:**
- **URL** - Adresa magazinului
- **Order Series** - Prefix pentru numerele de comandă (ex: "VLR-")
- **Order Email** - Email pentru notificări comenzi

**Culori (pentru widget):**
- **Primary Color** - Buton submit
- **Accent Color** - Badge-uri și prețuri
- **Background Color** - Header și rezumat
- **Text on Dark** - Text pe fundal închis

**Setări:**
- **Duplicate Order Days** - Zile pentru detectare duplicate (default: 14)

### 10.2 Creare magazin nou

1. Click "New Store"
2. Completați URL și Order Series (obligatorii)
3. Personalizați culorile
4. Salvați

---

## 11. Setări (Settings)

**Locație:** `/admin/settings`

### 11.1 Helpship Credentials

Pentru integrarea cu Helpship WMS:

1. **Client ID** - ID-ul clientului Helpship
2. **Client Secret** - Cheia secretă
3. **Validate** - Testează conexiunea
4. **Save** - Salvează credențialele

### 11.2 Meta CAPI Settings

Pentru tracking server-side Facebook:

1. **Meta Test Mode** - Activează modul de testare
2. **Test Event Code** - Codul pentru evenimente de test
3. **Server-Side Tracking** - Activează/dezactivează CAPI

---

## 12. Echipă (Team)

**Locație:** `/admin/settings/team`
**Acces:** Doar Owner

### 12.1 Lista membrilor

- **Email** - Adresa de email
- **Name** - Numele
- **Role** - Rolul în organizație
- **Status** - Activ/Inactiv
- **Created** - Data adăugării

### 12.2 Adăugare membru

1. Click "Add Team Member"
2. Introduceți email-ul
3. Selectați rolul (Owner, Admin, Store Manager)
4. Trimiteți invitația

### 12.3 Gestionare membri

- **Toggle Active** - Activare/dezactivare acces
- **Change Role** - Modificare rol
- **Delete** - Ștergere din echipă

---

## 13. Superadmin Panel

**Locație:** `/admin/superadmin`
**Acces:** Doar Owner din organizație Superadmin

### 13.1 Funcționalități

**Helpship Environment:**
- Toggle între **Development** și **Production**
- DEV MODE indicator în header când e activ development
- Afectează toate organizațiile

**Gestionare organizații:**
- Vizualizare toate organizațiile
- Activare/Dezactivare organizații
- Statistici per organizație

---

## 14. Widget-ul de Vânzare

Widget-ul este formularul de comandă integrat în site-uri externe.

### 14.1 Fluxul de checkout

**Pasul 1: Informații livrare**
- Telefon (10 cifre, format 07XX XXX XXX)
- Nume și Prenume
- Județ (dropdown)
- Localitate/Oraș
- Adresă completă

**Pasul 2: Selectare ofertă**
- 3 opțiuni de preț cu cantități diferite
- Afișare preț barat vs preț actual
- Calcul automat total

**Pasul 3: Presale Upsells (opțional)**
- Checkbox-uri pentru produse adiționale
- Afișare discount și preț redus
- Adăugare la total

**Pasul 4: Rezumat comandă**
- Preț produse
- Livrare curier rapid
- Oferte speciale (upsells)
- **TOTAL**

**Pasul 5: Plasare comandă**
- Buton "PLASEAZĂ COMANDA"
- Validare formular
- Trimitere la server

### 14.2 Postsale Offer

După plasarea comenzii:
1. **Popup animat** cu ofertă specială
2. **Countdown 180 secunde**
3. **Buton Accept** - Adaugă upsell-ul
4. **Buton Decline** - Finalizează fără upsell
5. **Auto-redirect** la pagina de mulțumire

### 14.3 Funcționalități automate

- **Auto-save** - Salvare parțială la fiecare 3 secunde
- **Cod poștal** - Auto-completare din Helpship
- **Tracking** - Events trimise la Meta (client + server)
- **Validare** - Verificare în timp real a datelor

---

## 15. Integrări

### 15.1 Helpship WMS

**Funcționalități:**
- Sincronizare comenzi confirmate
- Extragere cod poștal (județ + oraș)
- Status update-uri din warehouse
- Retry automat la erori

**Configurare:**
1. Obțineți credențiale de la Helpship
2. Introduceți în Settings > Helpship
3. Validați conexiunea
4. Salvați

### 15.2 Meta Conversions API (CAPI)

**Evenimente tracked:**
- **PageView** - La încărcare widget
- **ViewContent** - La vizualizare produs
- **InitiateCheckout** - La submit formular
- **Purchase** - La finalizare comandă

**Configurare:**
1. Obțineți Pixel ID și Access Token
2. Configurați în Landing Page sau Store
3. Activați Server-Side Tracking

### 15.3 Facebook Pixel (Client-side)

**Funcționează în paralel cu CAPI:**
- Tracking browser-level
- Deduplicare automată cu CAPI
- Test Event Code pentru testare

---

## 16. Statusuri și Fluxuri

### 16.1 Flux comandă normală

```
Formular completat
       ↓
   [QUEUE] (3 min pentru postsale)
       ↓
   Finalizare
       ↓
   [PENDING]
       ↓
   Confirmare
       ↓
   [CONFIRMED] → Sincronizat cu Helpship
```

### 16.2 Flux comandă cu postsale

```
Formular completat
       ↓
   [QUEUE]
       ↓
   Popup Postsale (180 sec)
       ↓
   Accept/Decline
       ↓
   [PENDING] (cu/fără upsell)
       ↓
   Confirmare
       ↓
   [CONFIRMED]
```

### 16.3 Flux comandă programată

```
   [PENDING]
       ↓
   Confirmare cu dată programată
       ↓
   [SCHEDULED]
       ↓
   La data programată (cron job)
       ↓
   [CONFIRMED] → Sincronizat automat
```

### 16.4 Flux comandă de test

```
   Produs în status "testing"
       ↓
   Comandă creată ca [TESTING]
       ↓
   Opțiuni:
   ├── Promote → [PENDING] → [CONFIRMED]
   └── Cancel → [CANCELLED]
```

---

## Anexă: Shortcuts și Sfaturi

### Tastare rapidă în căutare
- Tastați numărul de telefon pentru căutare rapidă
- Căutarea este debounced (300ms delay)

### Verificare duplicate
- Sistemul verifică automat duplicate la confirmare
- Perioada de verificare: configurabilă per store (default 14 zile)

### Rezolvare erori de sincronizare
1. Verificați statusul comenzii (sync_error)
2. Click pe "Resync" din dropdown
3. Verificați credențialele Helpship dacă persistă

### Best Practices
- Confirmați comenzile prompt pentru a evita pierderi
- Verificați comenzile parțiale zilnic
- Monitorizați stock-ul din Dashboard
- Folosiți note pentru comunicare internă

---

**Document generat pentru MVP Orders v1.0**
**© 2025 Velaro Trading SRL**
