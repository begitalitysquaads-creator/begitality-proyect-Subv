"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeft, Building2, Mail, Phone, Briefcase, Info, 
  Edit3, Trash2, Save, X, FileText, ChevronRight, Plus,
  Archive, RotateCcw, Link2, Loader2
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Client, Project } from "@/lib/types";
import * as Label from "@radix-ui/react-label";
import * as Dialog from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";

export default function ClientDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [client, setClient] = useState<Client | any>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [availableProjects, setAvailableProjects] = useState<Project[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    tax_id: "",
    contact_email: "",
    contact_phone: "",
    industry: "",
    notes: ""
  });

  const router = useRouter();
  const supabase = createClient();

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [clientRes, projectsRes, availableRes] = await Promise.all([
      supabase.from("clients").select("*").eq("id", id).single(),
      supabase.from("projects").select("*").eq("client_id", id).order("created_at", { ascending: false }),
      supabase.from("projects").select("*").is("client_id", null).eq("user_id", user.id)
    ]);

    if (clientRes.error) {
      setError(clientRes.error.message);
    } else {
      setClient(clientRes.data);
      setFormData({
        name: clientRes.data.name,
        tax_id: clientRes.data.tax_id || "",
        contact_email: clientRes.data.contact_email || "",
        contact_phone: clientRes.data.contact_phone || "",
        industry: clientRes.data.industry || "",
        notes: clientRes.data.notes || ""
      });
    }

    if (projectsRes.data) setProjects(projectsRes.data);
    if (availableRes.data) setAvailableProjects(availableRes.data);
    setLoading(false);
  }, [id, supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const { error: err } = await supabase
      .from("clients")
      .update({
        name: formData.name,
        tax_id: formData.tax_id || null,
        contact_email: formData.contact_email || null,
        contact_phone: formData.contact_phone || null,
        industry: formData.industry || null,
        notes: formData.notes || null,
      })
      .eq("id", id);

    if (err) {
      setError(err.message);
      setSaving(false);
    } else {
      setIsEditing(false);
      setSaving(false);
      loadData();
    }
  };

  const handleArchive = async () => {
    const nextStatus = client.status === 'archived' ? 'active' : 'archived';
    const msg = nextStatus === 'archived' 
      ? "¿Estás seguro de que deseas archivar este cliente? Seguirá apareciendo en el histórico." 
      : "¿Deseas restaurar a este cliente?";
      
    if (!confirm(msg)) return;
    
    const { error: err } = await supabase
      .from("clients")
      .update({ status: nextStatus })
      .eq("id", id);

    if (err) setError(err.message);
    else loadData();
  };

  const linkProject = async (projectId: string) => {
    const { error: err } = await supabase
      .from("projects")
      .update({ client_id: id })
      .eq("id", projectId);

    if (err) setError(err.message);
    else {
      setIsLinking(false);
      loadData();
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-600" /></div>;
  if (!client) return <div className="text-center py-20 text-slate-500">Cliente no encontrado</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in duration-500">
      <header className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/clients"
            className="p-2 hover:bg-white rounded-full border border-slate-200 transition-all"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-black text-slate-900 tracking-tighter">
                {client.name}
              </h1>
              {client.status === 'archived' && (
                <span className="bg-amber-100 text-amber-700 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">
                  Archivado
                </span>
              )}
            </div>
            <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">
              ID: {client.tax_id || "SIN CIF"}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          {!isEditing ? (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-600 hover:text-blue-600 transition-all shadow-sm"
              >
                <Edit3 size={18} /> Editar
              </button>
              <button
                onClick={handleArchive}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 border rounded-xl font-bold transition-all",
                  client.status === 'archived' 
                    ? "bg-blue-50 border-blue-100 text-blue-600 hover:bg-blue-100" 
                    : "bg-white border-slate-200 text-slate-400 hover:text-amber-600 hover:border-amber-100"
                )}
              >
                {client.status === 'archived' ? <RotateCcw size={18} /> : <Archive size={18} />}
                {client.status === 'archived' ? "Restaurar" : "Archivar"}
              </button>
            </>
          ) : (
            <div className="flex gap-2">
              <button
                form="client-form"
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20"
              >
                {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                Guardar Cambios
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
      </header>

      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-100 text-red-700 text-sm font-bold">
          ⚠️ {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm">
            <form id="client-form" onSubmit={handleUpdate} className="space-y-6">
              <div className="flex items-center gap-3 text-slate-900 font-bold border-b border-slate-100 pb-4">
                <Building2 size={20} className="text-blue-600" />
                Datos Maestros
              </div>

              <div className="space-y-4">
                {isEditing && (
                  <div className="space-y-1">
                    <Label.Root className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nombre Comercial</Label.Root>
                    <input
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold"
                      required
                    />
                  </div>
                )}
                
                {[
                  { label: "CIF / NIF", key: "tax_id" },
                  { label: "Sector", key: "industry" },
                  { label: "Email", key: "contact_email", type: "email" },
                  { label: "Teléfono", key: "contact_phone" },
                ].map((field) => (
                  <div key={field.key} className="space-y-1">
                    <Label.Root className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{field.label}</Label.Root>
                    {isEditing ? (
                      <input
                        type={field.type || "text"}
                        value={(formData as any)[field.key]}
                        onChange={(e) => setFormData({...formData, [field.key]: e.target.value})}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium"
                      />
                    ) : (
                      <p className="font-bold text-slate-900">{(client as any)[field.key] || "—"}</p>
                    )}
                  </div>
                ))}

                <div className="space-y-1 pt-4 border-t border-slate-50">
                  <Label.Root className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Notas internas</Label.Root>
                  {isEditing ? (
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                      rows={4}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium resize-none"
                    />
                  ) : (
                    <p className="text-sm text-slate-500 italic">{client.notes || "Sin notas."}</p>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-black text-slate-900 tracking-tighter flex items-center gap-2">
              <FileText size={20} className="text-blue-600" />
              Proyectos Vinculados
            </h2>
            <div className="flex gap-2">
              <Dialog.Root open={isLinking} onOpenChange={setIsLinking}>
                <Dialog.Trigger asChild>
                  <button className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl font-bold text-xs hover:bg-blue-100 transition-all">
                    <Link2 size={14} /> Vincular Existente
                  </button>
                </Dialog.Trigger>
                <Dialog.Portal>
                  <Dialog.Overlay className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" />
                  <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-[2.5rem] p-10 shadow-2xl z-50">
                    <Dialog.Title className="text-xl font-black text-slate-900 mb-4">
                      Vincular Proyecto
                    </Dialog.Title>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                      {availableProjects.length === 0 ? (
                        <p className="text-slate-400 text-sm italic">No hay proyectos sin cliente asignado.</p>
                      ) : (
                        availableProjects.map(p => (
                          <button
                            key={p.id}
                            onClick={() => linkProject(p.id)}
                            className="w-full text-left p-4 rounded-2xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50 transition-all"
                          >
                            <p className="font-bold text-slate-900 text-sm">{p.name}</p>
                            <p className="text-[10px] text-slate-500">{p.grant_name}</p>
                          </button>
                        ))
                      )}
                    </div>
                  </Dialog.Content>
                </Dialog.Portal>
              </Dialog.Root>
              <Link
                href={`/dashboard/projects/new?clientId=${id}`}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-xs hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20"
              >
                <Plus size={14} /> Nuevo Proyecto
              </Link>
            </div>
          </div>

          <div className="space-y-3">
            {projects.length === 0 ? (
              <div className="bg-slate-50 border border-dashed border-slate-200 rounded-3xl p-12 text-center">
                <p className="text-slate-400 font-medium italic">Este cliente no tiene proyectos aún.</p>
              </div>
            ) : (
              projects.map((p) => (
                <Link
                  key={p.id}
                  href={`/dashboard/projects/${p.id}`}
                  className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl p-6 hover:border-blue-200 hover:shadow-md transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-slate-50 rounded-xl group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                      <FileText size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{p.name}</p>
                      <p className="text-xs text-slate-500">{p.grant_name}</p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
