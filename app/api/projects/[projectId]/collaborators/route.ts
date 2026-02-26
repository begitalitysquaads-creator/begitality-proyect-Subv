import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Fetch collaborators joining with profiles
  const { data: collaborators, error } = await supabase
    .from("project_collaborators")
    .select(`
      id,
      role,
      user_id,
      profiles (
        full_name,
        email,
        avatar_url
      )
    `)
    .eq("project_id", projectId);


  if (error) {
    console.error("GET Collaborators Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Formatting for frontend
  const formatted = (collaborators || []).map((c: any) => ({
    id: c.id,
    role: c.role,
    userId: c.user_id,
    name: c.profiles?.full_name || "Consultor Begitality",
    email: c.profiles?.email || "Sin email",
    avatar: c.profiles?.avatar_url
  }));

  return NextResponse.json(formatted);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { email, role = 'editor' } = await req.json();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: "Usuario no encontrado en Begitality" }, { status: 404 });
  }

  const { data: newCollab, error: insertError } = await supabase
    .from("project_collaborators")
    .insert([{
      project_id: projectId,
      user_id: profile.id,
      role
    }])
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: "El usuario ya es colaborador" }, { status: 400 });
  }

  return NextResponse.json(newCollab);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase
    .from("project_collaborators")
    .delete()
    .eq("id", id)
    .eq("project_id", projectId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
