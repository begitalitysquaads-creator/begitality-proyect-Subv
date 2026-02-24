import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  // Nota: provider_token solo está disponible si se ha configurado 
  // correctamente el flujo de Google en Supabase y se ha guardado en la sesión.
  const providerToken = session?.provider_token;

  if (!providerToken) {
    return NextResponse.json({ 
      error: "Google Drive no vinculado",
      detail: "Se requiere el provider_token de Google. Asegúrate de haber iniciado sesión con Google y tener los scopes adecuados."
    }, { status: 401 });
  }

  try {
    const response = await fetch(
      "https://www.googleapis.com/drive/v3/files?q=mimeType='application/vnd.google-apps.folder'%20and%20trashed=false&fields=files(id,name)", 
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
    const folders = data.files.map((f: any) => ({ id: f.id, name: f.name }));

    return NextResponse.json({ folders });
  } catch (error) {
    console.error("Drive error:", error);
    return NextResponse.json({ error: "Error al acceder a Google Drive" }, { status: 500 });
  }
}
