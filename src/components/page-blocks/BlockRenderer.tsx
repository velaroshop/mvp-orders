import type { ReactNode } from "react";
import { ANPC_LINKS, type PageBlock, type TextSize } from "@/lib/page-blocks";
import OwnOrderForm from "@/components/own-form/OwnOrderForm";
import OrderSummary from "@/components/thank-you/OrderSummary";
import PostsaleOffer from "@/components/thank-you/PostsaleOffer";
import StoreCta from "@/components/thank-you/StoreCta";
import PhaseGate from "@/components/thank-you/PhaseGate";
import StickyFooter from "@/components/page-blocks/StickyFooter";

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

function Block({
  block,
  index,
  firstImageIndex,
  preview,
}: {
  block: PageBlock;
  index: number;
  firstImageIndex: number;
  preview?: boolean;
}) {
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

    case "reviews":
      return (
        <section className="px-4 py-4">
          {block.title && <h2 className="mb-3 text-center text-xl font-bold text-zinc-900">{block.title}</h2>}
          <div className="space-y-3">
            {block.items.map((review, i) => (
              <figure key={i} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
                <div className="mb-2 flex items-center gap-3">
                  {review.avatar && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={review.avatar}
                      alt=""
                      width={44}
                      height={44}
                      loading="lazy"
                      decoding="async"
                      className="h-11 w-11 rounded-full object-cover"
                    />
                  )}
                  <div className="min-w-0">
                    <div className="font-bold text-zinc-900">{review.name}</div>
                    {review.verified && <div className="text-xs text-zinc-600">Client verificat</div>}
                  </div>
                  {block.showRating && (
                    <div className="ml-auto text-lg leading-none" aria-label={`${review.rating} din 5 stele`}>
                      <span style={{ color: block.accent }}>{"★".repeat(review.rating)}</span>
                      <span className="text-zinc-300">{"★".repeat(5 - review.rating)}</span>
                    </div>
                  )}
                </div>
                <blockquote className="text-base leading-snug text-zinc-800">{renderInline(review.text)}</blockquote>
              </figure>
            ))}
          </div>
        </section>
      );

    case "faq":
      // Native <details>: an accordion with no JavaScript
      return (
        <section className="px-4 py-4">
          {block.title && <h2 className="mb-3 text-center text-xl font-bold text-zinc-900">{block.title}</h2>}
          <div className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white">
            {block.items.map((item, i) => (
              <details key={i} className="group p-4" open={block.openFirst && i === 0}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-base font-semibold text-zinc-900 [&::-webkit-details-marker]:hidden">
                  <span>{item.q}</span>
                  <span
                    className="text-2xl leading-none transition-transform group-open:rotate-45"
                    style={{ color: block.accent }}
                    aria-hidden="true"
                  >
                    +
                  </span>
                </summary>
                <div className="mt-2 text-base leading-snug text-zinc-700">{renderInline(item.a)}</div>
              </details>
            ))}
          </div>
        </section>
      );

    case "video":
      return (
        <div className={block.rounded ? "px-4 py-2" : ""}>
          <video
            src={block.src}
            poster={block.poster ?? undefined}
            controls={!block.autoplay}
            autoPlay={block.autoplay}
            muted={block.autoplay}
            loop={block.autoplay}
            playsInline
            preload={block.autoplay ? "auto" : "none"}
            className={`block h-auto w-full bg-black ${block.rounded ? "rounded-xl" : ""}`}
          />
        </div>
      );

    case "gallery":
      // Horizontal scroll-snap carousel with no JavaScript
      return (
        <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {block.images.map((image, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={image.src}
              alt={image.alt}
              loading="lazy"
              decoding="async"
              className="h-auto w-[82%] flex-none snap-center rounded-xl"
            />
          ))}
        </div>
      );

    case "before_after":
      return (
        <div className="grid grid-cols-2 gap-2 px-4 py-2">
          {[
            { image: block.before, label: block.beforeLabel },
            { image: block.after, label: block.afterLabel },
          ].map(({ image, label }, i) => (
            <figure key={i} className="relative overflow-hidden rounded-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.src} alt={image.alt} loading="lazy" decoding="async" className="block h-auto w-full" />
              <figcaption className="absolute left-2 top-2 rounded-full bg-black/75 px-3 py-1 text-sm font-bold text-white">
                {label}
              </figcaption>
            </figure>
          ))}
        </div>
      );

    case "form":
      // Editor preview: never load the real form (it would start the pixel and call the API)
      if (preview) {
        return (
          <section id="comanda" className="px-4 py-3">
            <div className="rounded-xl border-2 border-dashed border-zinc-400 bg-zinc-100 px-4 py-10 text-center text-sm text-zinc-600">
              <div className="mb-1 text-2xl">🛒</div>
              Formularul de comandă apare aici
              <div className="mt-1 text-xs">landing page: {block.landingSlug || "—"}</div>
            </div>
          </section>
        );
      }
      // #comanda is the anchor used by the buttons ("href": "#comanda")
      return (
        <section id="comanda" className="scroll-mt-4">
          <OwnOrderForm slug={block.landingSlug} org={block.org} thankYouPath={block.thankYouPath} />
        </section>
      );

    case "order_summary":
      return <OrderSummary block={block} />;

    case "postsale_offer":
      return <PostsaleOffer block={block} />;

    case "store_cta":
      return <StoreCta />;

    case "spacer":
      return <div style={{ height: block.height }} aria-hidden="true" />;

    case "footer":
    case "sticky_footer":
      // Rendered separately, outside the page flow
      return null;
  }
}

function Footer({ block }: { block: Extract<PageBlock, { type: "footer" }> }) {
  return (
    <footer className="px-5 py-8 text-center text-sm" style={{ backgroundColor: block.bg, color: block.color }}>
      <div className="mx-auto max-w-[560px] space-y-4">
        {block.logo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={block.logo.src}
            alt={block.logo.alt}
            width={block.logo.width ?? undefined}
            loading="lazy"
            decoding="async"
            className="mx-auto block h-auto max-w-[60%]"
          />
        )}
        {block.company && <p className="whitespace-pre-line leading-relaxed">{block.company}</p>}
        {block.links.length > 0 && (
          <nav className="flex flex-wrap justify-center gap-x-4 gap-y-2">
            {block.links.map((link, i) => (
              <a key={i} href={link.href} className="underline underline-offset-2">
                {link.label}
              </a>
            ))}
          </nav>
        )}
        {block.showAnpc && (
          <nav className="flex flex-col items-center gap-2">
            {ANPC_LINKS.map((link) => (
              <a key={link.href} href={link.href} className="underline underline-offset-2" rel="noopener" target="_blank">
                {link.label}
              </a>
            ))}
          </nav>
        )}
        {block.badges.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-3">
            {block.badges.map((badge, i) => {
              // eslint-disable-next-line @next/next/no-img-element
              const img = <img src={badge.src} alt={badge.alt} loading="lazy" decoding="async" className="h-12 w-auto" />;
              return badge.href ? (
                <a key={i} href={badge.href} rel="noopener" target="_blank">
                  {img}
                </a>
              ) : (
                <span key={i}>{img}</span>
              );
            })}
          </div>
        )}
        {block.copyright && <p className="text-xs">{block.copyright}</p>}
      </div>
    </footer>
  );
}

export default function BlockRenderer({
  blocks,
  background,
  preview = false,
}: {
  blocks: PageBlock[];
  background: string;
  /** Editor preview: replaces the order form with a placeholder */
  preview?: boolean;
}) {
  const firstImageIndex = blocks.findIndex((b) => b.type === "image");
  const topbars = blocks.filter((b) => b.type === "topbar");
  const stickyFooter = blocks.find((b) => b.type === "sticky_footer");
  const footers = blocks.filter((b): b is Extract<PageBlock, { type: "footer" }> => b.type === "footer");
  const flow = blocks
    .map((block, index) => ({ block, index }))
    .filter(({ block }) => block.type !== "topbar" && block.type !== "sticky_footer" && block.type !== "footer");

  return (
    <main className="min-h-screen" style={{ backgroundColor: background }}>
      {topbars.map((block, i) => (
        <Block key={`topbar-${i}`} block={block} index={-1} firstImageIndex={firstImageIndex} preview={preview} />
      ))}

      <div className="mx-auto w-full max-w-[560px]">
        {flow.map(({ block, index }) => {
          const element = <Block key={index} block={block} index={index} firstImageIndex={firstImageIndex} preview={preview} />;
          // Thank-you page: blocks can be limited to a phase and to the presence of the store button
          return block.phase || block.showWhen ? (
            <PhaseGate key={index} phase={block.phase} showWhen={block.showWhen}>
              {element}
            </PhaseGate>
          ) : (
            element
          );
        })}
      </div>

      {footers.map((block, i) => (
        <Footer key={`footer-${i}`} block={block} />
      ))}

      {stickyFooter && stickyFooter.type === "sticky_footer" && <StickyFooter block={stickyFooter} />}
    </main>
  );
}
