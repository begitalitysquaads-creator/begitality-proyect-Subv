import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const providerToken = session?.provider_token;

  if (!providerToken) {
    return NextResponse.json({ error: "Google Drive no vinculado" }, { status: 401 });
  }

  try {
    const { name, parentId } = await req.json();

    if (!name) {
      return NextResponse.json({ error: "El nombre de la carpeta es obligatorio" }, { status: 400 });
    }

    const metadata = {
      name: name,
      mimeType: "application/vnd.google-apps.folder",
      parents: parentId && parentId !== "root" ? [parentId] : []
    };

    const response = await fetch(
      "https://www.googleapis.com/drive/v3/files",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${providerToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(metadata),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Google Drive Create Folder Error:", errorData);
      throw new Error("Failed to create folder in Drive");
    }

    const folder = await response.json();
    return NextResponse.json({ id: folder.id, name: folder.name });
  } catch (error) {
    console.error("Drive create folder error:", error);
    return NextResponse.json({ 
      error: "Error al crear carpeta en Google Drive",
      detail: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
