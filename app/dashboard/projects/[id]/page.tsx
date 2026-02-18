import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, User, Mail, Phone, ExternalLink, RefreshCw, Archive, RotateCcw } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CargarBasesConvocatoria } from "@/components/project/CargarBasesConvocatoria";
import { SeccionesMemoria } from "@/components/project/SeccionesMemoria";
import { cn } from "@/lib/utils";
import { revalidatePath } from "next/cache";

export default async function ProjectWorkspacePage({
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

  // Cargar proyecto con cliente
  const { data: project } = await supabase
    .from("projects")
    .select("*, clients(*)")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!project) notFound();

  // "Touch" al proyecto para que aparezca en Recientes SOLO si no está archivado
  if (project.status !== 'archived') {
    await supabase
      .from("projects")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id);
  }

  const isArchived = project.status === 'archived';

  const { data: sections } = await supabase
    .from("sections")
    .select("id, title, content, is_completed, sort_order")
    .eq("project_id", id)
    .order("sort_order");

  const { data: convocatoriaFiles } = await supabase
    .from("convocatoria_bases")
    .select("id, name, file_path, file_size, created_at")
    .eq("project_id", id)
    .order("created_at", { ascending: false });

  // Solo mostrar clientes activos para asignación
  const { data: clients } = await supabase
    .from("clients")
    .select("id, name")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("name");

  const client = project.clients;

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <header className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="p-2 hover:bg-white rounded-full border border-slate-200 transition-all"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-slate-900 tracking-tighter">{project.name}</h1>
              {isArchived && (
                <span className="bg-amber-100 text-amber-700 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">
                  Archivado
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <p className="text-slate-500 text-sm font-medium">{project.grant_name}</p>
              {client && (
                <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-black uppercase tracking-widest">
                  {client.name}
                </span>
              )}
            </div>
          </div>
        </div>

        <form action={async () => {
          "use server";
          const sb = await createClient();
          const nextStatus = isArchived ? 'draft' : 'archived';
          await sb.from("projects").update({ status: nextStatus }).eq("id", id);
          revalidatePath(`/dashboard/projects/${id}`);
          revalidatePath("/dashboard");
        }}>
          <button 
            type="submit"
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all border shadow-sm",
              isArchived 
                ? "bg-blue-50 border-blue-100 text-blue-600 hover:bg-blue-100" 
                : "bg-white border-slate-200 text-slate-400 hover:text-amber-600 hover:border-amber-100"
            )}
          >
            {isArchived ? <RotateCcw size={16} /> : <Archive size={16} />}
            {isArchived ? "Restaurar Proyecto" : "Archivar Proyecto"}
          </button>
        </form>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <CargarBasesConvocatoria
            projectId={id}
            files={convocatoriaFiles ?? []}
          />

          <SeccionesMemoria
            projectId={id}
            sections={sections ?? []}
            hasConvocatoriaFiles={(convocatoriaFiles?.length ?? 0) > 0}
          />
        </div>
        
        <div className="space-y-6">
          {/* Tarjeta de Cliente */}
          <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm">
            <div className="flex justify-between items-start mb-6">
              <h3 className="font-black text-slate-900 flex items-center gap-2">
                <Building2 size={18} className="text-blue-600" />
                Cliente
              </h3>
              {client && (
                <Link 
                  href={`/dashboard/clients/${client.id}`}
                  className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-blue-600 transition-all"
                >
                  <ExternalLink size={16} />
                </Link>
              )}
            </div>

            {client ? (
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Empresa</p>
                  <p className="font-bold text-slate-900">{client.name}</p>
                  <p className="text-xs text-slate-500 font-medium">{client.tax_id || "SIN CIF"}</p>
                </div>
                {(client.contact_email || client.contact_phone) && (
                  <div className="pt-4 border-t border-slate-50 space-y-2">
                    {client.contact_email && (
                      <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                        <Mail size={12} className="text-slate-300" />
                        {client.contact_email}
                      </div>
                    )}
                    {client.contact_phone && (
                      <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                        <Phone size={12} className="text-slate-300" />
                        {client.contact_phone}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="py-4 text-center">
                <p className="text-xs text-slate-400 italic mb-4">No hay cliente asignado a este proyecto.</p>
              </div>
            )}

            <div className="mt-6 pt-6 border-t border-slate-100">
              <form action={async (formData) => {
                "use server";
                const newClientId = formData.get("clientId") as string;
                const sb = await createClient();
                await sb.from("projects").update({ client_id: newClientId || null }).eq("id", id);
                revalidatePath(`/dashboard/projects/${id}`);
              }}>
                <select 
                  name="clientId"
                  defaultValue={client?.id || ""}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-100 bg-slate-50 text-xs font-bold text-slate-600 outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 mb-3"
                >
                  <option value="">Sin cliente...</option>
                  {clients?.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <button 
                  type="submit"
                  className="w-full py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                >
                  <RefreshCw size={12} /> Actualizar Asignación
                </button>
              </form>
            </div>
          </div>

          <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden group">
            <h3 className="font-bold mb-2 flex items-center gap-2">
              <User size={18} className="text-blue-400" />
              Asistente IA
            </h3>
            <p className="text-slate-400 text-xs font-medium leading-relaxed">
              El chat contextual para redactar por secciones estará disponible
              en la Etapa 3.
            </p>
            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform duration-700">
              <Building2 size={120} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
