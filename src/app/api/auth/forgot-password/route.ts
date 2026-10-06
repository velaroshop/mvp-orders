import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { sendPasswordResetEmail } from "@/lib/email";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Find user — always return success to avoid email enumeration
    const { data: user } = await supabaseAdmin
      .from("users")
      .select("id, email, name")
      .eq("email", email.toLowerCase().trim())
      .single();

    if (user) {
      // Delete any existing tokens for this user
      await supabaseAdmin
        .from("password_reset_tokens")
        .delete()
        .eq("user_id", user.id);

      // Generate token
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

      await supabaseAdmin.from("password_reset_tokens").insert({
        user_id: user.id,
        token,
        expires_at: expiresAt,
      });

      const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${token}`;
      await sendPasswordResetEmail(user.email, resetUrl, user.name || "there");
    }

    // Always return success
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[Forgot Password]", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
