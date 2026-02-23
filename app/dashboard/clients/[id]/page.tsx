"use client";

import { useEffect, useState, useCallback, use, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeft, Building2, Mail, Phone, Briefcase, Info, 
  Edit3, Trash2, Save, X, FileText, ChevronRight, Plus,
  Archive, RotateCcw, Link2, Loader2, CheckCircle2,
  Search, Target, Award, Clock, FileCheck, Layers,
  BarChart3, Activity, Zap, Calendar, User
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Client, Project } from "@/lib/types";
import * as Label from "@radix-ui/react-label";
import * as Dialog from "@radix-ui/react-dialog";
import * as Tabs from "@radix-ui/react-tabs";
import { BackButton } from "@/components/ui/BackButton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
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
  
  // Confirmation state
  const [confirmArchive, setConfirmArchive] = useState({ open: false, type: 'archive' });
  const [archiving, setArchiving] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    tax_id: "",
    contact_email: "",
    contact_phone: "",
    contact_name: "",
    contact_position: "",
    industry: "",
    cnae: "",
    constitution_date: "",
    fiscal_region: "",
    annual_turnover: "",
    employee_count: "",
    de_minimis_received: "",
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
        contact_name: clientRes.data.contact_name || "",
        contact_position: clientRes.data.contact_position || "",
        industry: clientRes.data.industry || "",
        cnae: clientRes.data.cnae || "",
        constitution_date: clientRes.data.constitution_date || "",
        fiscal_region: clientRes.data.fiscal_region || "",
        annual_turnover: clientRes.data.annual_turnover?.toString() || "0",
        employee_count: clientRes.data.employee_count?.toString() || "0",
        de_minimis_received: clientRes.data.de_minimis_received?.toString() || "0",
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
    const { error: err } = await supabase.from("clients").update({ 
      name: formData.name, 
      tax_id: formData.tax_id || null, 
      contact_email: formData.contact_email || null, 
      contact_phone: formData.contact_phone || null, 
      contact_name: formData.contact_name || null,
      contact_position: formData.contact_position || null,
      industry: formData.industry || null, 
      cnae: formData.cnae || null,
      constitution_date: formData.constitution_date || null,
      fiscal_region: formData.fiscal_region || null,
      annual_turnover: formData.annual_turnover ? parseFloat(formData.annual_turnover) : 0,
      employee_count: formData.employee_count ? parseInt(formData.employee_count) : 0,
      de_minimis_received: formData.de_minimis_received ? parseFloat(formData.de_minimis_received) : 0,
      notes: formData.notes || null, 
    }).eq("id", id);
    if (err) setError(err.message);
    else { setIsEditing(false); loadData(); }
    setSaving(false);
  };

  const handleArchive = async () => {
    const nextStatus = client.status === 'archived' ? 'active' : 'archived';
    setArchiving(true);
    const { error: err } = await supabase.from("clients").update({ status: nextStatus }).eq("id", id);
    if (err) setError(err.message); 
    else {
      setConfirmArchive({ ...confirmArchive, open: false });
      loadData();
    }
    setArchiving(false);
  };

  const linkProject = async (projectId: string) => {
    const { error: err } = await supabase.from("projects").update({ client_id: id }).eq("id", projectId);
    if (err) setError(err.message); else { setIsLinking(false); loadData(); }
  };

  const filteredProjects = useMemo(() => {
    const search = projectSearch.toLowerCase().trim();
    return projects.filter(p => {
      // 1. Filtrado por Pestaña
      const matchesTab = 
        activeTab === 'all' ? true :
        activeTab === 'active' ? p.status !== 'archived' :
        p.status === 'archived';

      // 2. Filtrado por Búsqueda
      const matchesSearch = 
        p.name.toLowerCase().includes(search) || 
        p.grant_name.toLowerCase().includes(search);

      return matchesTab && matchesSearch;
    });
  }, [projects, activeTab, projectSearch]);

  const stats = useMemo(() => ({
    all: projects.length,
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
          <BackButton 
            variant="minimal" 
            className="p-4 bg-slate-50 hover:bg-white rounded-2xl border border-slate-100 transition-all shadow-sm group" 
          />
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-black text-slate-900 tracking-tighter leading-none">{client.name}</h1>
              {client.status === 'archived' && <span className="bg-amber-100 text-amber-700 text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-widest">Archivado</span>}
            </div>
            <div className="flex items-center gap-4 mt-3">
              <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] bg-blue-50 px-3 py-1 rounded-full">{client.tax_id || "ID PENDIENTE"}</span>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                <Clock size={12} /> Miembro desde {new Date(client.created_at).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          {!isEditing ? (
            <>
              <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:border-blue-600 hover:text-blue-600 transition-all shadow-sm"><Edit3 size={16} /> Editar Perfil</button>
              <button onClick={() => setConfirmArchive({ open: true, type: client.status === 'archived' ? 'restore' : 'archive' })} className={cn("p-3.5 rounded-2xl border transition-all", client.status === 'archived' ? "bg-blue-50 border-blue-100 text-blue-600" : "bg-white border-slate-200 text-slate-300 hover:text-amber-600")}>{client.status === 'archived' ? <RotateCcw size={20} /> : <Archive size={20} />}</button>
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
                {[ { label: "Identificación Fiscal", key: "tax_id" }, { label: "Sector de Negocio", key: "industry" } ].map((field) => (
                  <div key={field.key} className="space-y-2">
                    <Label.Root className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">{field.label}</Label.Root>
                    {isEditing ? (
                      <input value={(formData as any)[field.key]} onChange={(e) => setFormData({...formData, [field.key]: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all" />
                    ) : (
                      <p className="font-bold text-slate-900 bg-slate-50/30 px-5 py-4 rounded-2xl border border-slate-100/50">{(client as any)[field.key] || "—"}</p>
                    )}
                  </div>
                ))}

                {/* PERSONA DE CONTACTO */}
                <div className="pt-4 space-y-6">
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.25em] border-b border-blue-50 pb-2">Persona de Contacto</p>
                  {[ { label: "Nombre y Apellidos", key: "contact_name" }, { label: "Cargo / Puesto", key: "contact_position" } ].map((field) => (
                    <div key={field.key} className="space-y-2">
                      <Label.Root className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">{field.label}</Label.Root>
                      {isEditing ? (
                        <input value={(formData as any)[field.key]} onChange={(e) => setFormData({...formData, [field.key]: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all" />
                      ) : (
                        <p className="font-bold text-slate-900 bg-slate-50/30 px-5 py-4 rounded-2xl border border-slate-100/50">{(client as any)[field.key] || "—"}</p>
                      )}
                    </div>
                  ))}
                </div>

                <div className="pt-4 space-y-6">
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.25em] border-b border-blue-50 pb-2">Perfil Técnico y Financiero</p>
                  <div className="grid grid-cols-1 gap-6">
                    {[ 
                      { label: "Código CNAE", key: "cnae" }, 
                      { label: "Fecha Constitución", key: "constitution_date", type: "date" },
                      { label: "Región Fiscal", key: "fiscal_region" },
                      { label: "Nº Empleados", key: "employee_count", type: "number" },
                      { label: "Facturación Anual (€)", key: "annual_turnover", type: "number" },
                      { label: "Ayudas De Minimis (€)", key: "de_minimis_received", type: "number" }
                    ].map((field) => (
                      <div key={field.key} className="space-y-2">
                        <Label.Root className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">{field.label}</Label.Root>
                        {isEditing ? (
                          <input 
                            type={field.type || "text"} 
                            step={field.type === "number" ? "0.01" : undefined}
                            value={(formData as any)[field.key]} 
                            onChange={(e) => setFormData({...formData, [field.key]: e.target.value})} 
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all" 
                          />
                        ) : (
                          <p className="font-bold text-slate-900 bg-slate-50/30 px-5 py-4 rounded-2xl border border-slate-100/50">
                            {field.key === "constitution_date" && (client as any)[field.key] 
                              ? new Date((client as any)[field.key]).toLocaleDateString()
                              : (field.key === "annual_turnover" || field.key === "de_minimis_received")
                                ? new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format((client as any)[field.key] || 0)
                                : (client as any)[field.key] || "—"}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 space-y-6">
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.25em] border-b border-blue-50 pb-2">Canales Directos</p>
                  {[ { label: "Canal Email", key: "contact_email", type: "email" }, { label: "Contacto Telefónico", key: "contact_phone" } ].map((field) => (
                    <div key={field.key} className="space-y-2">
                      <Label.Root className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">{field.label}</Label.Root>
                      {isEditing ? (
                        <input type={field.type || "text"} value={(formData as any)[field.key]} onChange={(e) => setFormData({...formData, [field.key]: e.target.value})} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all" />
                      ) : (
                        <p className="font-bold text-slate-900 bg-slate-50/30 px-5 py-4 rounded-2xl border border-slate-100/50">{(client as any)[field.key] || "—"}</p>
                      )}
                    </div>
                  ))}
                </div>
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
          
          {/* TOOLBAR INTEGRADA COHESIVA */}
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6 bg-white border border-slate-200 p-2.5 rounded-[2rem] shadow-sm">
            <Tabs.Root value={activeTab} onValueChange={setActiveTab} className="w-full lg:w-auto">
              <Tabs.List className="flex gap-1 p-1 bg-slate-100/60 rounded-xl w-fit border border-slate-200/20 backdrop-blur-sm">
                <Tabs.Trigger
                  value="all"
                  className={cn(
                    "flex items-center gap-2 px-3.5 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all group",
                    activeTab === "all" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  <Layers size={12} className={cn("transition-colors", activeTab === "all" ? "text-blue-600" : "text-slate-300 group-hover:text-slate-400")} />
                  Todos
                  <span className={cn(
                    "ml-1 px-1.5 py-0.5 rounded text-[8px] font-bold transition-all",
                    activeTab === "all" ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-500"
                  )}>{stats.all}</span>
                </Tabs.Trigger>
                <Tabs.Trigger
                  value="active"
                  className={cn(
                    "flex items-center gap-2 px-3.5 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all group",
                    activeTab === "active" ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  <Zap size={12} className={cn("transition-colors", activeTab === "active" ? "text-blue-600" : "text-slate-300 group-hover:text-slate-400")} />
                  Activos
                  <span className={cn(
                    "ml-1 px-1.5 py-0.5 rounded text-[8px] font-bold transition-all",
                    activeTab === "active" ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-500"
                  )}>{stats.active}</span>
                </Tabs.Trigger>
                <Tabs.Trigger
                  value="archived"
                  className={cn(
                    "flex items-center gap-2 px-3.5 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all group",
                    activeTab === "archived" ? "bg-white text-amber-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  <Archive size={12} className={cn("transition-colors", activeTab === "archived" ? "text-amber-600" : "text-slate-300 group-hover:text-slate-400")} />
                  Histórico
                  <span className={cn(
                    "ml-1 px-1.5 py-0.5 rounded text-[8px] font-bold transition-all",
                    activeTab === "archived" ? "bg-amber-600 text-white" : "bg-slate-200 text-slate-500"
                  )}>{stats.archived}</span>
                </Tabs.Trigger>
              </Tabs.List>
            </Tabs.Root>

            <div className="flex items-center gap-3 w-full lg:flex-1 lg:justify-end">
              <div className="relative flex-1 max-w-xl group">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                <input 
                  placeholder="Buscar" 
                  value={projectSearch} 
                  onChange={(e) => setProjectSearch(e.target.value)} 
                  className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-100 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all text-[11px] font-black uppercase tracking-widest shadow-sm placeholder:text-slate-300" 
                />
              </div>
              <Link href={`/dashboard/projects/new?clientId=${id}`} className="p-2.5 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-600/20 hover:bg-blue-500 transition-all active:scale-95 shrink-0 flex items-center justify-center">
                <Plus size={20} />
              </Link>
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
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                      <span className={cn("text-[8px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded-full border flex items-center gap-1.5", 
                        p.status === 'exported' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : 
                        p.status === 'archived' ? "bg-amber-50 text-amber-600 border-amber-100" : 
                        "bg-blue-50 text-blue-600 border-blue-100"
                      )}>
                        <div className={cn("w-1 h-1 rounded-full", p.status === 'archived' ? "bg-amber-400" : p.status === 'exported' ? "bg-emerald-500" : "bg-blue-500 animate-pulse")} />
                        {p.status === 'exported' ? 'Finalizado' : p.status === 'archived' ? 'Archivado' : 'En Curso'}
                      </span>
                      {client.contact_name && (
                        <span className="flex items-center gap-1 text-[8px] bg-slate-50 text-slate-400 px-2 py-1 rounded-full font-black uppercase tracking-widest border border-slate-100">
                          <User size={10} /> {client.contact_name}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                    <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      <Calendar size={12} className="text-slate-300" />
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

      <ConfirmDialog 
        open={confirmArchive.open}
        onOpenChange={(open: boolean) => setConfirmArchive({ ...confirmArchive, open })}
        title={confirmArchive.type === 'archive' ? "Archivar Cliente" : "Restaurar Cliente"}
        description={confirmArchive.type === 'archive' 
          ? `¿Estás seguro de que deseas archivar a ${client.name}? El cliente se moverá al histórico pero sus datos se mantendrán a salvo.`
          : `¿Deseas restaurar a ${client.name} para que vuelva a aparecer en el listado de clientes activos?`
        }
        confirmText={confirmArchive.type === 'archive' ? "Archivar ahora" : "Restaurar ahora"}
        variant={confirmArchive.type === 'archive' ? "warning" : "info"}
        loading={archiving}
        onConfirm={handleArchive}
      />
    </div>
  );
}
