"use client";

import Link from "next/link";
import { Zap, ShieldAlert, ArrowLeft, Mail } from "lucide-react";

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC] px-4">
      <div className="w-full max-w-md space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-amber-50 text-amber-600 rounded-[2rem] flex items-center justify-center mx-auto shadow-inner border border-amber-100">
            <ShieldAlert size={40} />
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Acceso Restringido</h1>
          <p className="text-slate-500 font-medium max-w-xs mx-auto">
            Begitality es una plataforma privada. El acceso es exclusivo mediante <span className="text-slate-900 font-bold">invitación directa</span> del equipo administrador.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-[3rem] p-10 shadow-xl space-y-6 text-center">
          <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
            <Mail className="mx-auto text-slate-400" size={24} />
            <p className="text-xs font-bold text-slate-600 leading-relaxed">
              Si has sido dado de alta, revisa tu bandeja de entrada para encontrar el enlace de activación.
            </p>
          </div>
          
          <Link 
            href="/login" 
            className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl hover:bg-blue-600 transition-all flex items-center justify-center gap-2"
          >
            <ArrowLeft size={16} /> Volver al Login
          </Link>
        </div>

        <p className="text-center text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">
          Begitality Identity Guard • 2026
        </p>
      </div>
    </div>
  );
}
