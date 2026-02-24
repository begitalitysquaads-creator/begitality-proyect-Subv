import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const providerToken = session?.provider_token;

  if (!providerToken) {
    return NextResponse.json({ error: "Google Drive no vinculado" }, { status: 401 });
  }

  try {
    // Listar carpetas en la unidad del usuario
    const response = await fetch(
      "https://www.googleapis.com/drive/v3/files?q=mimeType='application/vnd.google-apps.folder' and trashed=false&fields=files(id, name)",
      {
        headers: {
          Authorization: `Bearer ${providerToken}`,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Google Drive API Error:", errorData);
      
      if (response.status === 403) {
        return NextResponse.json({ 
          error: "Permisos insuficientes", 
          detail: "La sesión de Google no tiene permisos para acceder a Drive. Por favor, vuelve a vincular tu cuenta de Google con los permisos necesarios." 
        }, { status: 403 });
      }
      
      throw new Error("Failed to fetch folders");
    }

    const data = await response.json();
    const folders = (data.files || []).map((f: any) => ({ id: f.id, name: f.name }));

    return NextResponse.json({ folders });
  } catch (error) {
    console.error("Drive error:", error);
    return NextResponse.json({ error: "Error al acceder a Google Drive" }, { status: 500 });
  }
}

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
