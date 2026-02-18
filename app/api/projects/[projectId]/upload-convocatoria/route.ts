import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "convocatoria-files";
const MAX_SIZE = 50 * 1024 * 1024; // 50 MB

export async function POST(
  req: Request,
  context: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await context.params;

  /* ── 1. Autenticar al usuario con la sesión (anon key + cookies) ── */
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  /* ── 2. Verificar que el proyecto pertenece al usuario ── */
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single();

  if (!project) {
    return NextResponse.json(
      { error: "Proyecto no encontrado" },
      { status: 404 }
    );
  }

  /* ── 3. Leer el archivo del FormData ── */
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json(
      { error: "No se recibió ningún archivo" },
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: `El archivo excede el límite de ${MAX_SIZE / 1024 / 1024} MB` },
      { status: 400 }
    );
  }

  /* ── 4. Subir al Storage con service_role (bypasea RLS) ── */
  const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const admin = createServiceClient(serviceUrl, serviceKey);

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${user.id}/${projectId}/${crypto.randomUUID()}-${safeName}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error: uploadErr } = await admin.storage
    .from(BUCKET)
    .upload(path, buffer, {
      cacheControl: "3600",
      upsert: false,
      contentType: "application/pdf",
    });

  if (uploadErr) {
    console.error("Storage upload error:", uploadErr);
    return NextResponse.json(
      { error: `Error subiendo archivo: ${uploadErr.message}` },
      { status: 500 }
    );
  }

  /* ── 5. Registrar en la tabla convocatoria_bases (con service_role) ── */
  const { data: inserted, error: insertErr } = await admin
    .from("convocatoria_bases")
    .insert({
      project_id: projectId,
      name: file.name,
      file_path: path,
      file_size: file.size,
    })
    .select("id, name, file_path, file_size, created_at")
    .single();

  if (insertErr) {
    console.error("DB insert error:", insertErr);
    // Limpiar el archivo subido si falla el insert
    await admin.storage.from(BUCKET).remove([path]);
    return NextResponse.json(
      { error: `Error registrando archivo: ${insertErr.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, file: inserted });
}

/* ── DELETE: eliminar un archivo de convocatoria ── */
export async function DELETE(
  req: Request,
  context: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await context.params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  /* Verificar que el proyecto pertenece al usuario */
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single();

  if (!project) {
    return NextResponse.json(
      { error: "Proyecto no encontrado" },
      { status: 404 }
    );
  }

  const { fileId, filePath } = await req.json();
  if (!fileId) {
    return NextResponse.json(
      { error: "Falta fileId" },
      { status: 400 }
    );
  }

  const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const admin = createServiceClient(serviceUrl, serviceKey);

  if (filePath) {
    await admin.storage.from(BUCKET).remove([filePath]);
  }

  const { error: deleteErr } = await admin
    .from("convocatoria_bases")
    .delete()
    .eq("id", fileId);

  if (deleteErr) {
    return NextResponse.json(
      { error: deleteErr.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
