"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeft, Building2, User, Mail, Phone, 
  Briefcase, Info, Hash, Globe, Check, Loader2,
  ChevronDown, UserCheck, Search, TrendingUp, Calendar, Users, Zap
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import * as Label from "@radix-ui/react-label";
import { BackButton } from "@/components/ui/BackButton";
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

export default function NewClientPage() {
  const [name, setName] = useState("");
  const [taxId, setTaxId] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [countryPrefix, setCountryPrefix] = useState(COUNTRIES[0]);
  const [showPrefixSelector, setShowPrefixSelector] = useState(false);
  
  // Contact Person Fields
  const [contactName, setContactName] = useState("");
  const [contactPosition, setContactPosition] = useState("");
  
  const [industry, setIndustry] = useState("");
  
  // Technical & Financial Fields (Fase 2)
  const [cnae, setCnae] = useState("");
  const [constitutionDate, setConstitutionDate] = useState("");
  const [fiscalRegion, setFiscalRegion] = useState("");
  const [annualTurnover, setAnnualTurnover] = useState("");
  const [employeeCount, setEmployeeCount] = useState("");
  const [deMinimisReceived, setDeMinimisReceived] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const prefixRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (prefixRef.current && !prefixRef.current.contains(event.target as Node)) {
        setShowPrefixSelector(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("Sesión no válida");
      setLoading(false);
      return;
    }

    const fullPhone = phone ? `${countryPrefix.code} ${phone.trim()}` : null;

    const { data, error: err } = await supabase
      .from("clients")
      .insert({
        user_id: user.id,
        name,
        tax_id: taxId.toUpperCase() || null,
        contact_email: email || null,
        contact_phone: fullPhone,
        contact_name: contactName || null,
        contact_position: contactPosition || null,
        industry: industry || null,
        cnae: cnae || null,
        constitution_date: constitutionDate || null,
        fiscal_region: fiscalRegion || null,
        annual_turnover: annualTurnover ? parseFloat(annualTurnover) : 0,
        employee_count: employeeCount ? parseInt(employeeCount) : 0,
        de_minimis_received: deMinimisReceived ? parseFloat(deMinimisReceived) : 0,
      })
      .select("id")
      .single();

    if (err) {
      setError(err.message);
      setLoading(false);
    } else {
      window.location.href = `/dashboard/clients/${data.id}`;
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-10 animate-in fade-in duration-700 pb-20">
      <header className="flex items-center gap-6">
        <BackButton />
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter">
            Nuevo Cliente
          </h1>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Expediente de Alta Técnica</p>
        </div>
      </header>

      <form
        onSubmit={handleSubmit}
        className="bg-white border border-slate-200 rounded-[3rem] p-10 shadow-sm space-y-12 relative overflow-hidden"
      >
        {error && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-100 text-red-700 text-xs font-bold uppercase tracking-widest animate-in slide-in-from-top-2">
            ⚠️ {error}
          </div>
        )}

        {/* SECCIÓN 1: DATOS FISCALES */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 text-slate-900 font-black text-[10px] uppercase tracking-[0.25em] border-b border-slate-50 pb-4">
            <Hash size={14} className="text-blue-600" />
            Identificación Fiscal
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label.Root htmlFor="name" className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Razón Social</Label.Root>
              <div className="relative">
                <Building2 size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                <input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full pl-11 pr-4 py-4 rounded-2xl border border-slate-100 bg-slate-50/50 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all"
                  placeholder="Nombre de la empresa"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label.Root htmlFor="taxId" className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">NIF / CIF</Label.Root>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded uppercase">ID</div>
                <input
                  id="taxId"
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value.toUpperCase())}
                  className="w-full pl-14 pr-4 py-4 rounded-2xl border border-slate-100 bg-slate-50/50 text-sm font-mono font-bold outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all uppercase placeholder:text-slate-200"
                  placeholder="B12345678"
                />
              </div>
            </div>
          </div>
        </div>

        {/* SECCIÓN 2: PERSONA DE CONTACTO (NUEVA) */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 text-slate-900 font-black text-[10px] uppercase tracking-[0.25em] border-b border-slate-50 pb-4">
            <UserCheck size={14} className="text-blue-600" />
            Persona de Contacto
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label.Root htmlFor="contactName" className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre y Apellidos</Label.Root>
              <div className="relative">
                <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                <input
                  id="contactName"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="w-full pl-11 pr-4 py-4 rounded-2xl border border-slate-100 bg-slate-50/50 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all"
                  placeholder="Ej: Juan Pérez"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label.Root htmlFor="contactPosition" className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Cargo / Puesto</Label.Root>
              <div className="relative">
                <Briefcase size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                <input
                  id="contactPosition"
                  value={contactPosition}
                  onChange={(e) => setContactPosition(e.target.value)}
                  className="w-full pl-11 pr-4 py-4 rounded-2xl border border-slate-100 bg-slate-50/50 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all"
                  placeholder="Ej: CEO / Director IT"
                />
              </div>
            </div>
          </div>
        </div>

        {/* SECCIÓN 3: COMUNICACIÓN */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 text-slate-900 font-black text-[10px] uppercase tracking-[0.25em] border-b border-slate-50 pb-4">
            <Globe size={14} className="text-blue-600" />
            Canales de Contacto
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label.Root htmlFor="email" className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Principal</Label.Root>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-4 rounded-2xl border border-slate-100 bg-slate-50/50 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all"
                  placeholder="contacto@empresa.com"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label.Root htmlFor="phone" className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Teléfono Directo</Label.Root>
              <div className="flex bg-slate-50/50 border border-slate-100 rounded-2xl overflow-visible focus-within:ring-4 focus-within:ring-blue-500/5 focus-within:border-blue-500 transition-all">
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
                <div className="relative flex-1">
                  <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                  <input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ""))}
                    className="w-full pl-11 pr-4 py-4 bg-transparent text-sm font-bold outline-none"
                    placeholder="600 000 000"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SECCIÓN 4: INFORMACIÓN TÉCNICA Y FINANCIERA (Fase 2) */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 text-slate-900 font-black text-[10px] uppercase tracking-[0.25em] border-b border-slate-50 pb-4">
            <TrendingUp size={14} className="text-blue-600" />
            Perfil Técnico y Financiero
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label.Root htmlFor="cnae" className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Código CNAE</Label.Root>
              <div className="relative">
                <Hash size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                <input
                  id="cnae"
                  value={cnae}
                  onChange={(e) => setCnae(e.target.value)}
                  className="w-full pl-11 pr-4 py-4 rounded-2xl border border-slate-100 bg-slate-50/50 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all"
                  placeholder="Ej: 6201"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label.Root htmlFor="constitutionDate" className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Fecha Constitución</Label.Root>
              <div className="relative">
                <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                <input
                  id="constitutionDate"
                  type="date"
                  value={constitutionDate}
                  onChange={(e) => setConstitutionDate(e.target.value)}
                  className="w-full pl-11 pr-4 py-4 rounded-2xl border border-slate-100 bg-slate-50/50 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label.Root htmlFor="fiscalRegion" className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Región Fiscal</Label.Root>
              <div className="relative">
                <Globe size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                <input
                  id="fiscalRegion"
                  value={fiscalRegion}
                  onChange={(e) => setFiscalRegion(e.target.value)}
                  className="w-full pl-11 pr-4 py-4 rounded-2xl border border-slate-100 bg-slate-50/50 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all"
                  placeholder="Ej: Comunidad de Madrid"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label.Root htmlFor="employeeCount" className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Nº Empleados</Label.Root>
              <div className="relative">
                <Users size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                <input
                  id="employeeCount"
                  type="number"
                  value={employeeCount}
                  onChange={(e) => setEmployeeCount(e.target.value)}
                  className="w-full pl-11 pr-4 py-4 rounded-2xl border border-slate-100 bg-slate-50/50 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all"
                  placeholder="Ej: 15"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label.Root htmlFor="annualTurnover" className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Facturación Anual (€)</Label.Root>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300">€</div>
                <input
                  id="annualTurnover"
                  type="number"
                  step="0.01"
                  value={annualTurnover}
                  onChange={(e) => setAnnualTurnover(e.target.value)}
                  className="w-full pl-11 pr-4 py-4 rounded-2xl border border-slate-100 bg-slate-50/50 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all"
                  placeholder="Ej: 1200000"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label.Root htmlFor="deMinimis" className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Ayudas De Minimis (€)</Label.Root>
              <div className="relative">
                <Zap size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                <input
                  id="deMinimis"
                  type="number"
                  step="0.01"
                  value={deMinimisReceived}
                  onChange={(e) => setDeMinimisReceived(e.target.value)}
                  className="w-full pl-11 pr-4 py-4 rounded-2xl border border-slate-100 bg-slate-50/50 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all"
                  placeholder="Ej: 45000"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label.Root htmlFor="industry" className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Vertical de Negocio</Label.Root>
          <div className="relative">
            <Briefcase size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
            <input
              id="industry"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="w-full pl-11 pr-4 py-4 rounded-2xl border border-slate-100 bg-slate-50/50 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all"
              placeholder="Ej: Transformación Digital"
            />
          </div>
        </div>

        <div className="flex gap-4 pt-6">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-5 bg-slate-900 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl hover:bg-blue-600 disabled:opacity-70 flex items-center justify-center gap-3 active:scale-95"
          >
            {loading ? <Loader2 size={20} className="animate-spin" /> : <Check size={20} />}
            {loading ? "Procesando Alta..." : "Vincular Nuevo Cliente"}
          </button>
        </div>

        <div className="absolute -right-10 -bottom-10 opacity-[0.015] pointer-events-none">
          <Building2 size={320} />
        </div>
      </form>
    </div>
  );
}
