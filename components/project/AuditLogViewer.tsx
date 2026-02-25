"use client";

import { useState, useEffect } from "react";
import { History, Loader2, User, FileText, CheckCircle2, AlertTriangle, Database, Bot, FileUp, Target, Users, Briefcase, Shield, Search, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { StyledTooltip } from "@/components/ui/Tooltip";

interface AuditLog {
  id: string;
  action: string;
  details: any;
  created_at: string;
  user: {
    email: string;
    full_name: string;
    avatar_url: string | null;
  };
  projects?: {
    name: string;
  } | null;
}

export function AuditLogViewer({ projectId, isGlobal = false }: { projectId?: string, isGlobal?: boolean }) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    // Asegurar que la página empiece arriba si no es global (en el dashboard)
    if (!isGlobal) window.scrollTo(0, 0);

    const fetchLogs = async () => {
      try {
        let query = supabase
          .from("audit_logs")
          .select(`
            *,
            profiles (
              email,
              full_name,
              avatar_url
            ),
            projects (
              name
            )
          `)
          .order("created_at", { ascending: false })
          .limit(isGlobal ? 50 : 20);
        
        if (projectId) {
          query = query.eq("project_id", projectId);
        }
        
        const { data, error } = await query;
        
        if (error) {
          console.error("Error fetching audit logs:", error);
          return;
        }

        // Map profiles to user for backwards compatibility with the UI code
        const mappedLogs = (data || []).map((log: any) => ({
          ...log,
          user: Array.isArray(log.profiles) ? log.profiles[0] : log.profiles
        }));
        
        setLogs(mappedLogs);
      } catch (err) {
        console.error("Critical error fetching logs:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();

    // Realtime subscription
    const channel = supabase
      .channel('audit_logs_channel')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'audit_logs', 
        ...(projectId ? { filter: `project_id=eq.${projectId}` } : {})
      }, 
        () => {
          fetchLogs();
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [projectId, isGlobal, supabase]);

  const getIcon = (action: string) => {
    if (action.includes("IA") || action.includes("Diagnóstico")) return <Bot size={14} className="text-blue-600" />;
    if (action.includes("Presupuesto")) return <Database size={14} className="text-emerald-600" />;
    if (action.includes("Tarea")) return <CheckCircle2 size={14} className="text-blue-600" />;
    if (action.includes("Hito")) return <Target size={14} className="text-orange-600" />;
    if (action.includes("Equipo") || action.includes("Seguridad")) return <Shield size={14} className="text-slate-900" />;
    if (action.includes("Memoria")) return <FileText size={14} className="text-blue-500" />;
    if (action.includes("Documentación")) return <FileUp size={14} className="text-blue-500" />;
    if (action.includes("Proyecto")) return <Briefcase size={14} className="text-slate-600" />;
    return <FileText size={14} className="text-slate-500" />;
  };

  if (loading) return <div className="py-10 text-center"><Loader2 className="animate-spin mx-auto text-slate-300" /></div>;

  const filteredLogs = logs.filter(log => {
    const searchLower = searchTerm.toLowerCase();
    const userName = log.user?.full_name?.toLowerCase() || "";
    const userEmail = log.user?.email?.toLowerCase() || "";
    const projectName = log.projects?.name?.toLowerCase() || "";
    const action = log.action.toLowerCase();
    const description = (typeof log.details === 'string' ? log.details : log.details?.description || "").toLowerCase();

    return userName.includes(searchLower) || 
           userEmail.includes(searchLower) || 
           projectName.includes(searchLower) || 
           action.includes(searchLower) || 
           description.includes(searchLower);
  });

  return (
    <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm relative group animate-in fade-in duration-700 overflow-hidden">
      
      {/* Background Icon */}
      <div className="absolute inset-0 rounded-[2.5rem] overflow-hidden pointer-events-none">
        <div className="absolute -right-8 -bottom-8 opacity-[0.02] group-hover:scale-110 transition-transform duration-1000">
          <History size={280} />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 relative z-10 gap-4">
        <h3 className="font-black text-slate-900 flex items-center gap-2.5 text-[10px] uppercase tracking-[0.25em]">
          <div className="w-2 h-2 bg-blue-600 rounded-full shadow-[0_0_10px_rgba(37,99,235,0.5)]" />
          Historial de Actividad
        </h3>
        
        <div className="flex items-center gap-3">
          <div className="relative group/search">
            <Search size={14} className={cn(
              "absolute left-3 top-1/2 -translate-y-1/2 transition-colors",
              searchTerm ? "text-blue-500" : "text-slate-300 group-focus-within/search:text-blue-400"
            )} />
            <input 
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar acción, usuario..."
              className="pl-9 pr-8 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-bold outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-200 transition-all w-full sm:w-48 placeholder:text-slate-300"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-300 hover:text-slate-600 transition-colors"
              >
                <X size={12} />
              </button>
            )}
          </div>
          <div className="p-2 bg-slate-50 text-slate-400 rounded-xl">
            <History size={18} />
          </div>
        </div>
      </div>

      <div className="space-y-4 max-h-[450px] overflow-y-auto pr-2 scrollbar-premium relative z-10">
        {filteredLogs.length === 0 ? (
          <div className="py-12 text-center border-2 border-dashed border-slate-100 rounded-[2rem] opacity-40">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">
              {searchTerm ? "No se encontraron coincidencias" : "Sin actividad registrada"}
            </p>
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div key={log.id} className="flex gap-4 p-4 rounded-[1.5rem] bg-slate-50/50 border border-slate-100 hover:bg-white hover:border-blue-100 hover:shadow-lg transition-all group/item duration-300">
              <div className="mt-1 shrink-0">
                {log.user?.avatar_url ? (
                  <img src={log.user.avatar_url} className="w-9 h-9 rounded-xl object-cover border-2 border-white shadow-md" alt="User" />
                ) : (
                  <div className="w-9 h-9 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-blue-600 font-black text-xs shadow-sm">
                    {log.user?.email?.[0].toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <div className="p-1 bg-white rounded-lg border border-slate-100 shadow-xs">
                      {getIcon(log.action)}
                    </div>
                    {log.action}
                  </span>
                  <StyledTooltip content={new Date(log.created_at).toLocaleString('es-ES', { 
                    day: '2-digit', month: '2-digit', year: 'numeric', 
                    hour: '2-digit', minute: '2-digit', second: '2-digit' 
                  })}>
                    <span className="text-[8px] font-black text-slate-300 uppercase tracking-tighter cursor-help">
                      {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: es })}
                    </span>
                  </StyledTooltip>
                </div>
                <p className="text-[11px] font-bold text-slate-700 leading-snug">
                  <span className="text-slate-900 font-black">{log.user?.full_name || "Usuario"}</span> 
                  {" "}
                  {log.details?.description || (typeof log.details === 'string' ? log.details : "realizó una acción técnica")}
                  {isGlobal && log.projects?.name && (
                    <span className="text-blue-600/60 font-medium italic ml-1 whitespace-nowrap">
                      en {log.projects.name}
                    </span>
                  )}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
