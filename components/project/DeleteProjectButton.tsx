"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2, MoreVertical, X } from "lucide-react";

export function DeleteProjectButton({ projectId, projectName }: { projectId: string; projectName: string }) {
    const [showMenu, setShowMenu] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const router = useRouter();

    const handleDelete = async () => {
        setDeleting(true);
        try {
            const res = await fetch(`/api/projects/${projectId}`, {
                method: "DELETE",
                credentials: "include",
            });
            if (res.ok) {
                router.push("/dashboard");
                router.refresh();
            } else {
                const data = await res.json().catch(() => ({}));
                alert(data.error || "Error al eliminar el proyecto");
                setDeleting(false);
                setShowConfirm(false);
            }
        } catch {
            alert("Error de conexión al eliminar");
            setDeleting(false);
            setShowConfirm(false);
        }
    };

    return (
        <>
            {/* Modal de confirmación */}
            {showConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl p-8 shadow-2xl shadow-slate-900/10 w-full max-w-md mx-4 animate-in zoom-in-95 duration-200">
                        <div className="flex items-start justify-between mb-4">
                            <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center">
                                <Trash2 size={22} className="text-red-600" />
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowConfirm(false)}
                                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>
                        <h3 className="font-black text-slate-900 text-xl mb-2">Eliminar proyecto</h3>
                        <p className="text-slate-500 text-sm mb-1">
                            ¿Estás seguro de que quieres eliminar{" "}
                            <span className="font-bold text-slate-700">"{projectName}"</span>?
                        </p>
                        <p className="text-slate-400 text-xs mb-6">
                            Esta acción eliminará el proyecto, todas sus secciones, archivos y mensajes del chat. No se puede deshacer.
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                type="button"
                                onClick={() => setShowConfirm(false)}
                                disabled={deleting}
                                className="px-4 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 transition-colors disabled:opacity-60"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleDelete}
                                disabled={deleting}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-500 disabled:opacity-60 transition-colors"
                            >
                                {deleting ? (
                                    <Loader2 size={14} className="animate-spin" />
                                ) : (
                                    <Trash2 size={14} />
                                )}
                                {deleting ? "Eliminando…" : "Sí, eliminar proyecto"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Botón de menú */}
            <div className="relative">
                <button
                    type="button"
                    onClick={() => setShowMenu(!showMenu)}
                    className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-white border border-slate-200 transition-all"
                    title="Opciones del proyecto"
                >
                    <MoreVertical size={18} />
                </button>

                {showMenu && (
                    <>
                        <div
                            className="fixed inset-0 z-30"
                            onClick={() => setShowMenu(false)}
                        />
                        <div className="absolute right-0 top-full mt-2 z-40 bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-900/10 py-1.5 min-w-[180px] animate-in fade-in slide-in-from-top-2 duration-150">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowMenu(false);
                                    setShowConfirm(true);
                                }}
                                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 transition-colors"
                            >
                                <Trash2 size={15} />
                                Eliminar proyecto
                            </button>
                        </div>
                    </>
                )}
            </div>
        </>
    );
}
