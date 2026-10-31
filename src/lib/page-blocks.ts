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

export type PageBlock =
  | TopbarBlock
  | ImageBlock
  | TextBlock
  | ListBlock
  | ButtonBlock
  | StickyFooterBlock
  | HtmlBlock;

const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;
const SAFE_HREF = /^(?:https?:\/\/|\/(?!\/)|#|tel:|mailto:)/i;
const TEXT_SIZES: TextSize[] = ["sm", "base", "lg", "xl", "2xl"];
const LIST_ICONS: Record<string, string> = { check: "✓", dot: "•", star: "★" };

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
