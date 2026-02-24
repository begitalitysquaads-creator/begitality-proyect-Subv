"use client";

import { useEffect, useState, useCallback, use, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Building2, Mail, Phone, Briefcase, Info,
  Edit3, Trash2, Save, X, FileText, ChevronRight, Plus,
  Archive, RotateCcw, Link2, Loader2, CheckCircle2,
  Search, Target, Award, Clock, FileCheck, Layers,
  BarChart3, Activity, Zap, Calendar, User, ChevronDown, ExternalLink, Users, TrendingUp, Hash, Globe, UserCheck, MapPin,
  Check
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Client, Project } from "@/lib/types";
import * as Label from "@radix-ui/react-label";
import * as Dialog from "@radix-ui/react-dialog";
import * as Tabs from "@radix-ui/react-tabs";
import { BackButton } from "@/components/ui/BackButton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PremiumSelector } from "@/components/ui/PremiumSelector";
import { PremiumDatePicker } from "@/components/ui/PremiumDatePicker";
import { cn } from "@/lib/utils";

const COUNTRIES = [
  { code: "+34", flag: "🇪🇸", label: "España" },
  { code: "+351", flag: "🇵🇹", label: "Portugal" },
  { code: "+33", flag: "🇫🇷", label: "Francia" },
  { code: "+44", flag: "🇬🇧", label: "Reino Unido" },
  { code: "+49", flag: "🇩🇪", label: "Alemania" },
  { code: "+1", flag: "🇺🇸", label: "EE.UU." },
  { code: "+39", flag: "🇮🇹", label: "Italia" },
  { code: "+52", flag: "🇲🇽", label: "México" },
  { code: "+54", flag: "🇦🇷", label: "Argentina" },
  { code: "+56", flag: "🇨🇱", label: "Chile" },
  { code: "+57", flag: "🇨🇴", label: "Colombia" },
];

const COMPANY_SIZES = [
  { value: "micro", label: "Microempresa (< 10 emp.)" },
  { value: "small", label: "Pequeña (10-49 emp.)" },
  { value: "medium", label: "Mediana (50-249 emp.)" },
  { value: "large", label: "Grande (> 250 emp.)" },
];

const REVENUE_RANGES = [
  { value: "<2M", label: "Menos de 2M €" },
  { value: "2M-10M", label: "2M € - 10M €" },
  { value: "10M-50M", label: "10M € - 50M €" },
  { value: ">50M", label: "Más de 50M €" },
];

const SECTORS = [
  "Tecnología e IT", "Industria y Manufactura", "Energía y Renovables",
  "Salud y Farma", "Agroalimentario", "Construcción", "Transporte y Logística",
  "Turismo y Ocio", "Comercio", "Servicios Profesionales", "Educación", "Otros"
];

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
    cnae: "",
    constitution_date: "",
    fiscal_region: "",
    de_minimis_received: "",
    notes: "",
    // Metadata
    address: "",
    company_size: "",
    founded_year: "",
    website: "",
    revenue_range: "",
    sector: ""
  });

  const [countryPrefix, setCountryPrefix] = useState(COUNTRIES[0]);
  const [showPrefixSelector, setShowPrefixSelector] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");
  const prefixRef = useRef<HTMLDivElement>(null);

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

      // Parse phone
      let parsedPrefix = COUNTRIES[0];
      let parsedPhone = clientRes.data.contact_phone || "";

      if (parsedPhone.includes(" ")) {
        const [prefixCode, ...rest] = parsedPhone.split(" ");
        const match = COUNTRIES.find(c => c.code === prefixCode);
        if (match) {
          parsedPrefix = match;
          parsedPhone = rest.join(" ");
        }
      } else if (parsedPhone.startsWith("+")) {
        // Try to find matching prefix at start
        const match = COUNTRIES.find(c => parsedPhone.startsWith(c.code));
        if (match) {
          parsedPrefix = match;
          parsedPhone = parsedPhone.replace(match.code, "").trim();
        }
      }

      setCountryPrefix(parsedPrefix);
      setPhoneInput(parsedPhone);

      setFormData({
        name: clientRes.data.name,
        tax_id: clientRes.data.tax_id || "",
        contact_email: clientRes.data.contact_email || "",
        contact_phone: clientRes.data.contact_phone || "",
        contact_name: clientRes.data.contact_name || "",
        contact_position: clientRes.data.contact_position || "",
        cnae: clientRes.data.cnae || "",
        constitution_date: clientRes.data.constitution_date || "",
        fiscal_region: clientRes.data.fiscal_region || "",
        de_minimis_received: clientRes.data.de_minimis_received?.toString() || "0",
        notes: clientRes.data.notes || "",
        // Metadata
        address: clientRes.data.address || "",
        company_size: clientRes.data.company_size || "",
        founded_year: clientRes.data.founded_year?.toString() || "",
        website: clientRes.data.website || "",
        revenue_range: clientRes.data.revenue_range || "",
        sector: clientRes.data.sector || ""
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
    setError(null);

    const year = formData.constitution_date ? new Date(formData.constitution_date).getFullYear() : null;
    const fullPhone = phoneInput ? `${countryPrefix.code} ${phoneInput.trim()}` : null;

    const { error: err } = await supabase.from("clients").update({
      name: formData.name,
      tax_id: formData.tax_id || null,
      contact_email: formData.contact_email || null,
      contact_phone: fullPhone,
      contact_name: formData.contact_name || null,
      contact_position: formData.contact_position || null,
      industry: formData.sector || null, // Sync industry with sector for compatibility
      cnae: formData.cnae || null,
      constitution_date: formData.constitution_date || null,
      fiscal_region: formData.fiscal_region || null,
      de_minimis_received: formData.de_minimis_received ? parseFloat(formData.de_minimis_received) : 0,
      notes: formData.notes || null,
      // Metadata
      address: formData.address || null,
      company_size: formData.company_size || null,
      founded_year: year,
      website: formData.website || null,
      revenue_range: formData.revenue_range || null,
      sector: formData.sector || null,
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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (prefixRef.current && !prefixRef.current.contains(event.target as Node)) {
        setShowPrefixSelector(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredProjects = useMemo(() => {
    const search = projectSearch.toLowerCase().trim();
    return projects.filter(p => {
      const matchesTab =
        activeTab === 'all' ? true :
          activeTab === 'active' ? p.status !== 'archived' :
            p.status === 'archived';
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
                <Clock size={12} /> Miembro desde {new Date(client.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
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

      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-100 text-red-700 text-xs font-bold uppercase tracking-widest animate-in slide-in-from-top-2">
          ⚠️ {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* COLUMNA IZQUIERDA: RESUMEN TÉCNICO */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-sm">
            <form id="client-form" onSubmit={handleUpdate} className="space-y-10">

              {/* SECCIÓN 1: IDENTIDAD DEL CLIENTE */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 text-slate-900 font-black text-[10px] uppercase tracking-[0.25em] border-b border-slate-50 pb-4">
                  <Building2 size={14} className="text-blue-600" />
                  Identidad del Cliente
                </div>

                <div className="flex flex-col gap-6">
                  <div className="space-y-2">
                    <Label.Root className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre de Cliente</Label.Root>
                    {isEditing ? (
                      <div className="relative group">
                        <Building2 size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                        <input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full pl-12 pr-4 py-5 bg-slate-50 border border-slate-100 rounded-2xl text-lg font-black tracking-tight text-slate-900 outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 focus:bg-white transition-all" required />
                      </div>
                    ) : (
                      <p className="text-xl font-black text-slate-900 bg-slate-50/30 px-5 py-4 rounded-2xl border border-slate-100/50 tracking-tight">{client.name}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label.Root className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">NIF / CIF</Label.Root>
                    {isEditing ? (
                      <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded uppercase transition-colors group-focus-within:bg-blue-600 group-focus-within:text-white">ID</div>
                        <input value={formData.tax_id} onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })} className="w-full pl-14 pr-4 py-5 bg-slate-50 border border-slate-100 rounded-2xl text-base font-mono font-black outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 focus:bg-white transition-all uppercase tracking-wider" />
                      </div>
                    ) : (
                      <p className="font-bold text-slate-900 bg-slate-50/30 px-5 py-4 rounded-2xl border border-slate-100/50 tracking-wider font-mono uppercase">{client.tax_id || "—"}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* SECCIÓN 2: PERFIL DE NEGOCIO */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 text-slate-900 font-black text-[10px] uppercase tracking-[0.25em] border-b border-slate-50 pb-4">
                  <Briefcase size={14} className="text-blue-600" />
                  Perfil de Negocio
                </div>

                <div className="flex flex-col gap-6">
                  <div className="space-y-2">
                    <Label.Root className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Sector Principal</Label.Root>
                    {isEditing ? (
                      <PremiumSelector
                        options={SECTORS}
                        value={formData.sector}
                        onChange={(val) => setFormData({ ...formData, sector: val })}
                        placeholder="Buscar sector..."
                        icon={Briefcase}
                      />
                    ) : (
                      <p className="font-bold text-slate-900 bg-slate-50/30 px-5 py-4 rounded-2xl border border-slate-100/50">{client.sector || client.industry || "—"}</p>
                    )}
                  </div>

                  {[
                    { label: "Tamaño de Empresa", key: "company_size", options: COMPANY_SIZES, icon: Users, legacyKey: 'employee_count' },
                    { label: "Rango de Facturación", key: "revenue_range", options: REVENUE_RANGES, icon: TrendingUp, legacyKey: 'annual_turnover' }
                  ].map((field) => (
                    <div key={field.key} className="space-y-2">
                      <Label.Root className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">{field.label}</Label.Root>
                      {isEditing ? (
                        <PremiumSelector
                          options={field.options}
                          value={(formData as any)[field.key]}
                          onChange={(val) => setFormData({ ...formData, [field.key]: val })}
                          placeholder="Seleccionar..."
                          icon={field.icon}
                        />
                      ) : (
                        <p className="font-bold text-slate-900 bg-slate-50/30 px-5 py-4 rounded-2xl border border-slate-100/50">
                          {field.options.find(o => o.value === (client as any)[field.key])?.label || (client as any)[field.key] || (client as any)[field.legacyKey!] || "—"}
                        </p>
                      )}
                    </div>
                  ))}

                  <div className="space-y-2">
                    <Label.Root className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Fecha de Constitución</Label.Root>
                    {isEditing ? (
                      <PremiumDatePicker
                        value={formData.constitution_date}
                        onChange={(val) => setFormData({ ...formData, constitution_date: val })}
                        placeholder="DD/MM/AAAA"
                      />
                    ) : (
                      <p className="font-bold text-slate-900 bg-slate-50/30 px-5 py-4 rounded-2xl border border-slate-100/50">
                        {client.constitution_date ? new Date(client.constitution_date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) : "—"}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label.Root className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Sitio Web Corporativo</Label.Root>
                    {isEditing ? (
                      <div className="relative group">
                        <Globe size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                        <input value={formData.website} onChange={(e) => setFormData({ ...formData, website: e.target.value })} className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 focus:bg-white transition-all" placeholder="https://www.empresa.com" />
                      </div>
                    ) : (
                      <p className="font-bold text-slate-900 bg-slate-50/30 px-5 py-4 rounded-2xl border border-slate-100/50 truncate">
                        {client.website ? (
                          <a href={client.website.startsWith('http') ? client.website : `https://${client.website}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-2">
                            {client.website} <ExternalLink size={12} />
                          </a>
                        ) : "—"}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* SECCIÓN 3: UBICACIÓN Y FISCALIDAD */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 text-slate-900 font-black text-[10px] uppercase tracking-[0.25em] border-b border-slate-50 pb-4">
                  <MapPin size={14} className="text-blue-600" />
                  Ubicación y Fiscalidad
                </div>

                <div className="flex flex-col gap-6">
                  <div className="space-y-2">
                    <Label.Root className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Dirección Social</Label.Root>
                    {isEditing ? (
                      <div className="relative group">
                        <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                        <input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 focus:bg-white transition-all" />
                      </div>
                    ) : (
                      <p className="font-bold text-slate-900 bg-slate-50/30 px-5 py-4 rounded-2xl border border-slate-100/50">{client.address || "—"}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label.Root className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Región Fiscal</Label.Root>
                    {isEditing ? (
                      <div className="relative group">
                        <Globe size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                        <input value={formData.fiscal_region} onChange={(e) => setFormData({ ...formData, fiscal_region: e.target.value })} className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 focus:bg-white transition-all" placeholder="Ej: Comunidad de Madrid" />
                      </div>
                    ) : (
                      <p className="font-bold text-slate-900 bg-slate-50/30 px-5 py-4 rounded-2xl border border-slate-100/50">{client.fiscal_region || "—"}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label.Root className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Código CNAE</Label.Root>
                    {isEditing ? (
                      <div className="relative group">
                        <Hash size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                        <input value={formData.cnae} onChange={(e) => setFormData({ ...formData, cnae: e.target.value })} className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 focus:bg-white transition-all" placeholder="Ej: 6201" />
                      </div>
                    ) : (
                      <p className="font-bold text-slate-900 bg-slate-50/30 px-5 py-4 rounded-2xl border border-slate-100/50 font-mono tracking-wider">{client.cnae || "—"}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label.Root className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Ayudas De Minimis (Últimos 3 años)</Label.Root>
                    {isEditing ? (
                      <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 group-focus-within:text-blue-500">€</div>
                        <input type="number" step="0.01" value={formData.de_minimis_received} onChange={(e) => setFormData({ ...formData, de_minimis_received: e.target.value })} className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 focus:bg-white transition-all" />
                      </div>
                    ) : (
                      <p className="font-bold text-slate-900 bg-slate-50/30 px-5 py-4 rounded-2xl border border-slate-100/50">
                        {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(client.de_minimis_received || 0)}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* SECCIÓN 4: RESPONSABLE DE PROYECTO */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 text-slate-900 font-black text-[10px] uppercase tracking-[0.25em] border-b border-slate-50 pb-4">
                  <UserCheck size={14} className="text-blue-600" />
                  Responsable del Proyecto
                </div>

                <div className="flex flex-col gap-6">
                  {[
                    { label: "Nombre y Apellidos", key: "contact_name", icon: User, id: "contact_name" },
                    { label: "Cargo Directivo", key: "contact_position", icon: Briefcase, id: "contact_position" }
                  ].map((field) => (
                    <div key={field.key} className="space-y-2">
                      <Label.Root htmlFor={field.id} className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{field.label}</Label.Root>
                      {isEditing ? (
                        <div className="relative group">
                          <field.icon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                          <input id={field.id} value={(formData as any)[field.key]} onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })} className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 focus:bg-white transition-all" />
                        </div>
                      ) : (
                        <p className="font-bold text-slate-900 bg-slate-50/30 px-5 py-4 rounded-2xl border border-slate-100/50">{(client as any)[field.key] || "—"}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* SECCIÓN 5: COMUNICACIÓN DIRECTA */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 text-slate-900 font-black text-[10px] uppercase tracking-[0.25em] border-b border-slate-50 pb-4">
                  <Globe size={14} className="text-blue-600" />
                  Comunicación Directa
                </div>

                <div className="flex flex-col gap-6">
                  <div className="space-y-2">
                    <Label.Root htmlFor="email" className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Corporativo</Label.Root>
                    {isEditing ? (
                      <div className="relative group">
                        <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                        <input id="email" type="email" value={formData.contact_email} onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })} className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 focus:bg-white transition-all" />
                      </div>
                    ) : (
                      <p className="font-bold text-slate-900 bg-slate-50/30 px-5 py-4 rounded-2xl border border-slate-100/50">{client.contact_email || "—"}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label.Root htmlFor="phone" className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Teléfono Directo</Label.Root>
                    {isEditing ? (
                      <div className="flex bg-slate-50 border border-slate-100 rounded-2xl overflow-visible focus-within:ring-4 focus-within:ring-blue-500/5 focus-within:border-blue-500 focus-within:bg-white transition-all">
                        <div className="relative" ref={prefixRef}>
                          <button
                            type="button"
                            onClick={() => setShowPrefixSelector(!showPrefixSelector)}
                            className="h-full pl-4 pr-10 py-4 bg-transparent text-sm font-black outline-none border-r border-slate-100 flex items-center gap-2 hover:bg-slate-100/50 transition-colors rounded-l-2xl"
                          >
                            <span>{countryPrefix.flag}</span>
                            <span className="text-slate-600">{countryPrefix.code}</span>
                            <ChevronDown size={14} className={cn("text-slate-400 transition-transform", showPrefixSelector && "rotate-180")} />
                          </button>

                          {showPrefixSelector && (
                            <div className="absolute top-full left-0 mt-2 w-48 bg-white border border-slate-100 rounded-2xl shadow-2xl z-50 p-2 space-y-1 animate-in zoom-in-95 duration-200">
                              <div className="max-h-48 overflow-y-auto pr-1">
                                {COUNTRIES.map(c => (
                                  <button
                                    key={c.code}
                                    type="button"
                                    onClick={() => {
                                      setCountryPrefix(c);
                                      setShowPrefixSelector(false);
                                    }}
                                    className={cn(
                                      "w-full flex items-center justify-between p-2.5 rounded-xl transition-all text-left group",
                                      countryPrefix.code === c.code ? "bg-blue-50 text-blue-600" : "hover:bg-slate-50 text-slate-500"
                                    )}
                                  >
                                    <div className="flex items-center gap-3">
                                      <span className="text-base">{c.flag}</span>
                                      <div className="min-w-0">
                                        <p className="text-[10px] font-black leading-none">{c.code}</p>
                                        <p className="text-[8px] font-bold text-slate-400 mt-0.5 uppercase tracking-tighter">{c.label}</p>
                                      </div>
                                    </div>
                                    {countryPrefix.code === c.code && <Check size={12} className="text-blue-600" />}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="relative flex-1 group">
                          <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                          <input
                            id="phone"
                            type="tel"
                            value={phoneInput}
                            onChange={(e) => setPhoneInput(e.target.value.replace(/[^0-9]/g, ""))}
                            className="w-full pl-12 pr-4 py-4 bg-transparent text-sm font-bold outline-none"
                            placeholder="600 000 000"
                          />
                        </div>
                      </div>
                    ) : (
                      <p className="font-bold text-slate-900 bg-slate-50/30 px-5 py-4 rounded-2xl border border-slate-100/50">{client.contact_phone || "—"}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label.Root htmlFor="notes" className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Observaciones Técnicas</Label.Root>
                {isEditing ? (
                  <textarea id="notes" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={4} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 focus:bg-white transition-all resize-none" />
                ) : (
                  <div className="text-xs text-slate-500 font-medium italic bg-slate-50/30 p-5 rounded-2xl border border-slate-100/50 leading-relaxed">{client.notes || "Sin especificaciones técnicas."}</div>
                )}
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

          {/* LISTA DE PROYECTOS (Layout Cohesivo) */}
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {filteredProjects.length === 0 ? (
              <div className="py-24 text-center bg-white border border-slate-100 border-dashed rounded-[3rem]">
                <Activity size={48} className="mx-auto text-slate-100 mb-4" />
                <p className="text-slate-400 font-black text-xs uppercase tracking-widest">Sin proyectos vinculados</p>
              </div>
            ) : (
              filteredProjects.map((p) => (
                <Link
                  key={p.id}
                  href={`/dashboard/projects/${p.id}`}
                  className={cn(
                    "group flex flex-col md:flex-row md:items-center justify-between bg-white border border-slate-100 rounded-2xl p-6 hover:shadow-xl hover:shadow-blue-500/5 transition-all gap-4",
                    p.status === 'archived' ? "opacity-75 grayscale-[0.5] hover:opacity-100 hover:grayscale-0" : "hover:border-blue-200"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "p-3 rounded-xl transition-colors shadow-inner",
                      p.status === 'archived' ? "bg-slate-100 text-slate-400" : "bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white"
                    )}>
                      {p.status === 'archived' ? <Archive size={22} /> : <FileText size={22} />}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{p.name}</p>
                        <span className={cn(
                          "text-[8px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-full border",
                          p.status === 'exported' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                            p.status === 'archived' ? "bg-amber-50 text-amber-600 border-amber-100" :
                              "bg-blue-50 text-blue-600 border-blue-100"
                        )}>
                          {p.status === 'exported' ? 'Finalizado' : p.status === 'archived' ? 'Archivado' : 'En Curso'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 font-bold uppercase tracking-widest text-[9px]">
                        <p className="text-slate-400">{p.grant_name}</p>
                        <div className="w-1 h-1 rounded-full bg-slate-200" />
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <Calendar size={12} className="text-slate-300" />
                          {new Date(p.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </div>
                        {p.project_deadline && (
                          <>
                            <div className="w-1 h-1 rounded-full bg-slate-200" />
                            <div className="flex items-center gap-1.5 text-amber-500 bg-amber-50 px-2 py-0.5 rounded-md">
                              <Clock size={12} />
                              {new Date(p.project_deadline + "T00:00:00").toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 self-end md:self-auto">
                    {/* AVATAR RESPONSABLE */}
                    {client.contact_name && (
                      <div className="hidden sm:flex items-center gap-3 border-l border-slate-100 pl-4 mr-4">
                        <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100 overflow-hidden shadow-sm">
                          <User size={14} />
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{client.contact_name.split(' ')[0]}</p>
                      </div>
                    )}

                    <div className="p-2 bg-slate-50 rounded-xl text-slate-300 group-hover:bg-blue-50 group-hover:text-blue-600 transition-all shadow-inner">
                      <ChevronRight size={20} />
                    </div>
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
