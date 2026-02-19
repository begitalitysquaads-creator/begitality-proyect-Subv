import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { uploadToDrive } from "@/lib/google/drive";
import { logActivity } from "@/lib/activity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/export/drive
 * Genera el archivo (PDF o DOCX) y lo sube a Google Drive del usuario.
 * Body: { projectId: string, format: "pdf" | "docx" }
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { projectId: string; format: "pdf" | "docx" };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { projectId, format } = body;
  if (!projectId || !format || !["pdf", "docx"].includes(format)) {
    return NextResponse.json(
      { error: "projectId and format (pdf|docx) required" },
      { status: 400 }
    );
  }

  // Obtener proyecto
  const { data: project } = await supabase
    .from("projects")
    .select("id, name, grant_name")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single();

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Obtener secciones
  const { data: sections } = await supabase
    .from("sections")
    .select("id, title, content, sort_order")
    .eq("project_id", projectId)
    .order("sort_order");

  const sectionsList = sections ?? [];

  // Generar archivo
  let buffer: ArrayBuffer | Buffer;
  let mimeType: string;
  let extension: string;

  if (format === "pdf") {
    const { generatePdf } = await import("@/lib/export/pdf");
    buffer = await generatePdf({
      title: project.name,
      grantName: project.grant_name,
      sections: sectionsList.map((s) => ({
        title: s.title,
        content: s.content,
      })),
    });
    mimeType = "application/pdf";
    extension = "pdf";
  } else {
    const { generateDocx } = await import("@/lib/export/docx");
    buffer = await generateDocx({
      title: project.name,
      grantName: project.grant_name,
      sections: sectionsList.map((s) => ({
        title: s.title,
        content: s.content,
      })),
    });
    mimeType =
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    extension = "docx";
  }

  const fileName = `Memoria_Tecnica_${project.name.replace(/\s+/g, "_")}.${extension}`;

  // Subir a Google Drive
  try {
    const result = await uploadToDrive({
      userId: user.id,
      fileName,
      mimeType,
      fileBuffer: Buffer.from(buffer),
    });

    await logActivity({
      userId: user.id,
      projectId,
      action: `exported_drive_${format}`,
      description: `Exportado a Google Drive como ${format.toUpperCase()}: "${project.name}"`,
      metadata: {
        format,
        sections_count: sectionsList.length,
        drive_file_id: result.fileId,
      },
    });

    return NextResponse.json({
      success: true,
      fileId: result.fileId,
      webViewLink: result.webViewLink,
      fileName,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown error uploading to Drive";

    if (message === "GOOGLE_NOT_CONNECTED") {
      return NextResponse.json(
        { error: "Google Drive not connected", code: "GOOGLE_NOT_CONNECTED" },
        { status: 403 }
      );
    }

    console.error("Drive upload error:", err);
    return NextResponse.json(
      { error: "Failed to upload to Google Drive", detail: message },
      { status: 500 }
    );
  }
}
