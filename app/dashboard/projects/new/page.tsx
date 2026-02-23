"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeft, Building2, Plus, Loader2, Check, 
  Search, ChevronDown, X, UserPlus 
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import * as Label from "@radix-ui/react-label";
import * as Dialog from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";
import { Client } from "@/lib/types";
import { BackButton } from "@/components/ui/BackButton";

export default function NewProjectPage() {
  const [name, setName] = useState("");
  const [grantName, setGrantName] = useState("");
  const [clientId, setClientId] = useState<string>("");
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Custom Selector State
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const selectorRef = useRef<HTMLDivElement>(null);

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

    const handleClickOutside = (event: MouseEvent) => {
      if (selectorRef.current && !selectorRef.current.contains(event.target as Node)) {
        setIsSelectorOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [supabase]);

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
    (c.tax_id || "").toLowerCase().includes(clientSearch.toLowerCase())
  );

  const selectedClient = clients.find(c => c.id === clientId);

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

    if (err) {
      setLoading(false);
      setError(err.message);
      return;
    }

    // Registrar al creador como el primer colaborador (owner)
    await supabase.from("project_collaborators").insert({
      project_id: data.id,
      user_id: user.id,
      role: 'owner'
    });

    setLoading(false);
    router.push(`/dashboard/projects/${data.id}`);
    router.refresh();
  }

  return (
    <div className="max-w-2xl mx-auto space-y-10 animate-in fade-in duration-700 pb-20">
      <header className="flex items-center gap-6">
        <BackButton />
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter">
            Nuevo Proyecto
          </h1>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Configuración del Espacio de Trabajo</p>
        </div>
      </header>

      <form
        onSubmit={handleSubmit}
        className="bg-white border border-slate-200 rounded-[3rem] p-10 shadow-sm space-y-8 relative overflow-hidden"
      >
        {error && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-100 text-red-700 text-xs font-bold uppercase tracking-widest animate-in slide-in-from-top-2">
            ⚠️ {error}
          </div>
        )}

        {/* CUSTOM CLIENT SELECTOR (AIR STYLE) */}
        <div className="space-y-2" ref={selectorRef}>
          <Label.Root className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex justify-between">
            Cliente Asignado
            <span className="opacity-50">Opcional</span>
          </Label.Root>
          
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsSelectorOpen(!isSelectorOpen)}
              className={cn(
                "w-full flex items-center justify-between px-5 py-4 rounded-2xl border transition-all outline-none",
                isSelectorOpen ? "ring-4 ring-blue-500/5 border-blue-500 bg-white" : "border-slate-100 bg-slate-50/50 hover:bg-slate-100/50"
              )}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Building2 size={18} className={cn(selectedClient ? "text-blue-600" : "text-slate-300")} />
                <span className={cn("text-sm font-bold truncate", !selectedClient && "text-slate-400")}>
                  {selectedClient ? selectedClient.name : "Seleccionar un cliente existente..."}
                </span>
              </div>
              <ChevronDown size={18} className={cn("text-slate-300 transition-transform duration-300", isSelectorOpen && "rotate-180")} />
            </button>

            {isSelectorOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-[2rem] shadow-2xl z-50 p-3 animate-in zoom-in-95 duration-200">
                <div className="relative mb-2">
                  <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                  <input
                    autoFocus
                    placeholder="Filtrar clientes..."
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none focus:ring-4 focus:ring-blue-500/5 transition-all"
                  />
                </div>

                <div className="max-h-60 overflow-y-auto space-y-1 pr-1 scrollbar-premium">
                  <button
                    type="button"
                    onClick={() => { setClientId(""); setIsSelectorOpen(false); }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl text-left hover:bg-red-50 text-slate-400 hover:text-red-600 transition-all text-xs font-black uppercase tracking-widest"
                  >
                    <X size={14} /> Sin asignar cliente
                  </button>
                  
                  <div className="h-px bg-slate-50 my-1" />

                  {filteredClients.length === 0 ? (
                    <div className="py-8 text-center opacity-30">
                      <p className="text-[10px] font-black uppercase tracking-widest">Sin resultados</p>
                    </div>
                  ) : (
                    filteredClients.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => { setClientId(c.id); setIsSelectorOpen(false); }}
                        className={cn(
                          "w-full flex items-center justify-between p-3 rounded-xl transition-all text-left group",
                          clientId === c.id ? "bg-blue-50 text-blue-600 shadow-sm" : "hover:bg-slate-50 text-slate-600"
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center transition-colors", clientId === c.id ? "bg-blue-100 text-blue-600" : "bg-white border border-slate-100 text-slate-300 group-hover:text-blue-500")}>
                            <Building2 size={16} />
                          </div>
                          <div className="truncate">
                            <p className="text-sm font-black truncate">{c.name}</p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{c.tax_id || "Sin ID Fiscal"}</p>
                          </div>
                        </div>
                        {clientId === c.id && <Check size={16} className="text-blue-600 shrink-0" />}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label.Root htmlFor="name" className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Título de la Memoria</Label.Root>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50/50 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all"
              placeholder="Ej: Plan de Expansión Digital 2026"
              required
            />
          </div>

          <div className="space-y-2">
            <Label.Root htmlFor="grantName" className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Organismo / Convocatoria</Label.Root>
            <input
              id="grantName"
              type="text"
              value={grantName}
              onChange={(e) => setGrantName(e.target.value)}
              className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50/50 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all"
              placeholder="Ej: CDTI - Proyectos de I+D"
              required
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
            {loading ? "Inicializando..." : "Crear Espacio de Trabajo"}
          </button>
        </div>

        <div className="absolute -right-10 -bottom-10 opacity-[0.015] pointer-events-none">
          <Plus size={320} />
        </div>
      </form>

      {/* QUICK CLIENT ACCESS */}
      <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden group">
        <div className="absolute right-0 top-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-1000">
          <UserPlus size={120} fill="white" />
        </div>
        
        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-8 text-center sm:text-left">
          <div className="space-y-2">
            <p className="text-blue-400 text-[10px] font-black uppercase tracking-[0.3em]">Registro Inteligente</p>
            <h2 className="text-3xl font-black tracking-tighter">¿Cliente no registrado?</h2>
            <p className="text-slate-400 text-sm font-medium max-w-sm">Añade una nueva empresa a tu base de datos Begitality sin perder el progreso de este proyecto.</p>
          </div>
          
          <Dialog.Root open={isQuickClientOpen} onOpenChange={setIsQuickClientOpen}>
            <Dialog.Trigger asChild>
              <button className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl shadow-blue-600/30 active:scale-95 whitespace-nowrap">
                Alta Rápida de Cliente
              </button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] animate-in fade-in duration-300" />
              <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-[3rem] p-10 shadow-2xl z-[101] outline-none animate-in zoom-in-95 duration-300">
                <Dialog.Title className="text-2xl font-black text-slate-900 tracking-tighter mb-2 uppercase">
                  Alta Rápida
                </Dialog.Title>
                <Dialog.Description className="text-slate-500 text-sm mb-8 font-medium">
                  Introduce los identificadores básicos para vincular la empresa.
                </Dialog.Description>
                
                <form onSubmit={handleQuickClientSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label.Root htmlFor="qName" className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Razón Social</Label.Root>
                    <input
                      id="qName"
                      value={quickClientName}
                      onChange={(e) => setQuickClientName(e.target.value)}
                      required
                      autoFocus
                      className="w-full px-5 py-4 rounded-2xl border border-slate-100 bg-slate-50/50 outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 font-bold text-sm"
                      placeholder="Nombre oficial"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label.Root htmlFor="qTax" className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">CIF / NIF</Label.Root>
                    <input
                      id="qTax"
                      value={quickClientTaxId}
                      onChange={(e) => setQuickClientTaxId(e.target.value)}
                      className="w-full px-5 py-4 rounded-2xl border border-slate-100 bg-slate-50/50 outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 font-mono font-bold text-sm uppercase"
                      placeholder="B12345678"
                    />
                  </div>
                  
                  <div className="flex gap-3 pt-4">
                    <button
                      type="submit"
                      disabled={isCreatingClient || !quickClientName}
                      className="flex-1 py-5 bg-slate-900 text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.2em] hover:bg-blue-600 disabled:opacity-70 transition-all flex items-center justify-center gap-3"
                    >
                      {isCreatingClient ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                      {isCreatingClient ? "Registrando..." : "Confirmar y Seleccionar"}
                    </button>
                  </div>
                </form>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
      </div>
    </div>
  );
}
