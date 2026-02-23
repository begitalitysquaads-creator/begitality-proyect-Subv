"use client";

import { useState, useEffect } from "react";
import { History, Loader2, User, FileText, CheckCircle2, AlertTriangle, Database, Bot } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

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
}

export function AuditLogViewer({ projectId }: { projectId: string }) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchLogs = async () => {
      const { data } = await supabase
        .from("audit_logs")
        .select(`
          *,
          user:user_id (
            email,
            full_name,
            avatar_url
          )
        `)
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(20);
      
      setLogs(data || []);
      setLoading(false);
    };

    fetchLogs();

    // Realtime subscription
    const channel = supabase
      .channel('audit_logs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_logs', filter: `project_id=eq.${projectId}` }, 
        (payload) => {
          fetchLogs(); // Refresh full list to get user data easily
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [projectId, supabase]);

  const getIcon = (action: string) => {
    if (action.includes("IA")) return <Bot size={14} className="text-indigo-600" />;
    if (action.includes("Presupuesto")) return <Database size={14} className="text-emerald-600" />;
    if (action.includes("Tarea")) return <CheckCircle2 size={14} className="text-blue-600" />;
    return <FileText size={14} className="text-slate-500" />;
  };

  if (loading) return <div className="py-10 text-center"><Loader2 className="animate-spin mx-auto text-slate-300" /></div>;

  return (
    <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm">
      <div className="flex items-center gap-4 mb-6">
        <div className="p-3 bg-slate-50 text-slate-600 rounded-2xl shadow-inner">
          <History size={20} />
        </div>
        <div>
          <h3 className="text-lg font-black text-slate-900 tracking-tight uppercase">Historial de Actividad</h3>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Registro de cambios</p>
        </div>
      </div>

      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-premium">
        {logs.length === 0 ? (
          <p className="text-center text-xs text-slate-400 py-8">No hay actividad registrada aún.</p>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="flex gap-4 p-4 rounded-2xl bg-slate-50/50 border border-slate-100 hover:bg-white hover:shadow-md transition-all group">
              <div className="mt-1">
                {log.user?.avatar_url ? (
                  <img src={log.user.avatar_url} className="w-8 h-8 rounded-full object-cover border-2 border-white shadow-sm" alt="User" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold text-[10px]">
                    {log.user?.email?.[0].toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    {getIcon(log.action)} {log.action}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: es })}
                  </span>
                </div>
                <p className="text-sm font-bold text-slate-800 leading-snug">
                  {log.user?.full_name || "Usuario"} {log.details?.description || "realizó una acción"}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
