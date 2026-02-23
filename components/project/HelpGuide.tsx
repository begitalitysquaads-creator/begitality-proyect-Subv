"use client";

import { useState } from "react";
import { 
  HelpCircle, X, Database, RotateCcw, Sparkles, TrendingUp, Info, 
  Zap, Layout, ShieldCheck, Calculator, Users, ClipboardList, FileUp,
  FileSearch, Target, MessageSquare, Fingerprint
} from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";

export function HelpGuide() {
  const [isOpen, setIsOpen] = useState(false);

  const guides = [
    {
      icon: <FileUp className="text-blue-600" />,
      title: "Bases y Quick-Read",
      desc: "Sube el PDF de la convocatoria. La IA extraerá automáticamente una ficha técnica con importes, plazos y beneficiarios para una consulta rápida."
    },
    {
      icon: <Target className="text-amber-600" />,
      title: "Gap Analysis Inteligente",
      desc: "El sistema cruza el perfil del cliente con las bases. Si la viabilidad es inferior al 100%, la IA listará los impedimentos críticos detectados."
    },
    {
      icon: <Fingerprint className="text-indigo-600" />,
      title: "Contexto de Redacción",
      desc: "Define directrices específicas (tono, enfoque, prioridades) en el panel lateral. La IA las usará para personalizar cada sección de la memoria."
    },
    {
      icon: <ClipboardList className="text-blue-500" />,
      title: "Smart Roadmap",
      desc: "Gestión unificada de hitos. Arrastra tareas para priorizar y suelta archivos directamente sobre ellas para completar requisitos documentalmente."
    },
    {
      icon: <Sparkles className="text-purple-600" />,
      title: "Optimización RAG",
      desc: "Begitality utiliza 'Retrieval-Augmented Generation' para inyectar datos reales del BOE en tus borradores, asegurando precisión técnica absoluta."
    },
    {
      icon: <Calculator className="text-emerald-600" />,
      title: "Simulador Financiero",
      desc: "Calcula el ROI estimado ajustando la intensidad de ayuda. El sistema actualiza en tiempo real el presupuesto elegible y la subvención esperada."
    },
    {
      icon: <MessageSquare className="text-slate-900" />,
      title: "Master Copilot",
      desc: "Chat integrado con memoria del proyecto. Resuelve dudas técnicas sobre las bases o pide redactar párrafos específicos usando todo el contexto disponible."
    }
  ];

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
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-xl bg-white rounded-[3rem] p-0 shadow-2xl z-[201] overflow-hidden outline-none animate-in zoom-in-95 duration-200">
            
            <div className="p-10 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl">
                  <Zap size={24} fill="currentColor" />
                </div>
                <div>
                  <Dialog.Title className="text-2xl font-black text-slate-900 tracking-tighter leading-none uppercase">Manual de Operaciones</Dialog.Title>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-2">Begitality identity • 2026 Edition</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-3 hover:bg-white rounded-2xl text-slate-400 hover:text-slate-900 transition-all shadow-sm border border-transparent hover:border-slate-100">
                <X size={24} />
              </button>
            </div>

            <div className="p-10 space-y-2 max-h-[60vh] overflow-y-auto scrollbar-premium">
              {guides.map((g, i) => (
                <div key={i} className="flex gap-6 p-6 rounded-[2rem] hover:bg-slate-50/80 transition-all border border-transparent hover:border-slate-100 group">
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
                className="px-8 py-3.5 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-all active:scale-95"
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
