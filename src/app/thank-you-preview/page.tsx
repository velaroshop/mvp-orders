"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

function PreviewContent() {
  const searchParams = useSearchParams();
  const previewId = searchParams.get("preview");

  useEffect(() => {
    if (!previewId) return;

    // Load the thank-you embed script
    const script = document.createElement("script");
    script.src = "/thank-you-embed.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      script.remove();
    };
  }, [previewId]);

  if (!previewId) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#dc2626" }}>
        Lipsește parametrul preview.
      </div>
    );
  }

  return (
    // Plain full-width block, like a theme page: the embed script breaks out of its container with 100vw / left 50%,
    // which only lines up when the container starts at the left edge of the window (no centering, no padding)
    <div style={{ minHeight: "100vh", background: "#f8f9fa" }}>
      <div id="preview-thank-you" style={{ width: "100%" }} />
    </div>
  );
}

export default function ThankYouPreviewPage() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: 60, textAlign: "center", color: "#6b7280" }}>
          Se încarcă...
        </div>
      }
    >
      <PreviewContent />
    </Suspense>
  );
}
