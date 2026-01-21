"use client";

import { useState, useRef, useEffect } from "react";
import { signOut, useSession } from "next-auth/react";
import { useOrganization } from "@/contexts/OrganizationContext";
import { getRoleDisplayName, getRoleBadgeColor } from "@/lib/permissions";
import type { UserRole } from "@/lib/types";

export default function UserMenu() {
  const { data: session } = useSession();
  const { organizations, activeOrganization, setActiveOrganization } =
    useOrganization();
  const [isOpen, setIsOpen] = useState(false);
  const [showOrgSwitcher, setShowOrgSwitcher] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowOrgSwitcher(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!session?.user) return null;

  const userRole = (session.user as any)?.activeRole as UserRole;

  return (
    <div className="relative" ref={menuRef}>
      {/* User Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-zinc-800 transition-colors w-full"
      >
        <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-medium shrink-0">
          {session.user.name?.[0]?.toUpperCase() || session.user.email?.[0]?.toUpperCase()}
        </div>
        <div className="text-left flex-1 min-w-0">
          <div className="text-sm font-medium text-white truncate">
            {session.user.name || "User"}
          </div>
          {userRole && (
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${getRoleBadgeColor(userRole)}`}>
                {getRoleDisplayName(userRole)}
              </span>
            </div>
          )}
        </div>
        <svg
          className="w-4 h-4 text-zinc-400 shrink-0"
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
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-zinc-200 py-2 z-50">
          {/* User Info */}
          <div className="px-4 py-2 border-b border-zinc-200">
            <div className="text-sm font-medium text-zinc-900">
              {session.user.name}
            </div>
            <div className="text-xs text-zinc-500">{session.user.email}</div>
          </div>

          {/* Organization Info */}
          {activeOrganization && (
            <div className="px-4 py-2 border-b border-zinc-200">
              <div className="text-xs text-zinc-500 mb-1">Organization</div>
              <div className="text-sm font-medium text-zinc-900">
                {activeOrganization.name}
              </div>
              {userRole && (
                <div className="mt-1.5">
                  <span className={`inline-block px-2 py-1 rounded text-xs font-medium border ${getRoleBadgeColor(userRole)}`}>
                    {getRoleDisplayName(userRole)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Organization Switcher */}
          {organizations.length > 1 && (
            <div className="border-b border-zinc-200">
              <button
                onClick={() => setShowOrgSwitcher(!showOrgSwitcher)}
                className="w-full px-4 py-2 text-left text-sm hover:bg-zinc-50 flex items-center justify-between"
              >
                <span>Switch Organization</span>
                <svg
                  className={`w-4 h-4 transition-transform ${showOrgSwitcher ? "rotate-180" : ""}`}
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
                <div className="bg-zinc-50 border-t border-zinc-200">
                  {organizations.map((org) => (
                    <button
                      key={org.id}
                      onClick={() => {
                        setActiveOrganization(org);
                        setShowOrgSwitcher(false);
                        setIsOpen(false);
                      }}
                      className={`w-full px-6 py-2 text-left text-sm hover:bg-zinc-100 ${
                        org.id === activeOrganization?.id
                          ? "bg-emerald-50 text-emerald-900"
                          : "text-zinc-700"
                      }`}
                    >
                      {org.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Sign Out */}
          <button
            onClick={() => signOut({ callbackUrl: "/auth/signin" })}
            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
