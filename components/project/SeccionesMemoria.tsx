"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface Section {
  id: string;
  title: string;
  content: string;
  is_completed: boolean;
  sort_order: number;
}

export function SeccionesMemoria({
  projectId,
  sections: initialSections,
  hasConvocatoriaFiles,
}: {
  projectId: string;
  sections: Section[];
  hasConvocatoriaFiles: boolean;
}) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleGenerate = async () => {
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

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-8">
      <div className="flex items-center justify-between gap-4 mb-4">
        <h2 className="font-bold text-slate-900 flex items-center gap-2">
          <FileText size={18} />
          Secciones de la memoria
        </h2>
        {hasConvocatoriaFiles && (
          <button
            type="button"
            onClick={handleGenerate}
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
            {generating ? "Generando…" : "Generar secciones desde las bases"}
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm">
          {error}
        </div>
      )}

      {!initialSections.length ? (
        <p className="text-slate-500 text-sm">
          {hasConvocatoriaFiles
            ? "Pulsa «Generar secciones desde las bases» para que la IA extraiga la estructura de la memoria a partir de los PDFs cargados."
            : "Carga primero los PDFs de la convocatoria y luego genera las secciones."}
        </p>
      ) : (
        <ul className="space-y-3">
          {initialSections.map((s) => (
            <li
              key={s.id}
              className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100"
            >
              <span
                className={cn(
                  "w-5 h-5 rounded-full border-2 shrink-0",
                  s.is_completed ? "bg-emerald-500 border-emerald-500" : "border-slate-300"
                )}
              />
              <span className="font-medium text-slate-900">{s.title}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
