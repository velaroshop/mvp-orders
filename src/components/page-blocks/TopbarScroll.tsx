"use client";

import { useEffect, useState } from "react";
import type { TopbarBlock } from "@/lib/page-blocks";

const ROTATE_MS = { slow: 6000, medium: 4000, fast: 2500 } as const;
// Marquee speed in px per second
const MARQUEE_PX = { slow: 30, medium: 50, fast: 80 } as const;

/**
 * Scrolling messages of the top bar. "rotate": one message at a time, fading into the next (all messages are in the
 * HTML, stacked, so nothing jumps). "marquee": continuous sideways run. Both pause while the bar is touched or hovered,
 * and with "reduce motion" turned on in the phone only the first message is shown, still.
 */
export default function TopbarScroll({ block, messages }: { block: TopbarBlock; messages: string[] }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);
    const onChange = () => setReduced(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  const rotating = block.effect === "rotate" && messages.length > 1 && !reduced;
  useEffect(() => {
    if (!rotating || paused) return;
    const timer = setInterval(() => setActive((i) => (i + 1) % messages.length), ROTATE_MS[block.speed]);
    return () => clearInterval(timer);
  }, [rotating, paused, messages.length, block.speed]);

  const pauseProps = {
    onMouseEnter: () => setPaused(true),
    onMouseLeave: () => setPaused(false),
    onTouchStart: () => setPaused(true),
    onTouchEnd: () => setPaused(false),
    onTouchCancel: () => setPaused(false),
  };

  if (block.effect === "marquee" && messages.length > 0) {
    const gap = block.size * 3;
    // Rough length of one full set of messages, to get a steady speed whatever the text length
    const setWidth = messages.reduce((sum, m) => sum + (m.length * block.size * 0.55 + gap), 0);
    // The track is two identical halves that slide by exactly one half; each half must be wider than a phone screen
    const reps = Math.max(1, Math.ceil(700 / setWidth));
    const half = Array.from({ length: reps }, () => messages).flat();
    const seconds = Math.max(8, Math.round((setWidth * reps) / MARQUEE_PX[block.speed]));
    const items = [...half, ...half];
    return (
      <div className="vtb-marquee overflow-hidden whitespace-nowrap" data-paused={paused ? "true" : "false"} {...pauseProps}>
        <style>{`
          @keyframes vtb-run { from { transform: translateX(0) } to { transform: translateX(-50%) } }
          .vtb-track { display: inline-flex; animation: vtb-run ${seconds}s linear infinite; }
          .vtb-marquee[data-paused="true"] .vtb-track { animation-play-state: paused; }
          @media (prefers-reduced-motion: reduce) {
            .vtb-track { animation: none; justify-content: center; }
            .vtb-item:not(:first-child) { display: none; }
          }
        `}</style>
        <div className="vtb-track">
          {items.map((m, i) => (
            <span key={i} className="vtb-item" style={{ paddingRight: gap }} aria-hidden={i >= messages.length}>
              {m}
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="grid" {...pauseProps}>
      {messages.map((m, i) => (
        <span
          key={i}
          className="transition-opacity duration-500"
          style={{ gridArea: "1 / 1", opacity: i === (rotating ? active : 0) ? 1 : 0 }}
          aria-hidden={i !== (rotating ? active : 0)}
        >
          {m}
        </span>
      ))}
    </div>
  );
}
