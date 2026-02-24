"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const DAYS_SHORT = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];
const MONTHS = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const MONTHS_SHORT = [
    "Ene", "Feb", "Mar", "Abr", "May", "Jun",
    "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

type ViewMode = "days" | "months" | "years";

interface PremiumDatePickerProps {
    /** Value in YYYY-MM-DD (ISO) format — internal/storage format */
    value: string;
    /** Called with YYYY-MM-DD string */
    onChange: (value: string) => void;
    placeholder?: string;
    id?: string;
    className?: string;
    /** Show the Calendar icon on the left */
    showIcon?: boolean;
}

export function PremiumDatePicker({
    value,
    onChange,
    placeholder = "DD/MM/AAAA",
    id,
    className,
    showIcon = true,
}: PremiumDatePickerProps) {
    const [open, setOpen] = useState(false);
    const [viewMode, setViewMode] = useState<ViewMode>("days");
    const containerRef = useRef<HTMLDivElement>(null);

    // Derive the calendar view month from current value or today
    const baseDate = value ? new Date(value + "T00:00:00") : new Date();
    const [viewYear, setViewYear] = useState(baseDate.getFullYear());
    const [viewMonth, setViewMonth] = useState(baseDate.getMonth());
    // Year range for the year picker (shows 12 years at a time)
    const [yearRangeStart, setYearRangeStart] = useState(Math.floor(baseDate.getFullYear() / 12) * 12);

    // Sync view when value changes externally
    useEffect(() => {
        if (value) {
            const d = new Date(value + "T00:00:00");
            setViewYear(d.getFullYear());
            setViewMonth(d.getMonth());
            setYearRangeStart(Math.floor(d.getFullYear() / 12) * 12);
        }
    }, [value]);

    // Reset to days view when opening
    useEffect(() => {
        if (open) setViewMode("days");
    }, [open]);

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    // ── Display value ────────────────────────────────────────────────────────────
    const displayValue = value
        ? (() => {
            const d = new Date(value + "T00:00:00");
            const dd = String(d.getDate()).padStart(2, "0");
            const mm = String(d.getMonth() + 1).padStart(2, "0");
            const yyyy = d.getFullYear();
            return `${dd}/${mm}/${yyyy}`;
        })()
        : "";

    // ── Calendar grid helpers ────────────────────────────────────────────────────
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
    const startDow = (firstDayOfMonth.getDay() + 6) % 7; // Monday-based
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const prevMonth = () => {
        if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
        else setViewMonth(m => m - 1);
    };
    const nextMonth = () => {
        if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
        else setViewMonth(m => m + 1);
    };
    const goToday = () => {
        const now = new Date();
        setViewMonth(now.getMonth());
        setViewYear(now.getFullYear());
        setYearRangeStart(Math.floor(now.getFullYear() / 12) * 12);
        setViewMode("days");
    };

    const selectDate = useCallback(
        (year: number, month: number, day: number) => {
            const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            onChange(iso);
            setOpen(false);
        },
        [onChange],
    );

    const selectMonth = (month: number) => {
        setViewMonth(month);
        setViewMode("days");
    };

    const selectYear = (year: number) => {
        setViewYear(year);
        setYearRangeStart(Math.floor(year / 12) * 12);
        setViewMode("months");
    };

    const today = new Date();
    const todayISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    // ── Day cells ──────────────────────────────────────────────────────────────
    const cells: { day: number; month: number; year: number; current: boolean }[] = [];
    for (let i = startDow - 1; i >= 0; i--) {
        const d = daysInPrevMonth - i;
        const m = viewMonth === 0 ? 11 : viewMonth - 1;
        const y = viewMonth === 0 ? viewYear - 1 : viewYear;
        cells.push({ day: d, month: m, year: y, current: false });
    }
    for (let d = 1; d <= daysInMonth; d++) {
        cells.push({ day: d, month: viewMonth, year: viewYear, current: true });
    }
    const remainder = cells.length % 7;
    const fill = remainder === 0 ? 0 : 7 - remainder;
    for (let d = 1; d <= fill; d++) {
        const m = viewMonth === 11 ? 0 : viewMonth + 1;
        const y = viewMonth === 11 ? viewYear + 1 : viewYear;
        cells.push({ day: d, month: m, year: y, current: false });
    }

    // ── Year range for picker ──────────────────────────────────────────────────
    const yearCells: number[] = [];
    for (let y = yearRangeStart; y < yearRangeStart + 12; y++) {
        yearCells.push(y);
    }

    return (
        <div className="relative" ref={containerRef}>
            {/* Trigger Button */}
            <button
                type="button"
                id={id}
                onClick={() => setOpen(!open)}
                className={cn(
                    "w-full flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 text-left outline-none transition-all",
                    "hover:bg-slate-100/60 focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 focus:bg-white",
                    showIcon ? "pl-12 pr-4 py-4" : "px-6 py-4",
                    className,
                )}
            >
                {showIcon && (
                    <Calendar
                        size={18}
                        className={cn(
                            "absolute left-4 top-1/2 -translate-y-1/2 transition-colors",
                            open ? "text-blue-500" : "text-slate-300",
                        )}
                    />
                )}
                <span
                    className={cn(
                        "text-sm font-bold tracking-widest",
                        displayValue ? "text-slate-900" : "text-slate-300",
                    )}
                >
                    {displayValue || placeholder}
                </span>
            </button>

            {/* Dropdown Calendar */}
            {open && (
                <div className="absolute top-full left-0 mt-2 w-[320px] bg-white border border-slate-100 rounded-[2rem] shadow-2xl z-50 p-5 animate-in zoom-in-95 slide-in-from-top-2 duration-200">

                    {/* ═══ HEADER — always visible ═══ */}
                    <div className="flex items-center justify-between mb-4">
                        {/* Left arrow */}
                        <button
                            type="button"
                            onClick={() => {
                                if (viewMode === "days") prevMonth();
                                else if (viewMode === "months") setViewYear(y => y - 1);
                                else setYearRangeStart(s => s - 12);
                            }}
                            className="p-2 rounded-xl hover:bg-slate-50 text-slate-400 hover:text-blue-600 transition-all active:scale-90"
                        >
                            <ChevronLeft size={18} />
                        </button>

                        {/* Center label — clickable to switch views */}
                        <div className="flex items-center gap-1.5">
                            {viewMode === "days" && (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => setViewMode("months")}
                                        className="text-sm font-black text-slate-900 hover:text-blue-600 hover:bg-blue-50 px-2 py-1 rounded-lg transition-all"
                                    >
                                        {MONTHS[viewMonth]}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setYearRangeStart(Math.floor(viewYear / 12) * 12); setViewMode("years"); }}
                                        className="text-sm font-black text-slate-900 hover:text-blue-600 hover:bg-blue-50 px-2 py-1 rounded-lg transition-all"
                                    >
                                        {viewYear}
                                    </button>
                                </>
                            )}
                            {viewMode === "months" && (
                                <button
                                    type="button"
                                    onClick={() => { setYearRangeStart(Math.floor(viewYear / 12) * 12); setViewMode("years"); }}
                                    className="text-sm font-black text-slate-900 hover:text-blue-600 hover:bg-blue-50 px-2.5 py-1 rounded-lg transition-all"
                                >
                                    {viewYear}
                                </button>
                            )}
                            {viewMode === "years" && (
                                <span className="text-sm font-black text-slate-900 px-2 py-1">
                                    {yearRangeStart} — {yearRangeStart + 11}
                                </span>
                            )}
                        </div>

                        {/* Right arrow */}
                        <button
                            type="button"
                            onClick={() => {
                                if (viewMode === "days") nextMonth();
                                else if (viewMode === "months") setViewYear(y => y + 1);
                                else setYearRangeStart(s => s + 12);
                            }}
                            className="p-2 rounded-xl hover:bg-slate-50 text-slate-400 hover:text-blue-600 transition-all active:scale-90"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>

                    {/* ═══ DAYS VIEW ═══ */}
                    {viewMode === "days" && (
                        <>
                            {/* Day-of-week headers */}
                            <div className="grid grid-cols-7 gap-0.5 mb-1">
                                {DAYS_SHORT.map((d) => (
                                    <div key={d} className="text-center text-[8px] font-black text-slate-300 uppercase tracking-widest py-1">
                                        {d}
                                    </div>
                                ))}
                            </div>

                            {/* Day grid */}
                            <div className="grid grid-cols-7 gap-0.5">
                                {cells.map((cell, idx) => {
                                    const cellISO = `${cell.year}-${String(cell.month + 1).padStart(2, "0")}-${String(cell.day).padStart(2, "0")}`;
                                    const isToday = cellISO === todayISO;
                                    const isSelected = cellISO === value;

                                    return (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => selectDate(cell.year, cell.month, cell.day)}
                                            className={cn(
                                                "relative w-full aspect-square flex items-center justify-center rounded-xl text-xs font-bold transition-all",
                                                !cell.current && "text-slate-200",
                                                cell.current && !isSelected && !isToday && "text-slate-600 hover:bg-blue-50 hover:text-blue-600",
                                                isToday && !isSelected && "bg-slate-100 text-slate-900 font-black ring-1 ring-slate-200",
                                                isSelected && "bg-blue-600 text-white font-black shadow-lg shadow-blue-600/30 scale-105",
                                            )}
                                        >
                                            {cell.day}
                                        </button>
                                    );
                                })}
                            </div>
                        </>
                    )}

                    {/* ═══ MONTHS VIEW ═══ */}
                    {viewMode === "months" && (
                        <div className="grid grid-cols-3 gap-2">
                            {MONTHS_SHORT.map((m, idx) => {
                                const isCurrent = idx === viewMonth && viewYear === today.getFullYear() && idx === today.getMonth();
                                const isSelected = idx === viewMonth;

                                return (
                                    <button
                                        key={m}
                                        type="button"
                                        onClick={() => selectMonth(idx)}
                                        className={cn(
                                            "py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
                                            isSelected && !isCurrent && "bg-blue-600 text-white shadow-lg shadow-blue-600/20",
                                            isCurrent && !isSelected && "bg-slate-100 text-slate-900 ring-1 ring-slate-200",
                                            isCurrent && isSelected && "bg-blue-600 text-white shadow-lg shadow-blue-600/20",
                                            !isSelected && !isCurrent && "text-slate-600 hover:bg-blue-50 hover:text-blue-600",
                                        )}
                                    >
                                        {m}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* ═══ YEARS VIEW ═══ */}
                    {viewMode === "years" && (
                        <div className="grid grid-cols-3 gap-2">
                            {yearCells.map((y) => {
                                const isCurrent = y === today.getFullYear();
                                const isSelected = y === viewYear;

                                return (
                                    <button
                                        key={y}
                                        type="button"
                                        onClick={() => selectYear(y)}
                                        className={cn(
                                            "py-3 rounded-xl text-xs font-black tracking-wider transition-all",
                                            isSelected && !isCurrent && "bg-blue-600 text-white shadow-lg shadow-blue-600/20",
                                            isCurrent && !isSelected && "bg-slate-100 text-slate-900 ring-1 ring-slate-200",
                                            isCurrent && isSelected && "bg-blue-600 text-white shadow-lg shadow-blue-600/20",
                                            !isSelected && !isCurrent && "text-slate-600 hover:bg-blue-50 hover:text-blue-600",
                                        )}
                                    >
                                        {y}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-50">
                        <button
                            type="button"
                            onClick={goToday}
                            className="text-[9px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-500 transition-colors"
                        >
                            Hoy
                        </button>
                        {value && (
                            <button
                                type="button"
                                onClick={() => { onChange(""); setOpen(false); }}
                                className="text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-red-500 transition-colors"
                            >
                                Limpiar
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
