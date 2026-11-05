// Catalog used by the page editor: for each block type, its label, defaults and the fields shown in the settings panel.
// Saved blocks are validated by normalizeBlocks() (src/lib/page-blocks.ts), so this only drives the editing UI.

export type PageKind = "landing" | "thank_you";

// showIf: the field is shown only while another field of the same block has this value
type FieldBase = { key: string; label: string; help?: string; showIf?: { key: string; equals: unknown } };

export type FieldDef =
  | (FieldBase & { kind: "text" | "textarea" | "url"; placeholder?: string; rows?: number; maxLength?: number })
  // Image: can be uploaded (resized to maxWidth) or pasted as a URL; dims = keys that receive the uploaded size
  // minWidth: below this width the uploaded image is flagged as possibly blurry on a phone (it is never enlarged)
  | (FieldBase & { kind: "image"; maxWidth?: number; minWidth?: number; dims?: { width?: string; height?: string } })
  // MP4 video: pasted as a URL or uploaded (stored as it is, max 4 MB)
  | (FieldBase & { kind: "video" })
  | (FieldBase & { kind: "color" })
  // keepRatioWith: another number field of the same block that follows this one proportionally (width <-> height)
  | (FieldBase & { kind: "number"; min?: number; max?: number; keepRatioWith?: string })
  | (FieldBase & { kind: "toggle" })
  // Formatted text editor (headings, bold, lists, links); the value is HTML
  | (FieldBase & { kind: "richtext" })
  // Choice among the organization's landing pages: sets this key (the slug) and, in orgKey, the organization slug
  | (FieldBase & { kind: "landingPicker"; orgKey: string })
  // Choice among the organization's footers ("" = the default footer)
  | (FieldBase & { kind: "footerPicker" })
  // Address of a footer link: one of the legal pages ("/<slug>") or any other link typed by hand; also fills the link text (labelKey)
  | (FieldBase & { kind: "legalLink"; labelKey: string })
  // Choice of Facebook reactions (up to max), shown with their icons
  | (FieldBase & { kind: "reactions"; max: number })
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
    create: () => ({
      type: "topbar",
      mode: "fixed",
      text: "Plată la livrare · Livrare 1-3 zile",
      messages: [],
      effect: "rotate",
      speed: "medium",
      size: 14,
      sticky: false,
      href: null,
      bg: "#202020",
      color: "#ffffff",
    }),
    fields: [
      {
        kind: "select",
        key: "mode",
        label: "Mod",
        options: [
          { value: "fixed", label: "Fix (un singur mesaj)" },
          { value: "scroll", label: "Derulant (mai multe mesaje)" },
        ],
      },
      { kind: "text", key: "text", label: "Mesaj", showIf: { key: "mode", equals: "fixed" } },
      {
        kind: "strings",
        key: "messages",
        label: "Mesaje",
        addLabel: "Adaugă mesaj",
        help: "Se afișează în ordinea din listă. Trage de mâner ca să le muți",
        showIf: { key: "mode", equals: "scroll" },
      },
      {
        kind: "select",
        key: "effect",
        label: "Cum derulează",
        help: "„Pe rând” se citește mai ușor pe telefon",
        showIf: { key: "mode", equals: "scroll" },
        options: [
          { value: "rotate", label: "Pe rând (un mesaj, apoi următorul)" },
          { value: "marquee", label: "Continuu, lateral" },
        ],
      },
      {
        kind: "select",
        key: "speed",
        label: "Viteză",
        showIf: { key: "mode", equals: "scroll" },
        options: [
          { value: "slow", label: "Lent" },
          { value: "medium", label: "Mediu" },
          { value: "fast", label: "Rapid" },
        ],
      },
      { kind: "number", key: "size", label: "Mărime text (px)", min: 11, max: 20 },
      { kind: "toggle", key: "sticky", label: "Rămâne sus la derulare (sticky)" },
      { kind: "url", key: "href", label: "Link la apăsare", placeholder: "#comanda", help: "Opțional. #comanda duce la formular" },
      { kind: "color", key: "bg", label: "Fundal" },
      { kind: "color", key: "color", label: "Culoare text" },
    ],
  },
  {
    type: "topbar_timer",
    label: "Bară cu timer",
    icon: "⏱",
    description: "Reducere, numele ofertei și numărătoare inversă până la miezul nopții",
    note: { text: "Timerul numără până la miezul nopții (ora României) din ziua de azi plus numărul de zile ales, și o ia de la capăt în fiecare zi. Folosește-l doar când oferta chiar se încheie sau își schimbă prețul." },
    kinds: ALL,
    create: () => ({
      type: "topbar_timer",
      label: "REDUCERE",
      discount: "-100 lei",
      discountBg: "#16a34a",
      discountColor: "#ffffff",
      expiresLabel: "Oferta expiră în",
      offerName: "OFERTĂ BLACK FRIDAY",
      days: 0,
      size: 14,
      sticky: false,
      radius: 12,
      bg: "#111827",
      color: "#ffffff",
    }),
    fields: [
      { kind: "text", key: "offerName", label: "Numele ofertei", maxLength: 80 },
      { kind: "text", key: "discount", label: "Reducerea", maxLength: 30, placeholder: "-100 lei", help: "Text liber, ex. -100 lei sau -20%" },
      { kind: "color", key: "discountBg", label: "Fundalul reducerii" },
      { kind: "color", key: "discountColor", label: "Culoarea textului reducerii" },
      {
        kind: "number",
        key: "days",
        label: "Zile până la expirare",
        min: 0,
        max: 60,
        help: "0 = expiră în noaptea asta la 00:00, 1 = mâine noapte la 00:00, 2 = poimâine…",
      },
      { kind: "text", key: "label", label: "Text înaintea reducerii", maxLength: 40, placeholder: "REDUCERE" },
      { kind: "text", key: "expiresLabel", label: "Text înaintea timerului", maxLength: 60, placeholder: "Oferta expiră în" },
      { kind: "number", key: "size", label: "Mărime text (px)", min: 11, max: 20 },
      { kind: "number", key: "radius", label: "Colțuri rotunjite jos (px)", min: 0, max: 24 },
      { kind: "toggle", key: "sticky", label: "Rămâne sus la derulare (sticky)" },
      { kind: "color", key: "bg", label: "Fundal" },
      { kind: "color", key: "color", label: "Culoare text" },
    ],
  },
  {
    type: "products",
    label: "Produse",
    icon: "🛍",
    description: "Grilă de carduri cu produse (pagina de pornire)",
    note: { text: "Cardurile se completează manual: imagine, nume, preț și link. Prețul e text liber (ex. 68 lei). Pe telefon se afișează implicit două coloane." },
    kinds: ["landing"],
    create: () => ({
      type: "products",
      title: "Produsele noastre",
      columnsMobile: 2,
      columnsDesktop: 4,
      ratio: "1 / 1",
      buttonLabel: "Vezi produsul",
      buttonBg: "#ff7a00",
      buttonColor: "#ffffff",
      bg: "#ffffff",
      color: "#1a1a1a",
      radius: 12,
      items: [{ image: "", title: "Nume produs", price: "", oldPrice: "", badge: "", badgeBg: "#e9ff0e", badgeColor: "#000000", href: "" }],
    }),
    fields: [
      { kind: "text", key: "title", label: "Titlul secțiunii (opțional)", maxLength: 120 },
      {
        kind: "items",
        key: "items",
        label: "Produse",
        itemLabel: "Produsul",
        addLabel: "Adaugă produs",
        newItem: () => ({ image: "", title: "", price: "", oldPrice: "", badge: "", badgeBg: "#e9ff0e", badgeColor: "#000000", href: "" }),
        fields: [
          { kind: "image", key: "image", label: "Imagine", maxWidth: 600, minWidth: 300, dims: { width: "width", height: "height" } },
          { kind: "text", key: "title", label: "Nume", maxLength: 120 },
          { kind: "text", key: "price", label: "Preț", maxLength: 30, placeholder: "68 lei" },
          { kind: "text", key: "oldPrice", label: "Preț tăiat (opțional)", maxLength: 30, placeholder: "168 lei" },
          { kind: "text", key: "badge", label: "Etichetă pe imagine (opțional)", maxLength: 30, placeholder: "Cel mai vândut" },
          { kind: "color", key: "badgeBg", label: "Fundal etichetă" },
          { kind: "color", key: "badgeColor", label: "Culoare text etichetă" },
          { kind: "url", key: "href", label: "Link", placeholder: "/slimgel sau https://…", help: "Pagina produsului" },
        ],
      },
      { kind: "number", key: "columnsMobile", label: "Coloane pe telefon", min: 1, max: 2 },
      { kind: "number", key: "columnsDesktop", label: "Coloane pe desktop", min: 2, max: 4 },
      {
        kind: "select",
        key: "ratio",
        label: "Forma imaginilor",
        options: [
          { value: "1 / 1", label: "Pătrat" },
          { value: "4 / 5", label: "Portret 4:5" },
          { value: "3 / 4", label: "Portret 3:4" },
        ],
      },
      { kind: "text", key: "buttonLabel", label: "Text buton", maxLength: 40, placeholder: "Vezi produsul" },
      { kind: "color", key: "buttonBg", label: "Fundal buton" },
      { kind: "color", key: "buttonColor", label: "Culoare text buton" },
      { kind: "number", key: "radius", label: "Rotunjirea cardurilor (px)", min: 0, max: 24 },
      { kind: "color", key: "bg", label: "Fundalul cardurilor" },
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
      { kind: "number", key: "maxWidth", label: "Lățime maximă (px)", min: 100, max: 1200, help: "Gol = toată lățimea paginii. Util la imagini înalte pe pagini largi: se centrează, fără să se întindă pe tot desktop-ul" },
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
    create: () => ({ type: "sticky_footer", text: "COMANDĂ ACUM", href: "#comanda", bg: "#0bba71", color: "#ffffff", animation: "none", speed: "medium" }),
    fields: [
      { kind: "text", key: "text", label: "Text buton" },
      { kind: "url", key: "href", label: "Link", help: "#comanda duce la formular" },
      { kind: "color", key: "bg", label: "Fundal" },
      { kind: "color", key: "color", label: "Culoare text" },
      {
        kind: "select",
        key: "animation",
        label: "Animație",
        help: "Atrage privirea spre buton. Se oprește pe telefoanele cu „reduce animațiile” activat.",
        options: [
          { value: "none", label: "Fără" },
          { value: "pulse", label: "Pulsare (se mărește ușor și revine)" },
          { value: "shine", label: "Strălucire (o dungă de lumină trece peste buton)" },
          { value: "ring", label: "Inel (un contur se extinde în jurul butonului)" },
          { value: "bounce", label: "Săritură (butonul sare ușor, apoi pauză)" },
          { value: "arrow", label: "Săgeată (o săgeată → se mișcă lângă text)" },
        ],
      },
      {
        kind: "select",
        key: "speed",
        label: "Viteză animație",
        help: "Se aplică doar dacă ai ales o animație.",
        options: [
          { value: "slow", label: "Lent" },
          { value: "medium", label: "Mediu" },
          { value: "fast", label: "Rapid" },
        ],
      },
    ],
  },
  {
    type: "rich_text",
    label: "Text formatat",
    icon: "📄",
    description: "Text lung cu titluri, liste și linkuri (pagini legale)",
    kinds: ALL,
    create: () => ({ type: "rich_text", html: "<p></p>", color: "#18181b", size: 16 }),
    fields: [
      { kind: "richtext", key: "html", label: "Conținut", help: "Poți lipi text copiat din altă pagină: formatarea simplă se păstrează" },
      { kind: "number", key: "size", label: "Mărime text (px)", min: 13, max: 22 },
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
    type: "fb_comments",
    label: "Comentarii (stil Facebook)",
    icon: "👍",
    description: "Comentarii reale ale clienților, în stilul Facebook",
    note: { text: "Folosește doar comentarii reale, de la clienți reali. Aspectul e de Facebook, dar conținutul trebuie să fie adevărat." },
    kinds: ALL,
    create: () => ({
      type: "fb_comments",
      title: "",
      cardBg: "#ffffff",
      bubbleBg: "#f0f2f5",
      color: "#050505",
      size: 15,
      showActions: true,
      items: [{ name: "Nume", text: "Comentariu", when: "2h", reactions: ["like"], count: 0, verified: false }],
    }),
    fields: [
      { kind: "text", key: "title", label: "Titlu (opțional)" },
      { kind: "number", key: "size", label: "Mărime text (px)", min: 13, max: 18 },
      { kind: "toggle", key: "showActions", label: "Arată „Like · Reply”" },
      { kind: "color", key: "cardBg", label: "Fundal card" },
      { kind: "color", key: "bubbleBg", label: "Fundal comentariu" },
      { kind: "color", key: "color", label: "Culoare text" },
      {
        kind: "items",
        key: "items",
        label: "Comentarii",
        itemLabel: "Comentariul",
        addLabel: "Adaugă comentariu",
        newItem: () => ({ name: "", text: "", when: "2h", reactions: ["like"], count: 0, verified: false }),
        fields: [
          { kind: "image", key: "avatar", label: "Poză profil (opțional)", maxWidth: 96 },
          { kind: "text", key: "name", label: "Nume" },
          { kind: "textarea", key: "text", label: "Comentariu", rows: 3 },
          { kind: "text", key: "when", label: "Când", placeholder: "2h", maxLength: 20 },
          { kind: "number", key: "count", label: "Număr reacții", min: 0, max: 999999 },
          { kind: "reactions", key: "reactions", label: "Reacții", max: 3, help: "Până la 3" },
          { kind: "toggle", key: "verified", label: "Arată „Client verificat”", help: "Doar dacă e chiar așa" },
          { kind: "text", key: "reply.name", label: "Răspuns: nume (opțional)", placeholder: "Numele magazinului" },
          { kind: "textarea", key: "reply.text", label: "Răspuns: text", rows: 2, help: "Gol = fără răspuns" },
          { kind: "text", key: "reply.when", label: "Răspuns: când", placeholder: "1h", maxLength: 20 },
          { kind: "image", key: "reply.avatar", label: "Răspuns: poză (opțional)", maxWidth: 96 },
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
    create: () => ({
      type: "gallery",
      images: [{ src: "", alt: "", caption: "" }],
      captionColor: "#18181b",
      captionSize: 14,
      captionBox: false,
      captionBg: "#f4f4f5",
      captionAlign: "center",
    }),
    fields: [
      {
        kind: "items",
        key: "images",
        label: "Poze",
        itemLabel: "Poza",
        addLabel: "Adaugă poză",
        newItem: () => ({ src: "", alt: "", caption: "" }),
        fields: [
          { kind: "image", key: "src", label: "Imagine", maxWidth: 800, minWidth: 500 },
          { kind: "text", key: "caption", label: "Text sub poză", maxLength: 40, help: "O singură linie, maximum 40 de caractere. Gol = fără text" },
          { kind: "text", key: "alt", label: "Text alternativ", help: "Nu se vede pe pagină. Dacă e gol, se folosește textul de sub poză" },
        ],
      },
      { kind: "color", key: "captionColor", label: "Text sub poză: culoare" },
      { kind: "number", key: "captionSize", label: "Text sub poză: mărime (px)", min: 11, max: 20 },
      {
        kind: "select",
        key: "captionAlign",
        label: "Text sub poză: aliniere",
        options: [
          { value: "center", label: "Centrat" },
          { value: "left", label: "Stânga" },
        ],
      },
      { kind: "toggle", key: "captionBox", label: "Text sub poză: bandă de fundal", help: "Bandă lipită de poză, pe toată lățimea ei" },
      { kind: "color", key: "captionBg", label: "Text sub poză: culoarea benzii", showIf: { key: "captionBox", equals: true } },
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
    note: {
      text: "Video MP4 (H.264), fără sunet, sub 4 MB, de preferat pătrat sau 4:5, cam 480–720 px. Pornirea automată poate fi oprită de telefon (economisire energie): de aceea imaginea de copertă contează, ea se vede mereu până pornește video-ul.",
    },
    create: () => ({ type: "video", src: "", poster: "", autoplay: true, radius: 0, inset: 0 }),
    fields: [
      { kind: "video", key: "src", label: "Fișier video (MP4)" },
      { kind: "image", key: "poster", label: "Imagine de copertă (primul cadru)", maxWidth: 800, dims: { width: "width", height: "height" }, help: "Obligatorie pentru pornirea automată" },
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
    description: "Formularul de comandă, direct în pagină",
    kinds: LANDING,
    create: () => ({ type: "form", landingSlug: "", org: "", thankYouPath: "/thank-you", variant: 3 }),
    fields: [
      { kind: "landingPicker", key: "landingSlug", orgKey: "org", label: "Landing page (comanda)", help: "Dă ofertele, prețurile și produsul" },
      {
        kind: "select",
        key: "variant",
        label: "Varianta formularului",
        options: [
          { value: "1", label: "V1 — Oferte jos (clasic)" },
          { value: "2", label: "V2 — Oferte sus" },
          { value: "3", label: "V3 — Oferte sus extra (câmpuri noi, etichete mari)" },
        ],
      },
      {
        kind: "select",
        key: "thankYouPath",
        label: "Pagina de mulțumire",
        options: [
          { value: "/thank-you", label: "Pagina proprie de mulțumire (recomandat)" },
          { value: "", label: "Pagina din Shopify" },
        ],
      },
    ],
  },
  {
    type: "refund_form",
    label: "Formular retur",
    icon: "↩",
    description: "Formularul de returnare produse",
    kinds: LANDING,
    create: () => ({ type: "refund_form", org: "" }),
    fields: [
      { kind: "text", key: "org", label: "Organizație (slug)", help: "ex. reduxio-srl", placeholder: "reduxio-srl", maxLength: 60 },
    ],
  },
  {
    type: "shared_footer",
    label: "Footer comun",
    icon: "▁",
    description: "Un footer din biblioteca de footere",
    note: { text: "Conținutul se editează în biblioteca de footere, nu aici. Un footer folosit pe mai multe pagini se schimbă o singură dată.", href: "/admin/pages/footers", linkLabel: "Deschide footerele" },
    kinds: ALL,
    create: () => ({ type: "shared_footer", footerId: null }),
    fields: [{ kind: "footerPicker", key: "footerId", label: "Footer" }],
  },
  {
    type: "footer",
    label: "Footer (doar această pagină)",
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
          { kind: "legalLink", key: "href", labelKey: "label", label: "Adresă" },
        ],
      },
      { kind: "toggle", key: "showAnpc", label: "Arată pictogramele ANPC (SAL și SOL)" },
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

/** Name given to a block, only to recognise it in the editor's list (never shown on the page) */
export const BLOCK_LABEL_MAX = 30;
export const NAME_FIELDS: FieldDef[] = [
  { kind: "text", key: "label", label: "Nume în listă", maxLength: BLOCK_LABEL_MAX, placeholder: "ex: Beneficii, Poze înainte/după", help: "Doar pentru tine, nu apare pe pagină" },
];

/** Shown for every block that sits in the page flow (not the top bar, sticky button or footer) */
export const SPACING_FIELDS: FieldDef[] = [
  { kind: "number", key: "spaceBelow", label: "Spațiu sub bloc (px)", min: 0, max: 80, help: "0 = fără spațiu. Util între două blocuri care ar trebui să respire" },
];

/** Blocks rendered outside the flow: the spacing field does not apply to them */
export const OUT_OF_FLOW_BLOCKS = ["topbar", "topbar_timer", "sticky_footer", "footer", "shared_footer"];

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
