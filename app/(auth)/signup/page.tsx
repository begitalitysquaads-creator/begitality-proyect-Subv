"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Zap } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import * as Label from "@radix-ui/react-label";
import { cn } from "@/lib/utils";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error: err } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${typeof window !== "undefined" ? window.location.origin : ""}/auth/callback`,
      },
    });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    setSuccess(true);
    setTimeout(() => router.push("/dashboard"), 2000);
    router.refresh();
  }

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC] px-4">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-sm text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4 text-2xl">
            ✓
          </div>
          <h2 className="text-xl font-bold text-slate-900">Cuenta creada</h2>
          <p className="text-slate-500 text-sm mt-2">
            Revisa tu email para confirmar. Redirigiendo al panel…
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
            Crear cuenta
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Empieza a gestionar tus subvenciones con IA
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
              htmlFor="fullName"
              className="text-sm font-bold text-slate-700"
            >
              Nombre
            </Label.Root>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={cn(
                "w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50",
                "focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              )}
              placeholder="Tu nombre"
            />
          </div>
          <div className="space-y-2">
            <Label.Root
              htmlFor="email"
              className="text-sm font-bold text-slate-700"
            >
              Email
            </Label.Root>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={cn(
                "w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50",
                "focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              )}
              placeholder="tu@email.com"
            />
          </div>
          <div className="space-y-2">
            <Label.Root
              htmlFor="password"
              className="text-sm font-bold text-slate-700"
            >
              Contraseña
            </Label.Root>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className={cn(
                "w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50",
                "focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              )}
              placeholder="Mínimo 6 caracteres"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-60 transition-all"
          >
            {loading ? "Creando cuenta…" : "Registrarse"}
          </button>
        </form>
        <p className="text-center text-slate-500 text-sm mt-6">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="font-bold text-blue-600 hover:underline">
            Iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
