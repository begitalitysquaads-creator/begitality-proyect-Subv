"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Building2, Plus, Loader2, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import * as Label from "@radix-ui/react-label";
import * as Dialog from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";
import { Client } from "@/lib/types";

export default function NewProjectPage() {
  const [name, setName] = useState("");
  const [grantName, setGrantName] = useState("");
  const [clientId, setClientId] = useState<string>("");
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Quick Client State
  const [isQuickClientOpen, setIsQuickClientOpen] = useState(false);
  const [quickClientName, setQuickClientName] = useState("");
  const [quickClientTaxId, setQuickClientTaxId] = useState("");
  const [isCreatingClient, setIsCreatingClient] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function loadClients() {
      const { data } = await supabase
        .from("clients")
        .select("*")
        .eq("status", "active")
        .order("name");
      setClients(data || []);
    }
    loadClients();
  }, [supabase]);

  async function handleQuickClientSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsCreatingClient(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error: err } = await supabase
      .from("clients")
      .insert({
        user_id: user.id,
        name: quickClientName,
        tax_id: quickClientTaxId || null
      })
      .select("*")
      .single();

    if (!err && data) {
      setClients(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setClientId(data.id);
      setIsQuickClientOpen(false);
      setQuickClientName("");
      setQuickClientTaxId("");
    }
    setIsCreatingClient(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Sesión no válida");
      setLoading(false);
      return;
    }
    const { data, error: err } = await supabase
      .from("projects")
      .insert({
        user_id: user.id,
        client_id: clientId || null,
        name: name || "Sin título",
        grant_name: grantName || "Convocatoria",
      })
      .select("id")
      .single();
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    router.push(`/dashboard/projects/${data.id}`);
    router.refresh();
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500">
      <header className="flex items-center gap-4">
        <Link
          href="/dashboard"
          className="p-2 hover:bg-white rounded-full border border-slate-200 transition-all"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-slate-900">
            Nuevo proyecto
          </h1>
          <p className="text-slate-500 text-sm">
            Crea un espacio de trabajo para esta convocatoria
          </p>
        </div>
      </header>

      <form
        onSubmit={handleSubmit}
        className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm space-y-6"
      >
        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <Label.Root className="text-sm font-bold text-slate-700 flex justify-between items-center">
            Cliente
            <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Opcional</span>
          </Label.Root>
          <div className="relative">
            <Building2 size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className={cn(
                "w-full pl-11 pr-4 py-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 appearance-none transition-all outline-none",
                "focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 font-bold text-slate-700 text-sm"
              )}
            >
              <option value="">Seleccionar cliente existente...</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
              <Plus size={14} className="text-slate-300" />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label.Root htmlFor="name" className="text-sm font-bold text-slate-700">
            Nombre del proyecto
          </Label.Root>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={cn(
              "w-full px-4 py-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 outline-none transition-all",
              "focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 text-sm font-medium"
            )}
            placeholder="Ej: Begitality AI Expansion"
            required
          />
        </div>

        <div className="space-y-2">
          <Label.Root
            htmlFor="grantName"
            className="text-sm font-bold text-slate-700"
          >
            Nombre de la convocatoria
          </Label.Root>
          <input
            id="grantName"
            type="text"
            value={grantName}
            onChange={(e) => setGrantName(e.target.value)}
            className={cn(
              "w-full px-4 py-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 outline-none transition-all",
              "focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 text-sm font-medium"
            )}
            placeholder="Ej: ICEX Next - Convocatoria 2024"
            required
          />
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-4 bg-blue-600 text-white rounded-[1.25rem] font-black text-sm transition-all shadow-lg shadow-blue-500/20 hover:bg-blue-500 disabled:opacity-60"
          >
            {loading ? <Loader2 size={18} className="animate-spin mx-auto" /> : "Crear proyecto y empezar"}
          </button>
          <Link
            href="/dashboard"
            className="px-8 py-4 border border-slate-200 rounded-[1.25rem] font-bold text-slate-600 hover:bg-slate-50 transition-all text-sm"
          >
            Cancelar
          </Link>
        </div>
      </form>

      {/* Quick Client Section */}
      <div className="bg-slate-900 rounded-[2rem] p-8 text-white flex items-center justify-between gap-6 overflow-hidden relative group">
        <div className="relative z-10">
          <p className="text-blue-400 text-[10px] font-black uppercase tracking-widest mb-1">Acceso Rápido</p>
          <h3 className="text-lg font-bold">¿Cliente nuevo?</h3>
          <p className="text-slate-400 text-sm font-medium mt-1">Registra a la empresa sin salir de esta página.</p>
        </div>
        
        <Dialog.Root open={isQuickClientOpen} onOpenChange={setIsQuickClientOpen}>
          <Dialog.Trigger asChild>
            <button className="relative z-10 p-4 bg-blue-600 hover:bg-blue-500 rounded-2xl transition-all shadow-xl shadow-blue-600/20 active:scale-95">
              <Plus size={24} />
            </button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 animate-in fade-in duration-300" />
            <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-[2.5rem] p-10 shadow-2xl z-50 outline-none animate-in zoom-in-95 duration-300">
              <Dialog.Title className="text-2xl font-black text-slate-900 tracking-tighter mb-2">
                Registro Rápido
              </Dialog.Title>
              <Dialog.Description className="text-slate-500 text-sm mb-8 font-medium">
                Añade los datos básicos para empezar a trabajar de inmediato.
              </Dialog.Description>
              
              <form onSubmit={handleQuickClientSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label.Root htmlFor="qName" className="text-sm font-bold text-slate-700">
                    Nombre de la Empresa
                  </Label.Root>
                  <input
                    id="qName"
                    value={quickClientName}
                    onChange={(e) => setQuickClientName(e.target.value)}
                    required
                    autoFocus
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 font-medium"
                    placeholder="Nombre comercial"
                  />
                </div>
                <div className="space-y-2">
                  <Label.Root htmlFor="qTax" className="text-sm font-bold text-slate-700">
                    CIF / NIF
                  </Label.Root>
                  <input
                    id="qTax"
                    value={quickClientTaxId}
                    onChange={(e) => setQuickClientTaxId(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 font-medium uppercase"
                    placeholder="B12345678"
                  />
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={isCreatingClient || !quickClientName}
                    className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black text-sm hover:bg-blue-500 disabled:opacity-70 transition-all flex items-center justify-center gap-2"
                  >
                    {isCreatingClient ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                    {isCreatingClient ? "Guardando..." : "Confirmar y Seleccionar"}
                  </button>
                </div>
              </form>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

        <div className="absolute right-0 bottom-0 opacity-10 -mr-8 -mb-8 group-hover:scale-110 transition-transform duration-700">
          <Building2 size={160} />
        </div>
      </div>
    </div>
  );
}
