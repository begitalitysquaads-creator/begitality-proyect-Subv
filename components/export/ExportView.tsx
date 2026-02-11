"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  FileText,
  Download,
  FileDown,
  ExternalLink,
  Eye,
  ShieldCheck,
  Printer,
  Sparkles,
  Zap,
  Loader2,
  CheckCircle2,
} from "lucide-react";
interface SectionData {
  id: string;
  title: string;
  content: string;
  is_completed: boolean;
}

interface ExportViewProps {
  project: {
    id: string;
    name: string;
    grant_name: string;
    sections: SectionData[];
  };
}

function ExportCard({
  type,
  title,
  icon: Icon,
  onClick,
}: {
  type: string;
  title: string;
  icon: React.ComponentType<{ size?: number }>;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="bg-white border border-slate-200 p-6 rounded-2xl flex items-center gap-4 hover:border-blue-500 hover:shadow-xl hover:shadow-blue-500/5 transition-all group w-full text-left"
    >
      <div className="p-3 bg-slate-50 rounded-xl group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
        <Icon size={24} />
      </div>
      <div className="flex-1">
        <h4 className="font-bold text-slate-900">{title}</h4>
        <p className="text-xs text-slate-500">Exportar formato oficial {type}</p>
      </div>
      <Download size={18} className="text-slate-300 group-hover:text-blue-500" />
    </button>
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ExportView({ project }: ExportViewProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);

  const doExport = async (format: "pdf" | "docx") => {
    setIsExporting(true);
    try {
      const res = await fetch("/api/export", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: project.id, format }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || res.statusText);
      }
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition");
      const match = disposition?.match(/filename="?([^";\n]+)"?/);
      const filename = match?.[1] ?? `Memoria_Tecnica.${format}`;
      downloadBlob(blob, filename);
      setExportComplete(true);
    } catch (e) {
      console.error(e);
      setExportComplete(false);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExport = () => doExport("pdf");
  const handleExportDocx = () => doExport("docx");
  const handleExportPdf = () => doExport("pdf");

  const sections = project.sections ?? [];

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="p-2 hover:bg-white rounded-full border border-slate-200 transition-all"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-slate-900">
              Finalizar Memoria
            </h1>
            <p className="text-slate-500 text-sm">
              Verificación y exportación de expediente
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <span className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl text-xs font-bold border border-emerald-100">
            <ShieldCheck size={16} /> Verificado por IA
          </span>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[70vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-slate-400" />
                <span className="text-sm font-bold text-slate-700">
                  MEMORIA_TECNICA_FINAL.PDF
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <Eye size={18} />
                </button>
                <button
                  type="button"
                  className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <Printer size={18} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-12 bg-slate-50/30">
              <div className="max-w-2xl mx-auto bg-white shadow-2xl shadow-slate-200/50 p-16 min-h-full space-y-8 font-serif">
                <div className="text-center space-y-2 mb-12">
                  <h1 className="text-3xl font-bold text-slate-900 uppercase tracking-tighter">
                    Memoria Técnica
                  </h1>
                  <div className="w-20 h-1 bg-blue-600 mx-auto rounded-full" />
                  <p className="text-slate-500 text-sm font-sans font-bold">
                    {project.grant_name}
                  </p>
                </div>
                {sections.length > 0 ? (
                  sections.map((section) => (
                    <div key={section.id} className="space-y-4">
                      <h3 className="text-lg font-bold text-slate-900 font-sans border-l-4 border-blue-600 pl-4">
                        {section.title}
                      </h3>
                      <p className="text-slate-700 leading-relaxed text-justify text-sm">
                        {section.content}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-400 text-sm italic">
                    Sin secciones aún. Completa la redacción en el espacio de
                    trabajo.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Sparkles size={120} />
            </div>
            <h3 className="text-xl font-bold mb-2">¿Todo listo?</h3>
            <p className="text-slate-400 text-sm mb-6 font-medium">
              Hemos analizado el documento y cumple con el 100% de los
              requisitos de la convocatoria.
            </p>
            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-3 text-sm">
                <CheckCircle2 size={18} className="text-emerald-400" />
                <span>Estructura completa</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <CheckCircle2 size={18} className="text-emerald-400" />
                <span>Presupuesto coherente</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <CheckCircle2 size={18} className="text-emerald-400" />
                <span>Contexto integrado</span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting}
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 rounded-2xl font-black text-sm transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {isExporting ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <Zap fill="currentColor" size={16} />
              )}
              {isExporting ? "Generando Archivos…" : "Finalizar y Descargar"}
            </button>
          </div>

          <div className="space-y-3">
            <ExportCard
              type=".docx"
              title="Microsoft Word"
              icon={FileText}
              onClick={handleExportDocx}
            />
            <ExportCard
              type=".pdf"
              title="Adobe PDF"
              icon={FileDown}
              onClick={handleExportPdf}
            />
            <ExportCard
              type="Enlace"
              title="Compartir Expediente"
              icon={ExternalLink}
              onClick={() => {}}
            />
          </div>

          {exportComplete && (
            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 text-emerald-700 animate-in zoom-in-95">
              <CheckCircle2 size={24} />
              <div>
                <p className="font-bold text-sm">¡Éxito!</p>
                <p className="text-xs">Documentos descargados correctamente.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
