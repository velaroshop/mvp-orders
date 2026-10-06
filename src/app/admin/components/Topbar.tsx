"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { getRoleDisplayName } from "@/lib/permissions";
import type { UserRole } from "@/lib/types";

type HelpshipEnvironment = "development" | "production";

export default function Topbar() {
  const { data: session } = useSession();
  const [helpshipEnvironment, setHelpshipEnvironment] = useState<HelpshipEnvironment | null>(null);

  useEffect(() => {
    async function fetchEnvironment() {
      try {
        const response = await fetch("/api/system-settings/environment");
        if (response.ok) {
          const data = await response.json();
          setHelpshipEnvironment(data.environment);
        }
      } catch (error) {
        console.error("Error fetching helpship environment:", error);
      }
    }
    fetchEnvironment();
  }, []);

  if (!session?.user) return null;

  const userName = (session.user as any)?.name || session.user.email || "User";
  const userRole = (session.user as any)?.activeRole as UserRole;

  return (
    <div className="fixed top-0 left-0 right-0 h-14 bg-zinc-950 border-b border-zinc-800/60 z-30 lg:left-56">
      <div className="h-full pl-14 lg:pl-0 flex items-center justify-between px-6">

        {/* Left — DEV mode indicator */}
        <div className="w-40 flex items-center">
          {helpshipEnvironment === "development" && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-900/40 border border-amber-600/60 rounded-lg animate-pulse">
              <span className="text-amber-400 text-xs">🔧</span>
              <span className="text-amber-300 text-[11px] font-semibold tracking-wide">DEV MODE</span>
            </div>
          )}
        </div>

        {/* Center — user name + role */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <p className="text-[13px] font-semibold text-white leading-tight">{userName}</p>
          {userRole && (
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest leading-tight mt-0.5">
              {getRoleDisplayName(userRole)}
            </p>
          )}
        </div>

        {/* Right — placeholder for balance */}
        <div className="w-40" />
      </div>
    </div>
  );
}
