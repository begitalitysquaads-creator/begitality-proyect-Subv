import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractTextFromPdf } from "@/lib/pdf-extract";
import { generateEmbedding, chunkText } from "@/lib/embeddings";
import { logAuditAction } from "@/lib/audit";

export const runtime = "nodejs";
// Increase timeout for long processing if needed on Vercel/etc
export const maxDuration = 60; 

export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> } // Params is a Promise in Next.js 15+
) {
  const { projectId } = await params;
  const supabase = await createClient(); // Await createClient
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 1. Fetch project bases
  const { data: bases, error: fetchError } = await supabase
    .from("convocatoria_bases")
    .select("id, name, file_path")
    .eq("project_id", projectId);

  if (fetchError || !bases || bases.length === 0) {
    return NextResponse.json({ message: "No documents found or error fetching bases." });
  }

  let processedCount = 0;

  // 2. Process each base
  for (const base of bases) {
    if (!base.file_path) continue;

    // Simple check: skip if already indexed
    const { count } = await supabase
      .from("document_embeddings")
      .select("*", { count: "exact", head: true })
      .eq("source_id", base.id);

    if (count && count > 0) {
      console.log(`Skipping ${base.name}, already indexed.`);
      continue;
    }

    try {
      console.log(`Processing ${base.name}...`);
      const { data: blob, error: downloadError } = await supabase.storage
        .from("convocatoria-files")
        .download(base.file_path);

      if (downloadError || !blob) {
        console.error(`Error downloading ${base.name}:`, downloadError);
        continue;
      }

      const buffer = Buffer.from(await blob.arrayBuffer());
      const text = await extractTextFromPdf(buffer);
      
      if (!text || text.trim().length === 0) {
         console.warn(`Empty text extracted from ${base.name}`);
         continue;
      }

      const chunks = chunkText(text);
      console.log(`Generated ${chunks.length} chunks for ${base.name}`);

      // Generate embeddings in batches to avoid rate limits
      const embeddingsData = [];
      for (const chunk of chunks) {
         try {
           const embedding = await generateEmbedding(chunk);
           embeddingsData.push({
             project_id: projectId,
             source_type: "convocatoria_basis",
             source_id: base.id,
             content: chunk,
             embedding: embedding, // Ensure DB expects vector(768)
             metadata: { file_name: base.name },
           });
           // Small delay to be nice to API
           await new Promise(r => setTimeout(r, 200)); 
         } catch (embError) {
           console.error(`Error embedding chunk for ${base.name}:`, embError);
         }
      }

      if (embeddingsData.length > 0) {
        const { error: insertError } = await supabase
          .from("document_embeddings")
          .insert(embeddingsData);

        if (insertError) {
          console.error(`Error inserting embeddings for ${base.name}:`, insertError);
        } else {
          processedCount++;
        }
      }

    } catch (e) {
      console.error(`Error processing ${base.name}:`, e);
    }
  }

  if (processedCount > 0) {
    await logAuditAction(projectId, user.id, "Ingesta IA", {
      description: `indexó ${processedCount} documentos en la base de conocimiento`,
      count: processedCount
    });
  }

  return NextResponse.json({ 
    success: true, 
    message: `Processed ${processedCount} documents.` 
  });
}
