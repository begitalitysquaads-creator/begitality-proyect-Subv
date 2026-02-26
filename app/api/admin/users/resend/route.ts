import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { logAuditAction } from "@/lib/audit";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getCurrentUser(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

export async function POST(req: Request) {
  try {
    if (!await isAdmin()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentAdmin = await getCurrentUser(req);
    const { email, full_name } = await req.json();
    if (!email) return NextResponse.json({ error: "Email requerido" }, { status: 400 });

    const origin = new URL(req.url).origin;
    // Re-invitar al usuario. Supabase Auth reenviará el correo de invitación.
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { full_name },
      redirectTo: `${origin}/auth/callback?next=/update-password`
    });

    if (error) {
      if (error.message.includes("rate limit")) {
        return NextResponse.json({ error: "Límite de correos excedido. Por favor, espera un minuto." }, { status: 429 });
      }
      throw error;
    }

    if (currentAdmin) {
      await logAuditAction(null, currentAdmin.id, "Seguridad", {
        description: `reenvió la invitación de acceso a "${full_name || email}"`,
        resend_email: email
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
