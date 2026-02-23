"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { User, Mail, Save, Loader2, Camera, ShieldCheck, Zap, Lock, Eye, EyeOff, KeyRound, ArrowRight, CheckCircle2, ShieldAlert, Info, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { BackButton } from "@/components/ui/BackButton";

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  
  const [profile, setProfile] = useState({
    full_name: "",
    email: "",
    avatar_url: "",
    role: "" as any
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    loadProfile();

    // Detectar si el usuario viene de un enlace de recuperación de contraseña
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovering(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push("/login");

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (data) {
      setProfile({
        full_name: data.full_name || "",
        email: data.email || "",
        avatar_url: data.avatar_url || "",
        role: data.role || "junior_consultant"
      });
    }
    setLoading(false);
  }

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setProfileMessage(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("profiles").update({
      full_name: profile.full_name,
      updated_at: new Date().toISOString()
    }).eq("id", user.id);

    if (error) setProfileMessage({ type: 'error', text: "Error al actualizar." });
    else setProfileMessage({ type: 'success', text: "Identidad actualizada." });
    setSaving(false);
  }

  async function handlePasswordUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordMessage({ type: 'error', text: "Las nuevas contraseñas no coinciden." });
      return;
    }
    
    setUpdatingPassword(true);
    setPasswordMessage(null);

    // Si NO estamos en modo recuperación, validamos la contraseña actual primero
    if (!isRecovering) {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: profile.email,
        password: passwordData.currentPassword,
      });

      if (authError) {
        setPasswordMessage({ type: 'error', text: "La contraseña actual es incorrecta." });
        setUpdatingPassword(false);
        return;
      }
    }

    // Actualizar a la nueva contraseña
    const { error: updateError } = await supabase.auth.updateUser({
      password: passwordData.newPassword
    });

    if (updateError) {
      setPasswordMessage({ type: 'error', text: updateError.message });
    } else {
      setPasswordMessage({ type: 'success', text: "Contraseña restablecida con éxito." });
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setIsRecovering(false); // Salir del modo recuperación
    }
    setUpdatingPassword(false);
  }

  async function handleResetRequest() {
    setSendingReset(true);
    const { error } = await supabase.auth.resetPasswordForEmail(profile.email, {
      redirectTo: `${window.location.origin}/dashboard/profile`,
    });
    if (error) setPasswordMessage({ type: 'error', text: error.message });
    else setPasswordMessage({ type: 'success', text: "Email de recuperación enviado." });
    setSendingReset(false);
  }

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="animate-spin text-blue-600" size={32} /></div>;

  return (
    <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in duration-700 pb-24">
      <header className="flex items-center gap-6">
        <BackButton />
        <div>
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter">Mi Perfil</h1>
          <p className="text-slate-500 font-medium mt-2 text-lg">Seguridad y Gestión de Identidad</p>
        </div>
      </header>

      {/* Identidad Card (Oculta si estamos recuperando contraseña para focalizar) */}
      {!isRecovering && (
        <div className="bg-white border border-slate-200 rounded-[3rem] p-10 shadow-sm relative overflow-hidden">
          <form onSubmit={handleProfileSave} className="space-y-8 relative z-10">
            <div className="flex items-center gap-8 pb-8 border-b border-slate-100">
              <div className="w-24 h-24 rounded-[2rem] bg-slate-50 border border-slate-100 flex items-center justify-center text-blue-600 shadow-inner overflow-hidden">
                {profile.avatar_url ? <img src={profile.avatar_url} className="w-full h-full object-cover" /> : <User size={32} />}
              </div>
                          <div className="space-y-1">
                            <h3 className="text-xl font-black text-slate-900">{profile.full_name || "Usuario"}</h3>
                            <p className={cn(
                              "text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-widest border inline-flex items-center gap-2",
                              profile.role === 'admin' 
                                ? "bg-slate-900 text-white border-slate-900" 
                                : "bg-emerald-50 text-emerald-600 border-emerald-100"
                            )}>
                              <ShieldCheck size={12} /> {profile.role?.replace('_', ' ')}
                            </p>
                          </div>
              
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nombre Completo</label>
                <input
                  value={profile.full_name}
                  onChange={e => setProfile({...profile, full_name: e.target.value})}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/5 transition-all outline-none"
                />
              </div>
              <div className="space-y-2 opacity-60">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Email (Protegido)</label>
                <input disabled value={profile.email} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none" />
              </div>
            </div>

            {profileMessage && <div className={cn("p-4 rounded-2xl text-xs font-bold", profileMessage.type === 'success' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-red-50 text-red-600")}>{profileMessage.text}</div>}

            <button type="submit" disabled={saving} className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] font-black text-[11px] uppercase tracking-widest shadow-xl hover:bg-blue-600 transition-all active:scale-95 flex items-center justify-center gap-3">
              {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} Guardar Cambios
            </button>
          </form>
        </div>
      )}

      {/* Seguridad Card */}
      <div className={cn(
        "border rounded-[3rem] p-10 shadow-xl transition-all duration-700 relative overflow-hidden",
        isRecovering ? "bg-blue-50 border-blue-200 ring-4 ring-blue-500/5" : "bg-white border-slate-200 shadow-sm"
      )}>
        <div className="flex items-center gap-4 mb-10">
          <div className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner",
            isRecovering ? "bg-blue-600 text-white" : "bg-amber-50 text-amber-600"
          )}>
            {isRecovering ? <ShieldAlert size={24} /> : <KeyRound size={24} />}
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900 tracking-tighter leading-none">
              {isRecovering ? "Restablecer Acceso" : "Seguridad de la Cuenta"}
            </h3>
            <p className={cn(
              "text-[9px] font-black uppercase tracking-[0.3em] mt-1.5",
              isRecovering ? "text-blue-600" : "text-amber-600"
            )}>
              {isRecovering ? "Verificación de Email Activa" : "Acceso y Credenciales"}
            </p>
          </div>
        </div>

        <form onSubmit={handlePasswordUpdate} className="space-y-6 relative z-10">
          {!isRecovering && (
            <div className="space-y-2 animate-in fade-in duration-500">
              <div className="flex justify-between items-center px-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contraseña Actual</label>
                <button type="button" onClick={handleResetRequest} disabled={sendingReset} className="text-[10px] font-black text-blue-600 hover:text-blue-700 uppercase tracking-widest transition-all">
                  {sendingReset ? "Enviando..." : "¿No la recuerdas?"}
                </button>
              </div>
              <div className="relative">
                <input
                  type={showCurrentPass ? "text" : "password"}
                  value={passwordData.currentPassword}
                  onChange={e => setPasswordData({...passwordData, currentPassword: e.target.value})}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-amber-500/5 transition-all outline-none"
                  placeholder="Inserta tu clave actual"
                />
                <button type="button" onClick={() => setShowCurrentPass(!showCurrentPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600">{showCurrentPass ? <EyeOff size={18} /> : <Eye size={18} />}</button>
              </div>
            </div>
          )}

          {isRecovering && (
            <div className="p-4 bg-blue-100/50 border border-blue-200 rounded-2xl text-[11px] font-bold text-blue-700 mb-6 flex items-center gap-3 animate-in zoom-in-95">
              <Info size={16} />
              Has accedido mediante un enlace de recuperación. Define tu nueva contraseña a continuación.
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nueva Contraseña</label>
              <div className="relative">
                <input
                  type={showNewPass ? "text" : "password"}
                  value={passwordData.newPassword}
                  onChange={e => setPasswordData({...passwordData, newPassword: e.target.value})}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/5 transition-all outline-none"
                  placeholder="Mín. 6 caracteres"
                />
                <button type="button" onClick={() => setShowNewPass(!showNewPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600">{showNewPass ? <EyeOff size={18} /> : <Eye size={18} />}</button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Confirmar Nueva</label>
              <input
                type={showNewPass ? "text" : "password"}
                value={passwordData.confirmPassword}
                onChange={e => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/5 transition-all outline-none"
                placeholder="Repite la clave"
              />
            </div>
          </div>

          {passwordMessage && (
            <div className={cn(
              "p-4 rounded-2xl text-xs font-bold flex items-center gap-3 animate-in slide-in-from-top-2",
              passwordMessage.type === 'success' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-red-50 text-red-600 border border-red-100"
            )}>
              {passwordMessage.type === 'success' ? <CheckCircle2 size={16} /> : <Zap size={16} />}
              {passwordMessage.text}
            </div>
          )}

          <button type="submit" disabled={updatingPassword} className={cn(
            "w-full py-5 rounded-[1.5rem] font-black text-[11px] uppercase tracking-widest shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3",
            isRecovering ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-slate-900 text-white hover:bg-amber-600"
          )}>
            {updatingPassword ? <Loader2 className="animate-spin" size={18} /> : <Lock size={18} />} 
            {updatingPassword ? "Procesando..." : isRecovering ? "Confirmar Nueva Contraseña" : "Actualizar Contraseña"}
          </button>
          
          {isRecovering && (
            <button type="button" onClick={() => setIsRecovering(false)} className="w-full text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-all">
              Cancelar restablecimiento
            </button>
          )}
        </form>
      </div>

      <footer className="text-center">
        <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">Begitality Identity Management • 2026</p>
      </footer>
    </div>
  );
}
