"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The return form (the same widget the Shopify page embeds, /widget/refund) inside a page. The widget reports its own
 * height by message, so the frame grows with the form and never shows a scroll bar.
 */
export default function RefundFormEmbed({ org }: { org: string }) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(320);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== frameRef.current?.contentWindow) return;
      const data = event.data as { type?: string; height?: number } | null;
      if (data?.type === "refund-form-resize" && typeof data.height === "number" && data.height > 0) setHeight(Math.ceil(data.height));
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return (
    <div className="px-4 py-3">
      <iframe
        ref={frameRef}
        title="Formular returnare produse"
        src={`/widget/refund?org=${encodeURIComponent(org)}`}
        width="100%"
        height={height}
        scrolling="no"
        style={{ border: "none", overflow: "hidden", display: "block" }}
      />
    </div>
  );
}
