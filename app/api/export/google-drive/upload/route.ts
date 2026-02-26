import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const providerToken = session?.provider_token;
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!providerToken) {
    return NextResponse.json({ 
      error: "Google Drive no vinculado",
      detail: "Tu sesión de Google ha caducado o no está activa. Por favor, pulsa en 'Activar Google Drive' para renovar el acceso."
    }, { status: 401 });
  }

  try {
    const { projectId, folderId } = await req.json();

    // 1. Obtener datos del proyecto (usando admin para verificar existencia primero)
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: project } = await supabaseAdmin
      .from("projects")
      .select("id, name, grant_name, viability_report, review_report")
      .eq("id", projectId)
      .single();

    if (!project) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });

    // Verificar permisos (debe ser staff de Begitality)
    const { data: isStaff } = await supabase.rpc("is_begitality_staff");
    if (!isStaff) {
       return NextResponse.json({ error: "No tienes permiso para acceder a este proyecto" }, { status: 403 });
    }

    const { data: sections } = await supabase
      .from("sections")
      .select("id, title, content, sort_order")
      .eq("project_id", projectId)
      .order("sort_order");

    const sectionsList = sections ?? [];

    // 2. Generar PDF
    const { generatePdf } = await import("@/lib/export/pdf");
    const buffer = await generatePdf({
      title: project.name,
      grantName: project.grant_name,
      viabilityReport: project.viability_report,
      reviewReport: project.review_report,
      sections: sectionsList.map((s) => ({ title: s.title, content: s.content })),
    });

    // 3. Subir a Google Drive
    const fileName = `Memoria_Tecnica_${project.name.replace(/\s+/g, "_")}.pdf`;
    
    // Metadata del archivo
    const metadata = {
      name: fileName,
      mimeType: "application/pdf",
      parents: folderId ? [folderId] : []
    };

    const formData = new FormData();
    formData.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
    formData.append("file", new Blob([buffer], { type: "application/pdf" }));

    const response = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${providerToken}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Google Drive Upload Error:", errorData);
      
      if (response.status === 403) {
        return NextResponse.json({ 
          error: "Permisos insuficientes", 
          detail: "Tu token de Google no tiene permiso de escritura en Drive. Intenta volver a iniciar sesión para actualizar permisos." 
        }, { status: 403 });
      }

      throw new Error("Failed to upload to Drive");
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Drive upload error:", error);
    return NextResponse.json({ 
      error: "Error al subir a Google Drive",
      detail: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
