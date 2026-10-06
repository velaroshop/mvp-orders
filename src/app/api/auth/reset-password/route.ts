import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json({ error: "Token and password are required" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    // Find valid token
    const { data: resetToken } = await supabaseAdmin
      .from("password_reset_tokens")
      .select("user_id, expires_at")
      .eq("token", token)
      .single();

    if (!resetToken) {
      return NextResponse.json({ error: "Invalid or expired reset link" }, { status: 400 });
    }

    if (new Date(resetToken.expires_at) < new Date()) {
      await supabaseAdmin.from("password_reset_tokens").delete().eq("token", token);
      return NextResponse.json({ error: "Reset link has expired" }, { status: 400 });
    }

    // Hash new password and update user
    const passwordHash = await bcrypt.hash(password, 10);

    await supabaseAdmin
      .from("users")
      .update({ password_hash: passwordHash, updated_at: new Date().toISOString() })
      .eq("id", resetToken.user_id);

    // Delete used token
    await supabaseAdmin.from("password_reset_tokens").delete().eq("token", token);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[Reset Password]", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
