import { createClient } from "@/lib/supabase/client";

/**
 * Registra una acción en el historial de auditoría desde el cliente.
 * El RLS de Supabase se encarga de validar que el usuario está autenticado.
 */
export async function logClientAction(
  projectId: string | null,
  action: string,
  description: string,
  details: any = {}
) {
  const supabase = createClient();
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("audit_logs").insert({
      project_id: projectId,
      user_id: user.id,
      action,
      details: {
        ...details,
        description
      }
    });
  } catch (error) {
    console.error("Failed to log client audit action:", error);
  }
}
