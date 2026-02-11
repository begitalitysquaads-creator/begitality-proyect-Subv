import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ExportView } from "@/components/export/ExportView";

export default async function ProjectExportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, grant_name")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!project) notFound();

  const { data: sections } = await supabase
    .from("sections")
    .select("id, title, content, is_completed, sort_order")
    .eq("project_id", id)
    .order("sort_order");

  const sectionsForExport = (sections ?? []).map((s) => ({
    id: s.id,
    title: s.title,
    content: s.content,
    is_completed: s.is_completed,
  }));

  return (
    <ExportView
      project={{
        id: project.id,
        name: project.name,
        grant_name: project.grant_name,
        sections: sectionsForExport,
      }}
    />
  );
}
