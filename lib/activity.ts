import { createClient as createServiceClient } from "@supabase/supabase-js";

/**
 * Registra una actividad en el historial.
 * Usa service_role para evitar problemas de RLS en contextos server-side.
 */
export async function logActivity({
    userId,
    projectId,
    action,
    description,
    metadata,
}: {
    userId: string;
    projectId?: string;
    action: string;
    description?: string;
    metadata?: Record<string, unknown>;
}) {
    try {
        const admin = createServiceClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        await admin.from("activity_log").insert({
            user_id: userId,
            project_id: projectId ?? null,
            action,
            description: description ?? null,
            metadata: metadata ?? {},
        });
    } catch (err) {
        // No fallar silenciosamente en producción, pero tampoco bloquear la operación principal
        console.error("Failed to log activity:", err);
    }
}
