"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  ShieldCheck, ShieldAlert, Loader2, CheckCircle2, QrCode,
  Smartphone, AlertCircle, Copy, Check, Fingerprint, Lock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

export function MFAConfiguration() {
  const [factors, setFactors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secretCode, setSecretCode] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [unenrollId, setUnenrollId] = useState<string | null>(null);

  const supabase = createClient();

  const loadMFAFactors = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      setFactors(data.all || []);
    } catch (err: any) {
      console.error("MFA List error:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadMFAFactors();
  }, [loadMFAFactors]);

  async function startEnrollment() {
    if (enrolling) return;
    setError(null);
    setEnrolling(true);

    try {
      // 1. Limpieza de factores pendientes (Evita error 422)
      const { data: currentFactors } = await supabase.auth.mfa.listFactors();
      const unverified = currentFactors?.all.filter(f => f.status === 'unverified');
      if (unverified && unverified.length > 0) {
        for (const f of unverified) {
          await supabase.auth.mfa.unenroll({ factorId: f.id });
        }
      }

      // 2. Nuevo enrolamiento
      const { data, error: enrollError } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
      if (enrollError) throw enrollError;

      if (data?.totp) {
        setQrCode(data.totp.qr_code);
        setSecretCode(data.totp.secret);
        setFactorId(data.id);
      }
    } catch (err: any) {
      setError(err.message || "Error al iniciar configuración.");
    } finally {
      setEnrolling(false);
    }
  }

  async function verifyAndActivate() {
    if (!verifyCode || verifyCode.length < 6 || verifying) return;
    setVerifying(true);
    setError(null);
    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: factorId! });
      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: factorId!,
        challengeId: challengeData.id,
        code: verifyCode.trim()
      });
      if (verifyError) throw verifyError;

      setQrCode(null);
      setSecretCode(null);
      setFactorId(null);
      setVerifyCode("");
      await loadMFAFactors();
    } catch (err: any) {
      setError(err.message || "Código incorrecto.");
    } finally {
      setVerifying(false);
    }
  }

  const copyToClipboard = () => {
    if (secretCode) {
      navigator.clipboard.writeText(secretCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  async function handleUnenroll() {
    if (!unenrollId) return;
    setLoading(true);
    setIsConfirmOpen(false);
    try {
      await supabase.auth.mfa.unenroll({ factorId: unenrollId });
      await loadMFAFactors();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUnenrollId(null);
      setLoading(false);
    }
  }

  function cancelEnrollment() {
    setQrCode(null);
    setSecretCode(null);
    setFactorId(null);
    setError(null);
    setVerifyCode("");
  }

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-blue-600" size={32} /></div>;

  const activeFactor = factors.find(f => f.status === 'verified');

  // ─── ESTADO: 2FA ACTIVA ─────────────────────────────────────────────
  if (activeFactor) {
    return (
      <>
        <ConfirmDialog
          open={isConfirmOpen} onOpenChange={setIsConfirmOpen}
          title="Desactivar 2FA" description="Esta acción reducirá la seguridad de tu cuenta. No podrás revertir esta acción sin volver a configurar el doble factor."
          confirmText="Desactivar" variant="danger" onConfirm={handleUnenroll}
        />
        <div className="bg-slate-50 border border-slate-100 rounded-[2rem] p-8 animate-in fade-in duration-500">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-600/20">
                <ShieldCheck size={28} />
              </div>
              <div>
                <h4 className="text-base font-black text-slate-900 tracking-tight">Protección 2FA Activa</h4>
                <p className="text-[9px] font-black text-emerald-600 uppercase tracking-[0.3em] mt-1">
                  Autenticación de doble factor verificada
                </p>
              </div>
            </div>
            <button
              onClick={() => { setUnenrollId(activeFactor.id); setIsConfirmOpen(true); }}
              className="px-6 py-3 bg-white border border-red-100 text-red-500 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-50 hover:border-red-200 transition-all shadow-sm"
            >
              Desactivar
            </button>
          </div>
        </div>
      </>
    );
  }

  // ─── ESTADO: SIN 2FA (CONFIGURACIÓN) ────────────────────────────────
  return (
    <div className="animate-in fade-in duration-500">
      {!qrCode ? (
        /* ── Prompt inicial para activar 2FA ── */
        <div className="bg-slate-50 border border-slate-100 rounded-[2rem] p-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-amber-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20">
                <ShieldAlert size={28} />
              </div>
              <div>
                <h4 className="text-base font-black text-slate-900 tracking-tight">Protección Adicional Recomendada</h4>
                <p className="text-[9px] font-black text-amber-600 uppercase tracking-[0.3em] mt-1">
                  Activa el doble factor para mayor seguridad
                </p>
              </div>
            </div>
            <button
              onClick={startEnrollment}
              disabled={enrolling}
              className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-all flex items-center gap-3 shadow-xl disabled:opacity-50"
            >
              {enrolling ? <Loader2 className="animate-spin" size={16} /> : <QrCode size={16} />}
              {enrolling ? "Iniciando..." : "Configurar 2FA"}
            </button>
          </div>

          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-2">
              <AlertCircle className="text-red-500 shrink-0" size={16} />
              <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider">{error}</p>
            </div>
          )}
        </div>
      ) : (
        /* ── Flujo de verificación QR ── */
        <div className="space-y-8 animate-in zoom-in-95 duration-500">
          {/* ── Paso 1: Escanear ── */}
          <div className="bg-slate-50 border border-slate-100 rounded-[2rem] p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center text-xs font-black shadow-sm">1</div>
              <h5 className="text-sm font-black text-slate-900 uppercase tracking-widest">Escanea el código QR</h5>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              {/* QR Code */}
              <div className="flex justify-center">
                <div className="bg-white p-5 rounded-[2rem] shadow-md border border-slate-100 ring-8 ring-blue-500/5 inline-flex items-center justify-center">
                  <img
                    src={qrCode}
                    alt="Código QR para autenticación 2FA"
                    width={180}
                    height={180}
                    className="rounded-xl"
                  />
                </div>
              </div>

              {/* Instrucciones + Clave manual */}
              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Smartphone className="text-blue-600 shrink-0" size={20} />
                    <p className="text-sm font-bold text-slate-700 leading-relaxed">
                      Abre <span className="text-blue-600">Google Authenticator</span> u otra app compatible y escanea este código.
                    </p>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">
                    Clave de configuración manual
                  </p>
                  <div className="flex items-center justify-between gap-3 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl">
                    <span className="text-xs font-mono font-black text-blue-600 tracking-wider truncate select-all">
                      {secretCode}
                    </span>
                    <button
                      onClick={copyToClipboard}
                      className="text-slate-400 hover:text-blue-600 transition-colors shrink-0"
                      title="Copiar clave"
                    >
                      {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Paso 2: Verificar ── */}
          <div className="bg-slate-50 border border-slate-100 rounded-[2rem] p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center text-xs font-black shadow-sm">2</div>
              <h5 className="text-sm font-black text-slate-900 uppercase tracking-widest">Verifica tu código</h5>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
              {/* Input */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                  Código de 6 dígitos de tu app
                </label>
                <div className="relative group">
                  <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={20} />
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={verifyCode}
                    onChange={e => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="w-full pl-14 pr-6 py-5 bg-white border border-slate-200 rounded-2xl text-2xl font-black tracking-[0.5em] text-center focus:ring-8 focus:ring-blue-500/5 focus:border-blue-600 transition-all outline-none"
                  />
                </div>
              </div>

              {/* Botones */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={verifyAndActivate}
                  disabled={verifying || verifyCode.length < 6}
                  className="flex-grow py-5 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-blue-600 shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {verifying ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
                  {verifying ? "Activando..." : "Confirmar"}
                </button>
                <button
                  onClick={cancelEnrollment}
                  className="py-5 px-6 bg-white border border-slate-200 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:text-slate-600 hover:border-slate-300 transition-all active:scale-95"
                >
                  Cancelar
                </button>
              </div>
            </div>

            {error && (
              <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-2">
                <AlertCircle className="text-red-500 shrink-0" size={16} />
                <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider">{error}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
