import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logAuditAction } from "@/lib/audit";

export const runtime = "nodejs";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: budgets, error } = await supabase
    .from("project_budgets")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(budgets);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { concept, amount, category, notes } = body;

  const { data: newItem, error } = await supabase
    .from("project_budgets")
    .insert([{ 
      project_id: projectId,
      concept,
      amount,
      category,
      notes
    }])
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAuditAction(projectId, user.id, "Presupuesto", {
    description: `añadió la partida "${concept}" de ${amount}€`,
    amount,
    category
  });

  return NextResponse.json(newItem);
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
    .from("project_budgets")
    .delete()
    .eq("id", id)
    .eq("project_id", projectId); // Ensure it belongs to the project (and by RLS, the user)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAuditAction(projectId, user.id, "Presupuesto", {
    description: "eliminó una partida presupuestaria",
    deleted_id: id
  });

  return NextResponse.json({ success: true });
}
