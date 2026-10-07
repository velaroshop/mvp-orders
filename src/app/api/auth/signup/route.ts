import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import { sendWelcomeEmail } from "@/lib/email";
import {
  TERMS_VERSION,
  TERMS_CONTENT_HASH,
} from "@/lib/terms-content";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function POST(request: NextRequest) {
  try {
    const {
      email,
      password,
      name,
      organizationName,
      organizationCui,
      organizationAddress,
      termsAccepted,
      authorizedRepresentative,
    } = await request.json();

    // ── Validări de bază ─────────────────────────────────────────────────────

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email-ul și parola sunt obligatorii" },
        { status: 400 }
      );
    }

    if (password.length < 8 || password.length > 64) {
      return NextResponse.json(
        { error: "Parola trebuie să aibă între 8 și 64 de caractere" },
        { status: 400 }
      );
    }

    if (!organizationName?.trim()) {
      return NextResponse.json(
        { error: "Denumirea firmei este obligatorie" },
        { status: 400 }
      );
    }

    // ── Validare server-side acceptare termeni ───────────────────────────────
    // Aceste verificări sunt critice — nu ne bazăm exclusiv pe client.

    if (termsAccepted !== true) {
      return NextResponse.json(
        { error: "Trebuie să accepți Termenii și Condițiile pentru a continua" },
        { status: 400 }
      );
    }

    if (authorizedRepresentative !== true) {
      return NextResponse.json(
        { error: "Trebuie să confirmi că ești autorizat să reprezinți firma" },
        { status: 400 }
      );
    }

    // ── Verificare email existent ────────────────────────────────────────────

    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: "Există deja un cont cu această adresă de email" },
        { status: 400 }
      );
    }

    // ── Creare utilizator ────────────────────────────────────────────────────

    const passwordHash = await bcrypt.hash(password, 10);

    const { data: user, error: userError } = await supabase
      .from("users")
      .insert({ email, name, password_hash: passwordHash })
      .select()
      .single();

    if (userError || !user) {
      console.error("[Signup] Error creating user:", userError);
      return NextResponse.json(
        { error: "Nu s-a putut crea contul" },
        { status: 500 }
      );
    }

    // ── Creare organizație ───────────────────────────────────────────────────

    let organizationId: string | null = null;

    const slug = organizationName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

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

    const { data: organization, error: orgError } = await supabase
      .from("organizations")
      .insert({
        name: organizationName.trim(),
        slug: finalSlug,
        cui: organizationCui?.trim() || null,
        address: organizationAddress?.trim() || null,
        is_active: false, // Necesită activare de către superadmin
        is_pending: true,
      })
      .select()
      .single();

    if (orgError || !organization) {
      console.error("[Signup] Error creating organization:", orgError);
      return NextResponse.json(
        { error: "Nu s-a putut crea organizația" },
        { status: 500 }
      );
    }

    organizationId = organization.id;

    // ── Adaugă utilizatorul ca owner ─────────────────────────────────────────

    const { error: memberError } = await supabase
      .from("organization_members")
      .insert({
        organization_id: organizationId,
        user_id: user.id,
        role: "owner",
      });

    if (memberError) {
      console.error("[Signup] Error adding user to organization:", memberError);
      return NextResponse.json(
        { error: "Nu s-a putut asocia utilizatorul cu organizația" },
        { status: 500 }
      );
    }

    // ── Salvare dovadă acceptare termeni ─────────────────────────────────────
    // Versiunea și hash-ul sunt preluate server-side din lib/terms-content.ts,
    // nu din cererea clientului.

    const { error: termsError } = await supabase
      .from("terms_acceptance")
      .insert({
        user_id: user.id,
        organization_id: organizationId,
        terms_version: TERMS_VERSION,         // valoare server-side
        terms_content_hash: TERMS_CONTENT_HASH, // valoare server-side
        accepted_at: new Date().toISOString(),
        is_authorized_representative: true,
        user_email: user.email,
        user_name: user.name ?? null,
        organization_name: organizationName.trim(),
        organization_cui: organizationCui?.trim() || null,
      });

    if (termsError) {
      // Logăm eroarea dar nu blocăm înregistrarea — contul există deja.
      // Administratorul poate verifica și remedia manual.
      console.error("[Signup] AVERTISMENT: Nu s-a salvat dovada acceptării termenilor:", termsError);
    }

    // ── Email de bun venit (non-blocking) ────────────────────────────────────

    sendWelcomeEmail(user.email, user.name || "there", organizationName || "").catch((err) =>
      console.error("[Signup] Failed to send welcome email:", err)
    );

    return NextResponse.json(
      {
        message: "Cont creat cu succes",
        user: { id: user.id, email: user.email, name: user.name },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[Signup] Unexpected error:", error);
    return NextResponse.json(
      { error: "A apărut o eroare. Te rugăm să încerci din nou." },
      { status: 500 }
    );
  }
}
