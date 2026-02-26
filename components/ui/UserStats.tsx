"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  FileCheck, Zap, Trophy, 
  Loader2, Sparkles, Target, Briefcase,
  TrendingUp, FileText, CheckCircle2, Layers
} from "lucide-react";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";

export function UserStats() {
  const [stats, setStats] = useState({
    totalProjects: 0,
    readyProjects: 0,
    totalSections: 0,
    completedSections: 0,
    milestones: [] as any[],
    loading: true
  });

  const supabase = createClient();

  useEffect(() => {
    async function loadStats() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Proyectos individuales
      const { data: projects } = await supabase
        .from("projects")
        .select("id, status")
        .eq("user_id", user.id);
      
      const total = projects?.length || 0;
      const ready = projects?.filter(p => p.status === 'ready_export' || p.status === 'exported').length || 0;

      // 2. Secciones individuales (CON GUARDA PARA EVITAR ERROR 400)
      let totalSec = 0;
      let completedSec = 0;

      if (total > 0 && projects) {
        const projectIds = projects.map(p => p.id);
        const { data: sections } = await supabase
          .from("sections")
          .select("is_completed")
          .in("project_id", projectIds);
        
        totalSec = sections?.length || 0;
        completedSec = sections?.filter(s => s.is_completed).length || 0;
      }

      // 3. Hitos individuales
      const { data: milestones } = await supabase
        .from("user_milestones")
        .select("*")
        .eq("user_id", user.id)
        .order("achieved_at", { ascending: false });

      setStats({
        totalProjects: total,
        readyProjects: ready,
        totalSections: totalSec,
        completedSections: completedSec,
        milestones: milestones || [],
        loading: false
      });
    }

    loadStats();
  }, []);

  const triggerConfetti = () => {
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#2563eb', '#10b981', '#f59e0b']
    });
  };

  if (stats.loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-blue-600" size={32} /></div>;

  const productivityScore = stats.totalSections > 0 
    ? Math.round((stats.completedSections / stats.totalSections) * 100) 
    : 0;

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="bg-white border border-slate-200 rounded-[3rem] p-10 shadow-sm relative overflow-hidden group">
        <header className="flex justify-between items-center mb-10">
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500">
              <Briefcase size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tighter leading-none uppercase">Mis Estadísticas de Productividad</h3>
              <p className="text-[9px] font-black text-blue-600 uppercase tracking-[0.3em] mt-1.5 flex items-center gap-2">
                <TrendingUp size={10} className="animate-pulse" />
                Rendimiento Individual Operativo
              </p>
            </div>
          </div>
          <button onClick={triggerConfetti} className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg active:scale-95">
            <Trophy size={14} /> Ver Logros
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="p-8 bg-slate-50 border border-slate-100 rounded-[2rem] space-y-3 hover:bg-white hover:shadow-xl transition-all group">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm group-hover:scale-110 transition-transform"><Layers size={20} /></div>
            <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mis Secciones</p><h4 className="text-3xl font-black text-slate-900 tracking-tighter">{stats.totalSections}</h4></div>
          </div>
          <div className="p-8 bg-slate-50 border border-slate-100 rounded-[2rem] space-y-3 hover:bg-white hover:shadow-xl transition-all group">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-emerald-600 shadow-sm group-hover:scale-110 transition-transform"><CheckCircle2 size={20} /></div>
            <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Completadas</p><h4 className="text-3xl font-black text-slate-900 tracking-tighter">{stats.completedSections}</h4></div>
          </div>
          <div className="p-8 bg-slate-50 border border-slate-100 rounded-[2rem] space-y-3 hover:bg-white hover:shadow-xl transition-all group">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-amber-600 shadow-sm group-hover:scale-110 transition-transform"><FileCheck size={20} /></div>
            <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mis Expedientes</p><h4 className="text-3xl font-black text-slate-900 tracking-tighter">{stats.readyProjects}</h4></div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-end px-1">
            <div className="space-y-1"><span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">Avance de Producción Personal</span><p className="text-xs font-medium text-slate-400">Progreso acumulado de tus tareas asignadas</p></div>
            <span className="text-4xl font-black tracking-tighter text-slate-900">{productivityScore}%</span>
          </div>
          <div className="h-4 bg-slate-100 rounded-full overflow-hidden p-1 border border-slate-200 relative">
            <div className="h-full bg-gradient-to-r from-blue-700 to-blue-400 rounded-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(37,99,235,0.2)]" style={{ width: `${productivityScore}%` }} />
          </div>
        </div>

        <div className="mt-10 pt-8 border-t border-slate-50 flex items-center gap-4 text-slate-400">
          <Zap size={16} className="text-amber-500 fill-amber-500" />
          <p className="text-[10px] font-bold uppercase tracking-widest">Has finalizado el <span className="text-slate-900 font-black">{productivityScore}%</span> de tu carga técnica individual.</p>
        </div>
      </div>
    </div>
  );
}
