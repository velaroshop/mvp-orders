import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { SupabaseAdapter } from "@auth/supabase-adapter";
import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";

// Supabase client for server-side operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      persistSession: false,
    },
  }
);

export const authOptions: NextAuthOptions = {
  adapter: SupabaseAdapter({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    secret: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  }),
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password required");
        }

        // Get user from database
        const { data: user, error } = await supabase
          .from("users")
          .select("*")
          .eq("email", credentials.email)
          .single();

        if (error || !user) {
          throw new Error("Invalid credentials");
        }

        // Check password
        if (!user.password_hash) {
          throw new Error("Invalid credentials");
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password_hash
        );

        if (!isPasswordValid) {
          throw new Error("Invalid credentials");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;

        // Get user's organizations
        const { data: memberships } = await supabase
          .from("organization_members")
          .select(`
            organization_id,
            role,
            is_active,
            organizations (
              id,
              name,
              slug
            )
          `)
          .eq("user_id", user.id)
          .eq("is_active", true); // Only get active memberships

        if (memberships && memberships.length > 0) {
          token.organizations = memberships.map((m: any) => ({
            id: m.organization_id,
            name: m.organizations.name,
            slug: m.organizations.slug,
            role: m.role,
          }));

          // Set the first organization as the active one by default
          token.activeOrganizationId = memberships[0].organization_id;
          token.activeRole = memberships[0].role; // Add active role to token
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.organizations = token.organizations as any[];
        session.user.activeOrganizationId = token.activeOrganizationId as string;
        session.user.activeRole = token.activeRole as string; // Add active role to session
      }

      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
