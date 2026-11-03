"use client";

import { useEffect } from "react";
import { newSessionId } from "@/lib/session-id";

/**
 * Anonymous visit counter of an own page: reports that the page was opened (with the source and screen width), then, as the
 * visitor goes on, that the order form came into view, how far they scrolled, how long they stayed and how fast the page was.
 * It starts only once the page is loaded and the browser is idle, sends everything with sendBeacon (no waiting, no answer
 * needed) and does nothing if anything is missing. `?notrack=1` in the address turns it off.
 */
export default function PageTracker({ pageId }: { pageId: string }) {
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("notrack") === "1" || typeof navigator.sendBeacon !== "function") return;

      const sid = newSessionId();
      const startedAt = Date.now();
      let formSeen = false;
      let formStarted = false;
      let ordered = false;
      let formMs: number | null = null;
      let maxScroll = 0;
      let jsErrors = 0;
      let firstError: string | null = null;
      let opened = false;

      const send = (extra: Record<string, unknown>) => {
        try {
          navigator.sendBeacon("/api/page-visits", new Blob([JSON.stringify({ sid, pid: pageId, ...extra })], { type: "application/json" }));
        } catch {
          // Never fail: counting must not affect the page
        }
      };

      const fcp = () => {
        const entry = performance.getEntriesByName("first-contentful-paint")[0];
        return entry ? Math.round(entry.startTime) : null;
      };

      const refHost = () => {
        try {
          const host = document.referrer ? new URL(document.referrer).hostname : "";
          return host && host !== window.location.hostname ? host : null;
        } catch {
          return null;
        }
      };

      const open = () => {
        if (opened) return;
        opened = true;
        send({
          open: true,
          us: params.get("utm_source"),
          um: params.get("utm_medium"),
          uc: params.get("utm_campaign"),
          un: params.get("utm_content"),
          ut: params.get("utm_term"),
          ref: refHost(),
          w: window.innerWidth,
          fcp: fcp(),
          ...(formSeen ? { form: true, fm: formMs } : {}),
          ...(formStarted ? { st: true } : {}),
          ...(ordered ? { ord: true } : {}),
        });
      };

      // Counts the errors and keeps the first one as short text: message and where it happened (file without query string, line)
      const onError = (event: ErrorEvent) => {
        jsErrors += 1;
        if (firstError) return;
        try {
          const file = event.filename ? event.filename.split(/[?#]/)[0].replace(/^https?:\/\/[^/]+/, "") : "";
          firstError = `${event.message || "error"}${file ? ` @ ${file}:${event.lineno || 0}` : ""}`.slice(0, 200);
        } catch {
          firstError = "error";
        }
      };
      window.addEventListener("error", onError);

      const onScroll = () => {
        const doc = document.documentElement;
        const total = doc.scrollHeight - window.innerHeight;
        const pct = total > 0 ? ((window.scrollY || doc.scrollTop) / total) * 100 : 100;
        if (pct > maxScroll) maxScroll = Math.min(100, Math.round(pct));
      };
      window.addEventListener("scroll", onScroll, { passive: true });

      // The order form (section #comanda) came into view
      let observer: IntersectionObserver | null = null;
      const form = document.getElementById("comanda");
      if (form && typeof IntersectionObserver === "function") {
        observer = new IntersectionObserver((entries) => {
          if (formSeen || !entries.some((e) => e.isIntersecting)) return;
          formSeen = true;
          formMs = Math.round(performance.now());
          observer?.disconnect();
          if (opened) send({ form: true, fm: formMs });
        });
        observer.observe(form);
      }

      // The visitor touched a field of the order form (phone, name...): started filling it
      const onFocus = (event: FocusEvent) => {
        if (formStarted || !(event.target instanceof HTMLElement) || !event.target.closest("#comanda")) return;
        if (!/^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName)) return;
        formStarted = true;
        if (opened) send({ st: true });
      };
      document.addEventListener("focusin", onFocus);

      // The order form announces a sent order (the page is left right after, sendBeacon still goes through)
      const onOrdered = () => {
        ordered = true;
        formStarted = true;
        send({ ord: true, st: true });
      };
      window.addEventListener("velaro:ordered", onOrdered);

      // Seen, scroll, time on page, speed and errors: sent whenever the page goes to the background (also the last chance on phones)
      const report = () => {
        if (!opened) return;
        send({
          sc: maxScroll,
          t: Math.round((Date.now() - startedAt) / 1000),
          fcp: fcp(),
          err: jsErrors,
          ...(firstError ? { em: firstError } : {}),
          ...(formSeen ? { form: true, fm: formMs } : {}),
          ...(formStarted ? { st: true } : {}),
          ...(ordered ? { ord: true } : {}),
        });
      };
      const onHidden = () => {
        if (document.visibilityState === "hidden") report();
      };
      document.addEventListener("visibilitychange", onHidden);
      window.addEventListener("pagehide", report);

      // Wait for the page to be loaded and the browser idle: the count never competes with the page itself
      const start = () => {
        const idle = (window as unknown as { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => void }).requestIdleCallback;
        if (typeof idle === "function") idle(open, { timeout: 4000 });
        else setTimeout(open, 2000);
      };
      if (document.readyState === "complete") start();
      else window.addEventListener("load", start, { once: true });

      return () => {
        window.removeEventListener("error", onError);
        window.removeEventListener("scroll", onScroll);
        document.removeEventListener("focusin", onFocus);
        window.removeEventListener("velaro:ordered", onOrdered);
        document.removeEventListener("visibilitychange", onHidden);
        window.removeEventListener("pagehide", report);
        observer?.disconnect();
      };
    } catch {
      // Never fail: counting must not affect the page
    }
  }, [pageId]);

  return null;
}
