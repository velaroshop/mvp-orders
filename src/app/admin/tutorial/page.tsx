"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Search,
  ChevronRight,
  ChevronDown,
  BookOpen,
  Store,
  Settings,
  Users,
  Tag,
  FileText,
  Code2,
  ShoppingCart,
  Clock,
  BarChart2,
  RotateCcw,
  Wrench,
  ImageIcon,
  Info,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  ExternalLink,
  Play,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Step {
  title: string;
  content: React.ReactNode;
}

interface Section {
  id: string;
  title: string;
  steps: Step[];
}

interface Module {
  id: string;
  title: string;
  shortTitle: string;
  icon: React.ReactNode;
  badge?: string;
  sections: Section[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper components
// ─────────────────────────────────────────────────────────────────────────────

function Screenshot({ src, alt, caption }: { src: string; alt: string; caption?: string }) {
  const [missing, setMissing] = useState(false);

  if (missing) {
    return (
      <div className="my-4 rounded-xl border border-dashed border-white/20 bg-white/5 flex flex-col items-center justify-center py-10 px-6 text-center gap-2">
        <ImageIcon className="w-8 h-8 text-white/20" />
        <p className="text-white/40 text-sm font-medium">{alt}</p>
        {caption && <p className="text-white/25 text-xs">{caption}</p>}
        <p className="text-white/20 text-xs mt-1 font-mono">/public/tutorial/{src}</p>
      </div>
    );
  }

  return (
    <figure className="my-4">
      <div className="rounded-xl overflow-hidden border border-white/10 shadow-lg">
        <Image
          src={`/tutorial/${src}`}
          alt={alt}
          width={1200}
          height={675}
          className="w-full h-auto"
          onError={() => setMissing(true)}
        />
      </div>
      {caption && (
        <figcaption className="mt-2 text-center text-white/40 text-xs">{caption}</figcaption>
      )}
    </figure>
  );
}

function Note({ type = "info", children }: { type?: "info" | "tip" | "warning"; children: React.ReactNode }) {
  const styles = {
    info:    { bg: "bg-blue-500/10 border-blue-500/30",    icon: <Info className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />,    label: "Info" },
    tip:     { bg: "bg-emerald-500/10 border-emerald-500/30", icon: <Lightbulb className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />, label: "Sfat" },
    warning: { bg: "bg-amber-500/10 border-amber-500/30",  icon: <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />, label: "Atenție" },
  }[type];

  return (
    <div className={`my-4 flex gap-3 rounded-lg border px-4 py-3 text-sm ${styles.bg}`}>
      {styles.icon}
      <div className="text-white/75 leading-relaxed">{children}</div>
    </div>
  );
}

function Checklist({ items }: { items: string[] }) {
  return (
    <ul className="my-3 space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-sm text-white/75">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function StepNumber({ n }: { n: number }) {
  return (
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-xs font-bold shrink-0">
      {n}
    </span>
  );
}

function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="px-1.5 py-0.5 rounded bg-white/10 text-white/90 text-xs font-mono border border-white/10">
      {children}
    </code>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tutorial content
// ─────────────────────────────────────────────────────────────────────────────

const modules: Module[] = [
  // ── MODULE 0: Introducere ──────────────────────────────────────────────────
  {
    id: "intro",
    title: "Introducere",
    shortTitle: "Introducere",
    icon: <BookOpen className="w-4 h-4" />,
    sections: [
      {
        id: "intro-overview",
        title: "Ce este această aplicație?",
        steps: [
          {
            title: "Prezentare generală",
            content: (
              <div className="space-y-4 text-sm text-white/75 leading-relaxed">
                <p>
                  Această aplicație este un sistem complet de gestionare a comenzilor pentru magazine de e-commerce care vând prin landing pages. Practic înlocuiește un sistem de comenzi clasic cu un flux optimizat pentru conversii ridicate.
                </p>
                <p>
                  Principiul de funcționare este simplu: tu creezi un <strong className="text-white">produs</strong> și o <strong className="text-white">landing page</strong> în aplicație, iar aplicația generează automat un <strong className="text-white">widget (iframe)</strong> pe care îl inserezi în site-ul tău. Când un vizitator completează formularul, comanda apare imediat în aplicație.
                </p>
                <Screenshot
                  src="intro-flow.png"
                  alt="Flux general: Site → Widget → Aplicație → WMS"
                  caption="Fluxul unei comenzi de la vizitator la depozit"
                />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                  {[
                    { title: "1. Configurezi", desc: "Magazin, produse, landing pages — o singură dată." },
                    { title: "2. Integrezi", desc: "Inserezi iframe-ul în site-ul tău sau al clienților." },
                    { title: "3. Gestionezi", desc: "Confirmi comenzile, urmărești ROAS, gestionezi retururi." },
                  ].map((c) => (
                    <div key={c.title} className="rounded-lg bg-white/5 border border-white/10 p-4">
                      <p className="font-semibold text-white text-sm mb-1">{c.title}</p>
                      <p className="text-white/55 text-xs">{c.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            ),
          },
          {
            title: "Ordinea recomandată de setup",
            content: (
              <div className="space-y-3 text-sm text-white/75">
                <p>Urmează această ordine la primul setup — sărind pași poți întâmpina erori sau funcționalități incomplete:</p>
                <ol className="space-y-3 mt-3">
                  {[
                    "Creează și configurează magazinul",
                    "Conectează WMS-ul (Helpship) și setează TVA-ul",
                    "Adaugă membrii echipei (opțional)",
                    "Creează produsele",
                    "Creează landing pages și adaugă upsells",
                    "Generează codul embed și inserează-l pe site",
                    "Testează cu o comandă de test",
                    "Activează tracking-ul Meta Pixel / CAPI",
                  ].map((step, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <StepNumber n={i + 1} />
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ),
          },
        ],
      },
    ],
  },

  // ── MODULE 1: Setup inițial ────────────────────────────────────────────────
  {
    id: "setup",
    title: "Modul 1 — Setup inițial",
    shortTitle: "Setup inițial",
    icon: <Settings className="w-4 h-4" />,
    badge: "Obligatoriu",
    sections: [
      {
        id: "setup-store",
        title: "1.1 Configurarea Magazinului",
        steps: [
          {
            title: "Crearea primului magazin",
            content: (
              <div className="space-y-4 text-sm text-white/75 leading-relaxed">
                <p>
                  Mergi la <strong className="text-white">Administrare → Magazin</strong> și apasă butonul <InlineCode>+ Magazin nou</InlineCode>. Un magazin reprezintă o entitate separată — poți avea mai multe magazine dacă ai mai multe branduri sau afaceri.
                </p>
                <Screenshot src="store-create.png" alt="Pagina Magazin — buton creare magazin nou" />
                <p>Completează câmpurile:</p>
                <Checklist
                  items={[
                    "Nume magazin — numele intern, vizibil doar în aplicație",
                    "URL magazin — domeniul site-ului tău (ex: magazinulmeu.ro)",
                    "Prefix serie comenzi — 2-4 litere care identifică comenzile acestui magazin (ex: VLR, SHP)",
                    "Culoare principală — culoarea butonului de comandă din widget",
                    "Culoare fundal — fundalul formularului din widget",
                  ]}
                />
                <Note type="tip">
                  Prefixul seriei de comenzi nu poate fi schimbat ulterior fără a afecta seria comenzilor existente. Alege cu atenție de la început.
                </Note>
                <Screenshot src="store-form.png" alt="Formular creare magazin — câmpuri completate" />
              </div>
            ),
          },
          {
            title: "Configurarea Facebook Pixel",
            content: (
              <div className="space-y-4 text-sm text-white/75 leading-relaxed">
                <p>
                  Tot în pagina magazinului poți adăuga <strong className="text-white">Facebook Pixel ID</strong>. Acesta este necesar pentru tracking-ul evenimentelor de comandă (Purchase, InitiateCheckout, etc.).
                </p>
                <p>Cum găsești Pixel ID-ul:</p>
                <ol className="space-y-2 mt-2">
                  {[
                    "Intră în Meta Business Suite (business.facebook.com)",
                    "Mergi la Events Manager",
                    "Selectează pixel-ul tău — ID-ul apare în partea de sus",
                  ].map((s, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <StepNumber n={i + 1} />
                      <span>{s}</span>
                    </li>
                  ))}
                </ol>
                <Note type="info">
                  Dacă vrei și tracking server-side (Meta CAPI), poți genera un token din Events Manager → Settings → Generate access token și îl adaugi în Setări → Meta Ads Dashboard.
                </Note>
              </div>
            ),
          },
        ],
      },
      {
        id: "setup-helpship",
        title: "1.2 Conectarea cu WMS-ul (Helpship)",
        steps: [
          {
            title: "Introducerea credențialelor Helpship",
            content: (
              <div className="space-y-4 text-sm text-white/75 leading-relaxed">
                <p>
                  Mergi la <strong className="text-white">Administrare → Setări</strong>. Prima secțiune este dedicată integrării cu Helpship (sistemul de gestiune a depozitului).
                </p>
                <Screenshot src="settings-helpship.png" alt="Secțiunea Helpship în Setări" />
                <p>Ai nevoie de:</p>
                <Checklist
                  items={[
                    "API Key — cheia API din contul tău Helpship",
                    "Organization ID — ID-ul organizației din Helpship",
                  ]}
                />
                <p>
                  După introducerea credențialelor, apasă <InlineCode>Testează conexiunea</InlineCode>. Dacă totul e corect, vei vedea un mesaj verde de confirmare.
                </p>
                <Note type="warning">
                  Fără o conexiune validă cu Helpship, comenzile nu vor fi trimise la depozit. Comenzile rămân în statusul <InlineCode>queue</InlineCode> timp de 3 minute, după care sunt trimise automat.
                </Note>
                <Screenshot src="settings-helpship-success.png" alt="Mesaj de succes conectare Helpship" />
              </div>
            ),
          },
          {
            title: "Setarea TVA-ului și a ferestrei de deduplicare",
            content: (
              <div className="space-y-4 text-sm text-white/75 leading-relaxed">
                <p>
                  Tot în pagina Setări configurezi:
                </p>
                <Checklist
                  items={[
                    "Cota TVA (%) — aplicată automat la valoarea comenzilor",
                    "Fereastra de deduplicare comenzi (zile) — numărul de zile în care o comandă identică (același telefon + aceeași landing page) este considerată duplicat",
                  ]}
                />
                <Note type="tip">
                  Recomandăm o fereastră de deduplicare de 30 de zile pentru a preveni comenzile duble de la același client pe același produs.
                </Note>
              </div>
            ),
          },
        ],
      },
      {
        id: "setup-team",
        title: "1.3 Gestionarea Echipei",
        steps: [
          {
            title: "Roluri disponibile",
            content: (
              <div className="space-y-4 text-sm text-white/75 leading-relaxed">
                <p>
                  Mergi la <strong className="text-white">Administrare → Echipă</strong>. Poți invita membri ai echipei cu diferite niveluri de acces:
                </p>
                <div className="space-y-3 mt-2">
                  {[
                    { role: "Owner", color: "text-purple-300", desc: "Acces complet la toate funcționalitățile, inclusiv setări, facturare și ștergere date." },
                    { role: "Admin", color: "text-blue-300", desc: "Poate gestiona comenzi, produse, landing pages și echipă. Nu are acces la setările critice." },
                    { role: "Store Manager", color: "text-emerald-300", desc: "Poate vedea și gestiona comenzile. Acces limitat la configurații." },
                  ].map((r) => (
                    <div key={r.role} className="flex gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                      <div className="shrink-0 pt-0.5">
                        <span className={`text-sm font-semibold ${r.color}`}>{r.role}</span>
                      </div>
                      <p className="text-xs text-white/60">{r.desc}</p>
                    </div>
                  ))}
                </div>
                <Screenshot src="team-management.png" alt="Pagina Echipă — lista membrilor și roluri" />
              </div>
            ),
          },
          {
            title: "Adăugarea unui membru nou",
            content: (
              <div className="space-y-4 text-sm text-white/75 leading-relaxed">
                <p>Apasă <InlineCode>+ Adaugă membru</InlineCode> și completează:</p>
                <Checklist
                  items={[
                    "Nume și prenume",
                    "Adresă de email (va fi folosită pentru autentificare)",
                    "Rol — alege din Owner / Admin / Store Manager",
                  ]}
                />
                <p>
                  Membrul va primi un email cu instrucțiuni de activare a contului. Până la activare, statusul apare ca <InlineCode>inactiv</InlineCode>.
                </p>
                <Note type="tip">
                  Poți dezactiva temporar un cont din lista de membri fără a-l șterge — util când un angajat pleacă în concediu sau din firmă.
                </Note>
              </div>
            ),
          },
        ],
      },
    ],
  },

  // ── MODULE 2: Catalog ──────────────────────────────────────────────────────
  {
    id: "catalog",
    title: "Modul 2 — Catalog",
    shortTitle: "Catalog",
    icon: <Tag className="w-4 h-4" />,
    sections: [
      {
        id: "catalog-products",
        title: "2.1 Crearea Produselor",
        steps: [
          {
            title: "Ce este un produs în această aplicație?",
            content: (
              <div className="space-y-4 text-sm text-white/75 leading-relaxed">
                <p>
                  Un produs reprezintă un articol pe care îl vinzi. Acesta este asociat ulterior cu o sau mai multe landing pages, fiecare cu prețuri și configurații diferite.
                </p>
                <p>
                  Mergi la <strong className="text-white">Catalog → Produse</strong> și apasă <InlineCode>+ Produs nou</InlineCode>.
                </p>
                <Screenshot src="products-list.png" alt="Lista de produse cu statusuri" />
              </div>
            ),
          },
          {
            title: "Completarea fișei de produs",
            content: (
              <div className="space-y-4 text-sm text-white/75 leading-relaxed">
                <Checklist
                  items={[
                    "Nume produs — exact cum va apărea în comenzi și în Helpship",
                    "SKU — codul intern al produsului (trebuie să corespundă SKU-ului din Helpship)",
                    "Stoc disponibil — cantitatea curentă în depozit",
                    "Prag alertă stoc — sub câte bucăți să apară avertizarea de epuizare",
                    "Status — Activ (vânzări reale), Testing (comenzi de test), Inactiv",
                  ]}
                />
                <Note type="warning">
                  SKU-ul trebuie să fie identic cu cel din Helpship. O nepotrivire va cauza erori la sincronizarea comenzilor cu depozitul.
                </Note>
                <Screenshot src="product-form.png" alt="Formular creare produs — câmpuri completate" />
              </div>
            ),
          },
          {
            title: "Statusuri produs și comenzi de test",
            content: (
              <div className="space-y-4 text-sm text-white/75 leading-relaxed">
                <p>Fiecare produs are un status care controlează comportamentul comenzilor:</p>
                <div className="space-y-2 mt-2">
                  {[
                    { status: "Activ", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30", desc: "Comenzile sunt reale și ajung la Helpship." },
                    { status: "Testing", color: "bg-amber-500/20 text-amber-300 border-amber-500/30", desc: "Comenzile sunt marcate ca test — nu ajung la Helpship, dar se comportă identic altfel." },
                    { status: "Inactiv", color: "bg-white/10 text-white/50 border-white/10", desc: "Landing page-urile asociate nu mai acceptă comenzi noi." },
                  ].map((s) => (
                    <div key={s.status} className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                      <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold border ${s.color}`}>{s.status}</span>
                      <span className="text-xs text-white/60">{s.desc}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-3">
                  Când un produs este în <strong className="text-white">Testing</strong>, poți face comenzi de test prin widget. Acestea vor apărea în <strong className="text-white">Comenzi</strong> cu un badge special. Din lista de comenzi le poți <InlineCode>Promova</InlineCode> (devin reale) sau <InlineCode>Anula</InlineCode>.
                </p>
              </div>
            ),
          },
        ],
      },
      {
        id: "catalog-landing-pages",
        title: "2.2 Crearea Landing Pages",
        steps: [
          {
            title: "Ce este o landing page?",
            content: (
              <div className="space-y-4 text-sm text-white/75 leading-relaxed">
                <p>
                  O landing page în această aplicație nu este pagina web în sine — este <strong className="text-white">configurația formularului de comandă</strong> asociat unui produs. Ea definește prețurile, upsell-urile disponibile și aspectul widgetului.
                </p>
                <p>
                  Poți crea mai multe landing pages pentru același produs — de exemplu, una pentru campanie de Black Friday cu alt preț, și alta cu prețul standard.
                </p>
                <Screenshot src="landing-pages-list.png" alt="Lista landing pages" />
              </div>
            ),
          },
          {
            title: "Configurarea unei landing page",
            content: (
              <div className="space-y-4 text-sm text-white/75 leading-relaxed">
                <p>Mergi la <strong className="text-white">Catalog → Landing Pages</strong> și apasă <InlineCode>+ Landing page nouă</InlineCode>.</p>
                <Checklist
                  items={[
                    "Selectează magazinul căruia îi aparține",
                    "Selectează produsul de bază",
                    "Definește nivelurile de preț (tiers) — ex: 1 buc / 2 buc / 3 buc cu prețuri diferite",
                    "Alege varianta de formular — simplu sau extins (cu câmp adresă detaliat)",
                    "Activează sau dezactivează câmpul de adresă",
                  ]}
                />
                <Screenshot src="landing-page-form.png" alt="Formular creare landing page — configurare prețuri" />
                <Note type="tip">
                  Tier-urile de preț sunt afișate ca opțiuni în widget — clientul vede toate variantele și alege. Cel mai popular produs la 3 bucăți cu reducere convertește de obicei mai bine.
                </Note>
              </div>
            ),
          },
          {
            title: "Adăugarea Upsell-urilor",
            content: (
              <div className="space-y-4 text-sm text-white/75 leading-relaxed">
                <p>
                  Upsell-urile sunt produse suplimentare pe care clientul le poate adăuga la comandă. Există două tipuri:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                  <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                    <p className="text-sm font-semibold text-white mb-2">Pre-sale Upsells</p>
                    <p className="text-xs text-white/60">Afișate în formularul principal, înainte ca clientul să trimită comanda. Clientul le bifează direct în widget.</p>
                  </div>
                  <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                    <p className="text-sm font-semibold text-white mb-2">Post-sale Upsells</p>
                    <p className="text-xs text-white/60">Afișate după confirmarea comenzii, pe pagina de mulțumire. Clientul le poate adăuga la comanda deja plasată printr-un click.</p>
                  </div>
                </div>
                <p className="mt-3">
                  Pentru a adăuga upsells, intră în editarea unei landing page și găsești secțiunile dedicate în josul paginii.
                </p>
                <Screenshot src="upsells-config.png" alt="Secțiunea de configurare upsells în landing page" />
                <Note type="info">
                  Upsell-urile post-sale necesită un widget separat integrat pe <strong>pagina de mulțumire</strong>. Codul embed pentru acest widget se generează separat — vezi Modulul 3.2.
                </Note>
              </div>
            ),
          },
        ],
      },
    ],
  },

  // ── MODULE 3: Integrare pe site ────────────────────────────────────────────
  {
    id: "integration",
    title: "Modul 3 — Integrare pe site",
    shortTitle: "Integrare site",
    icon: <Code2 className="w-4 h-4" />,
    sections: [
      {
        id: "integration-embed",
        title: "3.1 Generarea și inserarea codului embed",
        steps: [
          {
            title: "Cum generezi codul iframe",
            content: (
              <div className="space-y-4 text-sm text-white/75 leading-relaxed">
                <p>
                  Mergi la <strong className="text-white">Catalog → Landing Pages</strong>. Găsește landing page-ul pentru care vrei codul și apasă butonul <InlineCode>{'<>'} Embed</InlineCode> (sau similar — iconița de cod).
                </p>
                <Screenshot src="embed-button.png" alt="Butonul de embed din lista landing pages" />
                <p>Vei vedea două lucruri:</p>
                <Checklist
                  items={[
                    "Script tag — se inserează o singură dată în <head> sau înainte de </body>",
                    "Div container — se inserează exact acolo unde vrei să apară formularul pe pagina ta",
                  ]}
                />
                <Screenshot src="embed-code.png" alt="Modal cu codul embed generat" />
              </div>
            ),
          },
          {
            title: "Inserarea codului pe site",
            content: (
              <div className="space-y-4 text-sm text-white/75 leading-relaxed">
                <p>
                  Codul se inserează în platforma pe care este construit site-ul tău. Principiul este același indiferent de platformă:
                </p>
                <ol className="space-y-3 mt-2">
                  {[
                    { title: "WordPress / Elementor / WPBakery", desc: "Adaugă un bloc HTML/Custom Code și lipește div-ul container. Script-ul merge în header prin Appearance → Theme Editor sau un plugin de tip \"Header Footer Code Manager\"." },
                    { title: "Webflow", desc: "Adaugă un element Embed în canvas și lipește div-ul. Script-ul merge în Project Settings → Custom Code → Footer Code." },
                    { title: "Shopify / alte platforme", desc: "Similar — bloc HTML pentru div, script în secțiunea de cod global a temei." },
                  ].map((p, i) => (
                    <li key={i} className="flex gap-3">
                      <StepNumber n={i + 1} />
                      <div>
                        <p className="font-semibold text-white/90">{p.title}</p>
                        <p className="text-white/55 text-xs mt-0.5">{p.desc}</p>
                      </div>
                    </li>
                  ))}
                </ol>
                <Note type="warning">
                  Script-ul <InlineCode>embed.js</InlineCode> trebuie să fie prezent pe pagină înainte de a se încărca div-ul container. Dacă script-ul lipsește, formularul nu va apărea.
                </Note>
              </div>
            ),
          },
          {
            title: "Verificarea integrării",
            content: (
              <div className="space-y-4 text-sm text-white/75 leading-relaxed">
                <p>După inserare, verifică că widgetul apare corect:</p>
                <Checklist
                  items={[
                    "Formularul se încarcă și afișează prețurile configurate",
                    "Culorile corespund cu cele setate în magazin",
                    "Câmpurile de tip telefon, nume, județ funcționează corect",
                    "Pe mobil, formularul este responsive și butoanele sunt apăsabile",
                  ]}
                />
                <Note type="tip">
                  Înainte de a lansa în producție, pune produsul în status <strong>Testing</strong> și fă o comandă de test completă pentru a verifica că ajunge în aplicație și în Helpship.
                </Note>
              </div>
            ),
          },
        ],
      },
      {
        id: "integration-postsale",
        title: "3.2 Integrarea widgetului post-sale (pagina de mulțumire)",
        steps: [
          {
            title: "Ce este widgetul post-sale?",
            content: (
              <div className="space-y-4 text-sm text-white/75 leading-relaxed">
                <p>
                  Widgetul post-sale apare pe <strong className="text-white">pagina de mulțumire</strong> — pagina la care ajunge clientul imediat după ce a plasat comanda. Acolo poți afișa un upsell de tip <em>„Adaugă și tu la comandă"</em> pe care clientul îl poate accepta cu un singur click, fără să completeze din nou datele.
                </p>
                <Screenshot src="postsale-widget-preview.png" alt="Exemplu widget post-sale pe pagina de mulțumire" />
                <Note type="info">
                  Widgetul post-sale funcționează pe baza <InlineCode>orderId</InlineCode> transmis automat prin URL sau postMessage din widgetul principal. Nu necesită configurare suplimentară din partea clientului.
                </Note>
              </div>
            ),
          },
          {
            title: "Generarea codului embed post-sale",
            content: (
              <div className="space-y-4 text-sm text-white/75 leading-relaxed">
                <p>
                  Codul pentru widgetul post-sale se generează din aceeași secțiune de embed a landing page-ului, dar este un cod <strong className="text-white">diferit</strong> față de cel principal. Caută tab-ul sau butonul <InlineCode>Post-sale embed</InlineCode>.
                </p>
                <Screenshot src="postsale-embed-code.png" alt="Codul embed pentru widgetul post-sale" />
                <p>Inserează codul generat pe pagina ta de mulțumire — aceeași metodă ca la widgetul principal.</p>
                <Checklist
                  items={[
                    "Script-ul thank-you-embed.js se adaugă în <head> al paginii de mulțumire",
                    "Div-ul container se plasează acolo unde vrei să apară upsell-ul",
                    "Upsell-urile post-sale configurate în landing page sunt afișate automat",
                  ]}
                />
              </div>
            ),
          },
          {
            title: "Testarea fluxului complet",
            content: (
              <div className="space-y-4 text-sm text-white/75 leading-relaxed">
                <p>Testează întreg fluxul:</p>
                <ol className="space-y-3 mt-2">
                  {[
                    "Completează formularul principal → comanda apare în aplicație",
                    "Ești redirecționat pe pagina de mulțumire → widgetul post-sale se încarcă",
                    "Acceptă upsell-ul → comanda din aplicație se actualizează cu produsul adăugat",
                    "Verifică în Comenzi că ambele produse (principal + upsell) sunt în comandă",
                  ].map((s, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <StepNumber n={i + 1} />
                      <span>{s}</span>
                    </li>
                  ))}
                </ol>
                <Note type="tip">
                  Ține produsul în status <strong>Testing</strong> pe durata testelor. Poți anula comenzile de test din lista de comenzi după verificare.
                </Note>
              </div>
            ),
          },
        ],
      },
    ],
  },

  // ── MODULE 4: Operațiuni zilnice ───────────────────────────────────────────
  {
    id: "operations",
    title: "Modul 4 — Operațiuni zilnice",
    shortTitle: "Operațiuni",
    icon: <ShoppingCart className="w-4 h-4" />,
    sections: [
      {
        id: "operations-orders",
        title: "4.1 Gestionarea Comenzilor",
        steps: [
          {
            title: "Ciclul de viață al unei comenzi",
            content: (
              <div className="space-y-4 text-sm text-white/75 leading-relaxed">
                <p>O comandă trece prin mai multe statusuri de la plasare până la expediere:</p>
                <div className="space-y-2 mt-2">
                  {[
                    { status: "Queue", color: "bg-purple-500/20 text-purple-300 border-purple-500/30", desc: "Comanda tocmai a intrat. Rămâne în queue 3 minute (fereastră post-sale pentru upsells) înainte de a fi trimisă la Helpship." },
                    { status: "Pending", color: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30", desc: "Comanda a fost trimisă la Helpship și așteaptă confirmare din depozit." },
                    { status: "Confirmed", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30", desc: "Comanda este confirmată și în curs de procesare la depozit." },
                    { status: "Cancelled", color: "bg-red-500/20 text-red-300 border-red-500/30", desc: "Comanda a fost anulată manual sau din Helpship." },
                    { status: "Hold", color: "bg-orange-500/20 text-orange-300 border-orange-500/30", desc: "Comanda este pusă în așteptare temporară (de obicei după un apel la client)." },
                  ].map((s) => (
                    <div key={s.status} className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                      <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold border ${s.color}`}>{s.status}</span>
                      <span className="text-xs text-white/60">{s.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            ),
          },
          {
            title: "Acțiuni disponibile pe o comandă",
            content: (
              <div className="space-y-4 text-sm text-white/75 leading-relaxed">
                <Screenshot src="orders-list.png" alt="Lista comenzi cu acțiuni disponibile" />
                <p>Din lista de comenzi sau din detaliul unei comenzi poți:</p>
                <Checklist
                  items={[
                    "Confirma comanda — trimite manual la Helpship dacă nu a ajuns automat",
                    "Pune pe Hold — oprește procesarea temporar",
                    "Anula comanda — comanda nu mai ajunge la depozit",
                    "Adăuga o notiță internă — vizibilă doar echipei, nu clientului",
                    "Loga un apel — marchezi că ai sunat clientul (util pentru follow-up)",
                    "Detecta duplicate — sistemul alertează automat dacă numărul de telefon a mai comandat recent",
                  ]}
                />
                <Note type="info">
                  Sincronizarea cu Helpship se face automat. Dacă o comandă nu ajunge în Helpship în 5 minute, verifică credențialele API din Setări.
                </Note>
              </div>
            ),
          },
        ],
      },
      {
        id: "operations-partials",
        title: "4.2 Comenzile Parțiale",
        steps: [
          {
            title: "Ce sunt comenzile parțiale?",
            content: (
              <div className="space-y-4 text-sm text-white/75 leading-relaxed">
                <p>
                  O comandă parțială se creează automat când un vizitator <strong className="text-white">introduce numărul de telefon</strong> în widget și pierde focusul pe câmp (sau închide pagina), chiar dacă nu a apăsat butonul de comandă.
                </p>
                <p>
                  Aceasta captează lead-uri pierdute — clienți care au arătat intenție de cumpărare dar nu au finalizat.
                </p>
                <Screenshot src="partials-list.png" alt="Lista comenzilor parțiale" />
                <Checklist
                  items={[
                    "Telefon client capturat",
                    "Produsul și landing page-ul de pe care a venit",
                    "Timestamp — când a arătat intenția",
                    "Procentaj completare formular",
                  ]}
                />
              </div>
            ),
          },
          {
            title: "Gestionarea comenzilor parțiale",
            content: (
              <div className="space-y-4 text-sm text-white/75 leading-relaxed">
                <p>Mergi la <strong className="text-white">General → Parțiale</strong>. Poți filtra după status și căuta după telefon sau adresă.</p>
                <div className="space-y-2 mt-2">
                  {[
                    { status: "Pending", desc: "Lead nou — nu a fost contactat încă." },
                    { status: "Accepted", desc: "Clientul a fost contactat și a acceptat — urmează să plaseze comanda sau a plasat-o deja." },
                    { status: "Refused", desc: "Clientul a refuzat explicit." },
                    { status: "Call Later", desc: "Clientul a cerut să fie sunat mai târziu." },
                  ].map((s) => (
                    <div key={s.status} className="flex items-start gap-3 p-2 text-xs">
                      <InlineCode>{s.status}</InlineCode>
                      <span className="text-white/60">{s.desc}</span>
                    </div>
                  ))}
                </div>
                <Note type="tip">
                  Echipa de vânzări poate folosi secțiunea Parțiale ca listă de apeluri de urmărit zilnic.
                </Note>
              </div>
            ),
          },
        ],
      },
      {
        id: "operations-customers",
        title: "4.3 Clienți",
        steps: [
          {
            title: "Vizualizarea profilului clientului",
            content: (
              <div className="space-y-4 text-sm text-white/75 leading-relaxed">
                <p>
                  Mergi la <strong className="text-white">General → Clienți</strong>. Fiecare client are un profil automat creat din comenzile plasate.
                </p>
                <Screenshot src="customers-list.png" alt="Lista clienți cu valoare totală și număr comenzi" />
                <Checklist
                  items={[
                    "Număr total de comenzi",
                    "Valoare totală cumulată (LTV — Lifetime Value)",
                    "Data primei și ultimei comenzi",
                    "Istoricul complet al comenzilor",
                  ]}
                />
                <Note type="tip">
                  Folosește lista de clienți pentru a identifica cumpărătorii repeți și a le oferi beneficii speciale sau pentru retargeting manual.
                </Note>
              </div>
            ),
          },
        ],
      },
    ],
  },

  // ── MODULE 5: Marketing & Raportare ───────────────────────────────────────
  {
    id: "marketing",
    title: "Modul 5 — Marketing & Raportare",
    shortTitle: "Marketing",
    icon: <BarChart2 className="w-4 h-4" />,
    sections: [
      {
        id: "marketing-dashboard",
        title: "5.1 Dashboard",
        steps: [
          {
            title: "Urmărirea performanței",
            content: (
              <div className="space-y-4 text-sm text-white/75 leading-relaxed">
                <p>
                  Mergi la <strong className="text-white">Dashboard</strong> pentru o privire de ansamblu rapidă asupra afacerii. Datele pot fi filtrate pe perioade predefinite sau intervale personalizate.
                </p>
                <Screenshot src="dashboard-overview.png" alt="Dashboard principal cu metrici cheie" />
                <Checklist
                  items={[
                    "Venit total în perioada selectată",
                    "Număr comenzi și valoare medie comandă",
                    "Defalcare venituri pe produse",
                    "Analiza upsells — câți clienți au adăugat upsells și valoarea generată",
                    "Analiză stoc — produse aproape de epuizare",
                  ]}
                />
              </div>
            ),
          },
        ],
      },
      {
        id: "marketing-roas",
        title: "5.2 ROAS — Calculatorul de rentabilitate",
        steps: [
          {
            title: "Ce este ROAS și cum se calculează?",
            content: (
              <div className="space-y-4 text-sm text-white/75 leading-relaxed">
                <p>
                  ROAS (Return on Ad Spend) măsoară câți lei generezi pentru fiecare leu cheltuit pe publicitate. Formula este simplă: <strong className="text-white">Venit ÷ Cheltuieli publicitare</strong>.
                </p>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  {[
                    { label: "POOR", color: "text-red-300", desc: "Sub 2x — pierzi bani" },
                    { label: "MODERATE", color: "text-orange-300", desc: "2x–3x — punct de echilibru" },
                    { label: "TARGET", color: "text-yellow-300", desc: "3x–5x — profitabil" },
                    { label: "MONSTER", color: "text-emerald-300", desc: "Peste 5x — excelent" },
                  ].map((r) => (
                    <div key={r.label} className="p-3 rounded-lg bg-white/5 border border-white/10 text-center">
                      <p className={`font-bold text-sm ${r.color}`}>{r.label}</p>
                      <p className="text-xs text-white/50 mt-1">{r.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            ),
          },
          {
            title: "Importul datelor de cheltuieli",
            content: (
              <div className="space-y-4 text-sm text-white/75 leading-relaxed">
                <p>
                  Mergi la <strong className="text-white">Marketing → ROAS</strong>. Secțiunea are două tab-uri:
                </p>
                <div className="space-y-3 mt-2">
                  <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                    <p className="text-sm font-semibold text-white mb-2">Upload CSV Meta Ads</p>
                    <p className="text-xs text-white/60">Exportă raportul de cheltuieli din Meta Ads Manager (nivel campanie, cu coloana Amount Spent) și încarcă-l aici. Aplicația mapează automat cheltuielile pe zile.</p>
                  </div>
                  <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                    <p className="text-sm font-semibold text-white mb-2">Rapoarte lunare</p>
                    <p className="text-xs text-white/60">Vezi ROAS per produs pe luni. Filtrează după produs sau perioadă pentru a analiza tendințele.</p>
                  </div>
                </div>
                <Screenshot src="roas-report.png" alt="Raport ROAS lunar pe produse" />
              </div>
            ),
          },
        ],
      },
    ],
  },

  // ── MODULE 6: Returnări ────────────────────────────────────────────────────
  {
    id: "refunds",
    title: "Modul 6 — Returnări",
    shortTitle: "Returnări",
    icon: <RotateCcw className="w-4 h-4" />,
    sections: [
      {
        id: "refunds-main",
        title: "6.1 Gestionarea Returnărilor",
        steps: [
          {
            title: "Fluxul de returnare",
            content: (
              <div className="space-y-4 text-sm text-white/75 leading-relaxed">
                <p>
                  Mergi la <strong className="text-white">Administrare → Returnări</strong>. Fiecare cerere de returnare devine un ticket cu status propriu.
                </p>
                <Screenshot src="refunds-list.png" alt="Lista de returnări cu statusuri" />
                <div className="space-y-2 mt-2">
                  {[
                    { status: "New", color: "bg-blue-500/20 text-blue-300 border-blue-500/30", desc: "Cerere nouă, nepreluată." },
                    { status: "In Progress", color: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30", desc: "Cineva din echipă prelucrează returnarea." },
                    { status: "Completed", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30", desc: "Returnarea a fost procesată, banii returnați." },
                  ].map((s) => (
                    <div key={s.status} className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                      <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold border ${s.color}`}>{s.status}</span>
                      <span className="text-xs text-white/60">{s.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            ),
          },
          {
            title: "Crearea unui ticket de returnare",
            content: (
              <div className="space-y-4 text-sm text-white/75 leading-relaxed">
                <p>Apasă <InlineCode>+ Returnare nouă</InlineCode> și completează:</p>
                <Checklist
                  items={[
                    "Numărul comenzii originale",
                    "Datele clientului (nume, email, telefon)",
                    "Motivul returnării",
                    "Produsele returnate și cantitățile",
                    "Suma de returnat",
                  ]}
                />
                <Note type="tip">
                  Poți căuta o returnare după numele clientului, email sau număr de telefon pentru a găsi rapid istoricul.
                </Note>
              </div>
            ),
          },
        ],
      },
    ],
  },

  // ── MODULE 7: Tools ────────────────────────────────────────────────────────
  {
    id: "tools",
    title: "Modul 7 — Tools",
    shortTitle: "Tools",
    icon: <Wrench className="w-4 h-4" />,
    sections: [
      {
        id: "tools-webp",
        title: "7.1 Convertor & Compresor WebP",
        steps: [
          {
            title: "De ce WebP?",
            content: (
              <div className="space-y-4 text-sm text-white/75 leading-relaxed">
                <p>
                  Formatul WebP produce imagini cu <strong className="text-white">30–80% mai mici</strong> față de JPG sau PNG, la aceeași calitate vizuală. Imaginile mai mici înseamnă landing pages mai rapide, care convertesc mai bine.
                </p>
                <p>
                  Mergi la <strong className="text-white">Tools → Convertor WebP</strong>.
                </p>
                <Screenshot src="webp-converter.png" alt="Interfața convertorului WebP" />
              </div>
            ),
          },
          {
            title: "Utilizarea convertorului",
            content: (
              <div className="space-y-4 text-sm text-white/75 leading-relaxed">
                <p>Poți converti imagini în trei moduri:</p>
                <Checklist
                  items={[
                    "Upload fișier — trage imaginile direct pe zona de upload (acceptă JPG, JPEG, PNG, WebP)",
                    "URL extern — lipești URL-ul unei imagini de pe internet și serverul o descarcă și convertește",
                    "Setezi calitatea (1–100) și efortul de compresie (0–6) după nevoie",
                  ]}
                />
                <Note type="tip">
                  Calitate 75–80 și efort 4 este un bun echilibru pentru imagini de landing page. Scade calitatea sub 70 doar pentru imagini de fundal sau decorative.
                </Note>
                <p>
                  Fișierul convertit se descarcă automat în format <InlineCode>.webp</InlineCode> cu sufixul <InlineCode>_q{"{calitate}"}</InlineCode> în nume.
                </p>
              </div>
            ),
          },
        ],
      },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Main page component
// ─────────────────────────────────────────────────────────────────────────────

export default function TutorialPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeModuleId, setActiveModuleId] = useState(modules[0].id);
  const [activeSectionId, setActiveSectionId] = useState(modules[0].sections[0].id);
  const [expandedSteps, setExpandedSteps] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);

  const activeRole = (session?.user as any)?.activeRole;
  const isSuperadminOrg = (session?.user as any)?.isSuperadminOrg;

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user || activeRole !== "owner" || !isSuperadminOrg) {
      router.replace("/admin/orders");
    }
  }, [status, session, activeRole, isSuperadminOrg, router]);

  // Search filtering
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase();
    const results: { moduleId: string; moduleTitle: string; sectionId: string; sectionTitle: string; stepTitle: string }[] = [];
    for (const mod of modules) {
      for (const sec of mod.sections) {
        for (const step of sec.steps) {
          if (
            step.title.toLowerCase().includes(q) ||
            sec.title.toLowerCase().includes(q) ||
            mod.title.toLowerCase().includes(q)
          ) {
            results.push({
              moduleId: mod.id,
              moduleTitle: mod.shortTitle,
              sectionId: sec.id,
              sectionTitle: sec.title,
              stepTitle: step.title,
            });
          }
        }
      }
    }
    return results;
  }, [searchQuery]);

  const activeModule = modules.find((m) => m.id === activeModuleId) ?? modules[0];
  const activeSection = activeModule.sections.find((s) => s.id === activeSectionId) ?? activeModule.sections[0];

  const toggleStep = (key: string) => {
    setExpandedSteps((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const navigateTo = (moduleId: string, sectionId: string) => {
    setActiveModuleId(moduleId);
    setActiveSectionId(sectionId);
    setSearchQuery("");
    contentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (status === "loading" || !session?.user) return null;

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-[#0f0f14]">
      {/* ── Sidebar nav ─────────────────────────────────────────────────── */}
      <aside
        className={`${
          sidebarOpen ? "w-72" : "w-0"
        } transition-all duration-200 overflow-hidden shrink-0 border-r border-white/8 bg-[#111118] flex flex-col`}
      >
        {/* Search */}
        <div className="p-4 border-b border-white/8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="text"
              placeholder="Caută în tutorial..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/25 focus:bg-white/8"
            />
          </div>
        </div>

        {/* Search results */}
        {searchResults !== null ? (
          <div className="flex-1 overflow-y-auto p-3">
            {searchResults.length === 0 ? (
              <p className="text-white/35 text-xs text-center mt-6">Niciun rezultat</p>
            ) : (
              <div className="space-y-1">
                {searchResults.map((r, i) => (
                  <button
                    key={i}
                    onClick={() => navigateTo(r.moduleId, r.sectionId)}
                    className="w-full text-left rounded-lg px-3 py-2.5 hover:bg-white/8 transition-colors"
                  >
                    <p className="text-xs text-white/40 mb-0.5">{r.moduleTitle} → {r.sectionTitle}</p>
                    <p className="text-sm text-white/80">{r.stepTitle}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Module / section navigation */
          <nav className="flex-1 overflow-y-auto p-3 space-y-1">
            {modules.map((mod) => {
              const isActiveMod = mod.id === activeModuleId;
              return (
                <div key={mod.id}>
                  <button
                    onClick={() => {
                      setActiveModuleId(mod.id);
                      setActiveSectionId(mod.sections[0].id);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-sm font-medium transition-colors ${
                      isActiveMod ? "bg-indigo-500/15 text-indigo-300" : "text-white/55 hover:bg-white/6 hover:text-white/80"
                    }`}
                  >
                    <span className={isActiveMod ? "text-indigo-400" : "text-white/30"}>{mod.icon}</span>
                    <span className="flex-1 truncate">{mod.shortTitle}</span>
                    {mod.badge && (
                      <span className="px-1.5 py-0.5 bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[10px] font-semibold rounded-full">
                        {mod.badge}
                      </span>
                    )}
                    <ChevronRight className={`w-3 h-3 transition-transform ${isActiveMod ? "rotate-90 text-indigo-400" : "text-white/20"}`} />
                  </button>

                  {isActiveMod && (
                    <div className="ml-3 mt-1 space-y-0.5 border-l border-white/8 pl-3">
                      {mod.sections.map((sec) => {
                        const isActiveSec = sec.id === activeSectionId;
                        return (
                          <button
                            key={sec.id}
                            onClick={() => navigateTo(mod.id, sec.id)}
                            className={`w-full text-left px-2 py-1.5 rounded-md text-xs transition-colors ${
                              isActiveSec
                                ? "text-white bg-white/8"
                                : "text-white/45 hover:text-white/70 hover:bg-white/5"
                            }`}
                          >
                            {sec.title}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-white/8">
          <p className="text-white/25 text-xs text-center">
            {modules.reduce((acc, m) => acc + m.sections.reduce((a, s) => a + s.steps.length, 0), 0)} lecții · v1.0
          </p>
        </div>
      </aside>

      {/* ── Main content ────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {/* Top bar */}
        <header className="shrink-0 border-b border-white/8 px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="p-1.5 rounded-lg hover:bg-white/8 text-white/40 hover:text-white/70 transition-colors"
            title={sidebarOpen ? "Închide meniu" : "Deschide meniu"}
          >
            <BookOpen className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2 text-sm text-white/40">
            <span>{activeModule.shortTitle}</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-white/70">{activeSection.title}</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="px-2 py-0.5 bg-amber-500/15 border border-amber-500/40 text-amber-400 text-xs font-semibold rounded-full uppercase tracking-wide">
              Beta
            </span>
          </div>
        </header>

        {/* Content area */}
        <div ref={contentRef} className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-6 py-8">
            {/* Section header */}
            <h1 className="text-2xl font-bold text-white mb-6">{activeSection.title}</h1>

            {/* Steps */}
            <div className="space-y-4">
              {activeSection.steps.map((step, idx) => {
                const key = `${activeSection.id}-${idx}`;
                const isExpanded = expandedSteps[key] !== false; // default open
                return (
                  <div
                    key={key}
                    className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden"
                  >
                    <button
                      onClick={() => toggleStep(key)}
                      className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-white/5 transition-colors"
                    >
                      <Play className={`w-3.5 h-3.5 shrink-0 transition-colors ${isExpanded ? "text-indigo-400" : "text-white/25"}`} />
                      <span className={`flex-1 font-semibold text-sm ${isExpanded ? "text-white" : "text-white/60"}`}>
                        {step.title}
                      </span>
                      <ChevronDown className={`w-4 h-4 text-white/30 transition-transform ${isExpanded ? "" : "-rotate-90"}`} />
                    </button>
                    {isExpanded && (
                      <div className="px-5 pb-5 border-t border-white/6">
                        <div className="pt-4">{step.content}</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Section navigation */}
            <div className="flex items-center justify-between mt-10 pt-6 border-t border-white/8">
              {(() => {
                const allSections = modules.flatMap((m) =>
                  m.sections.map((s) => ({ moduleId: m.id, section: s }))
                );
                const currentIdx = allSections.findIndex((s) => s.section.id === activeSectionId);
                const prev = currentIdx > 0 ? allSections[currentIdx - 1] : null;
                const next = currentIdx < allSections.length - 1 ? allSections[currentIdx + 1] : null;
                return (
                  <>
                    {prev ? (
                      <button
                        onClick={() => navigateTo(prev.moduleId, prev.section.id)}
                        className="flex items-center gap-2 text-sm text-white/45 hover:text-white/75 transition-colors"
                      >
                        <ChevronRight className="w-4 h-4 rotate-180" />
                        <span>{prev.section.title}</span>
                      </button>
                    ) : <div />}
                    {next ? (
                      <button
                        onClick={() => navigateTo(next.moduleId, next.section.id)}
                        className="flex items-center gap-2 text-sm text-white/45 hover:text-white/75 transition-colors"
                      >
                        <span>{next.section.title}</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    ) : <div />}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
