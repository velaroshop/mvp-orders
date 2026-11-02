import type { CSSProperties, ReactNode } from "react";
import { ANPC_LINKS, type FooterBlock, type PageBlock, type TextSize } from "@/lib/page-blocks";
import { EMPTY_FOOTER_LIBRARY, resolveFooter, type FooterLibrary } from "@/lib/footer-library";
import OwnOrderForm from "@/components/own-form/OwnOrderForm";
import OrderSummary from "@/components/thank-you/OrderSummary";
import PostsaleOffer from "@/components/thank-you/PostsaleOffer";
import StoreCta from "@/components/thank-you/StoreCta";
import PhaseGate from "@/components/thank-you/PhaseGate";
import StickyFooter from "@/components/page-blocks/StickyFooter";
import FbReactionIcon from "@/components/page-blocks/FbReactionIcon";
import AutoplayVideo from "@/components/page-blocks/AutoplayVideo";
import TopbarScroll from "@/components/page-blocks/TopbarScroll";
import TopbarTimer from "@/components/page-blocks/TopbarTimer";

// Server component on purpose: no client JavaScript, so own pages stay as light as possible.

const SIZE_CLASS: Record<TextSize, string> = {
  sm: "text-sm",
  base: "text-base",
  lg: "text-lg",
  xl: "text-xl",
  "2xl": "text-2xl",
};

/** Margin around an image or video: full inset at the sides, half of it above and below */
const insetStyle = (inset: number): CSSProperties | undefined =>
  inset > 0 ? { padding: `${Math.round(inset / 2)}px ${inset}px` } : undefined;

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
    case "topbar": {
      const messages = block.messages.length > 0 ? block.messages : block.text ? [block.text] : [];
      const scrolling = block.mode === "scroll" && messages.length > 0;
      const content = scrolling ? (
        <TopbarScroll block={block} messages={messages} />
      ) : (
        <>{block.text}</>
      );
      return (
        <div
          className={`w-full px-3 py-2 text-center font-semibold ${block.sticky ? "sticky top-0 z-40" : ""}`}
          style={{ backgroundColor: block.bg, color: block.color, fontSize: block.size }}
        >
          {block.href ? (
            <a href={block.href} style={{ color: "inherit", textDecoration: "none" }}>
              {content}
            </a>
          ) : (
            content
          )}
        </div>
      );
    }

    case "topbar_timer":
      return (
        <div
          className={`w-full px-3 py-2 text-center font-semibold ${block.sticky ? "sticky top-0 z-40" : ""}`}
          style={{ backgroundColor: block.bg, color: block.color, fontSize: block.size, borderRadius: `0 0 ${block.radius}px ${block.radius}px` }}
        >
          <TopbarTimer block={block} />
        </div>
      );

    case "products":
      return (
        <section className="px-3 py-4" style={{ backgroundColor: block.bg, color: block.color }}>
          {block.title && <h2 className="mb-3 text-center text-xl font-bold sm:text-2xl">{block.title}</h2>}
          <div className="vlr-products" style={{ "--cols-mobile": block.columnsMobile, "--cols-desktop": block.columnsDesktop } as CSSProperties}>
            {block.items.map((card, i) => (
              <a key={i} href={card.href} className="flex flex-col overflow-hidden border border-zinc-200 bg-white text-inherit no-underline" style={{ borderRadius: block.radius }}>
                <div className="relative w-full overflow-hidden bg-zinc-100" style={{ aspectRatio: block.ratio }}>
                  {card.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={card.image}
                      alt={card.title}
                      width={card.width ?? undefined}
                      height={card.height ?? undefined}
                      loading="lazy"
                      decoding="async"
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  )}
                  {card.badge && (
                    <span className="absolute left-2 top-2 rounded px-2 py-0.5 text-xs font-bold leading-tight" style={{ backgroundColor: card.badgeBg, color: card.badgeColor }}>
                      {card.badge}
                    </span>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-1 p-2.5 sm:p-3">
                  <div className="text-sm font-semibold leading-snug sm:text-base" style={{ color: block.color }}>
                    {card.title}
                  </div>
                  {(card.price || card.oldPrice) && (
                    <div className="flex flex-wrap items-baseline gap-x-2 text-sm sm:text-base" style={{ color: block.color }}>
                      {card.price && <span className="font-bold">{card.price}</span>}
                      {card.oldPrice && <span className="text-xs line-through opacity-60 sm:text-sm">{card.oldPrice}</span>}
                    </div>
                  )}
                  <span className="mt-auto block rounded-lg px-3 py-2 text-center text-sm font-semibold" style={{ backgroundColor: block.buttonBg, color: block.buttonColor }}>
                    {block.buttonLabel}
                  </span>
                </div>
              </a>
            ))}
          </div>
        </section>
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
          // Images below the first screen must not compete with the main image and the CSS for the connection
          fetchPriority={index === firstImageIndex ? "high" : "low"}
          decoding="async"
          className="block h-auto w-full"
          style={block.radius > 0 ? { borderRadius: block.radius } : undefined}
        />
      );
      const wrapped = block.href ? <a href={block.href}>{img}</a> : img;
      return (
        <div style={insetStyle(block.inset)}>
          {block.maxWidth ? <div className="mx-auto w-full" style={{ maxWidth: block.maxWidth }}>{wrapped}</div> : wrapped}
        </div>
      );
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

    case "rich_text":
      // The html was cleaned on save and again before rendering the public page (sanitize-rich-text.ts)
      return <div className="vlr-rich px-4 py-3" style={{ color: block.color, fontSize: block.size }} dangerouslySetInnerHTML={{ __html: block.html }} />;

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

    case "fb_comments": {
      const meta = "#65676b";
      const avatarOf = (person: { name: string; avatar: string | null }, px: number) =>
        person.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={person.avatar} alt="" width={px} height={px} loading="lazy" decoding="async" className="shrink-0 rounded-full object-cover" style={{ width: px, height: px }} />
        ) : (
          <svg viewBox="0 0 40 40" width={px} height={px} className="shrink-0 rounded-full" aria-hidden="true">
            <rect width="40" height="40" fill="#e4e6eb" />
            <circle cx="20" cy="15" r="7" fill="#bcc0c4" />
            <path d="M6 40c0-9 6.5-14 14-14s14 5 14 14Z" fill="#bcc0c4" />
          </svg>
        );
      return (
        <section className="px-4 py-4">
          {block.title && <h2 className="mb-3 text-center text-xl font-bold text-zinc-900">{block.title}</h2>}
          <div className="space-y-4 rounded-xl border border-zinc-200 p-3 shadow-sm" style={{ backgroundColor: block.cardBg, color: block.color }}>
            {block.items.map((c, i) => (
              <div key={i} className="flex items-start gap-2">
                {avatarOf(c, 36)}
                <div className="min-w-0 flex-1">
                  <div className="inline-block max-w-full rounded-2xl px-3 py-2 align-top" style={{ backgroundColor: block.bubbleBg, fontSize: block.size }}>
                    {c.name && <div className="text-[0.87em] font-semibold leading-tight">{c.name}</div>}
                    <div className="leading-snug">{renderInline(c.text)}</div>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 px-3 text-[13px] leading-5" style={{ color: meta }}>
                    {c.when && <span>{c.when}</span>}
                    {block.showActions && (
                      <>
                        <span className="font-semibold">Like</span>
                        <span className="font-semibold">Reply</span>
                      </>
                    )}
                    {c.verified && <span className="italic">Client verificat</span>}
                    {(c.count > 0 || c.reactions.length > 0) && (
                      <span className="flex items-center gap-1">
                        {c.count > 0 && <span>{c.count}</span>}
                        <span className="flex items-center">
                          {c.reactions.map((reaction, j) => (
                            <span key={reaction} className="rounded-full" style={{ marginLeft: j === 0 ? 0 : -3, boxShadow: `0 0 0 2px ${block.cardBg}`, zIndex: 3 - j, display: "inline-flex" }}>
                              <FbReactionIcon type={reaction} size={16} />
                            </span>
                          ))}
                        </span>
                      </span>
                    )}
                  </div>
                  {c.reply && (
                    <div className="mt-2 flex items-start gap-2">
                      {avatarOf(c.reply, 28)}
                      <div className="min-w-0 flex-1">
                        <div className="inline-block max-w-full rounded-2xl px-3 py-2" style={{ backgroundColor: block.bubbleBg, fontSize: block.size }}>
                          {c.reply.name && <div className="text-[0.87em] font-semibold leading-tight">{c.reply.name}</div>}
                          <div className="leading-snug">{renderInline(c.reply.text)}</div>
                        </div>
                        {(c.reply.when || block.showActions) && (
                          <div className="mt-1 flex gap-3 px-3 text-[13px] leading-5" style={{ color: meta }}>
                            {c.reply.when && <span>{c.reply.when}</span>}
                            {block.showActions && (
                              <>
                                <span className="font-semibold">Like</span>
                                <span className="font-semibold">Reply</span>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      );
    }

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
        <div style={insetStyle(block.inset)}>
          {block.autoplay ? (
            <AutoplayVideo block={block} />
          ) : (
            <video
              src={block.src}
              poster={block.poster ?? undefined}
              width={block.width ?? undefined}
              height={block.height ?? undefined}
              controls
              playsInline
              preload="none"
              className="block h-auto w-full bg-black"
              style={{ ...(block.width && block.height ? { aspectRatio: `${block.width} / ${block.height}` } : {}), ...(block.radius > 0 ? { borderRadius: block.radius } : {}) }}
            />
          )}
        </div>
      );

    case "gallery":
      // Horizontal scroll-snap carousel with no JavaScript
      return (
        <div className="flex snap-x snap-mandatory items-start gap-3 overflow-x-auto px-4 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {block.images.map((image, i) => (
            <figure
              key={i}
              className="w-[82%] flex-none snap-center overflow-hidden rounded-xl"
              style={image.caption && block.captionBox ? { backgroundColor: block.captionBg } : undefined}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.src} alt={image.alt || image.caption} loading="lazy" decoding="async" className="block h-auto w-full" />
              {image.caption && (
                <figcaption
                  className="overflow-hidden text-ellipsis whitespace-nowrap px-2 py-1.5"
                  style={{ color: block.captionColor, fontSize: block.captionSize, textAlign: block.captionAlign }}
                >
                  {image.caption}
                </figcaption>
              )}
            </figure>
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

function Footer({ block }: { block: FooterBlock }) {
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
          <nav className="flex flex-wrap items-center justify-center gap-3">
            {ANPC_LINKS.map((link) => (
              <a key={link.href} href={link.href} rel="nofollow noopener" target="_blank">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={link.src} alt={link.label} width={170} height={42} loading="lazy" decoding="async" className="h-auto w-[170px]" />
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
  footerLibrary = EMPTY_FOOTER_LIBRARY,
  layout = "narrow",
}: {
  blocks: PageBlock[];
  background: string;
  /** Footers of the organization, for "shared_footer" blocks */
  footerLibrary?: FooterLibrary;
  /** "narrow": phone-style column (560 px); "wide": up to 1200 px (homepages with a product grid) */
  layout?: "narrow" | "wide";
  /** Editor preview: replaces the order form with a placeholder */
  preview?: boolean;
}) {
  const firstImageIndex = blocks.findIndex((b) => b.type === "image");
  const topbars = blocks.filter((b) => b.type === "topbar" || b.type === "topbar_timer");
  const stickyFooter = blocks.find((b) => b.type === "sticky_footer");
  const footers = blocks.flatMap((b): FooterBlock[] => {
    if (b.type === "footer") return [b];
    if (b.type === "shared_footer") {
      const footer = resolveFooter(b.footerId, footerLibrary);
      return footer ? [footer] : [];
    }
    return [];
  });
  const flow = blocks
    .map((block, index) => ({ block, index }))
    .filter(({ block }) => block.type !== "topbar" && block.type !== "topbar_timer" && block.type !== "sticky_footer" && block.type !== "footer" && block.type !== "shared_footer");

  return (
    <main className="min-h-screen" style={{ backgroundColor: background }}>
      {/* A bar that stays on top would cover the form's heading when a button scrolls to it: leave room */}
      {topbars.some((b) => b.sticky) && (
        <style>{`#comanda{scroll-margin-top:${Math.ceil(Math.max(...topbars.map((b) => (b.type === "topbar_timer" ? b.size * 3 + 8 : b.size * 1.5))) + 32)}px}`}</style>
      )}
      {topbars.map((block, i) => (
        <Block key={`topbar-${i}`} block={block} index={-1} firstImageIndex={firstImageIndex} preview={preview} />
      ))}

      <div className={`mx-auto w-full ${layout === "wide" ? "max-w-[1200px]" : "max-w-[560px]"}`}>
        {flow.map(({ block, index }) => {
          const inner = <Block key={index} block={block} index={index} firstImageIndex={firstImageIndex} preview={preview} />;
          // Space under the block lives inside the phase gate, so a hidden block leaves no gap
          const element = block.spaceBelow ? <div key={index} style={{ paddingBottom: block.spaceBelow }}>{inner}</div> : inner;
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
