"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { hasRoutePermission } from "@/lib/permissions";
import type { UserRole } from "@/lib/types";

export default function Sidebar() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { data: session } = useSession();

  const allMenuItems = [
    {
      name: "Orders",
      href: "/admin/orders",
      icon: "📦",
    },
    {
      name: "Partials",
      href: "/admin/partials",
      icon: "⏱️",
    },
    {
      name: "Customers",
      href: "/admin/customers",
      icon: "👥",
    },
    {
      name: "Products",
      href: "/admin/products",
      icon: "🏷️",
    },
    {
      name: "Store",
      href: "/admin/store",
      icon: "🏪",
    },
    {
      name: "Landing Pages",
      href: "/admin/landing-pages",
      icon: "📄",
    },
    {
      name: "Postal Code Test",
      href: "/admin/postal-code-test",
      icon: "📮",
    },
    {
      name: "Autocomplete Test",
      href: "/admin/autocomplete-test",
      icon: "🔍",
    },
    {
      name: "Team",
      href: "/admin/settings/team",
      icon: "👨‍💼",
    },
    {
      name: "Settings",
      href: "/admin/settings",
      icon: "⚙️",
    },
  ];

  // Filter menu items based on user role
  const menuItems = useMemo(() => {
    const userRole = (session?.user as any)?.activeRole as UserRole;

    if (!userRole) {
      return allMenuItems; // Show all if role not loaded yet
    }

    return allMenuItems.filter((item) => hasRoutePermission(item.href, userRole));
  }, [session]);

  const isActive = (href: string) => pathname.startsWith(href);

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-zinc-900 text-white rounded-md"
        aria-label="Toggle menu"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {isMobileMenuOpen ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          )}
        </svg>
      </button>

      {/* Overlay for mobile */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-48 bg-zinc-900 text-white z-40
          transform transition-transform duration-300 ease-in-out
          lg:translate-x-0
          ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Logo */}
        <div className="px-4 py-5 border-b border-zinc-800">
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold tracking-tight">EMS</h1>
            <p className="text-[10px] text-zinc-400 mt-0.5 tracking-wide">
              ECOM MADE SIMPLE
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="px-2 py-4 space-y-1">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsMobileMenuOpen(false)}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-lg
                transition-all duration-200
                ${
                  isActive(item.href)
                    ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20"
                    : "text-zinc-300 hover:bg-zinc-800 hover:text-white"
                }
              `}
            >
              <span className="text-base">{item.icon}</span>
              <span className="text-sm font-medium">{item.name}</span>
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 px-4 py-4 border-t border-zinc-800">
          <p className="text-[10px] text-zinc-500 text-center">v1.0.0</p>
          <p className="text-[10px] text-zinc-600 text-center mt-0.5">MVP Orders</p>
        </div>
      </aside>
    </>
  );
}
