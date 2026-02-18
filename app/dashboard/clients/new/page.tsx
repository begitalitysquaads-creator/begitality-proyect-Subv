"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeft, Building2, User, Mail, Phone, 
  Briefcase, Info, Hash, Globe, Check, Loader2 
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import * as Label from "@radix-ui/react-label";
import { cn } from "@/lib/utils";

export default function NewClientPage() {
  const [name, setName] = useState("");
  const [taxId, setTaxId] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [countryPrefix, setCountryPrefix] = useState("+34");
  const [industry, setIndustry] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const router = useRouter();
  const supabase = createClient();

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

    // Combinar prefijo y número
    const fullPhone = phone ? `${countryPrefix} ${phone.trim()}` : null;

    const { data, error: err } = await supabase
      .from("clients")
      .insert({
        user_id: user.id,
        name,
        tax_id: taxId.toUpperCase() || null,
        contact_email: email || null,
        contact_phone: fullPhone,
        industry: industry || null,
        notes: notes || null,
      })
      .select("id")
      .single();

    if (err) {
      setError(err.message);
      setLoading(false);
    } else {
      router.push(`/dashboard/clients/${data.id}`);
      router.refresh();
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-10 animate-in fade-in duration-700 pb-20">
      <header className="flex items-center gap-6">
        <Link
          href="/dashboard/clients"
          className="p-4 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-blue-600 transition-all shadow-sm group"
        >
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
        </Link>
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter">
            Registro de Cliente
          </h1>
          <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mt-1">Alta en Base de Datos Técnica</p>
        </div>
      </header>

      <form
        onSubmit={handleSubmit}
        className="bg-white border border-slate-200 rounded-[3rem] p-10 shadow-sm space-y-10 relative overflow-hidden"
      >
        {error && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-100 text-red-700 text-xs font-bold uppercase tracking-widest">
            ⚠️ {error}
          </div>
        )}

        {/* SECCIÓN: IDENTIDAD FISCAL */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 text-slate-900 font-black text-xs uppercase tracking-[0.2em] border-b border-slate-50 pb-4">
            <Hash size={16} className="text-blue-600" />
            Identidad y Fiscalidad
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label.Root htmlFor="name" className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Razón Social / Nombre</Label.Root>
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
              <Label.Root htmlFor="taxId" className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">CIF / NIF (Número)</Label.Root>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded uppercase">ID</span>
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

        {/* SECCIÓN: CONTACTO INTELIGENTE */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 text-slate-900 font-black text-xs uppercase tracking-[0.2em] border-b border-slate-50 pb-4">
            <Globe size={16} className="text-blue-600" />
            Canales de Comunicación
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label.Root htmlFor="email" className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Principal</Label.Root>
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
              <Label.Root htmlFor="phone" className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Teléfono (Número)</Label.Root>
              <div className="flex gap-2">
                <select 
                  value={countryPrefix}
                  onChange={(e) => setCountryPrefix(e.target.value)}
                  className="w-24 px-3 py-4 rounded-2xl border border-slate-100 bg-slate-50/50 text-xs font-black outline-none focus:border-blue-500 transition-all appearance-none text-center"
                >
                  <option value="+34">🇪🇸 +34</option>
                  <option value="+351">🇵🇹 +351</option>
                  <option value="+33">🇫🇷 +33</option>
                  <option value="+44">🇬🇧 +44</option>
                  <option value="+1">🇺🇸 +1</option>
                </select>
                <div className="relative flex-1">
                  <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                  <input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ""))}
                    className="w-full pl-11 pr-4 py-4 rounded-2xl border border-slate-100 bg-slate-50/50 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all"
                    placeholder="600 000 000"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label.Root htmlFor="industry" className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sector Industrial</Label.Root>
          <div className="relative">
            <Briefcase size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
            <input
              id="industry"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="w-full pl-11 pr-4 py-4 rounded-2xl border border-slate-100 bg-slate-50/50 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all"
              placeholder="Ej: Energías Renovables"
            />
          </div>
        </div>

        <div className="flex gap-4 pt-6">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-5 bg-slate-900 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] transition-all shadow-2xl shadow-slate-900/20 hover:bg-blue-600 disabled:opacity-70 flex items-center justify-center gap-3 active:scale-95"
          >
            {loading ? <Loader2 size={20} className="animate-spin" /> : <Check size={20} />}
            {loading ? "Registrando..." : "Confirmar Alta de Cliente"}
          </button>
          <Link
            href="/dashboard/clients"
            className="px-10 py-5 border border-slate-200 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all flex items-center"
          >
            Cancelar
          </Link>
        </div>

        {/* Marca de agua decorativa */}
        <div className="absolute -right-10 -bottom-10 opacity-[0.02] pointer-events-none">
          <Building2 size={300} />
        </div>
      </form>
    </div>
  );
}
