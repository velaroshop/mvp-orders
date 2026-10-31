// Catalog used by the page editor: for each block type, its label, defaults and the fields shown in the settings panel.
// Saved blocks are validated by normalizeBlocks() (src/lib/page-blocks.ts), so this only drives the editing UI.

export type PageKind = "landing" | "thank_you";

type FieldBase = { key: string; label: string; help?: string };

export type FieldDef =
  | (FieldBase & { kind: "text" | "textarea" | "url"; placeholder?: string; rows?: number })
  // Image: can be uploaded (resized to maxWidth) or pasted as a URL; dims = keys that receive the uploaded size
  // minWidth: below this width the uploaded image is flagged as possibly blurry on a phone (it is never enlarged)
  | (FieldBase & { kind: "image"; maxWidth?: number; minWidth?: number; dims?: { width?: string; height?: string } })
  | (FieldBase & { kind: "color" })
  // keepRatioWith: another number field of the same block that follows this one proportionally (width <-> height)
  | (FieldBase & { kind: "number"; min?: number; max?: number; keepRatioWith?: string })
  | (FieldBase & { kind: "toggle" })
  | (FieldBase & { kind: "select"; options: { value: string; label: string }[] })
  | (FieldBase & { kind: "strings"; addLabel: string })
  | (FieldBase & { kind: "items"; itemLabel: string; addLabel: string; fields: FieldDef[]; newItem: () => Record<string, unknown> });

export type BlockDef = {
  type: string;
  label: string;
  icon: string;
  description: string;
  /** Explanation shown above the settings (optionally with a link to where the real setting lives) */
  note?: { text: string; href?: string; linkLabel?: string };
  kinds: PageKind[];
  create: () => Record<string, unknown>;
  fields: FieldDef[];
};

const sizeOptions = [
  { value: "sm", label: "Mic" },
  { value: "base", label: "Normal" },
  { value: "lg", label: "Mare" },
  { value: "xl", label: "Foarte mare" },
  { value: "2xl", label: "Titlu" },
];

const ALL: PageKind[] = ["landing", "thank_you"];
const LANDING: PageKind[] = ["landing"];
const THANK_YOU: PageKind[] = ["thank_you"];

export const BLOCK_DEFS: BlockDef[] = [
  {
    type: "topbar",
    label: "Bară de sus",
    icon: "▔",
    description: "Bandă îngustă, deasupra paginii",
    kinds: ALL,
    create: () => ({ type: "topbar", text: "Plată la livrare · Livrare 1-3 zile", bg: "#202020", color: "#ffffff" }),
    fields: [
      { kind: "text", key: "text", label: "Text" },
      { kind: "color", key: "bg", label: "Fundal" },
      { kind: "color", key: "color", label: "Culoare text" },
    ],
  },
  {
    type: "image",
    label: "Imagine",
    icon: "🖼",
    description: "O imagine pe toată lățimea",
    kinds: ALL,
    create: () => ({ type: "image", src: "", alt: "", radius: 0, inset: 0 }),
    fields: [
      { kind: "image", key: "src", label: "Imagine", maxWidth: 800, minWidth: 500, dims: { width: "width", height: "height" } },
      { kind: "text", key: "alt", label: "Text alternativ", help: "Descrie imaginea (accesibilitate)" },
      {
        kind: "number",
        key: "width",
        label: "Lățime (px)",
        min: 1,
        max: 10000,
        keepRatioWith: "height",
        help: "Dimensiunea reală a fișierului: se completează singură la încărcare. Doar rezervă spațiul, imaginea se afișează pe toată lățimea",
      },
      { kind: "number", key: "height", label: "Înălțime (px)", min: 1, max: 10000, keepRatioWith: "width", help: "Se ajustează singură când schimbi lățimea (păstrează proporțiile)" },
      { kind: "number", key: "radius", label: "Rotunjirea colțurilor (px)", min: 0, max: 48, help: "0 = colțuri drepte. Se vede doar dacă imaginea are fundal diferit de pagină" },
      { kind: "number", key: "inset", label: "Margini laterale (px)", min: 0, max: 32, help: "0 = imaginea umple tot ecranul pe lățime" },
      { kind: "url", key: "href", label: "Link la apăsare (opțional)" },
    ],
  },
  {
    type: "text",
    label: "Text",
    icon: "T",
    description: "Titlu sau paragraf",
    kinds: ALL,
    create: () => ({ type: "text", text: "Text nou", align: "center", size: "base", color: "#18181b", bold: false }),
    fields: [
      { kind: "textarea", key: "text", label: "Text", rows: 4, help: "**îngroșat** · rând nou cu Enter" },
      {
        kind: "select",
        key: "align",
        label: "Aliniere",
        options: [
          { value: "left", label: "Stânga" },
          { value: "center", label: "Centru" },
          { value: "right", label: "Dreapta" },
        ],
      },
      { kind: "select", key: "size", label: "Mărime", options: sizeOptions },
      { kind: "color", key: "color", label: "Culoare" },
      { kind: "toggle", key: "bold", label: "Îngroșat" },
    ],
  },
  {
    type: "list",
    label: "Listă",
    icon: "☰",
    description: "Beneficii, puncte cu bife",
    kinds: ALL,
    create: () => ({ type: "list", items: ["Primul punct", "Al doilea punct"], icon: "check", iconColor: "#16a34a", color: "#18181b", size: "base" }),
    fields: [
      { kind: "strings", key: "items", label: "Puncte", addLabel: "Adaugă punct" },
      {
        kind: "select",
        key: "icon",
        label: "Iconiță",
        options: [
          { value: "check", label: "✓ Bifă" },
          { value: "dot", label: "• Punct" },
          { value: "star", label: "★ Stea" },
        ],
      },
      { kind: "color", key: "iconColor", label: "Culoare iconiță" },
      { kind: "color", key: "color", label: "Culoare text" },
      { kind: "select", key: "size", label: "Mărime", options: sizeOptions },
    ],
  },
  {
    type: "button",
    label: "Buton",
    icon: "▭",
    description: "Buton cu link sau ancoră",
    kinds: ALL,
    create: () => ({ type: "button", text: "Comandă acum", href: "#comanda", bg: "#16a34a", color: "#ffffff" }),
    fields: [
      { kind: "text", key: "text", label: "Text buton" },
      { kind: "url", key: "href", label: "Link", help: "#comanda duce la formular" },
      { kind: "color", key: "bg", label: "Fundal" },
      { kind: "color", key: "color", label: "Culoare text" },
    ],
  },
  {
    type: "sticky_footer",
    label: "Buton fix jos",
    icon: "⬓",
    description: "Rămâne lipit jos pe ecran",
    kinds: LANDING,
    create: () => ({ type: "sticky_footer", text: "COMANDĂ ACUM", href: "#comanda", bg: "#0bba71", color: "#ffffff" }),
    fields: [
      { kind: "text", key: "text", label: "Text buton" },
      { kind: "url", key: "href", label: "Link", help: "#comanda duce la formular" },
      { kind: "color", key: "bg", label: "Fundal" },
      { kind: "color", key: "color", label: "Culoare text" },
    ],
  },
  {
    type: "reviews",
    label: "Recenzii",
    icon: "💬",
    description: "Cărți cu părerile clienților",
    kinds: ALL,
    create: () => ({ type: "reviews", title: "Ce spun clienții", accent: "#f59e0b", showRating: true, items: [{ name: "Nume", text: "Părere", rating: 5, verified: false }] }),
    fields: [
      { kind: "text", key: "title", label: "Titlu (opțional)" },
      { kind: "toggle", key: "showRating", label: "Arată stelele" },
      { kind: "color", key: "accent", label: "Culoare stele" },
      {
        kind: "items",
        key: "items",
        label: "Recenzii",
        itemLabel: "Recenzia",
        addLabel: "Adaugă recenzie",
        newItem: () => ({ name: "", text: "", rating: 5, verified: false }),
        fields: [
          { kind: "text", key: "name", label: "Nume" },
          { kind: "textarea", key: "text", label: "Text", rows: 3 },
          { kind: "number", key: "rating", label: "Stele (1-5)", min: 1, max: 5 },
          { kind: "image", key: "avatar", label: "Poză (opțional)", maxWidth: 200 },
          { kind: "toggle", key: "verified", label: "Arată „Client verificat”", help: "Doar dacă recenzia chiar e verificată" },
        ],
      },
    ],
  },
  {
    type: "faq",
    label: "Întrebări frecvente",
    icon: "❓",
    description: "Acordeon de întrebări și răspunsuri",
    kinds: ALL,
    create: () => ({ type: "faq", title: "Întrebări frecvente", openFirst: false, accent: "#18181b", items: [{ q: "Întrebare?", a: "Răspuns." }] }),
    fields: [
      { kind: "text", key: "title", label: "Titlu (opțional)" },
      { kind: "toggle", key: "openFirst", label: "Prima întrebare deschisă" },
      { kind: "color", key: "accent", label: "Culoare semn +" },
      {
        kind: "items",
        key: "items",
        label: "Întrebări",
        itemLabel: "Întrebarea",
        addLabel: "Adaugă întrebare",
        newItem: () => ({ q: "", a: "" }),
        fields: [
          { kind: "text", key: "q", label: "Întrebare" },
          { kind: "textarea", key: "a", label: "Răspuns", rows: 4, help: "**îngroșat** · rând nou cu Enter" },
        ],
      },
    ],
  },
  {
    type: "gallery",
    label: "Galerie",
    icon: "🎞",
    description: "Poze cu derulare orizontală",
    kinds: ALL,
    create: () => ({ type: "gallery", images: [{ src: "", alt: "" }] }),
    fields: [
      {
        kind: "items",
        key: "images",
        label: "Poze",
        itemLabel: "Poza",
        addLabel: "Adaugă poză",
        newItem: () => ({ src: "", alt: "" }),
        fields: [
          { kind: "image", key: "src", label: "Imagine", maxWidth: 800, minWidth: 500 },
          { kind: "text", key: "alt", label: "Text alternativ" },
        ],
      },
    ],
  },
  {
    type: "before_after",
    label: "Înainte / După",
    icon: "⇄",
    description: "Două poze una lângă alta",
    kinds: ALL,
    create: () => ({ type: "before_after", before: { src: "", alt: "" }, after: { src: "", alt: "" }, beforeLabel: "Înainte", afterLabel: "După" }),
    fields: [
      { kind: "image", key: "before.src", label: "Poza „Înainte”", maxWidth: 800, minWidth: 500 },
      { kind: "text", key: "before.alt", label: "Text alternativ „Înainte”" },
      { kind: "image", key: "after.src", label: "Poza „După”", maxWidth: 800, minWidth: 500 },
      { kind: "text", key: "after.alt", label: "Text alternativ „După”" },
      { kind: "text", key: "beforeLabel", label: "Etichetă stânga" },
      { kind: "text", key: "afterLabel", label: "Etichetă dreapta" },
    ],
  },
  {
    type: "video",
    label: "Video",
    icon: "▶",
    description: "Fișier video (mp4)",
    kinds: ALL,
    create: () => ({ type: "video", src: "", poster: "", autoplay: false, radius: 0, inset: 0 }),
    fields: [
      { kind: "url", key: "src", label: "Adresa fișierului video (mp4)" },
      { kind: "image", key: "poster", label: "Imagine de copertă", maxWidth: 800, minWidth: 500 },
      { kind: "toggle", key: "autoplay", label: "Pornește singur, mut, în buclă" },
      { kind: "number", key: "radius", label: "Rotunjirea colțurilor (px)", min: 0, max: 48 },
      { kind: "number", key: "inset", label: "Margini laterale (px)", min: 0, max: 32 },
    ],
  },
  {
    type: "spacer",
    label: "Spațiu",
    icon: "↕",
    description: "Spațiu gol între blocuri",
    kinds: ALL,
    create: () => ({ type: "spacer", height: 24 }),
    fields: [{ kind: "number", key: "height", label: "Înălțime (px)", min: 4, max: 200 }],
  },
  {
    type: "html",
    label: "Cod HTML",
    icon: "</>",
    description: "HTML liber (doar pentru superadmin)",
    kinds: ALL,
    create: () => ({ type: "html", html: "<p style=\"text-align:center\">Text</p>" }),
    fields: [{ kind: "textarea", key: "html", label: "Cod HTML", rows: 8, help: "Atenție: codul rulează ca atare pe pagină" }],
  },
  {
    type: "form",
    label: "Formular de comandă",
    icon: "🛒",
    description: "Formularul V3, direct în pagină",
    kinds: LANDING,
    create: () => ({ type: "form", landingSlug: "", org: "", thankYouPath: "/thank-you" }),
    fields: [
      { kind: "text", key: "landingSlug", label: "Slug landing page (comanda)", help: "Landing page-ul din admin care dă ofertele, prețurile și produsul" },
      { kind: "text", key: "org", label: "Slug organizație (opțional)", placeholder: "reduxio-srl" },
      { kind: "text", key: "thankYouPath", label: "Pagina de mulțumire", help: "/thank-you = pagina proprie. Gol = pagina din Shopify" },
    ],
  },
  {
    type: "footer",
    label: "Footer",
    icon: "▁",
    description: "Logo, date firmă, linkuri legale, ANPC",
    kinds: ALL,
    create: () => ({
      type: "footer",
      logo: { src: "", alt: "", width: 120 },
      company: "Denumire firmă\nCUI · Adresă",
      links: [{ label: "Termeni și condiții", href: "/termeni" }],
      showAnpc: true,
      badges: [],
      copyright: "",
      bg: "#18181b",
      color: "#d4d4d8",
    }),
    fields: [
      { kind: "image", key: "logo.src", label: "Logo", maxWidth: 400, dims: { width: "logo.width" } },
      { kind: "text", key: "logo.alt", label: "Text alternativ logo" },
      { kind: "number", key: "logo.width", label: "Lățime logo (px)", min: 1, max: 10000 },
      { kind: "textarea", key: "company", label: "Date firmă și contact", rows: 4 },
      {
        kind: "items",
        key: "links",
        label: "Linkuri",
        itemLabel: "Linkul",
        addLabel: "Adaugă link",
        newItem: () => ({ label: "", href: "" }),
        fields: [
          { kind: "text", key: "label", label: "Text" },
          { kind: "url", key: "href", label: "Adresă" },
        ],
      },
      { kind: "toggle", key: "showAnpc", label: "Arată linkurile ANPC (SAL și SOL)" },
      {
        kind: "items",
        key: "badges",
        label: "Sigle (imagini)",
        itemLabel: "Sigla",
        addLabel: "Adaugă siglă",
        newItem: () => ({ src: "", alt: "", href: "" }),
        fields: [
          { kind: "image", key: "src", label: "Imagine", maxWidth: 400 },
          { kind: "text", key: "alt", label: "Text alternativ" },
          { kind: "url", key: "href", label: "Link (opțional)" },
        ],
      },
      { kind: "text", key: "copyright", label: "Text copyright" },
      { kind: "color", key: "bg", label: "Fundal" },
      { kind: "color", key: "color", label: "Culoare text" },
    ],
  },
  {
    type: "order_summary",
    label: "Rezumatul comenzii",
    icon: "🧾",
    description: "Produse, livrare și total",
    kinds: THANK_YOU,
    create: () => ({ type: "order_summary", heading: "Comanda ta", bg: "#13322c", color: "#e2e8f0", accent: "#22c55e" }),
    fields: [
      { kind: "text", key: "heading", label: "Titlu" },
      { kind: "color", key: "bg", label: "Fundal" },
      { kind: "color", key: "color", label: "Culoare text" },
      { kind: "color", key: "accent", label: "Culoare accent" },
    ],
  },
  {
    type: "postsale_offer",
    label: "Ofertă după comandă",
    icon: "🎁",
    description: "Oferta postsale cu numărătoare",
    kinds: THANK_YOU,
    create: () => ({
      type: "postsale_offer",
      phase: "offer",
      confirmedText: "COMANDA TA A FOST TRIMISĂ CU SUCCES!",
      headline: "AI DEBLOCAT O OFERTĂ SPECIALĂ!",
      timerLabel: "OFERTA EXPIRĂ ÎN",
      urgencyText: "Această ofertă dispare când părăsești pagina!",
      acceptText: "DA, ADAUGĂ LA COMANDĂ",
      declineText: "NU, MULȚUMESC",
      accent: "#22c55e",
    }),
    fields: [
      { kind: "text", key: "confirmedText", label: "Text confirmare" },
      { kind: "text", key: "headline", label: "Titlu ofertă" },
      { kind: "text", key: "timerLabel", label: "Text numărătoare" },
      { kind: "text", key: "urgencyText", label: "Text de sub preț", help: "Lasă gol ca să nu apară" },
      { kind: "text", key: "acceptText", label: "Buton acceptă" },
      { kind: "text", key: "declineText", label: "Buton refuză" },
      { kind: "color", key: "accent", label: "Culoare accent" },
    ],
  },
  {
    type: "store_cta",
    label: "Buton spre magazin",
    icon: "🛍",
    description: "Mesaj și buton din setările magazinului",
    note: {
      text: "Mesajul, textul butonului, culorile și adresa nu se editează aici, ci în setările magazinului (se aplică tuturor paginilor). Blocul apare doar când comutatorul „Buton spre homepage pe pagina de mulțumire” e pornit pe landing page-ul comenzii. Cât timp apare, mesajul lui înlocuiește blocurile setate cu „Butonul spre magazin nu e activ”.",
      href: "/admin/store",
      linkLabel: "Deschide setările magazinului",
    },
    kinds: THANK_YOU,
    create: () => ({ type: "store_cta", phase: "final", showWhen: "cta" }),
    fields: [],
  },
];

export const blockDef = (type: unknown): BlockDef | undefined => BLOCK_DEFS.find((d) => d.type === type);

/** Extra fields for the thank-you page: when a block is shown */
export const THANK_YOU_VISIBILITY_FIELDS: FieldDef[] = [
  {
    kind: "select",
    key: "phase",
    label: "Se afișează în faza",
    options: [
      { value: "", label: "Mereu" },
      { value: "offer", label: "Cât oferta e deschisă" },
      { value: "final", label: "După ce oferta s-a rezolvat" },
    ],
  },
  {
    kind: "select",
    key: "showWhen",
    label: "Se afișează dacă",
    help: "„Butonul spre magazin” = mesajul și butonul din setările magazinului, când comutatorul e pornit pe landing page-ul comenzii",
    options: [
      { value: "", label: "Oricând" },
      { value: "cta", label: "Butonul spre magazin e activ" },
      { value: "no_cta", label: "Butonul spre magazin nu e activ" },
    ],
  },
];

// ── helpers for "a.b" paths ────────────────────────────────────────────────────

export function getPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => (acc && typeof acc === "object" ? (acc as Record<string, unknown>)[key] : undefined), obj);
}

export function setPath<T extends Record<string, unknown>>(obj: T, path: string, value: unknown): T {
  const [head, ...rest] = path.split(".");
  if (rest.length === 0) return { ...obj, [head]: value };
  const child = (obj[head] && typeof obj[head] === "object" ? obj[head] : {}) as Record<string, unknown>;
  return { ...obj, [head]: setPath(child, rest.join("."), value) };
}
