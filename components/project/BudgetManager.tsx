"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { 
  PlusCircle, Trash2, Database, Loader2, Euro, 
  TrendingUp, HelpCircle, X, ChevronDown, Check,
  Info, PieChart, Calculator, ArrowRight, Target,
  Coins, Briefcase, Box, Layers, Wallet, BarChart3,
  Percent, Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Budget } from "@/lib/types";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { StyledTooltip } from "@/components/ui/Tooltip";
import { logClientAction } from "@/lib/audit-client";

export function BudgetManager({ projectId }: { projectId: string }) {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [intensity, setIntensity] = useState(40);
  
  // Confirmation state
  const [confirmDelete, setConfirmDelete] = useState<{open: boolean, id: string, name: string}>({open: false, id: "", name: ""});
  const [deleting, setDeleting] = useState(false);
  
  const [newConcept, setNewConcept] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newCategory, setNewCategory] = useState<Budget['category']>('personal');

  const formRef = useRef<HTMLDivElement>(null);
  const toggleBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    fetchBudgets();

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (formRef.current && !formRef.current.contains(target) && 
          toggleBtnRef.current && !toggleBtnRef.current.contains(target)) {
        setShowForm(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [projectId]);

  const fetchBudgets = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/budget`);
      const data = await res.json();
      setBudgets(data || []);
    } catch (e) {
      console.error(e);
      setBudgets([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newConcept || !newAmount) return;
    setAdding(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/budget`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          concept: newConcept,
          amount: parseFloat(newAmount),
          category: newCategory
        })
      });
      if (res.ok) {
        await logClientAction(projectId, "Presupuesto", `añadió la partida "${newConcept}" por un importe de ${new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(parseFloat(newAmount))}`);
        setNewConcept("");
        setNewAmount("");
        setShowForm(false);
        fetchBudgets();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/budget?id=${confirmDelete.id}`, { method: "DELETE" });
      if (res.ok) {
        await logClientAction(projectId, "Presupuesto", `eliminó la partida presupuestaria "${confirmDelete.name}"`);
        setConfirmDelete({ open: false, id: "", name: "" });
        fetchBudgets();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDeleting(false);
    }
  };

  const totalInvestment = budgets.reduce((acc, b) => acc + Number(b.amount), 0);
  const estimatedGrant = totalInvestment * (intensity / 100);

  const categories = [
    { id: 'personal', label: 'Personal', icon: <Briefcase size={14} />, color: 'bg-blue-600', text: 'text-blue-600', bg: 'bg-blue-50' },
    { id: 'equipment', label: 'Equipos', icon: <Box size={14} />, color: 'bg-emerald-600', text: 'text-emerald-600', bg: 'bg-emerald-50' },
    { id: 'external', label: 'Subcontratas', icon: <Layers size={14} />, color: 'bg-amber-600', text: 'text-amber-600', bg: 'bg-amber-50' },
    { id: 'other', label: 'Otros', icon: <Coins size={14} />, color: 'bg-slate-600', text: 'text-slate-600', bg: 'bg-slate-50' },
  ];

  const categoryStats = useMemo(() => {
    return categories.map(cat => {
      const amount = budgets
        .filter(b => b.category === cat.id)
        .reduce((acc, b) => acc + Number(b.amount), 0);
      const percentage = totalInvestment > 0 ? (amount / totalInvestment) * 100 : 0;
      return { ...cat, amount, percentage };
    });
  }, [budgets, totalInvestment]);

  return (
    <div className="bg-white border border-slate-200 rounded-[3rem] p-10 shadow-sm animate-in fade-in duration-1000">
      
      {/* HEADER */}
      <header className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-5">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shadow-inner">
            <Calculator size={24} />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900 tracking-tighter leading-none uppercase">Presupuesto</h3>
            <p className="text-[9px] font-black text-emerald-600 uppercase tracking-[0.3em] mt-1.5 flex items-center gap-2">
              <Sparkles size={10} className="animate-pulse" />
              Simulador Estratégico
            </p>
          </div>
        </div>
        <button
          ref={toggleBtnRef}
          onClick={() => setShowForm(!showForm)}
          className={cn(
            "p-2.5 rounded-xl transition-all shadow-lg active:scale-95",
            showForm ? "bg-slate-100 text-slate-400" : "bg-blue-600 text-white shadow-blue-600/20"
          )}
        >
          {showForm ? <X size={20} /> : <PlusCircle size={20} />}
        </button>
      </header>

      {/* KPI GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        
        {/* Card 1: Gasto Elegible */}
        <div className="group bg-white border border-slate-100 rounded-[2.5rem] p-6 transition-all duration-500 hover:shadow-[0_15px_40px_-12px_rgba(0,0,0,0.08)]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shadow-inner">
              <Euro size={20} />
            </div>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Gasto Elegible</span>
          </div>
          <p className="text-3xl font-black text-slate-900 tracking-tighter">
            {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(totalInvestment)}
          </p>
        </div>

        {/* Card 2: Intensidad */}
        <div className="group bg-white border border-slate-100 rounded-[2.5rem] p-6 transition-all duration-500 hover:shadow-[0_15px_40px_-12px_rgba(0,0,0,0.08)]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shadow-inner">
              <Percent size={20} />
            </div>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Intensidad</span>
          </div>
          <div className="flex flex-col gap-3">
            <p className="text-3xl font-black text-slate-900 tracking-tighter leading-none">{intensity}%</p>
            <input 
              type="range" min="5" max="100" step="5" value={intensity}
              onChange={(e) => setIntensity(parseInt(e.target.value))}
              className="w-full h-1 bg-slate-100 rounded-full appearance-none cursor-pointer accent-amber-600
                [&::-webkit-slider-thumb]:appearance-none 
                [&::-webkit-slider-thumb]:w-4 
                [&::-webkit-slider-thumb]:h-4 
                [&::-webkit-slider-thumb]:bg-amber-400 
                [&::-webkit-slider-thumb]:border-2 
                [&::-webkit-slider-thumb]:border-amber-600 
                [&::-webkit-slider-thumb]:rounded-full 
                [&::-webkit-slider-thumb]:shadow-lg
                [&::-webkit-slider-thumb]:hover:scale-110
                [&::-webkit-slider-thumb]:transition-all"
            />
          </div>
        </div>

        {/* Card 3: Subvención Estimada */}
        <div className="group bg-emerald-50/20 border border-emerald-100 rounded-[2.5rem] p-6 transition-all duration-500 hover:shadow-[0_15px_40px_-12px_rgba(16,185,129,0.12)]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center shadow-inner">
                <Wallet size={20} />
              </div>
              <span className="text-[9px] font-black text-emerald-600/60 uppercase tracking-widest">Subvención</span>
            </div>
            <StyledTooltip 
              content="Representa el retorno económico estimado a fondo perdido. Es el capital que el cliente recibirá basándose en la intensidad de ayuda aplicada sobre el total de gastos elegibles declarados."
            >
              <button className="p-2 rounded-lg transition-all text-slate-300 hover:text-emerald-600">
                <HelpCircle size={18} />
              </button>
            </StyledTooltip>
          </div>
          <p className="text-3xl font-black text-emerald-600 tracking-tighter">
            {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(estimatedGrant)}
          </p>
        </div>

      </div>

      {/* 2. ADD FORM */}
      {showForm && (
        <div ref={formRef} className="mb-10 animate-in slide-in-from-top-4 duration-500">
          <div className="p-1 bg-slate-50 border border-slate-100 rounded-[2.5rem] shadow-inner">
            <form onSubmit={handleAdd} className="p-6 space-y-4">
                          <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1 bg-slate-50 rounded-2xl border border-slate-100 flex items-center px-5 focus-within:ring-4 focus-within:ring-blue-500/5 focus-within:border-blue-200 transition-all">
                              <input
                                required autoFocus value={newConcept} onChange={e => setNewConcept(e.target.value)}
                                placeholder="Concepto del gasto..."
                                className="w-full py-3.5 bg-transparent text-sm font-bold outline-none placeholder:text-slate-300"
                              />
                            </div>
                            <div className="w-full md:w-40 bg-slate-50 rounded-2xl border border-slate-100 flex items-center px-5 focus-within:ring-4 focus-within:ring-blue-500/5 focus-within:border-blue-200 transition-all">
                              <span className="text-slate-300 text-sm font-bold mr-2">€</span>
                              <input
                                required type="number" step="0.01" value={newAmount} onChange={e => setNewAmount(e.target.value)}
                                placeholder="0.00"
                                className="w-full py-3.5 bg-transparent text-sm font-black outline-none placeholder:text-slate-300"
                              />
                            </div>
                          </div>
                            <div className="flex flex-col lg:flex-row items-center gap-4">
                <div className="w-full lg:flex-1 flex items-center gap-1 bg-white rounded-xl border border-slate-100 p-1">
                  {categories.map(cat => (
                    <button
                      key={cat.id} type="button" onClick={() => setNewCategory(cat.id as any)}
                      className={cn(
                        "flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex-1",
                        newCategory === cat.id ? "bg-slate-900 text-white shadow-lg" : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                      )}
                    >
                      {cat.icon}
                      <span className="hidden sm:inline ml-1">{cat.label}</span>
                    </button>
                  ))}
                </div>

                <button
                  type="submit" disabled={adding}
                  className="w-full lg:w-48 py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-600/20 hover:bg-emerald-500 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  {adding ? <Loader2 className="animate-spin" size={16} /> : <PlusCircle size={16} />}
                  {adding ? "Añadiendo..." : "Añadir Partida"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. CHART & LIST */}
      <div className="space-y-8">
        {totalInvestment > 0 && (
          <div className="space-y-4 px-2">
            <div className="flex h-1.5 w-full rounded-full overflow-hidden bg-slate-100">
              {categoryStats.map(stat => (
                <div key={stat.id} className={cn("h-full transition-all duration-1000", stat.color)} style={{ width: `${stat.percentage}%` }} />
              ))}
            </div>
            <div className="flex flex-wrap gap-6">
              {categoryStats.map(stat => stat.amount > 0 && (
                <div key={stat.id} className="flex items-center gap-2.5">
                  <div className={cn("w-1.5 h-1.5 rounded-full", stat.color)} />
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{stat.label}:</span>
                  <span className="text-[9px] font-black text-slate-900 tracking-tight">
                    {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(stat.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          {loading ? (
            <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-emerald-600" /></div>
          ) : budgets.length === 0 ? (
            <div className="py-20 text-center bg-slate-50/30 rounded-[3rem] border border-dashed border-slate-200">
               <Coins size={40} className="text-slate-200 mx-auto mb-4 opacity-50" />
               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">Sin gastos registrados.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto pr-2">
              {budgets.map(b => (
                <div key={b.id} className="group flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:shadow-md transition-all duration-300">
                  <div className="flex items-center gap-4">
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", categories.find(c => c.id === b.category)?.bg, categories.find(c => c.id === b.category)?.text)}>
                      {categories.find(c => c.id === b.category)?.icon}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-sm tracking-tight">{b.concept}</p>
                      <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">{categories.find(c => c.id === b.category)?.label}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <p className="text-base font-black text-slate-900 tracking-tighter">
                      {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(b.amount)}
                    </p>
                    <StyledTooltip content="Eliminar partida">
                      <button 
                        onClick={() => setConfirmDelete({ open: true, id: b.id, name: b.concept })}
                        className="p-2 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={14} />
                      </button>
                    </StyledTooltip>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog 
        open={confirmDelete.open}
        onOpenChange={(open: boolean) => setConfirmDelete({ ...confirmDelete, open })}
        title="Eliminar partida"
        description={`¿Estás seguro de que deseas eliminar "${confirmDelete.name}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar partida"
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
