"use client";

import { useState, useRef, useEffect } from "react";
import { signOut, useSession } from "next-auth/react";
import { useOrganization } from "@/contexts/OrganizationContext";
import { getRoleDisplayName, getRoleBadgeColor } from "@/lib/permissions";
import type { UserRole } from "@/lib/types";

type HelpshipEnvironment = "development" | "production";

export default function Topbar() {
  const { data: session } = useSession();
  const { organizations, activeOrganization, setActiveOrganization } = useOrganization();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showOrgSwitcher, setShowOrgSwitcher] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [helpshipEnvironment, setHelpshipEnvironment] = useState<HelpshipEnvironment | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
        setShowOrgSwitcher(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch helpship environment for DEV mode indicator
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

  const userRole = (session.user as any)?.activeRole as UserRole;

  return (
    <div className="fixed top-0 left-0 right-0 h-16 bg-zinc-900 border-b border-zinc-800 z-30 lg:left-48">
      <div className="h-full pl-16 pr-3 sm:px-6 lg:pl-6 flex items-center justify-between">
        {/* Left side - Organization info */}
        <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
          {activeOrganization && (
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-emerald-600 flex items-center justify-center shrink-0">
                <span className="text-white font-bold text-base sm:text-lg">
                  {activeOrganization.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="min-w-0 hidden sm:block">
                <h2 className="text-sm font-semibold text-white truncate">
                  {activeOrganization.name}
                </h2>
                <p className="text-xs text-zinc-400 truncate">
                  Organization Dashboard
                </p>
              </div>
            </div>
          )}
        </div>

        {/* DEV Mode Indicator */}
        {helpshipEnvironment === "development" && (
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-amber-900/50 border border-amber-600 rounded-lg mr-4 animate-pulse">
            <span className="text-amber-400 text-sm">🔧</span>
            <span className="text-amber-300 text-xs font-semibold">DEV MODE</span>
          </div>
        )}

        {/* Right side - User menu */}
        <div className="relative shrink-0" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 sm:gap-3 px-2 sm:px-4 py-2 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <div className="text-right hidden lg:block">
              <div className="text-sm font-medium text-white truncate max-w-50">
                {session.user.email}
              </div>
              {userRole && (
                <div className="flex items-center justify-end gap-1.5 mt-0.5">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${getRoleBadgeColor(userRole)}`}>
                    {getRoleDisplayName(userRole)}
                  </span>
                </div>
              )}
            </div>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center font-medium shrink-0">
              {session.user.name?.[0]?.toUpperCase() || session.user.email?.[0]?.toUpperCase()}
            </div>
            <svg
              className={`w-4 h-4 text-zinc-400 transition-transform hidden sm:block ${isDropdownOpen ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-72 bg-zinc-800 rounded-lg shadow-lg border border-zinc-700 py-2">
              {/* User Info */}
              <div className="px-4 py-3 border-b border-zinc-700">
                <div className="text-sm font-medium text-white">
                  {session.user.name || "User"}
                </div>
                <div className="text-xs text-zinc-400 mt-0.5">{session.user.email}</div>
                {userRole && (
                  <div className="mt-2">
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium border ${getRoleBadgeColor(userRole)}`}>
                      {getRoleDisplayName(userRole)}
                    </span>
                  </div>
                )}
              </div>

              {/* Organization Info */}
              {activeOrganization && (
                <div className="px-4 py-3 border-b border-zinc-700">
                  <div className="text-xs text-zinc-400 mb-1">Organization</div>
                  <div className="text-sm font-medium text-white">
                    {activeOrganization.name}
                  </div>
                </div>
              )}

              {/* Organization Switcher */}
              {organizations.length > 1 && (
                <div className="border-b border-zinc-700">
                  <button
                    onClick={() => setShowOrgSwitcher(!showOrgSwitcher)}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-zinc-700 flex items-center justify-between"
                  >
                    <span className="text-zinc-300">Switch Organization</span>
                    <svg
                      className={`w-4 h-4 text-zinc-400 transition-transform ${showOrgSwitcher ? "rotate-180" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>

                  {showOrgSwitcher && (
                    <div className="bg-zinc-900 border-t border-zinc-700">
                      {organizations.map((org) => (
                        <button
                          key={org.id}
                          onClick={() => {
                            setActiveOrganization(org);
                            setShowOrgSwitcher(false);
                            setIsDropdownOpen(false);
                          }}
                          className={`w-full px-6 py-2 text-left text-sm hover:bg-zinc-700 ${
                            org.id === activeOrganization?.id
                              ? "bg-emerald-900 text-emerald-100"
                              : "text-zinc-300"
                          }`}
                        >
                          <div className="font-medium">{org.name}</div>
                          <div className="text-xs text-zinc-400">{org.role}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Sign Out */}
              <button
                onClick={() => signOut({ callbackUrl: "/auth/signin" })}
                className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-zinc-700 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
