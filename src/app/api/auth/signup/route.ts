import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      persistSession: false,
    },
  }
);

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, organizationName } = await request.json();

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const { data: user, error: userError } = await supabase
      .from("users")
      .insert({
        email,
        name,
        password_hash: passwordHash,
      })
      .select()
      .single();

    if (userError) {
      console.error("Error creating user:", userError);
      return NextResponse.json(
        { error: "Failed to create user" },
        { status: 500 }
      );
    }

    // Create organization if provided
    if (organizationName) {
      // Generate slug from organization name
      const slug = organizationName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      // Check if slug already exists
      let finalSlug = slug;
      let counter = 1;
      while (true) {
        const { data: existingOrg } = await supabase
          .from("organizations")
          .select("id")
          .eq("slug", finalSlug)
          .single();

        if (!existingOrg) break;
        finalSlug = `${slug}-${counter}`;
        counter++;
      }

      // Create organization (inactive and pending by default - requires superadmin activation)
      const { data: organization, error: orgError } = await supabase
        .from("organizations")
        .insert({
          name: organizationName,
          slug: finalSlug,
          is_active: false, // New organizations require superadmin activation
          is_pending: true, // Mark as pending (new registration)
        })
        .select()
        .single();

      if (orgError) {
        console.error("Error creating organization:", orgError);
        return NextResponse.json(
          { error: "Failed to create organization" },
          { status: 500 }
        );
      }

      // Add user as owner of the organization
      const { error: memberError } = await supabase
        .from("organization_members")
        .insert({
          organization_id: organization.id,
          user_id: user.id,
          role: "owner",
        });

      if (memberError) {
        console.error("Error adding user to organization:", memberError);
        return NextResponse.json(
          { error: "Failed to add user to organization" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      {
        message: "User created successfully",
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "An error occurred during signup" },
      { status: 500 }
    );
  }
}
