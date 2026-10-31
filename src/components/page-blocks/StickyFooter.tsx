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
      <div aria-hidden="true" className="h-24" />
      <div
        data-sticky-footer
        data-hidden={hidden}
        aria-hidden={hidden}
        className={`fixed inset-x-0 bottom-0 z-50 bg-white/95 px-3 pt-3 shadow-[0_-4px_16px_rgba(0,0,0,0.15)] transition-all duration-200 ${
          hidden ? "pointer-events-none translate-y-full opacity-0" : "translate-y-0 opacity-100"
        }`}
        style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
      >
        <a
          href={block.href}
          tabIndex={hidden ? -1 : 0}
          className="mx-auto block max-w-[560px] rounded-xl px-6 py-4 text-center text-lg font-bold"
          style={{ backgroundColor: block.bg, color: block.color }}
        >
          {block.text}
        </a>
      </div>
    </>
  );
}
