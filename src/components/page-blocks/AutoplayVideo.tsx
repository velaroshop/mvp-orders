"use client";

import { useEffect, useRef } from "react";
import type { VideoBlock } from "@/lib/page-blocks";

/**
 * Looping, muted clip that behaves like an animated image.
 * - The cover image (poster) is on the page from the start and stays if the clip never plays.
 * - The clip is downloaded only when it is about to be seen, and it pauses when it leaves the screen (saves data and battery).
 * - If the phone refuses to play it (power saving, data saver), the player controls appear so it can be started with a tap.
 */
export default function AutoplayVideo({ block }: { block: VideoBlock }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    // Set as a property too: React does not write the "muted" attribute, and phones only autoplay muted videos
    video.muted = true;

    const play = () => {
      const promise = video.play();
      if (promise) promise.catch(() => video.setAttribute("controls", ""));
    };

    if (typeof IntersectionObserver === "undefined") {
      play();
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) play();
          else video.pause();
        }
      },
      { rootMargin: "300px 0px" },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  return (
    <video
      ref={ref}
      src={block.src}
      poster={block.poster ?? undefined}
      width={block.width ?? undefined}
      height={block.height ?? undefined}
      muted
      loop
      playsInline
      preload="none"
      className="block h-auto w-full bg-black"
      style={{ ...(block.width && block.height ? { aspectRatio: `${block.width} / ${block.height}` } : {}), ...(block.radius > 0 ? { borderRadius: block.radius } : {}) }}
    />
  );
}
