"use client";

import type { ReactNode } from "react";
import type { BlockPhase } from "@/lib/page-blocks";
import { useThankYou } from "./ThankYouProvider";

/** Shows its (server-rendered) children only in the given thank-you phase. Outside that page it renders them as-is. */
export default function PhaseGate({ phase, children }: { phase: BlockPhase; children: ReactNode }) {
  const ctx = useThankYou();
  if (!ctx) return <>{children}</>;
  return ctx.phase === phase ? <>{children}</> : null;
}
