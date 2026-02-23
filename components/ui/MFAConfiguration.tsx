"use client";

import { useState, useEffect, Component, ReactNode, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { ShieldCheck, ShieldAlert, Loader2, KeyRound, CheckCircle2, QrCode, Smartphone, X, AlertCircle, Copy, Check } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

class QRCodeErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="w-[200px] h-[200px] flex flex-col items-center justify-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 p-6 text-center">
          <QrCode className="text-slate-300 mb-2" size={32} />
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Error de renderizado. Usa el código manual inferior.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

export function MFAConfiguration() {
  const [factors, setFactors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrUri, setQrUri] = useState<string | null>(null);
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
      // SOLUCIÓN AL ERROR 422:
      // 1. Revisamos si hay factores 'unverified' que estén bloqueando el nuevo enrolamiento
      const { data: currentFactors } = await supabase.auth.mfa.listFactors();
      const unverified = currentFactors?.all.filter(f => f.status === 'unverified');

      // 2. Si existen, los eliminamos para limpiar el canal
      if (unverified && unverified.length > 0) {
        for (const f of unverified) {
          await supabase.auth.mfa.unenroll({ factorId: f.id });
        }
      }

      // 3. Ahora intentamos el enrolamiento limpio
      const { data, error: enrollError } = await supabase.auth.mfa.enroll({ factorType: 'totp' });

      if (enrollError) {
        if (enrollError.message.includes("not enabled")) {
          throw new Error("MFA no está activado en el Dashboard de Supabase. Actívalo en Settings > Auth.");
        }
        throw enrollError;
      }

      if (data?.totp) {
        setQrCode(data.totp.qr_code);
        setQrUri(data.totp.uri);
        setSecretCode(data.totp.secret);
        setFactorId(data.id);
      }
    } catch (err: any) {
      setError(err.message || "Error al iniciar el proceso de seguridad.");
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
      setQrUri(null);
      setSecretCode(null);
      setFactorId(null);
      setVerifyCode("");
      await loadMFAFactors();
    } catch (err: any) {
      setError(err.message || "Código incorrecto. Revisa tu aplicación.");
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
      const { error } = await supabase.auth.mfa.unenroll({ factorId: unenrollId });
      if (error) throw error;
      await loadMFAFactors();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUnenrollId(null);
      setLoading(false);
    }
  }

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-blue-600" size={32} /></div>;

  const activeFactor = factors.find(f => f.status === 'verified');

  return (
    <div className="space-y-6">
      <ConfirmDialog
        open={isConfirmOpen} onOpenChange={setIsConfirmOpen}
        title="Desactivar 2FA" description="¿Confirmas la desactivación de la seguridad?"
        confirmText="Desactivar" variant="danger" onConfirm={handleUnenroll}
      />

      {activeFactor ? (
        <div className="bg-emerald-50 border border-emerald-100 rounded-[2rem] p-8 flex items-center justify-between animate-in fade-in shadow-sm">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-lg"><ShieldCheck size={32} /></div>
            <div>
              <h4 className="text-lg font-black text-slate-900 tracking-tight">Protección 2FA Activa</h4>
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mt-1">Tu cuenta está blindada</p>
            </div>
          </div>
          <button onClick={() => { setUnenrollId(activeFactor.id); setIsConfirmOpen(true); }} className="px-6 py-3 bg-white border border-red-100 text-red-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-50 transition-all shadow-sm active:scale-95">Desactivar</button>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-100 rounded-[2rem] p-8 space-y-6 animate-in fade-in">
          {!qrCode ? (
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-amber-500 text-white rounded-2xl flex items-center justify-center shadow-lg"><ShieldAlert size={32} /></div>
                <div className="max-w-md">
                  <h4 className="text-lg font-black text-slate-900 tracking-tight">Seguridad Adicional</h4>
                  <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mt-1">Activa TOTP para proteger tus datos de expedientes</p>
                </div>
              </div>
              <button onClick={startEnrollment} disabled={enrolling} className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-all flex items-center gap-2 shadow-xl active:scale-95 disabled:opacity-50">
                {enrolling ? <Loader2 className="animate-spin" size={16} /> : <QrCode size={16} />}
                {enrolling ? "Limpiando sesión..." : "Configurar 2FA"}
              </button>
            </div>
          ) : (
            <div className="space-y-10 py-2 animate-in zoom-in-95">
              <div className="flex flex-col lg:flex-row gap-12 items-start">
                <div className="space-y-6 shrink-0 mx-auto lg:mx-0">
                  <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-slate-100 ring-8 ring-blue-500/5">
                    {qrUri ? (
                      <QRCodeErrorBoundary>
                        <QRCodeCanvas value={qrUri} size={180} level="L" includeMargin={false} />
                      </QRCodeErrorBoundary>
                    ) : qrCode ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={qrCode} alt="QR Code" width={180} height={180} className="rounded-xl" />
                    ) : null}
                  </div>
                  <div className="bg-white/50 border border-slate-200 rounded-2xl p-4 space-y-2">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center px-2">¿Problemas con el QR?</p>
                    <button onClick={copyToClipboard} className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-white border border-slate-100 rounded-xl hover:border-blue-300 transition-all group">
                      <span className="text-[11px] font-mono font-black text-blue-600 tracking-wider truncate max-w-[120px]">{secretCode}</span>
                      {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} className="text-slate-300 group-hover:text-blue-500" />}
                    </button>
                  </div>
                </div>

                <div className="flex-grow space-y-8 w-full">
                  <div className="space-y-2">
                    <h5 className="font-black text-slate-900 text-2xl tracking-tighter uppercase flex items-center gap-3"><Smartphone className="text-blue-600" /> Sincroniza tu app</h5>
                    <p className="text-sm text-slate-500 font-medium leading-relaxed">Escanea el código o inserta la clave manual en tu app de seguridad (Google Authenticator, Microsoft Auth, etc).</p>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Código de 6 dígitos</label>
                    <input type="text" maxLength={6} value={verifyCode} onChange={e => setVerifyCode(e.target.value)} placeholder="000000" className="w-full px-6 py-5 bg-white border border-slate-200 rounded-2xl text-2xl font-black tracking-[0.5em] text-center focus:ring-8 focus:ring-blue-500/5 focus:border-blue-600 transition-all outline-none" />
                  </div>
                  {error && <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 animate-in slide-in-from-top-2"><AlertCircle className="text-red-600 mt-0.5 shrink-0" size={16} /><p className="text-[10px] font-bold text-red-600 uppercase tracking-wider leading-relaxed">{error}</p></div>}
                  <div className="flex flex-col sm:flex-row gap-4 pt-2">
                    <button onClick={verifyAndActivate} disabled={verifying || verifyCode.length < 6} className="flex-grow py-5 bg-blue-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-500/20 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50">{verifying ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}{verifying ? "Activando..." : "Completar Activación"}</button>
                    <button onClick={() => { setQrCode(null); setQrUri(null); setSecretCode(null); setFactorId(null); setError(null); setVerifyCode(""); }} className="px-8 py-5 bg-white border border-slate-200 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:text-slate-600 transition-all active:scale-95">Cancelar</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
