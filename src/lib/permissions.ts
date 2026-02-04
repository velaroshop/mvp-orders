import type { UserRole } from "./types";

// Define route permissions
export const ROUTE_PERMISSIONS: Record<string, UserRole[]> = {
  // Routes accessible to all active users
  "/admin/orders": ["owner", "admin", "store_manager"],
  "/admin/partials": ["owner", "admin", "store_manager"],
  "/admin/customers": ["owner", "admin", "store_manager"],

  // Routes accessible to owner and admin only
  "/admin/products": ["owner", "admin"],
  "/admin/landing-pages": ["owner", "admin"],
  "/admin/stores": ["owner", "admin"],
  "/admin/settings": ["owner", "admin"],

  // Route accessible to owner only
  "/admin/settings/team": ["owner"],
};

// Check if user has permission to access a route
export function hasRoutePermission(
  route: string,
  userRole: UserRole
): boolean {
  // Check exact match first
  if (ROUTE_PERMISSIONS[route]) {
    return ROUTE_PERMISSIONS[route].includes(userRole);
  }

  // Check for parent routes (e.g., /admin/landing-pages/123/edit -> /admin/landing-pages)
  const routeParts = route.split("/").filter(Boolean);

  // Try to match parent routes
  for (let i = routeParts.length; i > 0; i--) {
    const parentRoute = "/" + routeParts.slice(0, i).join("/");
    if (ROUTE_PERMISSIONS[parentRoute]) {
      return ROUTE_PERMISSIONS[parentRoute].includes(userRole);
    }
  }

  // Default to owner and admin if route is not explicitly defined
  return ["owner", "admin"].includes(userRole);
}

// Check if user can perform specific actions
export function canManageTeam(userRole: UserRole): boolean {
  return userRole === "owner";
}

export function canManageProducts(userRole: UserRole): boolean {
  return ["owner", "admin"].includes(userRole);
}

export function canManageStores(userRole: UserRole): boolean {
  return ["owner", "admin"].includes(userRole);
}

export function canManageLandingPages(userRole: UserRole): boolean {
  return ["owner", "admin"].includes(userRole);
}

export function canManageSettings(userRole: UserRole): boolean {
  return ["owner", "admin"].includes(userRole);
}

export function canManageOrders(userRole: UserRole): boolean {
  return ["owner", "admin", "store_manager"].includes(userRole);
}

export function canManagePartialOrders(userRole: UserRole): boolean {
  return ["owner", "admin", "store_manager"].includes(userRole);
}

export function canViewCustomers(userRole: UserRole): boolean {
  return ["owner", "admin", "store_manager"].includes(userRole);
}

export function canEditCustomers(userRole: UserRole): boolean {
  return ["owner", "admin"].includes(userRole);
}

// Get role display name
export function getRoleDisplayName(role: UserRole): string {
  switch (role) {
    case "owner":
      return "Owner";
    case "admin":
      return "Administrator";
    case "store_manager":
      return "Store Manager";
    default:
      return role;
  }
}

// Get role color for badges
export function getRoleBadgeColor(role: UserRole): string {
  switch (role) {
    case "owner":
      return "bg-purple-900/30 text-purple-300 border-purple-700";
    case "admin":
      return "bg-blue-900/30 text-blue-300 border-blue-700";
    case "store_manager":
      return "bg-emerald-900/30 text-emerald-300 border-emerald-700";
    default:
      return "bg-zinc-700 text-zinc-300 border-zinc-600";
  }
}
