// Block model for own landing pages (/p/[slug]).
// A page is an ordered list of blocks stored as JSON; normalizeBlocks() turns whatever is stored
// into safe, fully-defaulted blocks, so rendering never breaks on malformed data.

export type TextSize = "sm" | "base" | "lg" | "xl" | "2xl";

export type TopbarSpeed = "slow" | "medium" | "fast";
export type TopbarBlock = {
  type: "topbar";
  /** "fixed": one message ("text"). "scroll": several messages ("messages") that rotate or run as a marquee */
  mode: "fixed" | "scroll";
  text: string;
  messages: string[];
  effect: "rotate" | "marquee";
  speed: TopbarSpeed;
  /** Text size in px */
  size: number;
  /** Stays at the top of the screen while the page scrolls */
  sticky: boolean;
  href: string | null;
  bg: string;
  color: string;
};
/**
 * Top bar with a discount badge, an offer name and a countdown. `days` = days from today until the offer ends:
 * 0 = tonight at 00:00 (Romania time), 1 = tomorrow night at 00:00, and so on. The countdown restarts every day.
 */
export type TopbarTimerBlock = {
  type: "topbar_timer";
  label: string;
  discount: string;
  discountBg: string;
  discountColor: string;
  expiresLabel: string;
  offerName: string;
  days: number;
  size: number;
  sticky: boolean;
  /** Radius in px of the bottom corners */
  radius: number;
  bg: string;
  color: string;
};
/** Product card of the "products" grid: everything is typed by hand (price included) */
export type ProductCard = {
  image: string | null;
  width: number | null;
  height: number | null;
  title: string;
  price: string;
  oldPrice: string;
  badge: string;
  badgeBg: string;
  badgeColor: string;
  href: string;
};
/** Grid of product cards (homepage). Two columns on a phone by default. */
export type ProductsBlock = {
  type: "products";
  title: string;
  items: ProductCard[];
  columnsMobile: number;
  columnsDesktop: number;
  /** CSS aspect-ratio of the card images, e.g. "1 / 1" */
  ratio: string;
  buttonLabel: string;
  buttonBg: string;
  buttonColor: string;
  bg: string;
  color: string;
  radius: number;
};
export type ImageBlock = {
  type: "image";
  src: string;
  alt: string;
  width: number | null;
  height: number | null;
  /** Corner radius in px (0 = square) */
  radius: number;
  /** Side margin in px around the image (0 = edge to edge) */
  inset: number;
  /** Widest the image may get, in px, centered (null = the whole width of the page). For tall images on wide pages. */
  maxWidth: number | null;
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
/** Formatted text (legal pages, long texts). html is cleaned on the server (see sanitize-rich-text.ts) */
export type RichTextBlock = { type: "rich_text"; html: string; color: string; size: number };

export const FB_REACTIONS = ["like", "love", "care", "haha", "wow", "sad", "angry"] as const;
export type FbReaction = (typeof FB_REACTIONS)[number];
export type FbCommentPerson = { name: string; text: string; when: string; avatar: string | null };
export type FbComment = FbCommentPerson & {
  reactions: FbReaction[];
  count: number;
  verified: boolean;
  /** Optional answer under the comment (for example from the store) */
  reply: FbCommentPerson | null;
};
export type FbCommentsBlock = {
  type: "fb_comments";
  title: string;
  items: FbComment[];
  /** Card, comment bubble and text colors; text size in px */
  cardBg: string;
  bubbleBg: string;
  color: string;
  size: number;
  /** The static "Like · Reply" line under each comment */
  showActions: boolean;
};

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
  /** Size of the cover image: reserves the space (no layout jump) before anything has loaded */
  width: number | null;
  height: number | null;
  autoplay: boolean;
  radius: number;
  inset: number;
};
export const GALLERY_CAPTION_MAX = 40;
export type GalleryBlock = {
  type: "gallery";
  images: { src: string; alt: string; caption: string }[];
  /** One line under each photo; these settings are shared by the whole gallery */
  captionColor: string;
  captionSize: number;
  /** A colored strip under the photo (same width as the photo) */
  captionBox: boolean;
  captionBg: string;
  captionAlign: "center" | "left";
};
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
/** Footer chosen from the organization's footer library; footerId null = the organization's default footer */
export type SharedFooterBlock = { type: "shared_footer"; footerId: string | null };
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
  | TopbarTimerBlock
  | ProductsBlock
  | ImageBlock
  | TextBlock
  | ListBlock
  | ButtonBlock
  | StickyFooterBlock
  | SharedFooterBlock
  | HtmlBlock
  | RichTextBlock
  | ReviewsBlock
  | FbCommentsBlock
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

/** spaceBelow: empty space in px under the block (only set when above 0, so older pages are unchanged) */
/** label: name given in the editor, to recognise the block in the list (never rendered) */
export type PageBlock = BlockVariant & { phase?: BlockPhase; showWhen?: BlockCondition; spaceBelow?: number; label?: string };

export const ANPC_LINKS = [
  { label: "ANPC – Soluționarea alternativă a litigiilor", href: "https://anpc.ro/ce-este-sal/", src: "/anpc/sal.webp" },
  { label: "Soluționarea online a litigiilor", href: "https://ec.europa.eu/consumers/odr", src: "/anpc/sol.webp" },
];

const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
const SAFE_HREF = /^(?:https?:\/\/|\/(?!\/)|#|tel:|mailto:)/i;
const TEXT_SIZES: TextSize[] = ["sm", "base", "lg", "xl", "2xl"];
const LIST_ICONS: Record<string, string> = { check: "✓", dot: "•", star: "★" };

const MAX_ITEMS = 30;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLUG = /^[a-z0-9][a-z0-9-]{0,79}$/i;
const imageSrc = (value: unknown): string | null =>
  typeof value === "string" && /^(https?:\/\/|\/(?!\/))/i.test(value.trim()) ? value.trim() : null;
const list = (value: unknown): unknown[] => (Array.isArray(value) ? value.slice(0, MAX_ITEMS) : []);
const obj = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

/**
 * Corner radius and side margin of an image/video. Old pages only had "rounded: true", which meant a 12px radius
 * with a 16px margin: that is still what they get, until a value is set explicitly.
 */
function radiusAndInset(b: Record<string, unknown>): { radius: number; inset: number } {
  const legacy = b.rounded === true;
  const bounded = (value: unknown, fallback: number, max: number) =>
    typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(0, Math.round(value))) : fallback;
  return { radius: bounded(b.radius, legacy ? 12 : 0, 48), inset: bounded(b.inset, legacy ? 16 : 0, 32) };
}

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
    ...(typeof b.label === "string" && b.label.trim() ? { label: b.label.trim().slice(0, 30) } : {}),
    ...(typeof b.spaceBelow === "number" && b.spaceBelow >= 1 ? { spaceBelow: Math.min(80, Math.round(b.spaceBelow)) } : {}),
  };
}

function normalizeVariant(b: Record<string, unknown>): BlockVariant | null {
  switch (b.type) {
    case "topbar":
      return {
        type: "topbar",
        // Bars saved before the scrolling option only have "text": they stay a fixed, non-sticky bar
        mode: b.mode === "scroll" ? "scroll" : "fixed",
        text: str(b.text),
        messages: list(b.messages)
          .filter((m): m is string => typeof m === "string" && m.trim() !== "")
          .map((m) => m.slice(0, 200)),
        effect: b.effect === "marquee" ? "marquee" : "rotate",
        speed: b.speed === "slow" || b.speed === "fast" ? b.speed : "medium",
        size: typeof b.size === "number" && Number.isFinite(b.size) ? Math.min(20, Math.max(11, Math.round(b.size))) : 14,
        sticky: b.sticky === true,
        href: typeof b.href === "string" && SAFE_HREF.test(b.href.trim()) ? b.href.trim() : null,
        bg: color(b.bg, "#111827"),
        color: color(b.color, "#ffffff"),
      };

    case "topbar_timer": {
      const bounded = (value: unknown, fallback: number, min: number, max: number) =>
        typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(min, Math.round(value))) : fallback;
      return {
        type: "topbar_timer",
        label: str(b.label, "REDUCERE").slice(0, 40),
        discount: str(b.discount).slice(0, 30),
        discountBg: color(b.discountBg, "#16a34a"),
        discountColor: color(b.discountColor, "#ffffff"),
        expiresLabel: str(b.expiresLabel, "Oferta expiră în").slice(0, 60),
        offerName: str(b.offerName).slice(0, 80),
        days: bounded(b.days, 0, 0, 60),
        size: bounded(b.size, 14, 11, 20),
        sticky: b.sticky === true,
        radius: bounded(b.radius, 0, 0, 24),
        bg: color(b.bg, "#111827"),
        color: color(b.color, "#ffffff"),
      };
    }

    case "products": {
      const items: ProductCard[] = [];
      for (const raw of list(b.items)) {
        const c = obj(raw);
        const title = str(c.title).trim().slice(0, 120);
        if (!title) continue;
        items.push({
          image: imageSrc(c.image),
          width: dimension(c.width),
          height: dimension(c.height),
          title,
          price: str(c.price).trim().slice(0, 30),
          oldPrice: str(c.oldPrice).trim().slice(0, 30),
          badge: str(c.badge).trim().slice(0, 30),
          badgeBg: color(c.badgeBg, "#e9ff0e"),
          badgeColor: color(c.badgeColor, "#000000"),
          href: href(c.href, "#"),
        });
      }
      const ratio = ["1 / 1", "4 / 5", "3 / 4"].includes(str(b.ratio)) ? str(b.ratio) : "1 / 1";
      const cols = (value: unknown, fallback: number, min: number, max: number) =>
        typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(min, Math.round(value))) : fallback;
      return {
        type: "products",
        title: str(b.title).slice(0, 120),
        items,
        columnsMobile: cols(b.columnsMobile, 2, 1, 2),
        columnsDesktop: cols(b.columnsDesktop, 4, 2, 4),
        ratio,
        buttonLabel: str(b.buttonLabel, "Vezi produsul").slice(0, 40),
        buttonBg: color(b.buttonBg, "#ff7a00"),
        buttonColor: color(b.buttonColor, "#ffffff"),
        bg: color(b.bg, "#ffffff"),
        color: color(b.color, "#1a1a1a"),
        radius: cols(b.radius, 12, 0, 24),
      };
    }

    case "image": {
      const src = str(b.src).trim();
      if (!/^(https?:\/\/|\/)/i.test(src)) return null;
      return {
        type: "image",
        src,
        alt: str(b.alt),
        width: dimension(b.width),
        height: dimension(b.height),
        ...radiusAndInset(b),
        maxWidth: typeof b.maxWidth === "number" && Number.isFinite(b.maxWidth) && b.maxWidth >= 100 ? Math.min(1200, Math.round(b.maxWidth)) : null,
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

    case "rich_text":
      return {
        type: "rich_text",
        html: str(b.html).slice(0, 200_000),
        color: color(b.color, "#18181b"),
        size: typeof b.size === "number" && Number.isFinite(b.size) ? Math.min(22, Math.max(13, Math.round(b.size))) : 16,
      };

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

    case "fb_comments": {
      const person = (raw: unknown): FbCommentPerson => {
        const p = obj(raw);
        return { name: str(p.name).trim().slice(0, 80), text: str(p.text).trim().slice(0, 1000), when: str(p.when).trim().slice(0, 20), avatar: imageSrc(p.avatar) };
      };
      const items: FbComment[] = [];
      for (const raw of list(b.items)) {
        const c = obj(raw);
        const main = person(c);
        if (!main.name && !main.text) continue;
        const reactions = [...new Set(list(c.reactions))].filter((r): r is FbReaction => FB_REACTIONS.includes(r as FbReaction)).slice(0, 3);
        const reply = person(c.reply);
        items.push({
          ...main,
          reactions,
          count: typeof c.count === "number" && Number.isFinite(c.count) ? Math.min(999999, Math.max(0, Math.round(c.count))) : 0,
          verified: c.verified === true,
          reply: reply.text ? reply : null,
        });
      }
      return items.length === 0
        ? null
        : {
            type: "fb_comments",
            title: str(b.title),
            items,
            cardBg: color(b.cardBg, "#ffffff"),
            bubbleBg: color(b.bubbleBg, "#f0f2f5"),
            color: color(b.color, "#050505"),
            size: typeof b.size === "number" && Number.isFinite(b.size) ? Math.min(18, Math.max(13, Math.round(b.size))) : 15,
            showActions: b.showActions !== false,
          };
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
      return {
        type: "video",
        src,
        poster: imageSrc(b.poster),
        width: dimension(b.width),
        height: dimension(b.height),
        autoplay: b.autoplay === true,
        ...radiusAndInset(b),
      };
    }

    case "gallery": {
      const images: { src: string; alt: string; caption: string }[] = [];
      for (const raw of list(b.images)) {
        const i = obj(raw);
        const src = imageSrc(i.src);
        if (src) images.push({ src, alt: str(i.alt), caption: str(i.caption).replace(/\s+/g, " ").trim().slice(0, GALLERY_CAPTION_MAX) });
      }
      return images.length === 0
        ? null
        : {
            type: "gallery",
            images,
            captionColor: color(b.captionColor, "#18181b"),
            captionSize: typeof b.captionSize === "number" && Number.isFinite(b.captionSize) ? Math.min(20, Math.max(11, Math.round(b.captionSize))) : 14,
            captionBox: b.captionBox === true,
            captionBg: color(b.captionBg, "#f4f4f5"),
            captionAlign: b.captionAlign === "left" ? "left" : "center",
          };
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

    case "shared_footer":
      return { type: "shared_footer", footerId: typeof b.footerId === "string" && UUID.test(b.footerId) ? b.footerId : null };

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
