"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
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
  Cloud,
  FolderOpen,
  Plus,
} from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";
import { StyledTooltip } from "@/components/ui/Tooltip";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PremiumSelector } from "@/components/ui/PremiumSelector";
import { logClientAction } from "@/lib/audit-client";
import { cn } from "@/lib/utils";

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
  tooltip
}: {
  type: string;
  title: string;
  icon: React.ComponentType<{ size?: number }>;
  onClick: () => void;
  tooltip: string;
}) {
  return (
    <StyledTooltip content={tooltip} side="left">
      <button
        onClick={onClick}
        className="bg-white border border-slate-200 p-6 rounded-2xl flex items-center gap-4 hover:border-blue-500 hover:shadow-xl hover:shadow-blue-500/5 transition-all group w-full text-left active:scale-[0.98]"
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
    </StyledTooltip>
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
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [driveFolders, setDriveFolders] = useState<{id: string, name: string}[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string>("root");
  const [isLoadingFolders, setIsLoadingFolders] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);
  const [alertDialog, setAlertDialog] = useState<{open: boolean, title: string, description: string}>({
    open: false, title: "", description: ""
  });

  const sections = project.sections ?? [];
  const completedSections = sections.filter(s => s.is_completed).length;
  const totalSections = sections.length;
  const progressPercent = totalSections > 0 ? Math.round((completedSections / totalSections) * 100) : 0;
  
  const getMaturityStatus = (percent: number) => {
    if (percent === 100) return { label: "Certificable", sub: "Cumple requisitos 100%", color: "text-emerald-600 bg-emerald-50 border-emerald-100", icon: ShieldCheck };
    if (percent > 75) return { label: "Consolidado", sub: "Revisión avanzada", color: "text-blue-600 bg-blue-50 border-blue-100", icon: Zap };
    if (percent > 25) return { label: "En Redacción", sub: "Contenido parcial", color: "text-amber-600 bg-amber-50 border-amber-100", icon: Loader2 };
    return { label: "Borrador", sub: "Estructura inicial", color: "text-slate-500 bg-slate-50 border-slate-100", icon: FileText };
  };

  const maturity = getMaturityStatus(progressPercent);
  const StatusIcon = maturity.icon;

  const hasContent = sections.some(s => s.content && s.content.trim().length > 0);
  // Si hay contenido pero 0% completado, podríamos sugerir marcar secciones como revisadas
  const hasUnmarkedContent = !completedSections && hasContent;

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
      
      await logClientAction(project.id, "Documentación", `exportó el expediente en formato ${format.toUpperCase()}`);
      
      setExportComplete(true);
    } catch (e) {
      console.error(e);
      setAlertDialog({
        open: true,
        title: "Error al exportar",
        description: e instanceof Error ? e.message : "Ocurrió un error inesperado al generar el archivo."
      });
      setExportComplete(false);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportDocx = () => doExport("docx");
  const handleExportPdf = () => doExport("pdf");

  const handlePrint = async () => {
    setIsExporting(true);
    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: project.id, format: "pdf" }),
      });
      
      if (!res.ok) throw new Error("Error al generar PDF para impresión");
      
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      
      // Creamos un iframe con un ID único para evitar colisiones
      const frameId = `print-frame-${Date.now()}`;
      let iframe = document.getElementById(frameId) as HTMLIFrameElement;
      
      if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = frameId;
        iframe.style.position = 'absolute';
        iframe.style.top = '-9999px';
        iframe.style.left = '-9999px';
        iframe.style.width = '0';
        iframe.style.height = '0';
        document.body.appendChild(iframe);
      }

      iframe.src = url;

      // Esperar a que el contenido esté totalmente cargado
      iframe.onload = () => {
        try {
          setTimeout(() => {
            if (!iframe.contentWindow) return;
            
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
            
            // Limpieza diferida para no interrumpir el spool
            setTimeout(() => {
              if (document.body.contains(iframe)) {
                document.body.removeChild(iframe);
              }
              URL.revokeObjectURL(url);
            }, 5000);
          }, 1000);
        } catch (e) {
          console.error("Print error inside iframe:", e);
          window.open(url, '_blank'); // Fallback si falla el iframe
        }
      };

      await logClientAction(project.id, "Documentación", "activó la impresión de la memoria técnica");
      
    } catch (e) {
      console.error(e);
      setAlertDialog({
        open: true,
        title: "Error de impresión",
        description: e instanceof Error ? e.message : "No se pudo generar el documento para imprimir."
      });
    } finally {
      setIsExporting(false);
    }
  };

  const fetchDriveFolders = async () => {
    setIsLoadingFolders(true);
    try {
      const res = await fetch("/api/export/google-drive/folders");
      
      if (res.status === 401 || res.status === 403) {
        const errorData = await res.json().catch(() => ({}));
        setAlertDialog({
          open: true,
          title: res.status === 401 ? "Cuenta no vinculada" : "Permisos faltantes",
          description: errorData.detail || "No hemos detectado una vinculación activa con Google Drive o faltan permisos. Por favor, asegúrate de haber iniciado sesión con Google y concedido permisos de Drive."
        });
        return;
      }

      if (!res.ok) throw new Error("Error al obtener carpetas de Drive");
      
      const data = await res.json();
      setDriveFolders(data.folders || []);
      setIsDriveModalOpen(true);
    } catch (e) {
      setAlertDialog({
        open: true,
        title: "Error de conexión",
        description: "No se pudo conectar con el servicio de Google Drive. Inténtalo de nuevo más tarde."
      });
    } finally {
      setIsLoadingFolders(false);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    setIsCreatingFolder(true);
    try {
      const res = await fetch("/api/export/google-drive/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newFolderName, parentId: "root" }),
      });
      if (!res.ok) throw new Error("Error al crear carpeta");
      const newFolder = await res.json();
      setDriveFolders([newFolder, ...driveFolders]);
      setSelectedFolderId(newFolder.id);
      setNewFolderName("");
      setShowNewFolderInput(false);
    } catch (e) {
      setAlertDialog({
        open: true,
        title: "Error al crear carpeta",
        description: "No se pudo crear la carpeta en Google Drive."
      });
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const handleDriveUpload = async () => {
    setIsExporting(true);
    setIsDriveModalOpen(false);
    try {
      const res = await fetch("/api/export/google-drive/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          projectId: project.id, 
          folderId: selectedFolderId === "root" ? null : selectedFolderId 
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error al subir a Drive");
      }
      
      await logClientAction(project.id, "Documentación", `subió el expediente a Google Drive`);
      setExportComplete(true);
    } catch (e) {
      setAlertDialog({
        open: true,
        title: "Error en Google Drive",
        description: e instanceof Error ? e.message : "Ocurrió un error al subir el archivo."
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-6rem)] flex flex-col space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-hidden">
      <header className="flex justify-between items-center shrink-0">
        <div className="flex items-center gap-4">
          <BackButton 
            variant="minimal" 
            className="p-2 hover:bg-white rounded-full border border-slate-200 transition-all shadow-sm" 
          />
          <div>
            <h1 className="text-2xl font-black text-slate-900">
              Finalizar Memoria
            </h1>
            <p className="text-slate-500 text-sm">
              Verificación y exportación de expediente
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Estado de Consolidación</p>
            <div className="flex items-center gap-3">
              <div className="w-32 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className={cn("h-full transition-all duration-1000", 
                    progressPercent === 100 ? "bg-emerald-500" : "bg-blue-500"
                  )}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="text-xs font-black text-slate-900">{progressPercent}%</span>
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch flex-1 min-h-0">
        <div className="lg:col-span-2 flex flex-col h-full min-h-0">
          {/* VISTA PREVIA */}
          <div className="bg-white border border-slate-200 rounded-[3rem] p-10 shadow-sm flex-1 flex flex-col relative group overflow-hidden min-h-0">
            <div className="absolute inset-0 rounded-[3rem] overflow-hidden pointer-events-none">
              <div className="absolute -right-10 -bottom-10 opacity-[0.02] group-hover:scale-110 transition-transform duration-1000">
                <FileText size={400} />
              </div>
            </div>

            <header className="flex justify-between items-center mb-10 relative z-10 shrink-0">
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner">
                  <Eye size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tighter leading-none uppercase">Vista Previa</h3>
                  <p className="text-[9px] font-black text-blue-600 uppercase tracking-[0.3em] mt-1.5 flex items-center gap-2">
                    <Sparkles size={10} className="animate-pulse" />
                    Memoria Técnica Generada
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <StyledTooltip content="Imprimir documento">
                  <button
                    type="button"
                    onClick={handlePrint}
                    disabled={isExporting || !hasContent}
                    className="p-3 hover:bg-white rounded-2xl text-slate-400 hover:text-slate-900 transition-all shadow-sm border border-transparent hover:border-slate-100 active:scale-95 disabled:opacity-50"
                  >
                    {isExporting ? <Loader2 size={20} className="animate-spin" /> : <Printer size={20} />}
                  </button>
                </StyledTooltip>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-12 bg-slate-50/30 rounded-[2rem] border border-slate-100 relative z-10 scrollbar-premium">
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
                {sections.length > 0 && hasContent ? (
                  sections.map((section) => (
                    <div key={section.id} className="space-y-4">
                      <h3 className="text-lg font-bold text-slate-900 font-sans border-l-4 border-blue-600 pl-4">
                        {section.title}
                      </h3>
                      <div className="text-slate-700 leading-relaxed text-justify text-sm whitespace-pre-wrap">
                        {section.content || (
                          <span className="text-slate-300 italic">Sección sin contenido redactado.</span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-20 text-center space-y-4">
                    <FileText size={48} className="text-slate-200 mx-auto" />
                    <p className="text-slate-400 text-sm italic">
                      No hay contenido redactado para exportar. 
                      Vuelve al espacio de trabajo para completar las secciones.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1 flex flex-col gap-6 h-full min-h-0">
          <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden flex flex-col justify-center flex-1 min-h-0">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Sparkles size={120} />
            </div>
            <div className="overflow-y-auto pr-2 scrollbar-premium flex-1 flex flex-col justify-center">
              <h3 className="text-xl font-bold mb-2">
                {maturity.label}
              </h3>
              {hasUnmarkedContent && (
                <p className="text-amber-400 text-[10px] mb-2 font-bold uppercase tracking-wider animate-pulse">
                  ⚠️ Hay secciones sin revisar
                </p>
              )}
              <p className="text-slate-400 text-sm mb-6 font-medium">
                {progressPercent === 100 
                  ? "El expediente cumple con todos los estándares técnicos para su presentación oficial."
                  : `Faltan ${totalSections - completedSections} secciones por validar.`}
              </p>
              <div className="space-y-4 mb-8">
                <div className="flex items-center gap-3 text-sm">
                  {totalSections > 0 ? (
                    <CheckCircle2 size={18} className="text-emerald-400" />
                  ) : (
                    <div className="w-[18px] h-[18px] rounded-full border border-slate-600" />
                  )}
                  <span>Estructura generada</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  {progressPercent > 50 ? (
                    <CheckCircle2 size={18} className="text-emerald-400" />
                  ) : (
                    <div className="w-[18px] h-[18px] rounded-full border border-slate-600" />
                  )}
                  <span>Contenido avanzado</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  {progressPercent === 100 ? (
                    <CheckCircle2 size={18} className="text-emerald-400" />
                  ) : (
                    <div className="w-[18px] h-[18px] rounded-full border border-slate-600" />
                  )}
                  <span>Requisitos verificados</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleExportPdf}
                disabled={isExporting || !hasContent}
                className="w-full py-4 bg-blue-600 hover:bg-blue-500 rounded-2xl font-black text-sm transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {isExporting ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <Zap fill="currentColor" size={16} />
                )}
                {isExporting ? "Generando Archivos…" : "Finalizar y Descargar PDF"}
              </button>
            </div>
          </div>

          <div className="space-y-3 flex-none">
            <ExportCard
              type=".docx"
              title="Microsoft Word"
              icon={FileText}
              onClick={handleExportDocx}
              tooltip="Descargar en formato editable .docx"
            />
            <ExportCard
              type=".pdf"
              title="Adobe PDF"
              icon={FileDown}
              onClick={handleExportPdf}
              tooltip="Descargar en formato final .pdf"
            />
            <ExportCard
              type="Drive"
              title="Google Drive"
              icon={Cloud}
              onClick={fetchDriveFolders}
              tooltip="Guardar directamente en tu Google Drive"
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

      <ConfirmDialog 
        open={alertDialog.open}
        onOpenChange={(open: boolean) => setAlertDialog({...alertDialog, open})}
        title={alertDialog.title}
        description={alertDialog.description}
        confirmText="Entendido"
        showCancel={false}
        variant="danger"
        onConfirm={() => setAlertDialog({...alertDialog, open: false})}
      />

      <ConfirmDialog 
        open={isDriveModalOpen}
        onOpenChange={setIsDriveModalOpen}
        title="SUBIR A GOOGLE DRIVE"
        description="Selecciona la carpeta de destino para guardar la memoria técnica."
        confirmText={isExporting ? "Subiendo..." : "Subir ahora"}
        variant="info"
        onConfirm={handleDriveUpload}
      >
        <div className="mt-6 space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center px-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Carpeta de Destino</label>
              <button 
                onClick={() => setShowNewFolderInput(!showNewFolderInput)}
                className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-700 transition-colors flex items-center gap-1"
              >
                <Plus size={10} /> {showNewFolderInput ? "Cancelar" : "Nueva Carpeta"}
              </button>
            </div>
            
            {showNewFolderInput ? (
              <div className="flex gap-2 animate-in slide-in-from-top-2">
                <input 
                  autoFocus
                  type="text"
                  placeholder="Nombre de la carpeta..."
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="flex-1 px-4 py-3 bg-white border border-blue-100 rounded-xl text-sm font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all"
                />
                <button
                  onClick={handleCreateFolder}
                  disabled={isCreatingFolder || !newFolderName.trim()}
                  className="px-4 py-3 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all disabled:opacity-50"
                >
                  {isCreatingFolder ? <Loader2 size={14} className="animate-spin" /> : "Crear"}
                </button>
              </div>
            ) : (
              <PremiumSelector 
                icon={FolderOpen}
                value={selectedFolderId}
                onChange={setSelectedFolderId}
                options={[
                  { value: "root", label: "Mi Unidad (Raíz)" },
                  ...driveFolders.map(f => ({ value: f.id, label: f.name }))
                ]}
              />
            )}
          </div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center">
            Se generará un archivo PDF con la versión actual
          </p>
        </div>
      </ConfirmDialog>
    </div>
  );
}
