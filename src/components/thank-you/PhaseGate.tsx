"use client";

import type { ReactNode } from "react";
import type { BlockCondition, BlockPhase } from "@/lib/page-blocks";
import { useThankYou } from "./ThankYouProvider";

/**
 * Shows its (server-rendered) children only in the given thank-you phase and/or when the store button
 * is (or is not) available. Outside the thank-you page it renders them as-is.
 */
export default function PhaseGate({
  phase,
  showWhen,
  children,
}: {
  phase?: BlockPhase;
  showWhen?: BlockCondition;
  children: ReactNode;
}) {
  const ctx = useThankYou();
  if (!ctx) return <>{children}</>;
  if (phase && ctx.phase !== phase) return null;
  if (showWhen) {
    const hasCta = !!ctx.data?.thankYouCta;
    if ((showWhen === "cta") !== hasCta) return null;
  }
  return <>{children}</>;
}
