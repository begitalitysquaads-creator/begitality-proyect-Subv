"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { Zap, Mail, CheckCircle2, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import * as Label from "@radix-ui/react-label";
import { cn } from "@/lib/utils";

function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/update-password`,
    });

    setLoading(false);

    if (err) {
      if (err.message.includes("rate limit")) {
        setError("Has solicitado demasiados correos. Por favor, espera un minuto.");
      } else {
        setError(err.message);
      }
      return;
    }

    setSuccess(true);
  }

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC] px-4">
        <div className="w-full max-w-sm bg-white border border-slate-200 rounded-3xl p-8 shadow-sm text-center space-y-4">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} />
          </div>
          <h2 className="text-xl font-black text-slate-900">¡Correo Enviado!</h2>
          <p className="text-slate-500 text-sm leading-relaxed">
            Hemos enviado las instrucciones para restablecer tu contraseña a <strong>{email}</strong>.
          </p>
          <div className="pt-4">
             <Link
              href="/login"
              className="text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors"
            >
              Volver a Iniciar Sesión
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC] px-4">
      <Link
        href="/login"
        className="absolute top-8 left-8 flex items-center gap-2 text-slate-500 hover:text-slate-900 font-bold text-sm group"
      >
        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
        Volver
      </Link>
      
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
               <Zap size={24} />
            </div>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tighter">
            Recuperar Contraseña
          </h1>
          <p className="text-slate-500 text-sm mt-2">
            Introduce tu email para recibir el enlace de recuperación
          </p>
        </div>
        <form
          onSubmit={handleSubmit}
          className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm space-y-6"
        >
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm">
              {error}
            </div>
          )}
          
          <div className="space-y-2">
            <Label.Root
              htmlFor="email"
              className="text-sm font-bold text-slate-700"
            >
              Email Registrado
            </Label.Root>
            <div className="relative">
              <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={cn(
                  "w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50",
                  "focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                )}
                placeholder="tu@email.com"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-60 transition-all uppercase tracking-wide text-xs shadow-lg shadow-blue-600/20"
          >
            {loading ? "Enviando..." : "Enviar Enlace de Recuperación"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="animate-pulse text-slate-400">Cargando...</div>
      </div>
    }>
      <ForgotPasswordForm />
    </Suspense>
  );
}
