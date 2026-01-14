"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { useSession } from "next-auth/react";

interface Organization {
  id: string;
  name: string;
  slug: string;
  role: string;
}

interface OrganizationContextType {
  organizations: Organization[];
  activeOrganization: Organization | null;
  setActiveOrganization: (org: Organization) => void;
  isLoading: boolean;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(
  undefined
);

export function OrganizationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [activeOrganization, setActiveOrganizationState] =
    useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === "loading") {
      setIsLoading(true);
      return;
    }

    if (status === "unauthenticated") {
      setOrganizations([]);
      setActiveOrganizationState(null);
      setIsLoading(false);
      return;
    }

    if (session?.user?.organizations) {
      setOrganizations(session.user.organizations);

      // Set active organization from session or first organization
      const activeOrgId = session.user.activeOrganizationId;
      const activeOrg = session.user.organizations.find(
        (org) => org.id === activeOrgId
      );

      setActiveOrganizationState(
        activeOrg || session.user.organizations[0] || null
      );
    }

    setIsLoading(false);
  }, [session, status]);

  function setActiveOrganization(org: Organization) {
    setActiveOrganizationState(org);

    // TODO: Update session with new active organization
    // This would require an API call to update the user's preference
  }

  return (
    <OrganizationContext.Provider
      value={{
        organizations,
        activeOrganization,
        setActiveOrganization,
        isLoading,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error(
      "useOrganization must be used within an OrganizationProvider"
    );
  }
  return context;
}
