"use client";

import { useState, Suspense, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Zap, Lock, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import * as Label from "@radix-ui/react-label";
import { cn } from "@/lib/utils";

function UpdatePasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setLoading(false);
      setError(userError?.message ?? "No se pudo obtener el usuario actual.");
      return;
    }

    const { error: err } = await supabase.auth.updateUser({
      password,
    });

    if (err) {
      setLoading(false);
      setError(err.message);
      return;
    }

    // Tras establecer contraseña, marcamos el perfil como ACTIVO/VERIFICADO
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ is_active: true })
      .eq("id", user.id);

    if (profileError) {
      console.error("Error al activar perfil:", profileError);
    }

    setLoading(false);
    setSuccess(true);
    // Redirigir al dashboard tras breve pausa
    setTimeout(() => {
      router.push("/dashboard");
      router.refresh();
    }, 2000);
  }

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC] px-4">
        <div className="w-full max-w-sm bg-white border border-slate-200 rounded-3xl p-8 shadow-sm text-center space-y-4">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} />
          </div>
          <h2 className="text-xl font-black text-slate-900">¡Contraseña Actualizada!</h2>
          <p className="text-slate-500 text-sm">
            Has configurado tu acceso correctamente. Redirigiendo al panel...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC] px-4">
      <Link
        href="/"
        className="absolute top-8 left-8 flex items-center gap-2 text-slate-500 hover:text-slate-900 font-bold text-sm"
      >
        <Zap size={20} className="text-blue-600" />
        Begitality
      </Link>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black text-slate-900 tracking-tighter">
            Configurar Acceso
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Establece tu nueva contraseña segura
          </p>
        </div>
        <form
          onSubmit={handleSubmit}
          className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm space-y-5"
        >
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm">
              {error}
            </div>
          )}
          
          <div className="space-y-2">
            <Label.Root
              htmlFor="password"
              className="text-sm font-bold text-slate-700"
            >
              Nueva Contraseña
            </Label.Root>
            <div className="relative">
              <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className={cn(
                  "w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50",
                  "focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                )}
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label.Root
              htmlFor="confirmPassword"
              className="text-sm font-bold text-slate-700"
            >
              Confirmar Contraseña
            </Label.Root>
            <div className="relative">
              <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className={cn(
                  "w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50",
                  "focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                )}
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl font-bold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-60 transition-all uppercase tracking-wide text-xs shadow-lg shadow-slate-900/20"
          >
            {loading ? "Guardando..." : "Establecer Contraseña"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function UpdatePasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="animate-pulse text-slate-400">Cargando...</div>
      </div>
    }>
      <UpdatePasswordForm />
    </Suspense>
  );
}
