# NextAuth.js Setup Guide - MVP Orders

## Ce am implementat

Am implementat un sistem complet de autentificare cu NextAuth.js, Organizations și Role-based Access Control (RBAC) pentru MVP Orders.

### Features implementate:

1. **User Authentication** cu NextAuth.js
   - Email/Password authentication
   - JWT sessions
   - Protected routes cu middleware

2. **Multi-tenancy cu Organizations**
   - Fiecare user poate aparține la multiple organizații
   - Fiecare organizație are propriile resurse (orders, products, stores, landing pages)
   - Organization switcher în UI

3. **Role-based Access Control**
   - Roluri: `owner`, `admin`, `member`
   - Permissions pe baza rolurilor

4. **Database Schema**
   - Users, Organizations, Organization Members
   - Products, Stores, Landing Pages cu `organization_id`
   - Row Level Security (RLS) policies

## Setup Instructions

### 1. Configurare Environment Variables

Trebuie să completezi următoarele variabile în `.env.local`:

```bash
# Supabase (deja configurate)
NEXT_PUBLIC_SUPABASE_URL=https://bgstbrpxpncrnxchijzs.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUz...

# IMPORTANT: Adaugă Service Role Key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# NextAuth.js
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-here-generate-with-openssl-rand-base64-32
```

#### Cum obții SUPABASE_SERVICE_ROLE_KEY:

1. Mergi la [Supabase Dashboard](https://supabase.com/dashboard)
2. Selectează proiectul tău
3. Settings → API
4. Copiază "service_role" key (NU "anon" key!)

#### Cum generezi NEXTAUTH_SECRET:

Rulează în terminal:
```bash
openssl rand -base64 32
```

Copiază output-ul și pune-l în `.env.local` la `NEXTAUTH_SECRET`.

### 2. Rulare Migration Database

Trebuie să rulezi SQL-ul din `migrations/001-auth-schema.sql` în Supabase.

**Pași:**

1. Mergi la [Supabase Dashboard](https://supabase.com/dashboard)
2. Selectează proiectul tău
3. SQL Editor (din sidebar)
4. New query
5. Copiază tot conținutul din `migrations/001-auth-schema.sql`
6. Paste în SQL Editor
7. Click "Run" (sau Cmd/Ctrl + Enter)

Această migrație va crea:
- Tabelele pentru users, sessions, accounts, organizations, organization_members
- Tabelele pentru products, stores, landing_pages
- Va adăuga `organization_id` la tabelele existente (orders, settings)
- Va configura Row Level Security (RLS) policies
- Va crea indexuri pentru performanță

### 3. Pornire Server Development

```bash
npm run dev
```

### 4. Crearea primului cont

1. Navighează la `http://localhost:3000/auth/signup`
2. Completează formularul cu:
   - Full Name
   - Email
   - Organization Name (acesta va fi workspace-ul tău)
   - Password (min. 8 caractere)
3. Click "Create Account"
4. Vei fi redirecționat la `/auth/signin`
5. Loghează-te cu email și password

### 5. Testare

După login, vei fi redirecționat automat la `/admin/orders`.

Verifică:
- ✅ Sidebar-ul este vizibil
- ✅ UserMenu este în footer-ul sidebar-ului
- ✅ Poți vedea numele tău și organizația activă
- ✅ Poți da click pe UserMenu pentru a vedea detalii

## Structura proiectului

```
src/
├── app/
│   ├── api/
│   │   └── auth/
│   │       ├── [...nextauth]/route.ts   # NextAuth.js handler
│   │       └── signup/route.ts          # Signup endpoint
│   ├── auth/
│   │   ├── signin/page.tsx              # Login page
│   │   ├── signup/page.tsx              # Registration page
│   │   └── no-organization/page.tsx     # Error page
│   └── admin/
│       ├── components/
│       │   ├── Sidebar.tsx              # Updated cu UserMenu
│       │   └── UserMenu.tsx             # User dropdown menu
│       └── layout.tsx                   # Admin layout
├── components/
│   └── Providers.tsx                    # SessionProvider + OrganizationProvider
├── contexts/
│   └── OrganizationContext.tsx          # Organization state management
├── lib/
│   └── auth.ts                          # NextAuth.js config
├── types/
│   └── next-auth.d.ts                   # TypeScript types pentru NextAuth
└── middleware.ts                        # Route protection

migrations/
└── 001-auth-schema.sql                  # Database migration
```

## Database Schema

### Organizations
```sql
- id (UUID, PK)
- name (TEXT)
- slug (TEXT, UNIQUE)
- created_at, updated_at
```

### Users
```sql
- id (UUID, PK)
- email (TEXT, UNIQUE)
- name (TEXT)
- password_hash (TEXT)
- email_verified (TIMESTAMP)
- created_at, updated_at
```

### Organization Members
```sql
- id (UUID, PK)
- organization_id (UUID, FK → organizations)
- user_id (UUID, FK → users)
- role (TEXT: 'owner', 'admin', 'member')
- created_at, updated_at
- UNIQUE(organization_id, user_id)
```

### Resurse cu organization_id
```sql
- orders (organization_id)
- products (organization_id)
- stores (organization_id)
- landing_pages (organization_id)
- settings (organization_id)
```

## Flow-uri importante

### 1. Signup Flow

```
User → /auth/signup
  → POST /api/auth/signup
    → Create user în DB
    → Create organization în DB
    → Add user ca "owner" în organization_members
  → Redirect la /auth/signin
```

### 2. Login Flow

```
User → /auth/signin
  → POST /api/auth/[...nextauth]
    → Verify credentials
    → Get user's organizations
    → Create JWT session
  → Redirect la /admin (care redirecționează la /admin/orders)
```

### 3. Organization Switching

```
User → Click UserMenu
  → Click "Switch Organization"
  → Select organization
  → Update activeOrganization în context
  → (TODO) API call pentru a salva preferința
```

## Row Level Security (RLS)

Toate tabelele au RLS policies care asigură că:

1. Users pot vedea doar organizațiile din care fac parte
2. Users pot accesa doar resursele (orders, products, etc.) din organizațiile lor
3. Doar owners și admins pot gestiona membrii organizației

**Exemplu policy:**

```sql
CREATE POLICY "Users can access their organization orders"
  ON orders FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );
```

## Următorii pași (TODO-uri pentru viitor)

1. **Update API routes** să folosească `organization_id`:
   - `/api/orders/*` - filtrare după organization
   - `/api/products/*` - filtrare după organization
   - `/api/stores/*` - filtrare după organization

2. **Implement Organization Settings**:
   - API pentru update active organization preference
   - Pagină de management pentru organization members
   - Invite system pentru noi membri

3. **Email Verification**:
   - Setup email provider (Resend, SendGrid, etc.)
   - Email templates pentru verification
   - Email templates pentru password reset

4. **OAuth Providers** (opțional):
   - Google Sign-In
   - GitHub Sign-In

5. **Audit Logging**:
   - Track who made what changes
   - Organization activity feed

## Troubleshooting

### Eroare: "User not authorized"

**Cauză:** RLS policies blochează accesul.

**Soluție:** Verifică că user-ul este membru al organizației și că `organization_id` este setat corect pe resurse.

### Eroare: "Invalid credentials"

**Cauză:** Email sau password greșit, sau user nu există.

**Soluție:** Verifică că ai rulat migration-ul și că user-ul a fost creat cu succes.

### Eroare: "NEXTAUTH_SECRET not set"

**Cauză:** `.env.local` nu are `NEXTAUTH_SECRET`.

**Soluție:** Generează un secret cu `openssl rand -base64 32` și adaugă-l în `.env.local`.

### Session nu se salvează

**Cauză:** `NEXTAUTH_URL` nu este setat corect.

**Soluție:** Asigură-te că `NEXTAUTH_URL=http://localhost:3000` în `.env.local` (sau domain-ul tău în producție).

## Producție (Vercel Deploy)

Când faci deploy pe Vercel, adaugă Environment Variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXTAUTH_URL=https://your-domain.vercel.app
NEXTAUTH_SECRET=... (acelaș secret ca în local)
```

**IMPORTANT:** Nu uita să rulezi migration-ul și pe database-ul de producție!

## Securitate

1. **NICIODATĂ** nu commite `.env.local` în git
2. **Service Role Key** trebuie păstrat secret (are acces complet la DB)
3. **NEXTAUTH_SECRET** trebuie să fie diferit între local și producție
4. **Passwords** sunt hash-uite cu bcrypt (cost factor 10)
5. **RLS policies** protejează toate resursele

## Support

Dacă întâmpini probleme:

1. Verifică că ai rulat migration-ul
2. Verifică că toate variabilele de environment sunt setate
3. Verifică logs în terminal pentru erori
4. Verifică Supabase Dashboard → Logs pentru erori de DB
