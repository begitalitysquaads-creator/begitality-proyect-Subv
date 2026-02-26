"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Option {
  value: string;
  label: string;
}

interface PremiumSelectorProps {
  options: Option[] | string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  icon?: LucideIcon;
  className?: string;
}

export function PremiumSelector({
  options,
  value,
  onChange,
  placeholder = "Seleccionar...",
  icon: Icon,
  className
}: PremiumSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const normalizedOptions: Option[] = options.map(opt =>
    typeof opt === "string" ? { value: opt, label: opt } : opt
  );

  const filteredOptions = normalizedOptions.filter(opt =>
    opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedOption = normalizedOptions.find(opt => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset search when closing/opening
  useEffect(() => {
    if (!isOpen) setSearchTerm("");
  }, [isOpen]);

  return (
    <div className={cn("relative w-full", className)} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between rounded-2xl border transition-all text-left outline-none focus:ring-4 focus:ring-blue-500/5",
          Icon ? "pl-12 pr-5 py-3" : "px-5 py-3",
          isOpen ? "bg-white border-blue-500 shadow-lg shadow-blue-500/5" : "bg-slate-50 border-slate-100 hover:border-slate-200"
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          {Icon && <Icon size={18} className={cn("absolute left-4 top-1/2 -translate-y-1/2 shrink-0 transition-colors", isOpen ? "text-blue-600" : "text-slate-300")} />}
          <span className={cn("text-sm font-bold truncate", !selectedOption ? "text-slate-300" : "text-slate-900")}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>
        <ChevronDown size={16} className={cn("shrink-0 text-slate-300 transition-transform duration-300", isOpen && "rotate-180 text-blue-600")} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl z-[100] p-2 space-y-2 animate-in zoom-in-95 duration-200">
          {/* Search Input */}
          <div className="relative px-2 pt-1">
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-200 transition-all"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          <div className="max-h-60 overflow-y-auto pr-1 scrollbar-premium">
            {filteredOptions.length === 0 ? (
              <div className="p-4 text-center text-[10px] font-black text-slate-300 uppercase tracking-widest">Sin resultados</div>
            ) : (
              filteredOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between p-2.5 rounded-2xl transition-all text-left group",
                    value === opt.value ? "bg-blue-50 text-blue-600 shadow-sm" : "hover:bg-slate-50 text-slate-600"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-xl flex items-center justify-center font-black text-[10px] transition-all",
                      value === opt.value ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "bg-white border border-slate-100 text-slate-400 group-hover:text-blue-600 group-hover:border-blue-100 shadow-sm"
                    )}>
                      {opt.label.charAt(0)}
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-tight group-hover:translate-x-0.5 transition-transform">{opt.label}</span>
                  </div>
                  {value === opt.value && <Check size={14} className="text-blue-600 shrink-0" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
