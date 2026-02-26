"use client";

import { useState, useEffect, useRef } from "react";
import { Users, Plus, X, Loader2, Shield, User, Trash2, Search, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { logClientAction } from "@/lib/audit-client";

interface Collaborator {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
}

interface ProfileSuggestion {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
}

export function CollaboratorManager({ projectId }: { projectId: string }) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [suggestions, setSuggestions] = useState<ProfileSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Confirmation state
  const [confirmDelete, setConfirmDelete] = useState<{open: boolean, id: string, name: string}>({open: false, id: "", name: ""});
  const [removing, setRemoving] = useState(false);
  
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchCollaborators();

    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSuggestions([]);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [projectId]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (searchTerm.length >= 2) {
        performSearch();
      } else {
        setSuggestions([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchTerm]);

  const fetchCollaborators = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/collaborators`);
      const data = await res.json();
      if (Array.isArray(data)) setCollaborators(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const performSearch = async () => {
    setSearching(true);
    try {
      const res = await fetch(`/api/profiles/search?q=${encodeURIComponent(searchTerm)}`);
      const data = await res.json();
      if (Array.isArray(data)) setSuggestions(data);
    } catch (e) {
      console.error(e);
    } finally {
      setSearching(false);
    }
  };

  const addCollaborator = async (email: string) => {
    setAdding(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/collaborators`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al añadir");
      
      const collabName = suggestions.find(s => s.email === email)?.full_name || email;
      await logClientAction(projectId, "Equipo", `añadió a ${collabName} al equipo`);

      setSearchTerm("");
      setSuggestions([]);
      setShowAdd(false);
      fetchCollaborators();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setAdding(false);
    }
  };

  const removeCollaborator = async () => {
    if (!confirmDelete.id) return;
    setRemoving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/collaborators?id=${confirmDelete.id}`, { method: "DELETE" });
      if (res.ok) {
        await logClientAction(projectId, "Equipo", `eliminó a ${confirmDelete.name} del equipo`);
        fetchCollaborators();
      }
      setConfirmDelete({open: false, id: "", name: ""});
    } catch (e) {
      console.error(e);
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm relative group animate-in fade-in duration-700 overflow-hidden">
      
      {/* Background Icon */}
      <div className="absolute inset-0 rounded-[2.5rem] overflow-hidden pointer-events-none">
        <div className="absolute -right-8 -bottom-8 opacity-[0.02] group-hover:scale-110 transition-transform duration-1000">
          <Users size={280} />
        </div>
      </div>

      <div className="flex items-center justify-between mb-8 relative z-10">
        <h3 className="font-black text-slate-900 flex items-center gap-2.5 text-[10px] uppercase tracking-[0.25em]">
          <div className="w-2 h-2 bg-blue-600 rounded-full shadow-[0_0_10px_rgba(37,99,235,0.5)]" />
          Equipo Begitality
        </h3>
        <button 
          onClick={() => {
            setShowAdd(!showAdd);
            setSearchTerm("");
            setSuggestions([]);
            setError(null);
          }}
          className={cn(
            "p-2 rounded-xl transition-all active:scale-95",
            showAdd ? "bg-slate-100 text-slate-400" : "text-slate-300 hover:text-blue-600 hover:bg-blue-50"
          )}
        >
          {showAdd ? <X size={18} /> : <Plus size={18} />}
        </button>
      </div>

      <div className="space-y-4 relative z-10">
        {showAdd && (
          <div className="mb-4 space-y-2 animate-in slide-in-from-top-2 duration-300" ref={searchRef}>
            <div className="relative">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" />
              <input
                autoFocus
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Buscar trabajador..."
                className="w-full pl-10 pr-10 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold focus:ring-2 focus:ring-blue-500/10 transition-all outline-none"
              />
              {searching && <Loader2 size={12} className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-blue-500" />}
              
              {suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-100 rounded-xl shadow-xl z-50 p-1.5 space-y-0.5">
                  {suggestions.map(s => {
                    const isAlreadyCollab = collaborators.some(c => c.userId === s.id);
                    return (
                      <button
                        key={s.id}
                        disabled={isAlreadyCollab || adding}
                        onClick={() => addCollaborator(s.email)}
                        className={cn(
                          "w-full flex items-center justify-between p-2 rounded-lg transition-all text-left",
                          isAlreadyCollab ? "opacity-50" : "hover:bg-blue-50"
                        )}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center text-blue-600 overflow-hidden shrink-0 text-[10px]">
                            {s.avatar_url ? <img src={s.avatar_url} className="w-full h-full object-cover" /> : <User size={12} />}
                          </div>
                          <div className="truncate">
                            <p className="text-[10px] font-black text-slate-900 truncate">{s.full_name}</p>
                            <p className="text-[8px] font-medium text-slate-400 truncate">{s.email}</p>
                          </div>
                        </div>
                        {isAlreadyCollab && <Check size={12} className="text-emerald-500 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            {error && <p className="text-[9px] font-bold text-red-500 px-1">{error}</p>}
          </div>
        )}

        <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1">
          {loading ? (
            <div className="py-4 text-center"><Loader2 size={16} className="animate-spin text-blue-400 mx-auto" /></div>
          ) : collaborators.length === 0 ? (
            <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest text-center py-2">Sin equipo asignado</p>
          ) : (
            collaborators.map(c => (
              <div key={c.id} className="flex items-center justify-between p-2.5 bg-slate-50/50 border border-slate-100 rounded-2xl group/item hover:bg-white hover:border-blue-100 hover:shadow-sm transition-all duration-300">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-blue-600 shadow-sm overflow-hidden shrink-0">
                    {c.avatar ? <img src={c.avatar} className="w-full h-full object-cover" /> : <User size={14} />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-black text-slate-900 truncate tracking-tight">{c.name}</p>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md border",
                        c.role === 'owner' ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-white text-slate-400 border-slate-100"
                      )}>
                        {c.role === 'owner' ? 'Admin' : 'Senior'}
                      </span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setConfirmDelete({open: true, id: c.id, name: c.name})}
                  className="opacity-0 group-hover/item:opacity-100 p-1.5 text-slate-300 hover:text-red-500 transition-all shrink-0"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <ConfirmDialog 
        open={confirmDelete.open}
        onOpenChange={(open: boolean) => setConfirmDelete({...confirmDelete, open})}
        title="Quitar Colaborador"
        description={`¿Deseas eliminar a ${confirmDelete.name} de este proyecto? Perderá el acceso de edición inmediatamente.`}
        confirmText="Eliminar"
        variant="danger"
        loading={removing}
        onConfirm={removeCollaborator}
      />
    </div>
  );
}
