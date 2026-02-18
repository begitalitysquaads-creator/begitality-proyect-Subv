"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    FileText,
    Loader2,
    Sparkles,
    Save,
    CheckCircle2,
    ChevronDown,
    ChevronRight,
    Wand2,
    RotateCcw,
    Send,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Section {
    id: string;
    title: string;
    content: string;
    is_completed: boolean;
    sort_order: number;
}

interface SectionEditorProps {
    projectId: string;
    sections: Section[];
    hasConvocatoriaFiles: boolean;
}

function SectionItem({
    section,
    onSaved,
}: {
    section: Section;
    onSaved: () => void;
}) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [content, setContent] = useState(section.content);
    const [saving, setSaving] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");
    const [instructions, setInstructions] = useState("");
    const [showInstructions, setShowInstructions] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current && isExpanded) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = `${Math.max(200, textareaRef.current.scrollHeight)}px`;
        }
    }, [content, isExpanded]);

    // Auto-save debounce
    const debouncedSave = useCallback(
        (newContent: string) => {
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
            saveTimeoutRef.current = setTimeout(async () => {
                setSaving(true);
                setSaveStatus("idle");
                try {
                    const res = await fetch(`/api/sections/${section.id}`, {
                        method: "PATCH",
                        credentials: "include",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ content: newContent }),
                    });
                    if (res.ok) {
                        setSaveStatus("saved");
                        setTimeout(() => setSaveStatus("idle"), 2000);
                    } else {
                        setSaveStatus("error");
                    }
                } catch {
                    setSaveStatus("error");
                } finally {
                    setSaving(false);
                }
            }, 1500);
        },
        [section.id]
    );

    const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newContent = e.target.value;
        setContent(newContent);
        debouncedSave(newContent);
    };

    const handleManualSave = async () => {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        setSaving(true);
        setSaveStatus("idle");
        try {
            const res = await fetch(`/api/sections/${section.id}`, {
                method: "PATCH",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content }),
            });
            if (res.ok) {
                setSaveStatus("saved");
                onSaved();
                setTimeout(() => setSaveStatus("idle"), 2000);
            } else {
                setSaveStatus("error");
            }
        } catch {
            setSaveStatus("error");
        } finally {
            setSaving(false);
        }
    };

    const handleToggleComplete = async () => {
        try {
            const res = await fetch(`/api/sections/${section.id}`, {
                method: "PATCH",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ is_completed: !section.is_completed }),
            });
            if (res.ok) onSaved();
        } catch {
            // silently fail
        }
    };

    const handleGenerate = async () => {
        setGenerating(true);
        try {
            const res = await fetch(`/api/sections/${section.id}/generate`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    instructions: instructions.trim() || undefined,
                }),
            });
            const data = await res.json();
            if (res.ok && data.content) {
                setContent(data.content);
                setShowInstructions(false);
                setInstructions("");
                onSaved();
            } else {
                alert(data.error || "Error al generar contenido");
            }
        } catch {
            alert("Error de conexión al generar contenido");
        } finally {
            setGenerating(false);
        }
    };

    const wordCount = content.trim().split(/\s+/).filter(Boolean).length;

    return (
        <li className="group bg-white border border-slate-200 rounded-2xl overflow-hidden transition-all hover:border-slate-300">
            {/* Header - clickable to expand */}
            <div
                role="button"
                tabIndex={0}
                onClick={() => setIsExpanded(!isExpanded)}
                onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setIsExpanded(!isExpanded);
                    }
                }}
                className="w-full flex items-center gap-3 p-5 text-left cursor-pointer"
            >
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        handleToggleComplete();
                    }}
                    className={cn(
                        "w-6 h-6 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors",
                        section.is_completed
                            ? "bg-emerald-500 border-emerald-500 text-white"
                            : "border-slate-300 hover:border-blue-400"
                    )}
                >
                    {section.is_completed && <CheckCircle2 size={14} />}
                </button>

                <div className="flex-1 min-w-0">
                    <span className="font-bold text-slate-900 block">
                        {section.sort_order + 1}. {section.title}
                    </span>
                    {!isExpanded && content && (
                        <span className="text-slate-400 text-sm truncate block mt-0.5">
                            {content.slice(0, 100)}
                            {content.length > 100 ? "…" : ""}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    {content && (
                        <span className="text-[11px] text-slate-400 font-medium">
                            {wordCount} palabras
                        </span>
                    )}
                    {saving && <Loader2 size={14} className="animate-spin text-blue-500" />}
                    {saveStatus === "saved" && (
                        <CheckCircle2 size={14} className="text-emerald-500" />
                    )}
                    {isExpanded ? (
                        <ChevronDown size={18} className="text-slate-400" />
                    ) : (
                        <ChevronRight size={18} className="text-slate-400" />
                    )}
                </div>
            </div>

            {/* Expanded editor */}
            {isExpanded && (
                <div className="border-t border-slate-100 p-5 space-y-4 animate-in slide-in-from-top-2 duration-200">
                    {/* Textarea */}
                    <textarea
                        ref={textareaRef}
                        value={content}
                        onChange={handleContentChange}
                        placeholder={`Escribe el contenido de "${section.title}" aquí, o usa el botón de IA para generar un borrador...`}
                        className={cn(
                            "w-full min-h-[200px] p-4 rounded-xl border border-slate-200 bg-slate-50/50 resize-none",
                            "focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500",
                            "text-sm text-slate-800 leading-relaxed placeholder:text-slate-400"
                        )}
                    />

                    {/* AI Instructions (hidden by default) */}
                    {showInstructions && (
                        <div className="flex gap-2 animate-in fade-in duration-200">
                            <input
                                type="text"
                                value={instructions}
                                onChange={(e) => setInstructions(e.target.value)}
                                placeholder="Ej: Enfócate en innovación tecnológica y digitalización..."
                                className={cn(
                                    "flex-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm",
                                    "focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                )}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        handleGenerate();
                                    }
                                }}
                            />
                            <button
                                type="button"
                                onClick={handleGenerate}
                                disabled={generating}
                                className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-500 disabled:opacity-60 transition-colors flex items-center gap-1.5"
                            >
                                {generating ? (
                                    <Loader2 size={14} className="animate-spin" />
                                ) : (
                                    <Send size={14} />
                                )}
                                Generar
                            </button>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-between">
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    if (showInstructions) {
                                        handleGenerate();
                                    } else {
                                        setShowInstructions(true);
                                    }
                                }}
                                disabled={generating}
                                className={cn(
                                    "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-bold transition-colors",
                                    "bg-gradient-to-r from-violet-600 to-blue-600 text-white hover:from-violet-500 hover:to-blue-500",
                                    "disabled:opacity-60 shadow-md shadow-violet-500/10"
                                )}
                            >
                                {generating ? (
                                    <Loader2 size={14} className="animate-spin" />
                                ) : (
                                    <Wand2 size={14} />
                                )}
                                {generating
                                    ? "Generando…"
                                    : content
                                        ? "Mejorar con IA"
                                        : "Redactar con IA"}
                            </button>

                            {showInstructions && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowInstructions(false);
                                        setInstructions("");
                                    }}
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 transition-colors"
                                >
                                    <RotateCcw size={14} />
                                    Cancelar
                                </button>
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={handleManualSave}
                            disabled={saving}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 disabled:opacity-60 transition-colors"
                        >
                            {saving ? (
                                <Loader2 size={14} className="animate-spin" />
                            ) : (
                                <Save size={14} />
                            )}
                            Guardar
                        </button>
                    </div>
                </div>
            )}
        </li>
    );
}

export function SectionEditor({
    projectId,
    sections: initialSections,
    hasConvocatoriaFiles,
}: SectionEditorProps) {
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const handleGenerateSections = async () => {
        setError(null);
        setGenerating(true);
        try {
            const res = await fetch(`/api/projects/${projectId}/generate-sections`, {
                method: "POST",
                credentials: "include",
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                const parts = [data.error || "Error al generar secciones"];
                if (data.message) parts.push(data.message);
                if (data.details?.length) parts.push(data.details.join(" "));
                setError(parts.join(" — "));
                return;
            }
            router.refresh();
        } finally {
            setGenerating(false);
        }
    };

    const completedCount = initialSections.filter((s) => s.is_completed).length;
    const totalCount = initialSections.length;
    const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

    return (
        <div className="bg-white border border-slate-200 rounded-3xl p-8">
            <div className="flex items-center justify-between gap-4 mb-2">
                <h2 className="font-bold text-slate-900 flex items-center gap-2 text-lg">
                    <FileText size={20} />
                    Secciones de la memoria
                </h2>
                {hasConvocatoriaFiles && (
                    <button
                        type="button"
                        onClick={handleGenerateSections}
                        disabled={generating}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors",
                            "bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-60"
                        )}
                    >
                        {generating ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : (
                            <Sparkles size={16} />
                        )}
                        {initialSections.length > 0
                            ? "Regenerar estructura"
                            : "Generar secciones desde las bases"}
                    </button>
                )}
            </div>

            {/* Barra de progreso */}
            {totalCount > 0 && (
                <div className="mb-6">
                    <div className="flex justify-between text-sm mb-1.5">
                        <span className="text-slate-500 font-medium">
                            {completedCount} de {totalCount} secciones completadas
                        </span>
                        <span className="text-slate-400 font-bold">{Math.round(progress)}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-500"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            )}

            {error && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm">
                    {error}
                </div>
            )}

            {!initialSections.length ? (
                <div className="text-center py-12">
                    <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <FileText size={32} className="text-slate-400" />
                    </div>
                    <p className="text-slate-500 text-sm max-w-md mx-auto">
                        {hasConvocatoriaFiles
                            ? 'Pulsa "Generar secciones desde las bases" para que la IA extraiga la estructura de tu memoria técnica a partir de los PDFs cargados.'
                            : "Carga primero los PDFs de la convocatoria y luego genera las secciones."}
                    </p>
                </div>
            ) : (
                <ul className="space-y-3">
                    {initialSections.map((s) => (
                        <SectionItem
                            key={s.id}
                            section={s}
                            onSaved={() => router.refresh()}
                        />
                    ))}
                </ul>
            )}
        </div>
    );
}
