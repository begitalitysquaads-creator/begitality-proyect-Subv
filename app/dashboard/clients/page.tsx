"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { PlusCircle, Search, Building2, Mail, Phone, ExternalLink, Archive, CheckCircle2, Layers, Zap, Trash2, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Client } from "@/lib/types";
import * as Tabs from "@radix-ui/react-tabs";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { cn } from "@/lib/utils";

export default function ClientsListPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("active");
  
  // Confirmation state
  const [confirmArchive, setConfirmArchive] = useState<{open: boolean, id: string, name: string}>({open: false, id: "", name: ""});
  const [archiving, setArchiving] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    loadClients();
  }, [supabase]);

  async function loadClients() {
    setLoading(true);
    const { data } = await supabase
      .from("clients")
      .select("*")
      .order("name");
    setClients(data || []);
    setLoading(false);
  }

  const handleArchive = async () => {
    setArchiving(true);
    const { error } = await supabase
      .from("clients")
      .update({ status: 'archived' })
      .eq("id", confirmArchive.id);

    if (!error) {
      setConfirmArchive({ open: false, id: "", name: "" });
      loadClients();
    }
    setArchiving(false);
  };

  const stats = useMemo(() => {
    return {
      all: clients.length,
      active: clients.filter(c => (c.status || 'active') === 'active').length,
      archived: clients.filter(c => c.status === 'archived').length
    };
  }, [clients]);

  const filteredClients = useMemo(() => {
    const s = search.toLowerCase().trim();
    return clients.filter(c => {
      // 1. Filtrado por Pestaña
      const matchesTab = 
        activeTab === 'all' ? true :
        activeTab === 'active' ? (c.status || 'active') === 'active' :
        c.status === 'archived';
        
      // 2. Filtrado por Búsqueda
      const matchesSearch = 
        c.name.toLowerCase().includes(s) || 
        (c.tax_id || "").toLowerCase().includes(s) ||
        (c.contact_email || "").toLowerCase().includes(s);
        
      return matchesTab && matchesSearch;
    });
  }, [clients, search, activeTab]);

  return (
    <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in duration-500">
      <header className="flex justify-between items-end gap-6 flex-wrap">
        <div className="flex-1 min-w-[300px]">
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter">
            Clientes
          </h1>
          <p className="text-slate-500 font-medium mt-2 text-lg">
            Base de datos de empresas y contactos
          </p>
        </div>
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-medium"
            />
          </div>
          <Link
            href="/dashboard/clients/new"
            className="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20 shrink-0"
          >
            <PlusCircle size={20} />
            Nuevo cliente
          </Link>
        </div>
      </header>

      <Tabs.Root value={activeTab} onValueChange={setActiveTab} className="space-y-8">
        <Tabs.List className="flex gap-2 p-1.5 bg-slate-100/80 rounded-2xl w-fit border border-slate-200/50 backdrop-blur-sm">
          <Tabs.Trigger
            value="all"
            className={cn(
              "flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-xs font-black transition-all group",
              activeTab === "all" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
            )}
          >
            <Layers size={14} className={cn("transition-colors", activeTab === "all" ? "text-blue-600" : "text-slate-300 group-hover:text-slate-400")} />
            Todos
            <span className={cn(
              "ml-1 px-2 py-0.5 rounded-md text-[10px] font-bold transition-all",
              activeTab === "all" ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-500"
            )}>{stats.all}</span>
          </Tabs.Trigger>
          <Tabs.Trigger
            value="active"
            className={cn(
              "flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-xs font-black transition-all group",
              activeTab === "active" ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
            )}
          >
            <CheckCircle2 size={14} className={cn("transition-colors", activeTab === "active" ? "text-blue-600" : "text-slate-300 group-hover:text-slate-400")} />
            Activos
            <span className={cn(
              "ml-1 px-2 py-0.5 rounded-md text-[10px] font-bold transition-all",
              activeTab === "active" ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-500"
            )}>{stats.active}</span>
          </Tabs.Trigger>
          <Tabs.Trigger
            value="archived"
            className={cn(
              "flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-xs font-black transition-all group",
              activeTab === "archived" ? "bg-white text-amber-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
            )}
          >
            <Archive size={14} className={cn("transition-colors", activeTab === "archived" ? "text-amber-600" : "text-slate-300 group-hover:text-slate-400")} />
            Archivados
            <span className={cn(
              "ml-1 px-2 py-0.5 rounded-md text-[10px] font-bold transition-all",
              activeTab === "archived" ? "bg-amber-600 text-white" : "bg-slate-200 text-slate-500"
            )}>{stats.archived}</span>
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value={activeTab} className="outline-none">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-[3rem] p-20 text-center">
              <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                {activeTab === 'active' ? <Building2 size={40} className="text-slate-300" /> : <Archive size={40} className="text-slate-300" />}
              </div>
              <h2 className="text-2xl font-black text-slate-900 mb-2">
                {search ? "Sin coincidencias" : activeTab === 'active' ? "Sin clientes activos" : "Histórico vacío"}
              </h2>
              <p className="text-slate-500 max-w-sm mx-auto mb-8 font-medium">
                {activeTab === 'active' 
                  ? "Registra a tus clientes para empezar a gestionar sus subvenciones." 
                  : "Aquí aparecerán los clientes que decidas archivar temporalmente."}
              </p>
              {activeTab === 'active' && !search && (
                <Link
                  href="/dashboard/clients/new"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-[1.25rem] font-black text-sm hover:bg-blue-500 transition-all shadow-xl shadow-blue-600/20"
                >
                  <PlusCircle size={20} />
                  Registrar primer cliente
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredClients.map((c) => (
                <Link
                  key={c.id}
                  href={`/dashboard/clients/${c.id}`}
                  className={cn(
                    "group bg-white border border-slate-200 rounded-[2.5rem] p-8 hover:shadow-2xl transition-all flex flex-col justify-between relative overflow-hidden",
                    c.status === 'archived' ? "opacity-75 grayscale-[0.5] hover:opacity-100 hover:grayscale-0" : "hover:border-blue-200 hover:shadow-blue-500/5"
                  )}
                >
                  <div>
                    <div className="flex justify-between items-start mb-6">
                      <div className={cn(
                        "w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 group-hover:scale-110",
                        c.status !== 'archived' ? "bg-blue-50 text-blue-600" : "bg-amber-50 text-amber-600"
                      )}>
                        <Building2 size={28} />
                      </div>
                      <ExternalLink size={18} className="text-slate-200 group-hover:text-blue-400 transition-colors" />
                    </div>
                    
                    <h3 
                      className="text-2xl font-black text-slate-900 mb-1 tracking-tight group-hover:text-blue-600 transition-colors line-clamp-2 leading-tight h-[3.5rem] flex items-end"
                      title={c.name}
                    >
                      {c.name}
                    </h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">
                      {c.tax_id || "ID Pendiente"}
                    </p>
                    
                    <div className="space-y-3">
                      {c.contact_email && (
                        <div className="flex items-center gap-3 text-sm text-slate-500 font-medium">
                          <Mail size={16} className="text-slate-300" />
                          <span className="truncate">{c.contact_email}</span>
                        </div>
                      )}
                      {c.contact_phone && (
                        <div className="flex items-center gap-3 text-sm text-slate-500 font-medium">
                          <Phone size={16} className="text-slate-300" />
                          <span>{c.contact_phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                      {new Date(c.created_at).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                    </span>
                    <div className="flex items-center gap-3">
                      {c.status !== 'archived' && (
                        <button 
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setConfirmArchive({ open: true, id: c.id, name: c.name });
                          }}
                          className="p-2 text-slate-200 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all"
                        >
                          <Archive size={16} />
                        </button>
                      )}
                      <span className={cn(
                        "text-xs font-bold",
                        c.status !== 'archived' ? "text-blue-600" : "text-amber-600"
                      )}>
                        Ver Ficha
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Tabs.Content>
      </Tabs.Root>

      <ConfirmDialog 
        open={confirmArchive.open}
        onOpenChange={(open: boolean) => setConfirmArchive({ ...confirmArchive, open })}
        title="Archivar Cliente"
        description={`¿Estás seguro de que deseas archivar a ${confirmArchive.name}? Podrás recuperarlo más tarde desde la pestaña de archivados.`}
        confirmText="Archivar cliente"
        variant="warning"
        loading={archiving}
        onConfirm={handleArchive}
      />
    </div>
  );
}
