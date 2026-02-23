import { createClient } from "@/lib/supabase/server";

export async function logAuditAction(
  projectId: string,
  userId: string,
  action: string,
  details: any = {}
) {
  const supabase = await createClient();
  
  try {
    await supabase.from("audit_logs").insert({
      project_id: projectId,
      user_id: userId,
      action,
      details
    });
  } catch (error) {
    console.error("Failed to log audit action:", error);
    // Non-blocking error logging
  }
}
