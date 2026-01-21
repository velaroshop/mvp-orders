import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import bcrypt from "bcryptjs";

// GET /api/team/members - List all members
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const activeOrganizationId = (session.user as any).activeOrganizationId;

    if (!activeOrganizationId) {
      return NextResponse.json(
        { error: "No active organization" },
        { status: 400 }
      );
    }

    // Fetch all organization members with user details
    const { data: members, error } = await supabaseAdmin
      .from("organization_members")
      .select("*")
      .eq("organization_id", activeOrganizationId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching organization members:", error);
      return NextResponse.json(
        { error: "Failed to fetch team members", details: error.message },
        { status: 500 }
      );
    }

    // Fetch user details separately
    const userIds = members?.map(m => m.user_id).filter(Boolean) || [];
    const creatorIds = members?.map(m => m.created_by).filter(Boolean) || [];
    const allUserIds = [...new Set([...userIds, ...creatorIds])];

    const { data: users } = await supabaseAdmin
      .from("users")
      .select("id, email, name")
      .in("id", allUserIds);

    const usersMap = new Map(users?.map(u => [u.id, u]) || []);

    // Map to OrganizationMember type
    const mappedMembers = (members || []).map((member) => ({
      id: member.id,
      organizationId: member.organization_id,
      userId: member.user_id,
      role: member.role,
      createdBy: member.created_by,
      isActive: member.is_active ?? true, // Default to true if null
      createdAt: member.created_at,
      updatedAt: member.updated_at,
      user: usersMap.get(member.user_id),
      creator: member.created_by ? usersMap.get(member.created_by) : undefined,
    }));

    return NextResponse.json({ members: mappedMembers });
  } catch (error) {
    console.error("Error in GET /api/team/members:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/team/members - Create a new member
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const activeOrganizationId = (session.user as any).activeOrganizationId;
    const currentUserId = (session.user as any).id;

    if (!activeOrganizationId) {
      return NextResponse.json(
        { error: "No active organization" },
        { status: 400 }
      );
    }

    // Check if current user is owner
    const { data: currentMember, error: memberError } = await supabaseAdmin
      .from("organization_members")
      .select("role")
      .eq("organization_id", activeOrganizationId)
      .eq("user_id", currentUserId)
      .single();

    if (memberError || !currentMember || currentMember.role !== "owner") {
      return NextResponse.json(
        { error: "Only owners can create new users" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, password, role } = body;

    // Validate required fields
    if (!email || !password || !role) {
      return NextResponse.json(
        { error: "Email, password, and role are required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Validate password length
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // Validate role
    if (!["admin", "store_manager"].includes(role)) {
      return NextResponse.json(
        { error: "Invalid role. Only admin and store_manager roles can be created" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", email)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create new user
    const { data: newUser, error: userError } = await supabaseAdmin
      .from("users")
      .insert({
        email,
        password_hash: passwordHash,
        email_verified: new Date().toISOString(), // Auto-verify created users
      })
      .select()
      .single();

    if (userError || !newUser) {
      console.error("Error creating user:", userError);
      return NextResponse.json(
        { error: "Failed to create user" },
        { status: 500 }
      );
    }

    // Create organization member
    const { data: newMember, error: memberCreationError } = await supabaseAdmin
      .from("organization_members")
      .insert({
        organization_id: activeOrganizationId,
        user_id: newUser.id,
        role: role,
        created_by: currentUserId,
        is_active: true,
      })
      .select()
      .single();

    if (memberCreationError || !newMember) {
      console.error("Error creating organization member:", memberCreationError);
      // Rollback - delete the user
      await supabaseAdmin.from("users").delete().eq("id", newUser.id);
      return NextResponse.json(
        { error: "Failed to create organization member" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "User created successfully",
      member: {
        id: newMember.id,
        organizationId: newMember.organization_id,
        userId: newMember.user_id,
        role: newMember.role,
        createdBy: newMember.created_by,
        isActive: newMember.is_active,
        createdAt: newMember.created_at,
        updatedAt: newMember.updated_at,
      },
    });
  } catch (error) {
    console.error("Error in POST /api/team/members:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
