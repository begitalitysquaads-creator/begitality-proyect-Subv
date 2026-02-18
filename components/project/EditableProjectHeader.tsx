"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Check, X, Loader2 } from "lucide-react";

interface EditableProjectHeaderProps {
    projectId: string;
    name: string;
    grantName: string;
}

export function EditableProjectHeader({
    projectId,
    name,
    grantName,
}: EditableProjectHeaderProps) {
    const [editingName, setEditingName] = useState(false);
    const [editingGrant, setEditingGrant] = useState(false);
    const [currentName, setCurrentName] = useState(name);
    const [currentGrant, setCurrentGrant] = useState(grantName);
    const [saving, setSaving] = useState(false);
    const nameInputRef = useRef<HTMLInputElement>(null);
    const grantInputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    useEffect(() => {
        if (editingName) nameInputRef.current?.focus();
    }, [editingName]);

    useEffect(() => {
        if (editingGrant) grantInputRef.current?.focus();
    }, [editingGrant]);

    const handleSave = async (field: "name" | "grant_name", value: string) => {
        const trimmed = value.trim();
        const original = field === "name" ? name : grantName;
        if (!trimmed || trimmed === original) {
            if (field === "name") { setCurrentName(name); setEditingName(false); }
            else { setCurrentGrant(grantName); setEditingGrant(false); }
            return;
        }

        setSaving(true);
        try {
            const res = await fetch(`/api/projects/${projectId}`, {
                method: "PATCH",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ [field]: trimmed }),
            });
            if (res.ok) {
                router.refresh();
            } else {
                if (field === "name") setCurrentName(name);
                else setCurrentGrant(grantName);
            }
        } catch {
            if (field === "name") setCurrentName(name);
            else setCurrentGrant(grantName);
        } finally {
            setSaving(false);
            if (field === "name") setEditingName(false);
            else setEditingGrant(false);
        }
    };

    return (
        <div>
            {/* Nombre del proyecto */}
            {editingName ? (
                <div className="flex items-center gap-2">
                    <input
                        ref={nameInputRef}
                        type="text"
                        value={currentName}
                        onChange={(e) => setCurrentName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") handleSave("name", currentName);
                            if (e.key === "Escape") { setCurrentName(name); setEditingName(false); }
                        }}
                        className="text-2xl font-black text-slate-900 bg-blue-50 border border-blue-300 rounded-xl px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500/20 w-full max-w-sm"
                        maxLength={255}
                    />
                    <button
                        type="button"
                        onClick={() => handleSave("name", currentName)}
                        disabled={saving}
                        className="p-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-60 transition-colors"
                    >
                        {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    </button>
                    <button
                        type="button"
                        onClick={() => { setCurrentName(name); setEditingName(false); }}
                        className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
                    >
                        <X size={14} />
                    </button>
                </div>
            ) : (
                <div className="flex items-center gap-2 group/name">
                    <h1 className="text-2xl font-black text-slate-900">{currentName}</h1>
                    <button
                        type="button"
                        onClick={() => setEditingName(true)}
                        className="opacity-0 group-hover/name:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                        title="Editar nombre del proyecto"
                    >
                        <Pencil size={14} />
                    </button>
                </div>
            )}

            {/* Nombre de la convocatoria */}
            {editingGrant ? (
                <div className="flex items-center gap-2 mt-1">
                    <input
                        ref={grantInputRef}
                        type="text"
                        value={currentGrant}
                        onChange={(e) => setCurrentGrant(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") handleSave("grant_name", currentGrant);
                            if (e.key === "Escape") { setCurrentGrant(grantName); setEditingGrant(false); }
                        }}
                        className="text-sm text-slate-500 bg-slate-50 border border-slate-300 rounded-lg px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 w-full max-w-xs"
                        maxLength={500}
                    />
                    <button
                        type="button"
                        onClick={() => handleSave("grant_name", currentGrant)}
                        disabled={saving}
                        className="p-1 rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-60 transition-colors"
                    >
                        {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                    </button>
                    <button
                        type="button"
                        onClick={() => { setCurrentGrant(grantName); setEditingGrant(false); }}
                        className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
                    >
                        <X size={12} />
                    </button>
                </div>
            ) : (
                <div className="flex items-center gap-1.5 group/grant mt-1">
                    <p className="text-slate-500 text-sm">{currentGrant}</p>
                    <button
                        type="button"
                        onClick={() => setEditingGrant(true)}
                        className="opacity-0 group-hover/grant:opacity-100 p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                        title="Editar nombre de la convocatoria"
                    >
                        <Pencil size={11} />
                    </button>
                </div>
            )}
        </div>
    );
}
