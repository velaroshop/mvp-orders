"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import OwnFormSkeleton from "./OwnFormSkeleton";

// The form is the heaviest script of the page and sits below the first screen. Its code is downloaded only after the page
// has been painted and the browser is idle, so it does not compete with the CSS and content on slow phones.
// Until then the page shows the same placeholder the form itself shows while loading (no layout jump).
const OwnOrderForm = dynamic(() => import("./OwnOrderForm"), { ssr: false, loading: () => <OwnFormSkeleton /> });

type FormProps = { slug: string; org?: string | null; thankYouPath?: string | null };

export default function LazyOwnOrderForm(props: FormProps) {
  const [load, setLoad] = useState(false);

  useEffect(() => {
    const start = () => setLoad(true);
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(start, { timeout: 1500 });
      return () => window.cancelIdleCallback(id);
    }
    const timer = window.setTimeout(start, 800);
    return () => window.clearTimeout(timer);
  }, []);

  return load ? <OwnOrderForm {...props} /> : <OwnFormSkeleton />;
}
