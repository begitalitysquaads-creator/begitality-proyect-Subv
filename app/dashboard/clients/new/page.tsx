"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Building2, User, Mail, Phone, Briefcase, Info } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import * as Label from "@radix-ui/react-label";
import { cn } from "@/lib/utils";

export default function NewClientPage() {
  const [name, setName] = useState("");
  const [taxId, setTaxId] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
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

    const { data, error: err } = await supabase
      .from("clients")
      .insert({
        user_id: user.id,
        name,
        tax_id: taxId || null,
        contact_email: email || null,
        contact_phone: phone || null,
        industry: industry || null,
        notes: notes || null,
      })
      .select("id")
      .single();

    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    router.push(`/dashboard/clients/${data.id}`);
    router.refresh();
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <header className="flex items-center gap-4">
        <Link
          href="/dashboard/clients"
          className="p-2 hover:bg-white rounded-full border border-slate-200 transition-all"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-slate-900">
            Nuevo Cliente
          </h1>
          <p className="text-slate-500 text-sm">
            Registra una nueva empresa en tu base de datos
          </p>
        </div>
      </header>

      <form
        onSubmit={handleSubmit}
        className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm space-y-8"
      >
        {error && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-100 text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-6">
          <div className="flex items-center gap-3 text-slate-900 font-bold border-b border-slate-100 pb-4">
            <Building2 size={20} className="text-blue-600" />
            Datos de la Empresa
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label.Root htmlFor="name" className="text-sm font-bold text-slate-700">
                Nombre Comercial
              </Label.Root>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className={cn(
                  "w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50",
                  "focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                )}
                placeholder="Ej: Squaads SL"
              />
            </div>
            <div className="space-y-2">
              <Label.Root htmlFor="taxId" className="text-sm font-bold text-slate-700">
                CIF / NIF
              </Label.Root>
              <input
                id="taxId"
                type="text"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                className={cn(
                  "w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50",
                  "focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 uppercase"
                )}
                placeholder="Ej: B12345678"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label.Root htmlFor="industry" className="text-sm font-bold text-slate-700">
                Sector de actividad
              </Label.Root>
              <div className="relative">
                <Briefcase size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="industry"
                  type="text"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className={cn(
                    "w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50",
                    "focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  )}
                  placeholder="Ej: Tecnología / IA"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center gap-3 text-slate-900 font-bold border-b border-slate-100 pb-4">
            <User size={20} className="text-blue-600" />
            Contacto Directo
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label.Root htmlFor="email" className="text-sm font-bold text-slate-700">
                Email de contacto
              </Label.Root>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={cn(
                    "w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50",
                    "focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  )}
                  placeholder="email@empresa.com"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label.Root htmlFor="phone" className="text-sm font-bold text-slate-700">
                Teléfono
              </Label.Root>
              <div className="relative">
                <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={cn(
                    "w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50",
                    "focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  )}
                  placeholder="+34 600 000 000"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label.Root htmlFor="notes" className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <Info size={16} className="text-slate-400" />
            Notas internas
          </Label.Root>
          <textarea
            id="notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={cn(
              "w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 resize-none",
              "focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            )}
            placeholder="Información relevante sobre el cliente..."
          />
        </div>

        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black text-sm transition-all shadow-lg shadow-blue-600/20 hover:bg-blue-500 disabled:opacity-70"
          >
            {loading ? "Registrando…" : "Registrar Cliente"}
          </button>
          <Link
            href="/dashboard/clients"
            className="px-8 py-4 border border-slate-200 rounded-2xl font-bold text-slate-600 hover:bg-slate-50 transition-all"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
