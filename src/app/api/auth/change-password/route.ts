import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import bcrypt from "bcryptjs";

/**
 * POST /api/auth/change-password
 * Change password for the currently logged-in user.
 * Body: { currentPassword: string, newPassword: string }
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Parola curentă și parola nouă sunt obligatorii." },
        { status: 400 }
      );
    }

    if (newPassword.length < 8 || newPassword.length > 64) {
      return NextResponse.json(
        { error: "Parola nouă trebuie să aibă între 8 și 64 de caractere." },
        { status: 400 }
      );
    }

    // Get the user's current password hash
    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("password_hash")
      .eq("id", userId)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Utilizator negăsit." },
        { status: 404 }
      );
    }

    // Verify current password
    const isCurrentValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isCurrentValid) {
      return NextResponse.json(
        { error: "Parola curentă este incorectă." },
        { status: 400 }
      );
    }

    // Hash new password and update
    const newHash = await bcrypt.hash(newPassword, 10);

    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update({
        password_hash: newHash,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (updateError) {
      console.error("Error changing password:", updateError);
      return NextResponse.json(
        { error: "Eroare la schimbarea parolei." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Parola a fost schimbată cu succes.",
    });
  } catch (error) {
    console.error("Error in POST /api/auth/change-password:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
