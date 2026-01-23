import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      organizations?: Array<{
        id: string;
        name: string;
        slug: string;
        role: string;
        isSuperadmin?: boolean;
      }>;
      activeOrganizationId?: string;
      activeRole?: string;
      isSuperadminOrg?: boolean;
    };
  }

  interface User {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    organizations?: Array<{
      id: string;
      name: string;
      slug: string;
      role: string;
      isSuperadmin?: boolean;
    }>;
    activeOrganizationId?: string;
    activeRole?: string;
    isSuperadminOrg?: boolean;
  }
}
