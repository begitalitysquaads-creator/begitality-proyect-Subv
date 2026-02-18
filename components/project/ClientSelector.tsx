"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Building2, ChevronDown, Check, X, RefreshCw, Search, UserPlus, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface Client {
  id: string;
  name: string;
}

interface ClientSelectorProps {
  projectId: string;
  initialClient: Client | null;
  availableClients: Client[];
}

export function ClientSelector({ projectId, initialClient, availableClients }: ClientSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClient, setSelectedId] = useState<string>(initialClient?.id || "");
  const [updating, setUpdating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectorRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredClients = useMemo(() => {
    return availableClients.filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [availableClients, searchTerm]);

  const handleSelect = async (clientId: string | null) => {
    setUpdating(true);
    const { error } = await supabase
      .from("projects")
      .update({ client_id: clientId })
      .eq("id", projectId);

    if (!error) {
      setSelectedId(clientId || "");
      setIsOpen(false);
      router.refresh();
    }
    setUpdating(false);
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Botón de Activación */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border",
          selectedClient 
            ? "bg-slate-900 text-white border-slate-900 shadow-lg" 
            : "bg-blue-600 text-white border-blue-600 shadow-xl shadow-blue-600/20 hover:bg-blue-500 active:scale-[0.98]"
        )}
      >
        <div className="flex items-center gap-3 truncate">
          {updating ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} className="text-white" />}
          <span className="truncate">{selectedClient ? "Cambiar Cliente" : "Asignar un Cliente"}</span>
        </div>
        <ChevronDown size={14} className={cn("transition-transform duration-500 opacity-50", isOpen && "rotate-180")} />
      </button>

      {/* Menú Desplegable "Air Style" - Ligero y con desenfoque de fondo */}
      {isOpen && (
        <div 
          ref={selectorRef}
          className="absolute bottom-full mb-3 left-0 right-0 bg-white/95 backdrop-blur-xl border border-slate-200/60 rounded-[2rem] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] z-40 p-3 animate-in slide-in-from-bottom-2 duration-300"
        >
          
          <div className="px-2 mb-2">
            <div className="relative">
              <Search size={12} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                autoFocus
                placeholder="Filtrar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50/50 border border-slate-100 rounded-xl text-[11px] font-bold outline-none focus:ring-2 focus:ring-blue-500/10 transition-all placeholder:text-slate-300"
              />
            </div>
          </div>

          <div className="max-h-52 overflow-y-auto space-y-0.5 pr-1 scrollbar-thin
            [&::-webkit-scrollbar]:w-1
            [&::-webkit-scrollbar-track]:bg-transparent
            [&::-webkit-scrollbar-thumb]:bg-slate-200
            [&::-webkit-scrollbar-thumb]:rounded-full">
            
            <button 
              onClick={() => handleSelect(null)}
              className="w-full text-left px-4 py-2.5 hover:bg-red-50 rounded-xl text-[9px] font-black uppercase transition-all flex items-center gap-3 group"
            >
              <X size={12} className="text-slate-300 group-hover:text-red-500" /> 
              <span className="text-slate-400 group-hover:text-red-600">Quitar asignación</span>
            </button>

            <div className="h-px bg-slate-100/50 my-1.5 mx-2" />

            {filteredClients.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest">Sin resultados</p>
              </div>
            ) : (
              filteredClients.map(c => (
                <button 
                  key={c.id}
                  onClick={() => handleSelect(c.id)}
                  className={cn(
                    "w-full text-left px-4 py-2.5 rounded-xl text-[10px] font-bold transition-all flex items-center justify-between group",
                    selectedClient === c.id ? "bg-blue-50 text-blue-600" : "hover:bg-slate-50 text-slate-500"
                  )}
                >
                  <div className="flex items-center gap-3 truncate">
                    <Building2 size={12} className={cn(selectedClient === c.id ? "text-blue-600" : "text-slate-300 group-hover:text-blue-500")} /> 
                    <span className="truncate">{c.name}</span>
                  </div>
                  {selectedClient === c.id && <Check size={12} className="text-blue-600" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Loader2({ size, className }: { size?: number; className?: string }) {
  return <RefreshCw size={size} className={cn("animate-spin", className)} />;
}
