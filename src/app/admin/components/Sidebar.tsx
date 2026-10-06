"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useMemo, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { useOrganization } from "@/contexts/OrganizationContext";
import { hasRoutePermission, getRoleDisplayName } from "@/lib/permissions";
import type { UserRole } from "@/lib/types";
import {
  LayoutDashboard,
  ShoppingCart,
  Clock,
  Users,
  Tag,
  TrendingUp,
  Megaphone,
  Store,
  FileText,
  UserCog,
  RotateCcw,
  Activity,
  Settings,
  Menu,
  X,
  ChevronRight,
  ChevronUp,
} from "lucide-react";

const iconMap: Record<string, React.ReactNode> = {
  "/admin/dashboard":      <LayoutDashboard className="w-4 h-4" />,
  "/admin/orders":         <ShoppingCart className="w-4 h-4" />,
  "/admin/partials":       <Clock className="w-4 h-4" />,
  "/admin/customers":      <Users className="w-4 h-4" />,
  "/admin/products":       <Tag className="w-4 h-4" />,
  "/admin/roas":           <TrendingUp className="w-4 h-4" />,
  "/admin/ads-dashboard":  <Megaphone className="w-4 h-4" />,
  "/admin/store":          <Store className="w-4 h-4" />,
  "/admin/landing-pages":  <FileText className="w-4 h-4" />,
  "/admin/settings/team":  <UserCog className="w-4 h-4" />,
  "/admin/refunds":        <RotateCcw className="w-4 h-4" />,
  "/admin/activity-log":   <Activity className="w-4 h-4" />,
  "/admin/settings":       <Settings className="w-4 h-4" />,
};

const menuGroups = [
  {
    label: "General",
    items: [
      { name: "Dashboard", href: "/admin/dashboard" },
      { name: "Comenzi", href: "/admin/orders" },
      { name: "Parțiale", href: "/admin/partials" },
      { name: "Clienți", href: "/admin/customers" },
    ],
  },
  {
    label: "Catalog",
    items: [
      { name: "Produse", href: "/admin/products" },
      { name: "Landing Pages", href: "/admin/landing-pages" },
    ],
  },
  {
    label: "Marketing",
    items: [
      { name: "ROAS", href: "/admin/roas" },
      { name: "Ads", href: "/admin/ads-dashboard", superadminOnly: true },
    ],
  },
  {
    label: "Administrare",
    items: [
      { name: "Magazin", href: "/admin/store" },
      { name: "Echipă", href: "/admin/settings/team" },
      { name: "Returnări", href: "/admin/refunds", badge: true },
      { name: "Activity Log", href: "/admin/activity-log" },
      { name: "Setări", href: "/admin/settings" },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { data: session } = useSession();
  const { organizations, activeOrganization, setActiveOrganization } = useOrganization();
  const [newRefundsCount, setNewRefundsCount] = useState(0);

  // User menu state
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showOrgSwitcher, setShowOrgSwitcher] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
        setShowOrgSwitcher(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleChangePassword() {
    setPasswordMessage(null);
    if (!currentPassword || !newPassword) {
      setPasswordMessage({ type: "error", text: "Completează toate câmpurile." });
      return;
    }
    if (newPassword.length < 8) {
      setPasswordMessage({ type: "error", text: "Parola nouă trebuie să aibă minim 8 caractere." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: "error", text: "Parolele noi nu coincid." });
      return;
    }
    try {
      setIsChangingPassword(true);
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Eroare la schimbarea parolei.");
      setPasswordMessage({ type: "success", text: data.message });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => {
        setShowChangePassword(false);
        setPasswordMessage(null);
      }, 2000);
    } catch (error) {
      setPasswordMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Eroare la schimbarea parolei.",
      });
    } finally {
      setIsChangingPassword(false);
    }
  }

  useEffect(() => {
    const userRole = (session?.user as any)?.activeRole as UserRole;
    if (!userRole || !["owner", "admin"].includes(userRole)) return;

    async function fetchCount() {
      try {
        const res = await fetch("/api/refunds?count_only=new");
        if (res.ok) {
          const data = await res.json();
          setNewRefundsCount(data.count || 0);
        }
      } catch { /* silent */ }
    }

    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, [session]);

  const filteredGroups = useMemo(() => {
    const userRole = (session?.user as any)?.activeRole as UserRole;
    const isSuperadminOrg = (session?.user as any)?.isSuperadminOrg as boolean;
    if (!userRole) return menuGroups;

    return menuGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => {
          if ((item as any).superadminOnly) {
            return userRole === "owner" && isSuperadminOrg;
          }
          return hasRoutePermission(item.href, userRole);
        }),
      }))
      .filter((group) => group.items.length > 0);
  }, [session]);

  const isActive = (href: string) => {
    if (href === "/admin/refunds" && pathname.startsWith("/admin/refunds/settings")) return false;
    return pathname.startsWith(href);
  };

  const userName = (session?.user as any)?.name || (session?.user as any)?.email || "User";
  const orgName = (session?.user as any)?.organizationName || activeOrganization?.name || "";
  const userRole = (session?.user as any)?.activeRole || "";
  const initials = userName.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);

  const SidebarContent = () => (
    <aside className="flex flex-col h-full w-56 bg-zinc-950 text-white">

      {/* Logo */}
      <div className="px-5 py-3.5 border-b border-zinc-800/60">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-900/40">
            <span className="text-white text-sm font-bold">E</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-white leading-tight">EMS</p>
            <p className="text-[10px] text-zinc-500 leading-tight">Ecom Made Simple</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {filteredGroups.map((group) => (
          <div key={group.label}>
            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest px-2 mb-1">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <div key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`
                      flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-sm transition-all duration-150
                      ${isActive(item.href)
                        ? "bg-indigo-600 text-white shadow-sm shadow-indigo-900/50"
                        : "text-zinc-300 hover:text-white hover:bg-zinc-800/70"
                      }
                    `}
                  >
                    <span className={isActive(item.href) ? "text-white" : "text-zinc-400"}>
                      {iconMap[item.href]}
                    </span>
                    <span className="font-medium text-[13px]">{item.name}</span>
                    {"badge" in item && item.badge && newRefundsCount > 0 && (
                      <span className="ml-auto px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-4.5 text-center leading-none">
                        {newRefundsCount}
                      </span>
                    )}
                  </Link>

                  {/* Refund Settings sub-item */}
                  {item.href === "/admin/refunds" && (
                    <Link
                      href="/admin/refunds/settings"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`
                        flex items-center gap-2 pl-9 pr-2.5 py-1.5 rounded-lg text-[12px] ml-1 mt-0.5 transition-all duration-150
                        ${pathname.startsWith("/admin/refunds/settings")
                          ? "bg-indigo-600 text-white"
                          : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/70"
                        }
                      `}
                    >
                      <ChevronRight className="w-3 h-3" />
                      <span className="font-medium">Setări returnări</span>
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User menu — bottom */}
      <div className="px-3 py-3 border-t border-zinc-800/60" ref={menuRef}>
        {/* Dropdown (opens upward) */}
        {isMenuOpen && (
          <div className="mb-2 bg-zinc-900 border border-zinc-700/60 rounded-xl shadow-2xl overflow-hidden">
            {/* User info header */}
            <div className="px-4 py-3 border-b border-zinc-800">
              <p className="text-[13px] font-semibold text-white truncate">{userName}</p>
              <p className="text-[11px] text-zinc-500 truncate">{(session?.user as any)?.email}</p>
              {userRole && (
                <span className="inline-block mt-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-600/20 border border-indigo-600/40 text-indigo-300">
                  {getRoleDisplayName(userRole as UserRole)}
                </span>
              )}
            </div>

            {/* Organization */}
            {orgName && (
              <div className="px-4 py-2.5 border-b border-zinc-800">
                <p className="text-[10px] text-zinc-500 uppercase tracking-wide mb-0.5">Organizație</p>
                <p className="text-[13px] text-white font-medium truncate">{orgName}</p>
              </div>
            )}

            {/* Org switcher */}
            {organizations.length > 1 && (
              <div className="border-b border-zinc-800">
                <button
                  onClick={() => setShowOrgSwitcher(!showOrgSwitcher)}
                  className="w-full px-4 py-2.5 text-left text-[13px] text-zinc-300 hover:bg-zinc-800/70 flex items-center justify-between transition-colors"
                >
                  <span>Schimbă organizația</span>
                  <ChevronUp className={`w-3.5 h-3.5 text-zinc-500 transition-transform ${showOrgSwitcher ? "" : "rotate-180"}`} />
                </button>
                {showOrgSwitcher && (
                  <div className="bg-zinc-950 border-t border-zinc-800">
                    {organizations.map((org) => (
                      <button
                        key={org.id}
                        onClick={() => {
                          setActiveOrganization(org);
                          setShowOrgSwitcher(false);
                          setIsMenuOpen(false);
                        }}
                        className={`w-full px-5 py-2 text-left text-[12px] hover:bg-zinc-800/70 transition-colors ${
                          org.id === activeOrganization?.id ? "text-indigo-300 font-semibold" : "text-zinc-400"
                        }`}
                      >
                        {org.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Change password */}
            <div className="border-b border-zinc-800">
              <button
                onClick={() => {
                  setShowChangePassword(!showChangePassword);
                  setPasswordMessage(null);
                  setCurrentPassword("");
                  setNewPassword("");
                  setConfirmPassword("");
                }}
                className="w-full px-4 py-2.5 text-left text-[13px] text-zinc-300 hover:bg-zinc-800/70 flex items-center gap-2 transition-colors"
              >
                <svg className="w-3.5 h-3.5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                Schimbă parola
              </button>
              {showChangePassword && (
                <div className="px-4 pb-3 space-y-2 bg-zinc-950 border-t border-zinc-800">
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Parola curentă"
                    maxLength={64}
                    className="w-full px-2.5 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-xs focus:outline-none focus:border-indigo-500 mt-2"
                  />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Parola nouă (8-64 caractere)"
                    maxLength={64}
                    className="w-full px-2.5 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-xs focus:outline-none focus:border-indigo-500"
                  />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirmă parola nouă"
                    maxLength={64}
                    className="w-full px-2.5 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-xs focus:outline-none focus:border-indigo-500"
                  />
                  {passwordMessage && (
                    <p className={`text-[11px] px-1 ${passwordMessage.type === "success" ? "text-green-400" : "text-red-400"}`}>
                      {passwordMessage.text}
                    </p>
                  )}
                  <button
                    onClick={handleChangePassword}
                    disabled={isChangingPassword}
                    className="w-full px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isChangingPassword ? "Se schimbă..." : "Salvează parola"}
                  </button>
                </div>
              )}
            </div>

            {/* Sign out */}
            <button
              onClick={() => signOut({ callbackUrl: "/auth/signin" })}
              className="w-full px-4 py-2.5 text-left text-[13px] text-red-400 hover:bg-zinc-800/70 flex items-center gap-2 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Deconectare
            </button>
          </div>
        )}

        {/* Trigger button */}
        <button
          onClick={() => { setIsMenuOpen(!isMenuOpen); setShowOrgSwitcher(false); }}
          className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-zinc-800/70 transition-colors group"
        >
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center shrink-0 text-xs font-bold text-white">
            {initials}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-[13px] font-semibold text-white truncate leading-tight">{orgName || userName}</p>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wide leading-tight">{userRole}</p>
          </div>
          <ChevronUp className={`w-3.5 h-3.5 text-zinc-500 shrink-0 transition-transform ${isMenuOpen ? "" : "rotate-180"}`} />
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-zinc-950 text-white rounded-lg shadow-lg"
        aria-label="Toggle menu"
      >
        {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:flex fixed inset-y-0 left-0 w-56 z-20">
        <SidebarContent />
      </div>

      {/* Mobile sidebar */}
      <div className={`
        lg:hidden fixed top-0 left-0 h-full z-40
        transform transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        <SidebarContent />
      </div>
    </>
  );
}
