"use client";

import { useState } from "react";
import { 
  HelpCircle, X, Database, RotateCcw, Sparkles, TrendingUp, Info, 
  Zap, Layout, ShieldCheck, Calculator, Users, ClipboardList, FileUp,
  FileSearch, Target, MessageSquare, Fingerprint, Activity, Wand2,
  Calendar, History, Briefcase, FileText, Cloud, CheckCircle2, UserCircle
} from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";

type Category = "general" | "ia" | "gestion" | "seguridad";

export function HelpGuide() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<Category>("general");

  const categories = [
    { id: "general", label: "General", icon: Layout },
    { id: "gestion", label: "Gestión", icon: Briefcase },
    { id: "ia", label: "IA Assist", icon: Sparkles },
    { id: "seguridad", label: "Seguridad", icon: ShieldCheck },
  ] as const;

  const guides = [
    // GENERAL
    {
      cat: "general",
      icon: <Layout className="text-blue-600" />,
      title: "Panel de Control",
      desc: "Vista 360° de tus expedientes activos. Gestiona el progreso global, alertas de vencimiento y accesos directos a los proyectos más recientes."
    },
    {
      cat: "general",
      icon: <UserCircle className="text-blue-600" />,
      title: "Gestión de Clientes",
      desc: "Base de datos técnica de empresas. Almacena perfiles, NIFs y documentación base para que la IA los utilice automáticamente en las memorias."
    },
    
    // GESTIÓN
    {
      cat: "gestion",
      icon: <Calendar className="text-blue-600" />,
      title: "Calendario Unificado",
      desc: "Control cronológico total. Visualiza hitos, entregas y reuniones. Los cambios se sincronizan en tiempo real con todo el equipo consultor."
    },
    {
      cat: "gestion",
      icon: <Calculator className="text-blue-600" />,
      title: "Presupuesto Técnico",
      desc: "Simulador financiero avanzado. Añade partidas, calcula intensidades de ayuda y exporta tablas económicas listas para la presentación."
    },
    {
      cat: "gestion",
      icon: <Cloud className="text-blue-600" />,
      title: "Ecosistema Google Drive",
      desc: "Subida directa y colaborativa. Envía tus memorias finales a la nube de tu equipo con un solo clic, manteniendo la estructura de carpetas."
    },

    // IA ASSIST
    {
      cat: "ia",
      icon: <Fingerprint className="text-indigo-600" />,
      title: "Análisis de Bases (IA)",
      desc: "La IA lee el BOE por ti. Extrae requisitos, criterios de evaluación y plazos automáticamente para generar la ficha técnica del proyecto."
    },
    {
      cat: "ia",
      icon: <Wand2 className="text-indigo-600" />,
      title: "Escritura Dinámica",
      desc: "Redacta memorias complejas en segundos. Usa comandos como 'hazlo más técnico' o 'resume' para que la IA ajuste el tono y contenido."
    },
    {
      cat: "ia",
      icon: <Activity className="text-indigo-600" />,
      title: "Diagnóstico de Calidad",
      desc: "Puntuación predictiva (IA Score). Evalúa tu memoria contra los criterios de la convocatoria para identificar puntos débiles antes de entregar."
    },

    // SEGURIDAD & AUDITORÍA
    {
      cat: "seguridad",
      icon: <History className="text-slate-900" />,
      title: "Actividad del Sistema",
      desc: "Trazabilidad 100% inmutable. Registra quién creó, editó o eliminó cada dato, hito o sección, incluyendo registros globales de administración."
    },
    {
      cat: "seguridad",
      icon: <ShieldCheck className="text-slate-900" />,
      title: "Control de Acceso",
      desc: "Gestión de roles (Admin/Senior/Junior). Invita a colaboradores a proyectos específicos y mantén la integridad de la información confidencial."
    },
    {
      cat: "seguridad",
      icon: <CheckCircle2 className="text-slate-900" />,
      title: "Índice de Madurez",
      desc: "Validación institucional. Clasifica el estado del expediente desde 'Borrador' hasta 'Certificable' según el grado de cumplimiento técnico."
    }
  ];

  const filteredGuides = guides.filter(g => g.cat === activeCategory);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-6 py-3.5 bg-white border border-slate-200 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm active:scale-95"
      >
        <HelpCircle size={18} />
        Guía de Interfaz
      </button>

      <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] animate-in fade-in duration-300" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-white rounded-[3rem] p-0 shadow-2xl z-[201] overflow-hidden outline-none animate-in zoom-in-95 duration-200">
            
            <div className="p-10 border-b border-slate-100 bg-slate-50/50">
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl">
                    <Zap size={24} fill="currentColor" />
                  </div>
                  <div>
                    <Dialog.Title className="text-2xl font-black text-slate-900 tracking-tighter leading-none uppercase">Manual de Operaciones</Dialog.Title>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-2">Begitality Identity • v2.0</p>
                  </div>
                </div>
                <button onClick={() => setIsOpen(false)} className="p-3 hover:bg-white rounded-2xl text-slate-400 hover:text-slate-900 transition-all shadow-sm border border-transparent hover:border-slate-100">
                  <X size={24} />
                </button>
              </div>

              {/* TABS DE CATEGORÍA */}
              <div className="flex gap-2 p-1.5 bg-slate-100/80 rounded-2xl border border-slate-200/50 backdrop-blur-sm shadow-inner">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                      activeCategory === cat.id 
                        ? "bg-white text-blue-600 shadow-sm" 
                        : "text-slate-400 hover:text-slate-600"
                    )}
                  >
                    <cat.icon size={12} />
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-10 space-y-2 max-h-[50vh] overflow-y-auto scrollbar-premium">
              {filteredGuides.map((g, i) => (
                <div key={i} className="flex gap-6 p-6 rounded-[2rem] hover:bg-slate-50/80 transition-all border border-transparent hover:border-slate-100 group animate-in fade-in slide-in-from-right-4 duration-300" style={{ animationDelay: `${i * 50}ms` }}>
                  <div className="w-14 h-14 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-500">
                    {g.icon}
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-sm font-black text-slate-900 tracking-tight leading-none uppercase">{g.title}</h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed font-medium">{g.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-10 border-t border-slate-100 bg-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse delay-75" />
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse delay-150" />
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Sistemas de Inteligencia Activos</p>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="px-8 py-3.5 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-all active:scale-95 shadow-lg shadow-slate-900/20"
              >
                Entendido
              </button>
            </div>

          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
