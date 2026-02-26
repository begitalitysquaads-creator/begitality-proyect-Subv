"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export function ProjectTouch({ projectId }: { projectId: string }) {
  useEffect(() => {
    const supabase = createClient();
    
    // Solo actualizar si la página está activa y después de un breve delay
    const timer = setTimeout(async () => {
      await supabase
        .from("projects")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", projectId);
    }, 2000);

    return () => clearTimeout(timer);
  }, [projectId]);

  return null;
}
