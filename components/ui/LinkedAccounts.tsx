"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Chrome, CheckCircle2, Loader2, Link as LinkIcon, AlertCircle, ShieldAlert, Trash2, Key } from "lucide-react";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

export function LinkedAccounts() {
  const [identities, setIdentities] = useState<any[]>([]);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    loadIdentities();
  }, []);

  async function loadIdentities() {
    try {
      // Forzamos la obtención del usuario desde el servidor para tener identidades frescas
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      
      if (user) {
        setUserEmail(user.email || null);
        setIdentities(user.identities || []);
      }
    } catch (err: any) {
      console.error("Error cargando identidades:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleLinkGoogle() {
    if (!userEmail) return;
    setActionLoading(true);
    setError(null);
    const { error: linkError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard/profile?linked=true`,
        queryParams: { login_hint: userEmail, prompt: 'select_account' }
      }
    });
    if (linkError) {
      setError(linkError.message);
      setActionLoading(false);
    }
  }

  async function handleUnlinkGoogle() {
    const googleIdentity = identities.find(id => id.provider === 'google');
    if (!googleIdentity) return;

    // REGLA DE SEGURIDAD: No permitir desvincular si es la única identidad
    if (identities.length <= 1) {
      setError("No puedes desvincular tu única forma de acceso. Establece una contraseña primero.");
      setIsConfirmOpen(false);
      return;
    }

    setActionLoading(true);
    setIsConfirmOpen(false);
    setError(null);

    try {
      const { error: unlinkError } = await supabase.auth.unlinkIdentity(googleIdentity);
      if (unlinkError) throw unlinkError;
      
      // Pequeña pausa para que Supabase procese el cambio
      await new Promise(resolve => setTimeout(resolve, 500));
      await loadIdentities();
    } catch (err: any) {
      setError("Error al desvincular: " + err.message);
    } finally {
      setActionLoading(false);
    }
  }

  const googleIdentity = identities.find(id => id.provider === 'google');
  const isGoogleLinked = !!googleIdentity;
  const emailMismatch = googleIdentity && googleIdentity.identity_data?.email !== userEmail;
  const canUnlink = identities.length > 1;

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-blue-600" /></div>;

  return (
    <div className="space-y-6">
      <ConfirmDialog 
        open={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        title="Desvincular Google"
        description="¿Estás seguro de que quieres desvincular Google SSO? Deberás usar tu email y contraseña para entrar."
        confirmText="Desvincular Ahora"
        variant="danger"
        onConfirm={handleUnlinkGoogle}
      />

      <div className={cn(
        "p-8 border transition-all duration-500 rounded-[2.5rem] bg-slate-50/50 border-slate-100",
        isGoogleLinked && !emailMismatch && "bg-white border-blue-100 shadow-sm"
      )}>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <div className={cn(
              "w-16 h-16 rounded-2xl flex items-center justify-center shadow-inner transition-all",
              isGoogleLinked ? "bg-blue-50 text-blue-600" : "bg-white text-slate-300 border border-slate-100"
            )}>
              <Chrome size={32} />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h4 className="text-lg font-black text-slate-900 tracking-tight">Google SSO</h4>
                {isGoogleLinked && !emailMismatch && (
                  <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase tracking-widest rounded-lg border border-emerald-100 flex items-center gap-1.5">
                    <CheckCircle2 size={10} /> Correcto
                  </span>
                )}
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {isGoogleLinked ? "Conexión activa y verificada" : "Acceso rápido por invitación"}
              </p>
            </div>
          </div>

          <div className="shrink-0">
            {isGoogleLinked ? (
              <button
                onClick={() => setIsConfirmOpen(true)}
                disabled={actionLoading}
                className="group flex items-center gap-2 px-6 py-3.5 bg-white border border-red-100 text-red-500 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all shadow-sm active:scale-95 disabled:opacity-50"
              >
                {actionLoading ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} className="group-hover:scale-110 transition-transform" />}
                Desvincular Cuenta
              </button>
            ) : (
              <button
                onClick={handleLinkGoogle}
                disabled={actionLoading}
                className="flex items-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl active:scale-95 flex items-center gap-2 disabled:opacity-50"
              >
                {actionLoading ? <Loader2 className="animate-spin" size={16} /> : <LinkIcon size={16} />}
                Vincular Google
              </button>
            )}
          </div>
        </div>
      </div>

      {/* AVISOS DE SEGURIDAD Y ERRORES */}
      <div className="space-y-3">
        {emailMismatch && (
          <div className="p-6 bg-red-50 border border-red-100 rounded-[2rem] flex items-start gap-4 animate-pulse">
            <ShieldAlert className="text-red-600 shrink-0 mt-1" size={20} />
            <div className="space-y-1">
              <p className="text-[10px] font-black text-red-700 uppercase tracking-widest">Conflicto de Email</p>
              <p className="text-[10px] font-bold text-red-600 leading-relaxed uppercase tracking-wider">
                Google ({googleIdentity.identity_data?.email}) ≠ Begitality ({userEmail}).
              </p>
            </div>
          </div>
        )}

        {isGoogleLinked && !canUnlink && (
          <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-center gap-3">
            <Key className="text-amber-600 shrink-0" size={18} />
            <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider leading-relaxed">
              Seguridad: No puedes desvincular Google si es tu única llave de acceso. Crea una contraseña primero.
            </p>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-2">
            <AlertCircle className="text-red-600 shrink-0" size={18} />
            <p className="text-[10px] font-bold text-red-700 uppercase tracking-wider">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
