"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Zap, Send, Bot, Loader2, MessageSquare, HelpCircle, 
  X, Target, Globe, CheckCircle2, Layout,
  Layers, FileSearch, Sparkles, Info, Hash, AtSign
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Section {
  id: string;
  title: string;
}

export function MasterChatIA({ projectId }: { projectId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [input, setInput] = useState("");
  const [isChatting, setIsChatting] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [focusId, setFocusId] = useState<string>("global");
  const [showFocusSelector, setShowFocusSelector] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const helpRef = useRef<HTMLDivElement>(null);
  const helpBtnRef = useRef<HTMLButtonElement>(null);
  const selectorRef = useRef<HTMLDivElement>(null);
  const selectorBtnRef = useRef<HTMLButtonElement>(null);
  const supabase = createClient();

  useEffect(() => {
    loadChatHistory();
    loadSections();

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      // Cerrar ayuda si el clic es fuera del panel Y fuera del botón de ayuda
      if (helpRef.current && !helpRef.current.contains(target) && 
          helpBtnRef.current && !helpBtnRef.current.contains(target)) {
        setShowHelp(false);
      }
      
      // Cerrar selector si el clic es fuera del menú Y fuera del botón del selector
      if (selectorRef.current && !selectorRef.current.contains(target) && 
          selectorBtnRef.current && !selectorBtnRef.current.contains(target)) {
        setShowFocusSelector(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [projectId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadChatHistory = async () => {
    const { data } = await supabase
      .from("ai_messages")
      .select("role, content")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true });
    setMessages((data as Message[]) || []);
  };

  const loadSections = async () => {
    const { data } = await supabase
      .from("sections")
      .select("id, title")
      .eq("project_id", projectId)
      .order("sort_order");
    setSections(data || []);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isChatting) return;

    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsChatting(true);

    try {
      const res = await fetch(`/api/projects/${projectId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: userMsg, 
          activeSectionId: focusId === "global" ? null : focusId,
          history: messages 
        })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || data.error || "Error en la comunicación con la IA");
      }

      if (data.answer) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.answer }]);
      }
    } catch (e: any) {
      console.error("Chat Error:", e);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `⚠️ Error: ${e.message}. Por favor, inténtalo de nuevo en unos segundos.` 
      }]);
    } finally {
      setIsChatting(false);
    }
  };

  const selectedSectionTitle = sections.find(s => s.id === focusId)?.title;

  return (
    <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-sm flex flex-col h-[650px] relative overflow-hidden animate-in fade-in duration-700">
      
      {/* HEADER */}
      <div className="px-8 py-5 border-b border-slate-50 flex items-center justify-between bg-white">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
            <Zap size={16} fill="currentColor" />
          </div>
          <div>
            <span className="text-xs font-black text-slate-900 uppercase tracking-widest">Begitality Assist</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[8px] font-black text-blue-600 uppercase tracking-widest">Master Copilot Active</span>
            </div>
          </div>
        </div>
        <button 
          ref={helpBtnRef}
          onClick={() => {
            setShowHelp(prev => !prev);
            setShowFocusSelector(false);
          }}
          className={cn("p-2 rounded-lg transition-all", showHelp ? "bg-blue-50 text-blue-600" : "text-slate-300 hover:text-slate-900")}
        >
          <HelpCircle size={18} />
        </button>
      </div>

      {/* CHAT AREA */}
      <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-white/50 scroll-smooth
        [&::-webkit-scrollbar]:w-1
        [&::-webkit-scrollbar-track]:bg-transparent
        [&::-webkit-scrollbar-thumb]:bg-slate-200
        [&::-webkit-scrollbar-thumb]:rounded-full
        hover:[&::-webkit-scrollbar-thumb]:bg-slate-300">
        
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-30 text-center px-10">
            <Bot size={48} className="text-slate-200 mb-4" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Consultoría Estratégica Lista</p>
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={cn(
              "animate-in fade-in slide-in-from-bottom-2 duration-500",
              m.role === 'user' ? "flex flex-col items-end" : "flex flex-col items-start"
            )}>
              <div className={cn(
                "max-w-[90%] p-5 rounded-[1.8rem] text-[13px] leading-relaxed shadow-sm transition-all",
                m.role === 'user' 
                  ? "bg-slate-900 text-white rounded-tr-none" 
                  : "bg-slate-50 text-slate-700 border border-slate-100 rounded-tl-none font-medium"
              )}>
                {m.content}
              </div>
            </div>
          ))
        )}
        {isChatting && (
          <div className="flex items-center gap-3 animate-pulse px-2">
            <Loader2 size={14} className="animate-spin text-blue-600" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Master está analizando...</span>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* AYUDA OVERLAY */}
      {showHelp && (
        <div ref={helpRef} className="absolute inset-x-8 top-20 bg-slate-900 rounded-3xl p-6 text-white shadow-2xl z-20 animate-in zoom-in-95">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-blue-400" />
              <h5 className="font-black text-[10px] uppercase tracking-[0.2em]">Guía Master Assist</h5>
            </div>
            <button onClick={() => setShowHelp(false)} className="p-1 hover:bg-white/10 rounded-lg"><X size={16} /></button>
          </div>
          <p className="text-[11px] leading-relaxed opacity-80 font-medium">
            Usa el botón <b>#</b> para seleccionar una sección específica. Gemini enfocará su análisis en ese apartado cruzándolo con los documentos oficiales.
          </p>
        </div>
      )}

      {/* INPUT AREA */}
      <div className="p-6 bg-white border-t border-slate-50">
        <form onSubmit={sendMessage} className="flex flex-col gap-3 relative">
          <div className="relative">
            <button
              ref={selectorBtnRef}
              type="button"
              onClick={() => {
                setShowFocusSelector(prev => !prev);
                setShowHelp(false);
              }}
              className={cn(
                "flex items-center gap-2 px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border",
                focusId === 'global' ? "bg-slate-50 text-slate-400 border-slate-100" : "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-600/20"
              )}
            >
              <Hash size={12} />
              {focusId === 'global' ? 'Contexto Global' : selectedSectionTitle}
            </button>
            
            {showFocusSelector && (
              <div ref={selectorRef} className="absolute bottom-full mb-3 left-0 right-0 bg-white border border-slate-200 rounded-[2rem] shadow-2xl z-30 p-3 animate-in slide-in-from-bottom-4 duration-300">
                <div className="max-h-48 overflow-y-auto space-y-1 scrollbar-thin
                  [&::-webkit-scrollbar]:w-1
                  [&::-webkit-scrollbar-track]:bg-transparent
                  [&::-webkit-scrollbar-thumb]:bg-slate-200
                  [&::-webkit-scrollbar-thumb]:rounded-full">
                  <button 
                    type="button"
                    onClick={() => { setFocusId("global"); setShowFocusSelector(false); }}
                    className="w-full text-left px-4 py-3 hover:bg-blue-50 hover:text-blue-600 rounded-2xl text-[10px] font-black uppercase transition-all flex items-center gap-3 group"
                  >
                    <Globe size={14} className="text-slate-300 group-hover:text-blue-500" /> Visión Global
                  </button>
                  {sections.map(s => (
                    <button 
                      key={s.id}
                      type="button"
                      onClick={() => { setFocusId(s.id); setShowFocusSelector(false); }}
                      className="w-full text-left px-4 py-3 hover:bg-blue-50 hover:text-blue-600 rounded-2xl text-[10px] font-black uppercase transition-all flex items-center gap-3 group"
                    >
                      <Target size={14} className="text-slate-300 group-hover:text-blue-500" /> {s.title}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="relative flex items-center">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Consulta al consultor senior..."
              className="w-full pl-6 pr-14 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-200 transition-all placeholder:text-slate-300"
            />
            <button 
              type="submit"
              disabled={!input.trim() || isChatting}
              className="absolute right-2 p-3 bg-blue-600 text-white rounded-xl shadow-xl shadow-blue-600/30 disabled:opacity-20 hover:bg-blue-500 transition-all active:scale-95"
            >
              <Send size={20} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
