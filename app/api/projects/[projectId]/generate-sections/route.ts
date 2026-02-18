import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractTextFromPdf } from "@/lib/pdf-extract";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const BUCKET = "convocatoria-files";
const MAX_TEXT_LENGTH = 30000;

export async function POST(
  _req: Request,
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

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, grant_name")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single();

  if (!project) {
    return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
  }

  const { data: bases } = await supabase
    .from("convocatoria_bases")
    .select("id, name, file_path")
    .eq("project_id", projectId)
    .not("file_path", "is", null);

  if (!bases?.length) {
    return NextResponse.json(
      { error: "No hay bases de convocatoria cargadas. Sube al menos un PDF." },
      { status: 400 }
    );
  }

  let fullText = "";
  const errors: string[] = [];
  for (const b of bases) {
    if (!b.file_path) continue;
    const { data: blob, error: downloadErr } = await supabase.storage
      .from(BUCKET)
      .download(b.file_path);
    if (downloadErr) {
      errors.push(`Descarga de "${b.name}": ${downloadErr.message}`);
      continue;
    }
    if (!blob || blob.size === 0) {
      errors.push(`El archivo "${b.name}" está vacío.`);
      continue;
    }
    const buffer = Buffer.from(await blob.arrayBuffer());
    try {
      const text = await extractTextFromPdf(buffer);
      if (text.length > 0) {
        fullText += `\n--- ${b.name} ---\n${text}`;
      } else {
        errors.push(`No se pudo extraer texto de "${b.name}" (PDF sin texto extraíble).`);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`Error al procesar "${b.name}": ${msg}`);
    }
  }

  const textToSend = fullText.slice(0, MAX_TEXT_LENGTH).trim();
  if (!textToSend) {
    return NextResponse.json(
      { error: "No se pudo extraer texto de los PDFs.", details: errors },
      { status: 400 }
    );
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY no configurada" }, { status: 500 });
  }

  try {
    const genAI = new GoogleGenerativeAI(geminiKey);
    
    // Definición de esquema con tipado explícito para evitar errores de compilación
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          description: "Lista de títulos de secciones para la memoria técnica",
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.STRING,
          },
        },
      },
    });

    const prompt = `Analiza el texto de la convocatoria de subvención y determina las secciones obligatorias que debe tener la memoria técnica. 
    Proyecto: ${project.name}
    Convocatoria: ${project.grant_name}

    Responde con un array de strings con los títulos de las secciones.
    
    Texto de la convocatoria:
    ${textToSend}`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const titles = JSON.parse(response.text()) as string[];

    if (!titles.length) {
      throw new Error("La IA no devolvió secciones");
    }

    // --- Lógica no destructiva ---
    const { data: existingSections } = await supabase
      .from("sections")
      .select("id, title, content")
      .eq("project_id", projectId);

    const existingTitles = new Set(existingSections?.map(s => s.title.toLowerCase()) || []);
    
    // Solo insertar secciones que no existan ya (evita duplicados y pérdida de datos)
    const sectionsToInsert = titles
      .filter(t => !existingTitles.has(t.toLowerCase()))
      .map((title, i) => ({
        project_id: projectId,
        title: title.slice(0, 500),
        content: "",
        sort_order: (existingSections?.length || 0) + i,
        is_completed: false,
      }));

    if (sectionsToInsert.length > 0) {
      const { error: insertErr } = await supabase.from("sections").insert(sectionsToInsert);
      if (insertErr) throw insertErr;
    }

    return NextResponse.json({
      ok: true,
      new_sections: sectionsToInsert.length,
      total_sections: (existingSections?.length || 0) + sectionsToInsert.length,
      sections: titles,
    });

  } catch (error) {
    console.error("Error en IA/DB:", error);
    return NextResponse.json(
      { error: "Error al procesar con IA", message: error instanceof Error ? error.message : "Desconocido" },
      { status: 502 }
    );
  }
}
