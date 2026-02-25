"use client";

import { useState, Suspense, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Zap, Chrome, Mail, Lock, Loader2, ShieldCheck, KeyRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import * as Label from "@radix-ui/react-label";
import { cn } from "@/lib/utils";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMfa, setShowMfa] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/dashboard";
  const supabase = createClient();

  useEffect(() => {
    const err = searchParams.get("error");
    if (err) setError(decodeURIComponent(err));

    const needsMfa = searchParams.get("mfa") === "true";
    if (needsMfa) {
      const checkMfa = async () => {
        const { data: factors } = await supabase.auth.mfa.listFactors();
        const activeFactor = factors?.all.find((f) => f.status === "verified");
        if (activeFactor) {
          setFactorId(activeFactor.id);
          setShowMfa(true);
        }
      };
      void checkMfa();
    }
  }, [searchParams, supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { data, error: err } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }

    const { data: factors, error: mfaError } = await supabase.auth.mfa.listFactors();

    if (mfaError) {
      setError(mfaError.message);
      setLoading(false);
      return;
    }

    const activeFactor = factors.all.find(f => f.status === 'verified');

    if (activeFactor) {
      setFactorId(activeFactor.id);
      setShowMfa(true);
      setLoading(false);
    } else {
      router.push(redirect);
      router.refresh();
    }
  }

  async function handleMfaVerify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: factorId! });

    if (challengeError) {
      setError(challengeError.message);
      setLoading(false);
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: factorId!,
      challengeId: challenge.id,
      code: mfaCode
    });

    if (verifyError) {
      setError(verifyError.message);
      setLoading(false);
    } else {
      // Limpiamos el estado sensible de MFA tras una verificación correcta
      setMfaCode("");
      setFactorId(null);
      setShowMfa(false);
      setLoading(false);
      router.push(redirect);
      router.refresh();
    }
  }

  async function handleGoogleLogin() {
    setGoogleLoading(true);
    setError(null);

    // La verificación real ocurre server-side en /auth/callback
    // Si el email de Google no fue invitado previamente, el callback lo rechazará y limpiará.
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?redirect=${redirect}`,
        queryParams: {
          ...(email ? { login_hint: email } : {}),
          prompt: 'select_account',
          access_type: 'offline',
        },
        scopes: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.metadata.readonly'
      },
    });

    if (err) {
      setError(err.message);
      setGoogleLoading(false);
    }
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
      <div className="w-full max-w-sm space-y-8 animate-in fade-in duration-700">
        <div className="text-center">
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter">
            {showMfa ? "Verificación" : "Bienvenido"}
          </h1>
          <p className="text-slate-500 text-sm mt-2 font-medium">
            {showMfa ? "Introduce tu código de seguridad" : "Accede a tu plataforma de divulgación e IA"}
          </p>
        </div>

        <div className="space-y-4">
          {!showMfa ? (
            <>
              <button
                onClick={handleGoogleLogin}
                disabled={googleLoading || loading}
                className="w-full py-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center gap-3 font-bold text-slate-700 hover:bg-slate-50 transition-all active:scale-95 disabled:opacity-60"
              >
                {googleLoading ? <Loader2 className="animate-spin" size={20} /> : <Chrome size={20} className="text-blue-500" />}
                Continuar con Google
              </button>

              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-slate-100"></div>
                <span className="flex-shrink mx-4 text-[10px] font-black text-slate-300 uppercase tracking-widest">O con tu email</span>
                <div className="flex-grow border-t border-slate-100"></div>
              </div>

              <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-xl space-y-6">
                {error && (
                  <div className="p-4 rounded-2xl bg-red-50 border border-red-100 text-red-700 text-xs font-bold animate-in slide-in-from-top-2">
                    {error}
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label.Root htmlFor="email" className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Email</Label.Root>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input
                      id="email" type="email" value={email}
                      onChange={(e) => setEmail(e.target.value)} required
                      className="w-full pl-12 pr-6 py-4 rounded-2xl border border-slate-200 bg-slate-50/50 font-bold text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all"
                      placeholder="tu@email.com"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center px-1">
                    <Label.Root htmlFor="password" className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contraseña</Label.Root>
                    <Link href="/forgot-password" className="text-[10px] font-black text-blue-600 hover:text-blue-800 transition-colors uppercase tracking-widest">¿Olvidaste tu clave?</Link>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input
                      id="password" type="password" value={password}
                      onChange={(e) => setPassword(e.target.value)} required
                      className="w-full pl-12 pr-6 py-4 rounded-2xl border border-slate-200 bg-slate-50/50 font-bold text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
                <button
                  type="submit" disabled={loading || googleLoading}
                  className="w-full py-5 rounded-2xl font-black text-[11px] uppercase tracking-widest text-white bg-slate-900 hover:bg-blue-600 shadow-xl transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-3"
                >
                  {loading ? <Loader2 className="animate-spin" size={18} /> : null}
                  {loading ? "Entrando…" : "Iniciar Sesión"}
                </button>
              </form>
            </>
          ) : (
            <form onSubmit={handleMfaVerify} className="bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-xl space-y-6 animate-in zoom-in-95 duration-500">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner">
                  <ShieldCheck size={32} />
                </div>
              </div>

              <div className="space-y-2">
                <Label.Root className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 block text-center">Código TOTP</Label.Root>
                <input
                  autoFocus
                  type="text"
                  maxLength={6}
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                  placeholder="000000"
                  className="w-full py-4 rounded-2xl border border-slate-200 bg-slate-50/50 font-black text-xl tracking-[0.5em] text-center focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all"
                />
              </div>

              {error && <div className="p-4 rounded-2xl bg-red-50 border border-red-100 text-red-700 text-xs font-bold">{error}</div>}

              <button
                type="submit"
                disabled={loading || mfaCode.length < 6}
                className="w-full py-5 rounded-2xl font-black text-[11px] uppercase tracking-widest text-white bg-blue-600 hover:bg-blue-700 shadow-xl transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-3"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : <KeyRound size={18} />}
                Verificar Código
              </button>

              <button
                type="button"
                onClick={() => setShowMfa(false)}
                className="w-full text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600"
              >
                Volver al login
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]"><div className="animate-pulse text-slate-400">Cargando…</div></div>}>
      <LoginForm />
    </Suspense>
  );
}
