import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (profileError) throw profileError;

    // Obtener información detallada de Auth
    const { data: { users: authUsers }, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    if (authError) throw authError;

    // Obtener todos los colaboradores para mapear proyectos a usuarios
    const { data: allCollabs } = await supabaseAdmin
      .from("project_collaborators")
      .select("user_id, projects(id, name, status, updated_at)");

    // Combinar datos
    const mergedData = profiles.map(profile => {
      const authUser = authUsers.find(u => u.id === profile.id);
      const userProjects = allCollabs
        ?.filter(c => c.user_id === profile.id)
        .map(c => c.projects) || [];

      return {
        ...profile,
        last_sign_in_at: authUser?.last_sign_in_at || null,
        has_authenticated: !!authUser?.last_sign_in_at,
        assigned_projects: userProjects,
        project_count: userProjects.length
      };
    });

    return NextResponse.json(mergedData);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { email, full_name, role } = await req.json();

    // 1. Invitar al usuario por email (Supabase maneja el envío del correo)
    const origin = new URL(req.url).origin;
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { full_name },
      redirectTo: `${origin}/auth/callback?next=/update-password`
    });

    if (authError) {
      if (authError.message.includes("rate limit")) {
        return NextResponse.json({ error: "Límite de correos excedido. Por favor, espera un minuto." }, { status: 429 });
      }
      if (authError.message.includes("already been registered")) {
        return NextResponse.json({ error: "Ya existe un usuario registrado con este correo electrónico." }, { status: 400 });
      }
      throw authError;
    }

    // 2. Actualizar el perfil con el rol (el trigger de la DB creará el perfil al crearse el user en Auth)
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({ role, full_name, is_active: false })
      .eq("id", authUser.user.id);

    if (profileError) throw profileError;

    return NextResponse.json({ success: true, userId: authUser.user.id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { id, full_name, role, is_active, email } = await req.json();
    if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

    const updateData: any = { full_name, role, is_active };
    if (email) updateData.email = email;

    const { error } = await supabaseAdmin
      .from("profiles")
      .update(updateData)
      .eq("id", id);

    if (error) throw error;

    if (email) {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(id, { email });
      if (authError) throw authError;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("id");
    if (!userId) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
