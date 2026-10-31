// Block model for own landing pages (/p/[slug]).
// A page is an ordered list of blocks stored as JSON; normalizeBlocks() turns whatever is stored
// into safe, fully-defaulted blocks, so rendering never breaks on malformed data.

export type TextSize = "sm" | "base" | "lg" | "xl" | "2xl";

export type TopbarBlock = { type: "topbar"; text: string; bg: string; color: string };
export type ImageBlock = {
  type: "image";
  src: string;
  alt: string;
  width: number | null;
  height: number | null;
  rounded: boolean;
  href: string | null;
};
export type TextBlock = {
  type: "text";
  text: string;
  align: "left" | "center" | "right";
  size: TextSize;
  color: string;
  bold: boolean;
};
export type ListBlock = {
  type: "list";
  items: string[];
  icon: string;
  iconColor: string;
  color: string;
  size: TextSize;
};
export type ButtonBlock = { type: "button"; text: string; href: string; bg: string; color: string };
export type StickyFooterBlock = { type: "sticky_footer"; text: string; href: string; bg: string; color: string };
export type HtmlBlock = { type: "html"; html: string };

export type ReviewItem = { name: string; text: string; rating: number; avatar: string | null; verified: boolean };
export type ReviewsBlock = { type: "reviews"; title: string; items: ReviewItem[]; accent: string; showRating: boolean };
export type FaqBlock = {
  type: "faq";
  title: string;
  items: { q: string; a: string }[];
  openFirst: boolean;
  accent: string;
};
export type VideoBlock = {
  type: "video";
  src: string;
  poster: string | null;
  autoplay: boolean;
  rounded: boolean;
};
export type GalleryBlock = { type: "gallery"; images: { src: string; alt: string }[] };
export type BeforeAfterBlock = {
  type: "before_after";
  before: { src: string; alt: string };
  after: { src: string; alt: string };
  beforeLabel: string;
  afterLabel: string;
};
// Order form (the landing page configuration with this slug drives offers, prices, upsells, tracking)
// thankYouPath: own thank-you page on this site (for example "/thank-you"); empty = the store's thank-you page, as the iframe widget does
export type FormBlock = { type: "form"; landingSlug: string; org: string | null; thankYouPath: string | null };
// Thank-you page only: order details from the order in the URL (renders nothing elsewhere)
export type OrderSummaryBlock = { type: "order_summary"; heading: string; bg: string; color: string; accent: string };
export type SpacerBlock = { type: "spacer"; height: number };
export type FooterBlock = {
  type: "footer";
  logo: { src: string; alt: string; width: number | null } | null;
  company: string;
  links: { label: string; href: string }[];
  showAnpc: boolean;
  badges: { src: string; alt: string; href: string | null }[];
  copyright: string;
  bg: string;
  color: string;
};

// Thank-you page only: the postsale offer (accept / decline / countdown), same flow as the Shopify embed
export type PostsaleOfferBlock = {
  type: "postsale_offer";
  confirmedText: string;
  headline: string;
  timerLabel: string;
  urgencyText: string;
  acceptText: string;
  declineText: string;
  accent: string;
};

// Thank-you page only: the "see all products" message + button from the store settings
// (shown only when the order's landing page has the switch on; renders nothing otherwise)
export type StoreCtaBlock = { type: "store_cta" };

/** Thank-you page: show a block only while the offer is open ("offer") or after it is settled ("final") */
export type BlockPhase = "offer" | "final";

/** Thank-you page: show a block only when the store button is available ("cta") or when it is not ("no_cta") */
export type BlockCondition = "cta" | "no_cta";

export type BlockVariant =
  | TopbarBlock
  | ImageBlock
  | TextBlock
  | ListBlock
  | ButtonBlock
  | StickyFooterBlock
  | HtmlBlock
  | ReviewsBlock
  | FaqBlock
  | VideoBlock
  | GalleryBlock
  | BeforeAfterBlock
  | SpacerBlock
  | OrderSummaryBlock
  | PostsaleOfferBlock
  | StoreCtaBlock
  | FormBlock
  | FooterBlock;

export type PageBlock = BlockVariant & { phase?: BlockPhase; showWhen?: BlockCondition };

export const ANPC_LINKS = [
  { label: "ANPC – Soluționarea alternativă a litigiilor", href: "https://anpc.ro/ce-este-sal/" },
  { label: "Soluționarea online a litigiilor", href: "https://ec.europa.eu/consumers/odr" },
];

const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
const SAFE_HREF = /^(?:https?:\/\/|\/(?!\/)|#|tel:|mailto:)/i;
const TEXT_SIZES: TextSize[] = ["sm", "base", "lg", "xl", "2xl"];
const LIST_ICONS: Record<string, string> = { check: "✓", dot: "•", star: "★" };

const MAX_ITEMS = 30;
const SLUG = /^[a-z0-9][a-z0-9-]{0,79}$/i;
const imageSrc = (value: unknown): string | null =>
  typeof value === "string" && /^(https?:\/\/|\/(?!\/))/i.test(value.trim()) ? value.trim() : null;
const list = (value: unknown): unknown[] => (Array.isArray(value) ? value.slice(0, MAX_ITEMS) : []);
const obj = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

const str = (value: unknown, fallback = ""): string => (typeof value === "string" ? value : fallback);
const color = (value: unknown, fallback: string): string =>
  typeof value === "string" && HEX_COLOR.test(value.trim()) ? value.trim() : fallback;
const href = (value: unknown, fallback: string): string =>
  typeof value === "string" && SAFE_HREF.test(value.trim()) ? value.trim() : fallback;
const dimension = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) && value > 0 && value <= 10000 ? Math.round(value) : null;
const size = (value: unknown, fallback: TextSize): TextSize =>
  TEXT_SIZES.includes(value as TextSize) ? (value as TextSize) : fallback;

function normalizeBlock(raw: unknown): PageBlock | null {
  if (!raw || typeof raw !== "object") return null;
  const b = raw as Record<string, unknown>;
  const block = normalizeVariant(b);
  if (!block) return null;
  return {
    ...block,
    ...(b.phase === "offer" || b.phase === "final" ? { phase: b.phase } : {}),
    ...(b.showWhen === "cta" || b.showWhen === "no_cta" ? { showWhen: b.showWhen } : {}),
  };
}

function normalizeVariant(b: Record<string, unknown>): BlockVariant | null {
  switch (b.type) {
    case "topbar":
      return { type: "topbar", text: str(b.text), bg: color(b.bg, "#111827"), color: color(b.color, "#ffffff") };

    case "image": {
      const src = str(b.src).trim();
      if (!/^(https?:\/\/|\/)/i.test(src)) return null;
      return {
        type: "image",
        src,
        alt: str(b.alt),
        width: dimension(b.width),
        height: dimension(b.height),
        rounded: b.rounded === true,
        href: typeof b.href === "string" && SAFE_HREF.test(b.href.trim()) ? b.href.trim() : null,
      };
    }

    case "text":
      return {
        type: "text",
        text: str(b.text),
        align: b.align === "center" || b.align === "right" ? b.align : "left",
        size: size(b.size, "base"),
        color: color(b.color, "#18181b"),
        bold: b.bold === true,
      };

    case "list": {
      const items = Array.isArray(b.items) ? b.items.filter((i): i is string => typeof i === "string" && i.trim() !== "") : [];
      const icon = str(b.icon, "check");
      return {
        type: "list",
        items,
        icon: LIST_ICONS[icon] ?? (icon.length <= 4 ? icon : "✓"),
        iconColor: color(b.iconColor, "#16a34a"),
        color: color(b.color, "#18181b"),
        size: size(b.size, "base"),
      };
    }

    case "button":
      return {
        type: "button",
        text: str(b.text, "Comandă acum"),
        href: href(b.href, "#"),
        bg: color(b.bg, "#16a34a"),
        color: color(b.color, "#ffffff"),
      };

    case "sticky_footer":
      return {
        type: "sticky_footer",
        text: str(b.text, "Comandă acum"),
        href: href(b.href, "#"),
        bg: color(b.bg, "#16a34a"),
        color: color(b.color, "#ffffff"),
      };

    case "html":
      return { type: "html", html: str(b.html) };

    case "reviews": {
      const items: ReviewItem[] = [];
      for (const raw of list(b.items)) {
        const r = obj(raw);
        const name = str(r.name).trim();
        const text = str(r.text).trim();
        if (!name && !text) continue;
        const rating = typeof r.rating === "number" ? Math.min(5, Math.max(1, Math.round(r.rating))) : 5;
        items.push({ name, text, rating, avatar: imageSrc(r.avatar), verified: r.verified === true });
      }
      return items.length === 0
        ? null
        : { type: "reviews", title: str(b.title), items, accent: color(b.accent, "#f59e0b"), showRating: b.showRating !== false };
    }

    case "faq": {
      const items: { q: string; a: string }[] = [];
      for (const raw of list(b.items)) {
        const f = obj(raw);
        const q = str(f.q).trim();
        if (q) items.push({ q, a: str(f.a) });
      }
      return items.length === 0
        ? null
        : { type: "faq", title: str(b.title), items, openFirst: b.openFirst === true, accent: color(b.accent, "#18181b") };
    }

    case "video": {
      const src = imageSrc(b.src);
      if (!src) return null;
      return { type: "video", src, poster: imageSrc(b.poster), autoplay: b.autoplay === true, rounded: b.rounded === true };
    }

    case "gallery": {
      const images: { src: string; alt: string }[] = [];
      for (const raw of list(b.images)) {
        const i = obj(raw);
        const src = imageSrc(i.src);
        if (src) images.push({ src, alt: str(i.alt) });
      }
      return images.length === 0 ? null : { type: "gallery", images };
    }

    case "before_after": {
      const before = obj(b.before);
      const after = obj(b.after);
      const beforeSrc = imageSrc(before.src);
      const afterSrc = imageSrc(after.src);
      if (!beforeSrc || !afterSrc) return null;
      return {
        type: "before_after",
        before: { src: beforeSrc, alt: str(before.alt) },
        after: { src: afterSrc, alt: str(after.alt) },
        beforeLabel: str(b.beforeLabel, "Înainte"),
        afterLabel: str(b.afterLabel, "După"),
      };
    }

    case "form": {
      const landingSlug = str(b.landingSlug).trim();
      if (!SLUG.test(landingSlug)) return null;
      const org = str(b.org).trim();
      const thankYouPath = str(b.thankYouPath).trim();
      return {
        type: "form",
        landingSlug,
        org: SLUG.test(org) ? org : null,
        thankYouPath: /^\/[a-z0-9\-_/]*$/i.test(thankYouPath) ? thankYouPath : null,
      };
    }

    case "order_summary":
      return {
        type: "order_summary",
        heading: str(b.heading, "Comanda ta"),
        bg: color(b.bg, "#13322c"),
        color: color(b.color, "#e2e8f0"),
        accent: color(b.accent, "#22c55e"),
      };

    case "store_cta":
      return { type: "store_cta" };

    case "postsale_offer":
      return {
        type: "postsale_offer",
        confirmedText: str(b.confirmedText, "COMANDA TA A FOST TRIMISĂ CU SUCCES!"),
        headline: str(b.headline, "AI DEBLOCAT O OFERTĂ SPECIALĂ!"),
        timerLabel: str(b.timerLabel, "OFERTA EXPIRĂ ÎN"),
        urgencyText: str(b.urgencyText, "Această ofertă dispare când părăsești pagina!"),
        acceptText: str(b.acceptText, "DA, ADAUGĂ LA COMANDĂ"),
        declineText: str(b.declineText, "NU, MULȚUMESC"),
        accent: color(b.accent, "#22c55e"),
      };

    case "spacer":
      return { type: "spacer", height: typeof b.height === "number" ? Math.min(200, Math.max(4, Math.round(b.height))) : 24 };

    case "footer": {
      const logoRaw = obj(b.logo);
      const logoSrc = imageSrc(logoRaw.src);
      const links: { label: string; href: string }[] = [];
      for (const raw of list(b.links)) {
        const l = obj(raw);
        const label = str(l.label).trim();
        if (label) links.push({ label, href: href(l.href, "#") });
      }
      const badges: { src: string; alt: string; href: string | null }[] = [];
      for (const raw of list(b.badges)) {
        const bd = obj(raw);
        const src = imageSrc(bd.src);
        if (src) {
          badges.push({
            src,
            alt: str(bd.alt),
            href: typeof bd.href === "string" && SAFE_HREF.test(bd.href.trim()) ? bd.href.trim() : null,
          });
        }
      }
      return {
        type: "footer",
        logo: logoSrc ? { src: logoSrc, alt: str(logoRaw.alt), width: dimension(logoRaw.width) } : null,
        company: str(b.company),
        links,
        showAnpc: b.showAnpc === true,
        badges,
        copyright: str(b.copyright),
        bg: color(b.bg, "#18181b"),
        color: color(b.color, "#d4d4d8"),
      };
    }

    default:
      return null;
  }
}

/** Keeps only well-formed blocks, with defaults filled in. Never throws. */
export function normalizeBlocks(raw: unknown): PageBlock[] {
  if (!Array.isArray(raw)) return [];
  const blocks: PageBlock[] = [];
  for (const item of raw) {
    const block = normalizeBlock(item);
    if (block) blocks.push(block);
  }
  return blocks;
}

export function normalizePageBackground(value: unknown): string {
  return color(value, "#ffffff");
}
