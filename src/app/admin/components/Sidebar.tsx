"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { useSession, signOut } from "next-auth/react";
import { hasRoutePermission } from "@/lib/permissions";
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
  LogOut,
  ChevronRight,
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
      { name: "Ads", href: "/admin/ads-dashboard" },
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
  const [newRefundsCount, setNewRefundsCount] = useState(0);

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
    if (!userRole) return menuGroups;

    return menuGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => hasRoutePermission(item.href, userRole)),
      }))
      .filter((group) => group.items.length > 0);
  }, [session]);

  const isActive = (href: string) => {
    if (href === "/admin/refunds" && pathname.startsWith("/admin/refunds/settings")) return false;
    return pathname.startsWith(href);
  };

  const userName = (session?.user as any)?.name || (session?.user as any)?.email || "User";
  const orgName = (session?.user as any)?.organizationName || "";
  const userRole = (session?.user as any)?.activeRole || "";
  const initials = userName.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);

  const SidebarContent = () => (
    <aside className="flex flex-col h-full w-56 bg-zinc-950 text-white">

      {/* Logo */}
      <div className="px-5 py-5 border-b border-zinc-800/60">
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
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {filteredGroups.map((group) => (
          <div key={group.label}>
            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest px-2 mb-1.5">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <div key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`
                      flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all duration-150
                      ${isActive(item.href)
                        ? "bg-indigo-600 text-white shadow-sm shadow-indigo-900/50"
                        : "text-zinc-400 hover:text-white hover:bg-zinc-800/70"
                      }
                    `}
                  >
                    <span className={isActive(item.href) ? "text-white" : "text-zinc-500"}>
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

      {/* User info */}
      <div className="px-3 py-4 border-t border-zinc-800/60">
        <div className="flex items-center gap-2.5 px-2">
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center shrink-0 text-xs font-bold text-white">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-white truncate leading-tight">{orgName || userName}</p>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wide leading-tight">{userRole}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/auth/signin" })}
            className="text-zinc-500 hover:text-white transition-colors p-1 rounded-md hover:bg-zinc-800"
            title="Sign out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
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
      <div className="hidden lg:flex w-56 shrink-0 min-h-screen">
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
