"use client";

import { useEffect, useState, useCallback, use, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeft, Building2, Mail, Phone, Briefcase, Info, 
  Edit3, Trash2, Save, X, FileText, ChevronRight, Plus,
  Archive, RotateCcw, Link2, Loader2, CheckCircle2,
  Search, Target, Award, Clock, FileCheck, Layers,
  BarChart3, Activity
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Client, Project } from "@/lib/types";
import * as Label from "@radix-ui/react-label";
import * as Dialog from "@radix-ui/react-dialog";
import * as Tabs from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

export default function ClientDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [client, setClient] = useState<Client | any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [availableProjects, setAvailableProjects] = useState<Project[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("active");
  const [projectSearch, setProjectSearch] = useState("");
  
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
      supabase.from("projects").select("*").eq("client_id", id).order("updated_at", { ascending: false }),
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

  useEffect(() => { loadData(); }, [loadData]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error: err } = await supabase.from("clients").update({ name: formData.name, tax_id: formData.tax_id || null, contact_email: formData.contact_email || null, contact_phone: formData.contact_phone || null, industry: formData.industry || null, notes: formData.notes || null, }).eq("id", id);
    if (err) setError(err.message);
    else { setIsEditing(false); loadData(); }
    setSaving(false);
  };

  const handleArchive = async () => {
    const nextStatus = client.status === 'archived' ? 'active' : 'archived';
    if (!confirm(nextStatus === 'archived' ? "¿Archivar?" : "¿Restaurar?")) return;
    const { error: err } = await supabase.from("clients").update({ status: nextStatus }).eq("id", id);
    if (err) setError(err.message); else loadData();
  };

  const linkProject = async (projectId: string) => {
    const { error: err } = await supabase.from("projects").update({ client_id: id }).eq("id", projectId);
    if (err) setError(err.message); else { setIsLinking(false); loadData(); }
  };

  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const matchesTab = activeTab === "active" ? p.status !== "archived" : p.status === "archived";
      const matchesSearch = p.name.toLowerCase().includes(projectSearch.toLowerCase()) || p.grant_name.toLowerCase().includes(projectSearch.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [projects, activeTab, projectSearch]);

  const stats = useMemo(() => ({
    active: projects.filter(p => p.status !== 'archived').length,
    archived: projects.filter(p => p.status === 'archived').length
  }), [projects]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-600" /></div>;
  if (!client) return <div className="text-center py-20 text-slate-500">Cliente no encontrado</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in duration-700 pb-20">
      
      {/* HEADER PREMIUM */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white border border-slate-200 p-8 rounded-[3rem] shadow-sm gap-6">
        <div className="flex items-center gap-6">
          <Link href="/dashboard/clients" className="p-4 bg-slate-50 hover:bg-white rounded-2xl border border-slate-100 transition-all shadow-sm group">
            <ArrowLeft size={20} className="text-slate-400 group-hover:text-blue-600 transition-colors" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-black text-slate-900 tracking-tighter leading-none">{client.name}</h1>
              {client.status === 'archived' && <span className="bg-amber-100 text-amber-700 text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-widest">Archivado</span>}
            </div>
            <div className="flex items-center gap-4 mt-3">
              <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] bg-blue-50 px-3 py-1 rounded-full">{client.tax_id || "ID PENDIENTE"}</span>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                <Clock size={12} /> Miembro desde {new Date(client.created_at).getFullYear()}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          {!isEditing ? (
            <>
              <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:border-blue-600 hover:text-blue-600 transition-all shadow-sm"><Edit3 size={16} /> Editar Perfil</button>
              <button onClick={handleArchive} className={cn("p-3.5 rounded-2xl border transition-all", client.status === 'archived' ? "bg-blue-50 border-blue-100 text-blue-600" : "bg-white border-slate-200 text-slate-300 hover:text-amber-600")}>{client.status === 'archived' ? <RotateCcw size={20} /> : <Archive size={20} />}</button>
            </>
          ) : (
            <div className="flex gap-2">
              <button form="client-form" type="submit" disabled={saving} className="flex items-center gap-3 px-8 py-3 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 shadow-xl transition-all">{saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Guardar</button>
              <button onClick={() => setIsEditing(false)} className="px-6 py-3 bg-slate-100 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest">Cancelar</button>
            </div>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* COLUMNA IZQUIERDA: RESUMEN TÉCNICO */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-sm">
            <form id="client-form" onSubmit={handleUpdate} className="space-y-10">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-6">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600"><Info size={20} /></div>
                <span className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Información Maestra</span>
              </div>
              
              <div className="space-y-6">
                {isEditing && (
                  <div className="space-y-2">
                    <Label.Root className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Razón Social</Label.Root>
                    <input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all" required />
                  </div>
                )}
                {[ { label: "Identificación Fiscal", key: "tax_id" }, { label: "Sector de Negocio", key: "industry" }, { label: "Canal Email", key: "contact_email", type: "email" }, { label: "Contacto Telefónico", key: "contact_phone" } ].map((field) => (
                  <div key={field.key} className="space-y-2">
                    <Label.Root className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">{field.label}</Label.Root>
                    {isEditing ? (
                      <input type={field.type || "text"} value={(formData as any)[field.key]} onChange={(e) => setFormData({...formData, [field.key]: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all" />
                    ) : (
                      <p className="font-bold text-slate-900 bg-slate-50/30 px-5 py-4 rounded-2xl border border-slate-100/50">{(client as any)[field.key] || "—"}</p>
                    )}
                  </div>
                ))}
                <div className="space-y-2">
                  <Label.Root className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Observaciones</Label.Root>
                  {isEditing ? (
                    <textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} rows={4} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all resize-none" />
                  ) : (
                    <div className="text-xs text-slate-500 font-medium italic bg-slate-50/30 p-5 rounded-2xl border border-slate-100/50 leading-relaxed">{client.notes || "Sin especificaciones técnicas."}</div>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* COLUMNA DERECHA: DASHBOARD DE PROYECTOS */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* TOOLBAR INTEGRADA */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 bg-white border border-slate-200 p-4 rounded-3xl shadow-sm">
            <Tabs.Root value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
              <Tabs.List className="flex gap-1 p-1 bg-slate-50 rounded-2xl w-fit border border-slate-100">
                <Tabs.Trigger value="active" className={cn("px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", activeTab === "active" ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600")}>Activos <span className="ml-2 opacity-40">{stats.active}</span></Tabs.Trigger>
                <Tabs.Trigger value="archived" className={cn("px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", activeTab === "archived" ? "bg-white text-amber-600 shadow-sm" : "text-slate-400 hover:text-slate-600")}>Histórico <span className="ml-2 opacity-40">{stats.archived}</span></Tabs.Trigger>
              </Tabs.List>
            </Tabs.Root>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64 group">
                <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                <input placeholder="Buscar memoria..." value={projectSearch} onChange={(e) => setProjectSearch(e.target.value)} className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] font-bold outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all shadow-inner" />
              </div>
              <Link href={`/dashboard/projects/new?clientId=${id}`} className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-600/20 hover:bg-blue-500 transition-all active:scale-95"><Plus size={20} /></Link>
            </div>
          </div>

          {/* GRID DE PROYECTOS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-bottom-4 duration-700">
            {filteredProjects.length === 0 ? (
              <div className="col-span-full py-24 text-center bg-white border border-slate-100 border-dashed rounded-[3rem]">
                <Activity size={48} className="mx-auto text-slate-100 mb-4" />
                <p className="text-slate-400 font-black text-xs uppercase tracking-widest">Sin coincidencias detectadas</p>
              </div>
            ) : (
              filteredProjects.map((p) => (
                <Link key={p.id} href={`/dashboard/projects/${p.id}`} className={cn("group bg-white border border-slate-100 rounded-[2.5rem] p-8 hover:border-blue-200 hover:shadow-[0_30px_60px_-12px_rgba(59,130,246,0.12)] transition-all relative overflow-hidden flex flex-col justify-between h-[280px]", p.status === 'archived' && "opacity-80 grayscale-[0.2]")}>
                  
                  <div>
                    <div className="flex justify-between items-start mb-6">
                      <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm transition-all group-hover:scale-110", p.status === 'archived' ? "bg-slate-50 text-slate-300" : "bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white")}>
                        {p.status === 'exported' ? <CheckCircle2 size={24} /> : p.status === 'archived' ? <Archive size={24} /> : <FileText size={24} />}
                      </div>
                      
                      {/* SCORE BADGE */}
                      {p.success_score > 0 && (
                        <div className="flex flex-col items-end">
                          <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1">Audit Score</span>
                          <div className={cn("w-10 h-10 rounded-full border-2 flex items-center justify-center", p.success_score >= 80 ? "border-emerald-100 bg-emerald-50 text-emerald-600" : "border-amber-100 bg-amber-50 text-amber-600")}>
                            <span className="text-xs font-black">{p.success_score}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <h3 className="font-black text-slate-900 text-xl tracking-tight leading-tight group-hover:text-blue-600 transition-colors mb-2 line-clamp-2">{p.name}</h3>
                    <div className="flex items-center gap-2 mb-4">
                      <span className={cn("text-[8px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded-full border flex items-center gap-1.5", 
                        p.status === 'exported' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : 
                        p.status === 'archived' ? "bg-amber-50 text-amber-600 border-amber-100" : 
                        "bg-blue-50 text-blue-600 border-blue-100"
                      )}>
                        <div className={cn("w-1 h-1 rounded-full", p.status === 'archived' ? "bg-amber-400" : p.status === 'exported' ? "bg-emerald-500" : "bg-blue-500 animate-pulse")} />
                        {p.status === 'exported' ? 'Finalizado' : p.status === 'archived' ? 'Archivado' : 'En Curso'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                    <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      <Calendar size={12} className="text-slate-200" />
                      {new Date(p.updated_at).toLocaleDateString()}
                    </div>
                    <div className="w-8 h-8 bg-slate-50 rounded-xl flex items-center justify-center text-slate-300 group-hover:bg-blue-50 group-hover:text-blue-600 transition-all">
                      <ChevronRight size={16} />
                    </div>
                  </div>

                  {/* Icono decorativo de fondo */}
                  <div className="absolute -right-4 -top-4 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity duration-700 pointer-events-none">
                    <BarChart3 size={120} />
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Calendar({ size, className }: { size?: number; className?: string }) {
  return <Clock size={size} className={className} />;
}
