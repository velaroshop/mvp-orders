import type { ReactNode } from "react";
import type { PageBlock, TextSize } from "@/lib/page-blocks";

// Server component on purpose: no client JavaScript, so own pages stay as light as possible.

const SIZE_CLASS: Record<TextSize, string> = {
  sm: "text-sm",
  base: "text-base",
  lg: "text-lg",
  xl: "text-xl",
  "2xl": "text-2xl",
};

/** Plain text with **bold** and line breaks; React escapes everything else. */
function renderInline(text: string): ReactNode[] {
  return text.split("\n").flatMap((line, lineIndex, lines) => {
    const parts = line.split(/\*\*(.+?)\*\*/g).map((part, i) =>
      i % 2 === 1 ? <strong key={`${lineIndex}-${i}`}>{part}</strong> : part,
    );
    return lineIndex < lines.length - 1 ? [...parts, <br key={`br-${lineIndex}`} />] : parts;
  });
}

function Block({ block, index, firstImageIndex }: { block: PageBlock; index: number; firstImageIndex: number }) {
  switch (block.type) {
    case "topbar":
      return (
        <div
          className="w-full px-3 py-2 text-center text-sm font-semibold"
          style={{ backgroundColor: block.bg, color: block.color }}
        >
          {block.text}
        </div>
      );

    case "image": {
      const img = (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={block.src}
          alt={block.alt}
          width={block.width ?? undefined}
          height={block.height ?? undefined}
          loading={index === firstImageIndex ? "eager" : "lazy"}
          fetchPriority={index === firstImageIndex ? "high" : "auto"}
          decoding="async"
          className={`block h-auto w-full ${block.rounded ? "rounded-xl" : ""}`}
        />
      );
      const wrapped = block.href ? <a href={block.href}>{img}</a> : img;
      return <div className={block.rounded ? "px-4 py-2" : ""}>{wrapped}</div>;
    }

    case "text":
      return (
        <div
          className={`px-4 py-2 leading-snug ${SIZE_CLASS[block.size]} ${block.bold ? "font-bold" : ""}`}
          style={{ color: block.color, textAlign: block.align }}
        >
          {renderInline(block.text)}
        </div>
      );

    case "list":
      return (
        <ul className={`space-y-2 px-4 py-2 ${SIZE_CLASS[block.size]}`} style={{ color: block.color }}>
          {block.items.map((item, i) => (
            <li key={i} className="flex items-start gap-2 leading-snug">
              <span className="font-bold" style={{ color: block.iconColor }} aria-hidden="true">
                {block.icon}
              </span>
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ul>
      );

    case "button":
      return (
        <div className="px-4 py-3">
          <a
            href={block.href}
            className="block rounded-xl px-6 py-4 text-center text-lg font-bold shadow-md"
            style={{ backgroundColor: block.bg, color: block.color }}
          >
            {block.text}
          </a>
        </div>
      );

    case "html":
      return <div dangerouslySetInnerHTML={{ __html: block.html }} />;

    case "sticky_footer":
      // Rendered separately, outside the page flow
      return null;
  }
}

export default function BlockRenderer({ blocks, background }: { blocks: PageBlock[]; background: string }) {
  const firstImageIndex = blocks.findIndex((b) => b.type === "image");
  const topbars = blocks.filter((b) => b.type === "topbar");
  const stickyFooter = blocks.find((b) => b.type === "sticky_footer");
  const flow = blocks
    .map((block, index) => ({ block, index }))
    .filter(({ block }) => block.type !== "topbar" && block.type !== "sticky_footer");

  return (
    <main className="min-h-screen" style={{ backgroundColor: background }}>
      {topbars.map((block, i) => (
        <Block key={`topbar-${i}`} block={block} index={-1} firstImageIndex={firstImageIndex} />
      ))}

      <div className="mx-auto w-full max-w-[560px]">
        {flow.map(({ block, index }) => (
          <Block key={index} block={block} index={index} firstImageIndex={firstImageIndex} />
        ))}
      </div>

      {stickyFooter && stickyFooter.type === "sticky_footer" && (
        <>
          {/* Spacer so the fixed button never covers the end of the page */}
          <div aria-hidden="true" className="h-24" />
          <div
            className="fixed inset-x-0 bottom-0 z-50 bg-white/95 px-3 pt-3 shadow-[0_-4px_16px_rgba(0,0,0,0.15)]"
            style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
          >
            <a
              href={stickyFooter.href}
              className="mx-auto block max-w-[560px] rounded-xl px-6 py-4 text-center text-lg font-bold"
              style={{ backgroundColor: stickyFooter.bg, color: stickyFooter.color }}
            >
              {stickyFooter.text}
            </a>
          </div>
        </>
      )}
    </main>
  );
}
