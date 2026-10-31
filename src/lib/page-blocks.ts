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
export type ReviewsBlock = { type: "reviews"; title: string; items: ReviewItem[]; accent: string };
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
export type FormBlock = { type: "form"; landingSlug: string; org: string | null };
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

export type PageBlock =
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
  | FormBlock
  | FooterBlock;

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
        : { type: "reviews", title: str(b.title), items, accent: color(b.accent, "#f59e0b") };
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
      return { type: "form", landingSlug, org: SLUG.test(org) ? org : null };
    }

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
