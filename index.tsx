import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  FileText,
  PlusCircle,
  ChevronRight,
  Zap,
  Briefcase,
  ArrowLeft,
  CheckCircle2,
  Download,
  FileDown,
  ExternalLink,
  Eye,
  ShieldCheck,
  Printer,
  Sparkles,
  Wand2,
  Loader2,
} from 'lucide-react';

// --- Tipos y Mock Data Consolidados ---
interface Section {
  id: string;
  title: string;
  content: string;
  isCompleted: boolean;
}

interface Project {
  id: string;
  name: string;
  grant_name: string;
  sections: Section[];
}

const CURRENT_PROJECT: Project = {
  id: 'p-101',
  name: 'Begitality AI Expansion',
  grant_name: 'ICEX Next - Convocatoria 2024',
  sections: [
    {
      id: '1',
      title: 'Resumen Ejecutivo',
      content:
        'Este proyecto busca democratizar el acceso a subvenciones públicas mediante el uso de inteligencia artificial generativa de contexto profundo...',
      isCompleted: true,
    },
    {
      id: '2',
      title: 'Capacidad Técnica y Equipo',
      content:
        'El equipo de Squaads cuenta con más de 10 años de experiencia en el sector tecnológico, habiendo liderado proyectos de escala internacional en el ámbito de la IA...',
      isCompleted: true,
    },
    {
      id: '3',
      title: 'Plan de Internacionalización',
      content:
        'Nuestra estrategia se centra en el mercado europeo y latinoamericano, aprovechando las sinergias de red y el bajo coste de escalabilidad de nuestra plataforma SaaS...',
      isCompleted: true,
    },
    {
      id: '4',
      title: 'Presupuesto y Viabilidad',
      content:
        'Se estima una inversión inicial de 150.000€, de los cuales el 70% se destinará a I+D y el 30% restante a estrategias de Go-to-Market...',
      isCompleted: true,
    },
  ],
};

// --- Componentes de UI Refinados ---

const ExportCard = ({ type, title, icon: Icon, onClick }: any) => (
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

// --- Pantalla de Finalización y Exportación ---

const ExportView = ({
  project,
  onBack,
}: {
  project: Project;
  onBack: () => void;
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);

  const handleExport = () => {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      setExportComplete(true);
    }, 2500);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-white rounded-full border border-slate-200 transition-all"
          >
            <ArrowLeft size={20} />
          </button>
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
        {/* Previsualización del Documento */}
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
                <button className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-slate-600">
                  <Eye size={18} />
                </button>
                <button className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-slate-600">
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
                  <div className="w-20 h-1 bg-blue-600 mx-auto rounded-full"></div>
                  <p className="text-slate-500 text-sm font-sans font-bold">
                    {project.grant_name}
                  </p>
                </div>

                {project.sections.map((section) => (
                  <div key={section.id} className="space-y-4">
                    <h3 className="text-lg font-bold text-slate-900 font-sans border-l-4 border-blue-600 pl-4">
                      {section.title}
                    </h3>
                    <p className="text-slate-700 leading-relaxed text-justify text-sm">
                      {section.content}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Panel de Exportación */}
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
                <span>Contexto ICEX integrado</span>
              </div>
            </div>

            <button
              onClick={handleExport}
              disabled={isExporting}
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 rounded-2xl font-black text-sm transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
            >
              {isExporting ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Zap fill="currentColor" size={16} />
              )}
              {isExporting ? 'Generando Archivos...' : 'Finalizar y Descargar'}
            </button>
          </div>

          <div className="space-y-3">
            <ExportCard
              type=".docx"
              title="Microsoft Word"
              icon={FileText}
              onClick={handleExport}
            />
            <ExportCard
              type=".pdf"
              title="Adobe PDF"
              icon={FileDown}
              onClick={handleExport}
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
};

// --- App Root ---

export default function App() {
  const [view, setView] = useState<'dashboard' | 'workspace' | 'export'>(
    'dashboard',
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-sans selection:bg-blue-100">
      {/* Sidebar - Estilo Squaads High-End */}
      <aside className="w-64 border-r border-slate-200 bg-white/80 backdrop-blur-md flex flex-col fixed h-screen z-10">
        <div className="p-8 flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
            <Zap size={24} fill="currentColor" />
          </div>
          <span className="font-black text-2xl tracking-tighter text-slate-900">
            Begitality
          </span>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Panel' },
            { id: 'projects', icon: FileText, label: 'Proyectos' },
            { id: 'success', icon: Briefcase, label: 'Histórico' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setView('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all font-bold text-sm ${
                view === 'dashboard' && item.id === 'dashboard'
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-slate-400 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <item.icon size={20} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-6">
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
              Tu Plan
            </p>
            <p className="text-sm font-bold text-slate-900">
              Senior Consultant
            </p>
            <div className="mt-2 h-1 w-full bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-blue-600 w-3/4"></div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 ml-64 p-12 min-h-screen">
        {view === 'dashboard' && (
          <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in duration-700">
            <header className="flex justify-between items-end">
              <div>
                <h1 className="text-5xl font-black text-slate-900 tracking-tighter">
                  Hola, Consultor
                </h1>
                <p className="text-slate-500 font-medium mt-2 text-lg">
                  Tienes una memoria lista para exportar.
                </p>
              </div>
              <button className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-blue-600 transition-all shadow-sm">
                <PlusCircle size={24} />
              </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div
                onClick={() => setView('export')}
                className="group relative bg-white border border-slate-200 p-8 rounded-[2.5rem] shadow-sm hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-2 transition-all cursor-pointer overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700 opacity-50"></div>
                <div className="relative">
                  <div className="flex justify-between items-start mb-12">
                    <div className="p-4 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-600/30 group-hover:rotate-12 transition-transform">
                      <FileText size={32} />
                    </div>
                    <span className="bg-emerald-100 text-emerald-700 text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest">
                      Listo para Envío
                    </span>
                  </div>
                  <h3 className="text-3xl font-black text-slate-900 mb-2 leading-tight">
                    Begitality AI Expansion
                  </h3>
                  <p className="text-slate-400 font-bold text-sm uppercase tracking-wider mb-6">
                    ICEX Next - 2024
                  </p>

                  <div className="flex items-center justify-between">
                    <div className="flex -space-x-2">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500"
                        >
                          AI
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 text-blue-600 font-black text-sm">
                      Revisar y Exportar <ChevronRight size={16} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-2 border-dashed border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center text-slate-400 group hover:border-blue-400 hover:bg-white transition-all cursor-pointer">
                <div className="p-4 bg-slate-50 rounded-full group-hover:bg-blue-50 group-hover:text-blue-600 transition-all">
                  <Wand2 size={40} />
                </div>
                <span className="mt-4 font-bold">Crear nueva memoria</span>
              </div>
            </div>
          </div>
        )}

        {view === 'export' && (
          <ExportView
            project={CURRENT_PROJECT}
            onBack={() => setView('dashboard')}
          />
        )}
      </main>
    </div>
  );
}
