"use client";

import { useEffect, useState } from "react";
import type { StickyFooterBlock } from "@/lib/page-blocks";

/**
 * Button fixed at the bottom of the screen. It slides away while the order form (#comanda) or the page footer is
 * on screen, so it never sits on top of the form's own "place order" button.
 */
export default function StickyFooter({ block }: { block: StickyFooterBlock }) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const targets: Element[] = [document.getElementById("comanda"), document.querySelector("footer")].filter(
      (el): el is HTMLElement => el !== null,
    );
    if (targets.length === 0 || !("IntersectionObserver" in window)) return;

    const visible = new Set<Element>();
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) visible.add(entry.target);
        else visible.delete(entry.target);
      }
      setHidden(visible.size > 0);
    });
    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, []);

  return (
    <>
      {/* Spacer so the fixed button never covers the end of the page */}
      <div aria-hidden="true" className={block.text2 ? "h-32" : "h-24"} />
      <div
        data-sticky-footer
        data-hidden={hidden}
        aria-hidden={hidden}
        className={`fixed inset-x-0 bottom-0 z-50 px-3 pt-3 shadow-[0_-4px_16px_rgba(0,0,0,0.15)] transition-all duration-200 ${
          hidden ? "pointer-events-none translate-y-full opacity-0" : "translate-y-0 opacity-100"
        }`}
        style={{
          paddingBottom: "max(12px, env(safe-area-inset-bottom))",
          // White stays slightly see-through, as before; any other color is solid
          backgroundColor: block.barBg.toLowerCase() === "#ffffff" ? "rgba(255,255,255,0.95)" : block.barBg,
        }}
      >
        <a
          href={block.href}
          tabIndex={hidden ? -1 : 0}
          className={`mx-auto block max-w-[560px] rounded-xl px-6 py-4 text-center font-bold${
            block.animation === "none" ? "" : ` vlr-sticky-${block.animation} vlr-sticky-${block.speed}`
          }`}
          style={{ backgroundColor: block.bg, color: block.color, fontSize: block.size, lineHeight: 1.555, ["--vlr-ring" as string]: block.bg }}
        >
          {block.text}
          {block.animation === "arrow" && (
            <span aria-hidden="true" className="vlr-sticky-arrow-icon ml-2 inline-block">
              →
            </span>
          )}
          {block.text2 && (
            <span className="mt-1 block font-normal" style={{ fontSize: block.size2 }}>
              {block.text2}
            </span>
          )}
        </a>
      </div>
    </>
  );
}
