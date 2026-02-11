import Link from "next/link";
import { Zap } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC] px-4">
      <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-600/20 mb-8">
        <Zap size={32} fill="currentColor" />
      </div>
      <h1 className="text-4xl font-black text-slate-900 tracking-tighter text-center mb-2">
        Begitality
      </h1>
      <p className="text-slate-500 text-center max-w-md mb-10">
        Plataforma inteligente de gestión de subvenciones. Redacta memorias
        técnicas con IA que no pierde el contexto.
      </p>
      <div className="flex gap-4">
        <Link
          href="/login"
          className="px-6 py-3 rounded-2xl font-bold text-slate-600 hover:text-slate-900 hover:bg-white border border-slate-200 transition-all"
        >
          Iniciar sesión
        </Link>
        <Link
          href="/signup"
          className="px-6 py-3 rounded-2xl font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-600/20 transition-all"
        >
          Registrarse
        </Link>
      </div>
    </div>
  );
}
