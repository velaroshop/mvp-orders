"use client";

import { useEffect, useState } from "react";
import { normalizeBlocks, normalizePageBackground, type PageBlock } from "@/lib/page-blocks";
import BlockRenderer from "@/components/page-blocks/BlockRenderer";
import { ThankYouPreviewProvider } from "@/components/thank-you/ThankYouProvider";

// Rendered inside an iframe by the page editor: it receives the page being edited via postMessage and shows it
// with the real renderer, at the real phone width. It holds no data and never calls the order API.

type PreviewMessage = {
  type: "velaro-preview";
  kind: "landing" | "thank_you";
  blocks: unknown;
  background: unknown;
  phase: "offer" | "final";
  withStoreCta: boolean;
};

export default function PagePreview() {
  const [state, setState] = useState<{ blocks: PageBlock[]; background: string; kind: "landing" | "thank_you"; phase: "offer" | "final"; withStoreCta: boolean } | null>(null);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      const data = event.data as PreviewMessage | undefined;
      if (!data || data.type !== "velaro-preview") return;
      setState({
        blocks: normalizeBlocks(data.blocks),
        background: normalizePageBackground(data.background),
        kind: data.kind,
        phase: data.phase,
        withStoreCta: data.withStoreCta,
      });
    }
    window.addEventListener("message", onMessage);
    window.parent.postMessage({ type: "velaro-preview-ready" }, window.location.origin);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  if (!state) return <div className="p-6 text-center text-sm text-zinc-500">Se încarcă previzualizarea…</div>;

  const page = <BlockRenderer blocks={state.blocks} background={state.background} preview />;
  return state.kind === "thank_you" ? (
    <ThankYouPreviewProvider phase={state.phase} withStoreCta={state.withStoreCta}>
      {page}
    </ThankYouPreviewProvider>
  ) : (
    page
  );
}
