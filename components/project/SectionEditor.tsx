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
    Trash2,
    Copy,
    Check,
    Pencil,
    X,
    Plus,
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
    onDeleted,
    onCompleted,
}: {
    section: Section;
    onSaved: () => void;
    onDeleted: (id: string) => void;
    onCompleted: (id: string, completed: boolean) => void;
}) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [content, setContent] = useState(section.content);
    const [title, setTitle] = useState(section.title);
    const [editingTitle, setEditingTitle] = useState(false);
    const [saving, setSaving] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");
    const [isCompleted, setIsCompleted] = useState(section.is_completed);
    const [copied, setCopied] = useState(false);
    const [instructions, setInstructions] = useState("");
    const [showInstructions, setShowInstructions] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const titleInputRef = useRef<HTMLInputElement>(null);
    const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current && isExpanded) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = `${Math.max(200, textareaRef.current.scrollHeight)}px`;
        }
    }, [content, isExpanded]);

    // Focus title input when editing
    useEffect(() => {
        if (editingTitle && titleInputRef.current) {
            titleInputRef.current.focus();
            titleInputRef.current.select();
        }
    }, [editingTitle]);

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
        // Si hay contenido, marcar como completada automáticamente
        const shouldComplete = content.trim().length > 0;
        try {
            const body: Record<string, unknown> = { content };
            if (shouldComplete) body.is_completed = true;
            const res = await fetch(`/api/sections/${section.id}`, {
                method: "PATCH",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            if (res.ok) {
                setSaveStatus("saved");
                if (shouldComplete && !isCompleted) {
                    setIsCompleted(true);
                    onCompleted(section.id, true);
                }
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
        const newVal = !isCompleted;
        setIsCompleted(newVal); // optimistic update
        try {
            const res = await fetch(`/api/sections/${section.id}`, {
                method: "PATCH",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ is_completed: newVal }),
            });
            if (res.ok) {
                onCompleted(section.id, newVal);
                onSaved();
            } else {
                setIsCompleted(!newVal); // revert on error
            }
        } catch {
            setIsCompleted(!newVal); // revert on error
        }
    };

    const handleSaveTitle = async () => {
        const trimmed = title.trim();
        if (!trimmed || trimmed === section.title) {
            setTitle(section.title);
            setEditingTitle(false);
            return;
        }
        try {
            const res = await fetch(`/api/sections/${section.id}`, {
                method: "PATCH",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title: trimmed }),
            });
            if (res.ok) {
                onSaved();
            } else {
                setTitle(section.title);
            }
        } catch {
            setTitle(section.title);
        } finally {
            setEditingTitle(false);
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

    const handleCopyToClipboard = async () => {
        if (!content) return;
        try {
            await navigator.clipboard.writeText(content);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Fallback
            const ta = document.createElement("textarea");
            ta.value = content;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand("copy");
            document.body.removeChild(ta);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleDelete = async () => {
        setDeleting(true);
        try {
            const res = await fetch(`/api/sections/${section.id}`, {
                method: "DELETE",
                credentials: "include",
            });
            if (res.ok) {
                onDeleted(section.id);
            } else {
                const data = await res.json().catch(() => ({}));
                alert(data.error || "Error al eliminar la sección");
            }
        } catch {
            alert("Error de conexión al eliminar");
        } finally {
            setDeleting(false);
            setShowDeleteConfirm(false);
        }
    };

    const wordCount = content.trim().split(/\s+/).filter(Boolean).length;

    return (
        <li className="group bg-white border border-slate-200 rounded-2xl overflow-hidden transition-all hover:border-slate-300">
            {/* Header - clickable to expand */}
            <div
                role="button"
                tabIndex={0}
                onClick={() => !editingTitle && setIsExpanded(!isExpanded)}
                onKeyDown={(e) => {
                    if (!editingTitle && (e.key === "Enter" || e.key === " ")) {
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
                        isCompleted
                            ? "bg-emerald-500 border-emerald-500 text-white"
                            : "border-slate-300 hover:border-blue-400"
                    )}
                >
                    {isCompleted && <CheckCircle2 size={14} />}
                </button>

                <div className="flex-1 min-w-0">
                    {editingTitle ? (
                        <div
                            className="flex items-center gap-2"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <input
                                ref={titleInputRef}
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") handleSaveTitle();
                                    if (e.key === "Escape") {
                                        setTitle(section.title);
                                        setEditingTitle(false);
                                    }
                                }}
                                className="flex-1 font-bold text-slate-900 bg-blue-50 border border-blue-300 rounded-lg px-2 py-0.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            />
                            <button
                                type="button"
                                onClick={handleSaveTitle}
                                className="p-1 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors"
                                title="Guardar título"
                            >
                                <Check size={12} />
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setTitle(section.title);
                                    setEditingTitle(false);
                                }}
                                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
                                title="Cancelar"
                            >
                                <X size={12} />
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 group/title">
                            <span className="font-bold text-slate-900 block">
                                {section.sort_order + 1}. {title}
                            </span>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingTitle(true);
                                }}
                                className="opacity-0 group-hover/title:opacity-100 p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                                title="Editar título"
                            >
                                <Pencil size={12} />
                            </button>
                        </div>
                    )}
                    {!isExpanded && content && !editingTitle && (
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
                        placeholder={`Escribe el contenido de "${title}" aquí, o usa el botón de IA para generar un borrador...`}
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
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex gap-2 flex-wrap">
                            {/* Generar con IA */}
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

                            {/* Copiar al portapapeles */}
                            {content && (
                                <button
                                    type="button"
                                    onClick={handleCopyToClipboard}
                                    className={cn(
                                        "flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold transition-colors",
                                        copied
                                            ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                                            : "text-slate-500 hover:bg-slate-100"
                                    )}
                                    title="Copiar contenido al portapapeles"
                                >
                                    {copied ? <Check size={14} /> : <Copy size={14} />}
                                    {copied ? "¡Copiado!" : "Copiar"}
                                </button>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Eliminar sección */}
                            {showDeleteConfirm ? (
                                <div className="flex items-center gap-1.5 animate-in fade-in duration-150">
                                    <span className="text-xs text-red-600 font-medium">¿Eliminar?</span>
                                    <button
                                        type="button"
                                        onClick={handleDelete}
                                        disabled={deleting}
                                        className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-white bg-red-600 hover:bg-red-500 disabled:opacity-60 transition-colors"
                                    >
                                        {deleting ? <Loader2 size={12} className="animate-spin" /> : "Sí, eliminar"}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowDeleteConfirm(false)}
                                        className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-100 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setShowDeleteConfirm(true)}
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                    title="Eliminar sección"
                                >
                                    <Trash2 size={14} />
                                </button>
                            )}

                            {/* Guardar */}
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
                </div>
            )}
        </li>
    );
}

// --- Modal para añadir sección manual ---
function AddSectionModal({
    onAdd,
    onClose,
}: {
    onAdd: (title: string) => Promise<void>;
    onClose: () => void;
}) {
    const [title, setTitle] = useState("");
    const [loading, setLoading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;
        setLoading(true);
        try {
            await onAdd(title.trim());
            onClose();
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl p-8 shadow-2xl shadow-slate-900/10 w-full max-w-md mx-4 animate-in zoom-in-95 duration-200">
                <h3 className="font-black text-slate-900 text-xl mb-1">Añadir sección</h3>
                <p className="text-slate-500 text-sm mb-6">Crea una sección personalizada para tu memoria técnica.</p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input
                        ref={inputRef}
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Ej: Plan de sostenibilidad, Análisis de mercado..."
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        maxLength={200}
                    />
                    <div className="flex gap-3 justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={!title.trim() || loading}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-60 transition-colors"
                        >
                            {loading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                            Añadir sección
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// --- Componente principal ---
export function SectionEditor({
    projectId,
    sections: initialSections,
    hasConvocatoriaFiles,
}: SectionEditorProps) {
    const [sections, setSections] = useState<Section[]>(initialSections);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
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
                setGenerating(false);
                return;
            }

            // Éxito — actualizar estado local directamente con las secciones generadas
            if (data.sections && Array.isArray(data.sections)) {
                const newSections: Section[] = data.sections.map(
                    (title: string, i: number) => ({
                        id: `temp-${i}-${Date.now()}`,
                        title,
                        content: "",
                        is_completed: false,
                        sort_order: i,
                    })
                );
                setSections(newSections);
            }
            setGenerating(false);
            // Refrescar datos reales de la BD en segundo plano (sin bloquear la UI)
            router.refresh();
        } catch (err) {
            console.error("Error generando secciones:", err);
            setError("Error de conexión. Inténtalo de nuevo.");
            setGenerating(false);
        }
    };

    const handleAddSection = async (title: string) => {
        const res = await fetch(`/api/projects/${projectId}/sections`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title }),
        });
        const data = await res.json();
        if (res.ok && data.section) {
            setSections((prev) => [...prev, data.section]);
        } else {
            alert(data.error || "Error al añadir la sección");
            throw new Error(data.error);
        }
    };

    const handleSectionDeleted = (deletedId: string) => {
        setSections((prev) => prev.filter((s) => s.id !== deletedId));
    };

    const handleSectionCompleted = (id: string, completed: boolean) => {
        setSections((prev) =>
            prev.map((s) => (s.id === id ? { ...s, is_completed: completed } : s))
        );
    };

    const completedCount = sections.filter((s) => s.is_completed).length;
    const totalCount = sections.length;
    const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
    const totalWords = sections.reduce((acc, s) => {
        return acc + (s.content?.trim().split(/\s+/).filter(Boolean).length ?? 0);
    }, 0);

    return (
        <>
            {showAddModal && (
                <AddSectionModal
                    onAdd={handleAddSection}
                    onClose={() => setShowAddModal(false)}
                />
            )}

            <div className="bg-white border border-slate-200 rounded-3xl p-8">
                <div className="flex items-center justify-between gap-4 mb-2 flex-wrap">
                    <h2 className="font-bold text-slate-900 flex items-center gap-2 text-lg">
                        <FileText size={20} />
                        Secciones de la memoria
                        {totalCount > 0 && (
                            <span className="text-sm font-normal text-slate-400">
                                · {totalWords.toLocaleString()} palabras en total
                            </span>
                        )}
                    </h2>
                    <div className="flex items-center gap-2">
                        {/* Añadir sección manual */}
                        <button
                            type="button"
                            onClick={() => setShowAddModal(true)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors"
                        >
                            <Plus size={16} />
                            Añadir sección
                        </button>

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
                                {sections.length > 0
                                    ? "Regenerar estructura"
                                    : "Generar secciones desde las bases"}
                            </button>
                        )}
                    </div>
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

                {!sections.length ? (
                    <div className="text-center py-12">
                        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <FileText size={32} className="text-slate-400" />
                        </div>
                        <p className="text-slate-500 text-sm max-w-md mx-auto mb-4">
                            {hasConvocatoriaFiles
                                ? 'Pulsa "Generar secciones desde las bases" para que la IA extraiga la estructura de tu memoria técnica a partir de los PDFs cargados.'
                                : "Carga primero los PDFs de la convocatoria y luego genera las secciones, o añade secciones manualmente."}
                        </p>
                        <button
                            type="button"
                            onClick={() => setShowAddModal(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-blue-600 border border-blue-200 hover:bg-blue-50 transition-colors"
                        >
                            <Plus size={16} />
                            Añadir sección manualmente
                        </button>
                    </div>
                ) : (
                    <ul className="space-y-3">
                        {sections.map((s) => (
                            <SectionItem
                                key={s.id}
                                section={s}
                                onSaved={() => router.refresh()}
                                onDeleted={handleSectionDeleted}
                                onCompleted={handleSectionCompleted}
                            />
                        ))}
                    </ul>
                )}
            </div>
        </>
    );
}
