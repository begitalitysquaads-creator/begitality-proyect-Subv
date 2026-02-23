"use client";

import { useState } from "react";
import { Sparkles, Save, Loader2, Info } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { StyledTooltip } from "@/components/ui/Tooltip";

export function IAContextPanel({ 
  projectId, 
  initialInstructions 
}: { 
  projectId: string; 
  initialInstructions: string | null;
}) {
  const [instructions, setInstructions] = useState(initialInstructions || "");
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("projects")
        .update({ writing_instructions: instructions })
        .eq("id", projectId);
      
      if (error) throw error;
    } catch (e) {
      console.error("Error saving IA context:", e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm relative group overflow-hidden flex flex-col h-full">
      {/* Background Icon */}
      <div className="absolute -right-6 -bottom-6 opacity-[0.015] group-hover:scale-110 transition-transform duration-1000 text-blue-600">
        <Sparkles size={180} />
      </div>

      <div className="relative z-10 flex flex-col h-full">
        <div className="flex items-center justify-between mb-8">
          <div className="space-y-1">
            <h3 className="font-black text-slate-900 flex items-center gap-3 text-[10px] uppercase tracking-[0.25em]">
              <div className="w-2 h-2 bg-blue-600 rounded-full shadow-[0_0_10px_rgba(37,99,235,0.5)] animate-pulse" />
              Contexto de Redacción
            </h3>
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-5">Directrices para la IA</p>
          </div>
          <StyledTooltip content="Define el estilo, tono o enfoque técnico que la IA debe seguir para redactar este proyecto.">
            <div className="text-slate-300 hover:text-blue-600 transition-colors cursor-pointer">
              <Info size={14} />
            </div>
          </StyledTooltip>
        </div>

        <div className="space-y-4">
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Ej: Utiliza un tono técnico y formal. Enfócate en la innovación disruptiva..."
            className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-200 transition-all resize-none min-h-[140px] font-medium shadow-inner"
          />
          
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl shadow-slate-900/10 active:scale-95 flex items-center justify-center gap-3"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? "Sincronizando..." : "Guardar Directrices"}
          </button>
        </div>
      </div>
    </div>
  );
}
