import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { logAuditAction } from "@/lib/audit";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "[ADMIN USERS API] Faltan variables de entorno NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY"
  );
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

/**
 * Helper para obtener el usuario actual desde el header de Authorization
 */
async function getCurrentUser(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

export async function GET() {
  try {
    if (!await isAdmin()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profiles, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (profileError) throw profileError;

    const { data: { users: authUsers }, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    if (authError) throw authError;

    const { data: allCollabs } = await supabaseAdmin
      .from("project_collaborators")
      .select("user_id, projects(id, name, status, updated_at)");

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
    if (!await isAdmin()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentAdmin = await getCurrentUser(req);
    const { email, full_name, role } = await req.json();

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

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({ role, full_name, is_active: false })
      .eq("id", authUser.user.id);

    if (profileError) throw profileError;

    if (currentAdmin) {
      await logAuditAction(null, currentAdmin.id, "Seguridad", {
        description: `invitó al nuevo trabajador "${full_name}" (${email}) con el rol ${role}`,
        new_user_email: email,
        role: role
      });
    }

    return NextResponse.json({ success: true, userId: authUser.user.id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    if (!await isAdmin()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentAdmin = await getCurrentUser(req);
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

    if (currentAdmin) {
      await logAuditAction(null, currentAdmin.id, "Seguridad", {
        description: `actualizó el perfil del trabajador "${full_name || email}"`,
        target_id: id,
        updates: updateData
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    if (!await isAdmin()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentAdmin = await getCurrentUser(req);
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("id");
    if (!userId) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

    const { data: targetProfile } = await supabaseAdmin.from("profiles").select("full_name, email").eq("id", userId).single();

    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw error;

    if (currentAdmin) {
      await logAuditAction(null, currentAdmin.id, "Seguridad", {
        description: `eliminó al trabajador "${targetProfile?.full_name || targetProfile?.email || userId}" del sistema`,
        deleted_id: userId
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
