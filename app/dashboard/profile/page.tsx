"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  User, Mail, Save, Loader2, Camera, ShieldCheck, 
  Zap, Lock, Eye, EyeOff, KeyRound, ArrowRight, 
  CheckCircle2, ShieldAlert, Info, ArrowLeft,
  LayoutDashboard, Fingerprint, History, Phone, AlignLeft, Calendar, X, AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { BackButton } from "@/components/ui/BackButton";
import { AvatarUpload } from "@/components/ui/AvatarUpload";
import { MFAConfiguration } from "@/components/ui/MFAConfiguration";
import { UserStats } from "@/components/ui/UserStats";
import { LinkedAccounts } from "@/components/ui/LinkedAccounts";

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const [activeTab, setActiveTab] = useState<'stats' | 'identity' | 'security'>('stats');
  
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  
  const [profile, setProfile] = useState({
    id: "",
    full_name: "",
    email: "",
    avatar_url: "",
    role: "" as any,
    phone_number: "",
    bio: "",
    last_login: null as string | null
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovering(true);
        setActiveTab('security');
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
      // SINCRONIZACIÓN AUTOMÁTICA DE LAST_LOGIN
      const actualLastLogin = data.last_login || user.last_sign_in_at;
      
      setProfile({
        id: data.id,
        full_name: data.full_name || "",
        email: data.email || "",
        avatar_url: data.avatar_url || "",
        role: data.role || "junior_consultant",
        phone_number: data.phone_number || "",
        bio: data.bio || "",
        last_login: actualLastLogin
      });

      // Si el dato de la tabla está vacío, lo actualizamos en background
      if (!data.last_login && user.last_sign_in_at) {
        await supabase.from("profiles").update({ last_login: user.last_sign_in_at }).eq("id", user.id);
      }
    }
    setLoading(false);
  }

  async function updateAvatarInDb(url: string) {
    setProfile(prev => ({ ...prev, avatar_url: url }));
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
    if (error) setProfileMessage({ type: 'error', text: "Error al guardar imagen." });
    else setProfileMessage({ type: 'success', text: "Imagen de perfil actualizada." });
  }

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setProfileMessage(null);

    const { error } = await supabase.from("profiles").update({
      full_name: profile.full_name,
      avatar_url: profile.avatar_url,
      phone_number: profile.phone_number,
      bio: profile.bio,
      updated_at: new Date().toISOString()
    }).eq("id", profile.id);

    if (error) setProfileMessage({ type: 'error', text: "Error al actualizar los datos." });
    else setProfileMessage({ type: 'success', text: "Perfil actualizado correctamente." });
    setSaving(false);
  }

  async function handlePasswordUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordMessage({ type: 'error', text: "Las contraseñas no coinciden." });
      return;
    }
    setUpdatingPassword(true);
    setPasswordMessage(null);

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

    const { error: updateError } = await supabase.auth.updateUser({ password: passwordData.newPassword });
    if (updateError) setPasswordMessage({ type: 'error', text: updateError.message });
    else {
      setPasswordMessage({ type: 'success', text: "Contraseña actualizada." });
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setIsRecovering(false);
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

  const roleLabels: Record<string, string> = {
    admin: "Administrador",
    senior_consultant: "Consultor Senior",
    junior_consultant: "Consultor Junior",
    auditor: "Auditor Técnico",
    viewer: "Lector"
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="animate-spin text-blue-600" size={32} /></div>;

  const tabs = [
    { id: 'stats', label: 'Estadísticas', icon: LayoutDashboard },
    { id: 'identity', label: 'Identidad', icon: User },
    { id: 'security', label: 'Seguridad', icon: ShieldCheck }
  ] as const;

  return (
    <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in duration-700 pb-24">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <BackButton />
          <div>
            <h1 className="text-5xl font-black text-slate-900 tracking-tighter">Mi Perfil</h1>
            <p className="text-slate-500 font-medium mt-2 text-lg">Identidad, Seguridad y Rendimiento Operativo</p>
          </div>
        </div>
        <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shadow-inner">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all",
                activeTab === tab.id ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-900"
              )}
            >
              <tab.icon size={14} /> {tab.label}
            </button>
          ))}
        </div>
      </header>

      {activeTab === 'stats' && <UserStats />}

      {activeTab === 'identity' && (
        <div className="space-y-8 animate-in zoom-in-95 duration-500">
          <div className="bg-white border border-slate-200 rounded-[3rem] p-10 shadow-sm relative overflow-hidden">
            <AvatarUpload currentUrl={profile.avatar_url} onUploadComplete={updateAvatarInDb} userId={profile.id} />
          </div>
          <div className="bg-white border border-slate-200 rounded-[3rem] p-12 shadow-sm relative overflow-hidden">
            <form onSubmit={handleProfileSave} className="space-y-12 relative z-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-6">
                  <div className="flex items-center justify-between px-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nombre Completo</label><span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full uppercase tracking-widest">Editable</span></div>
                  <div className="relative group">
                    <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={20} />
                    <input value={profile.full_name} onChange={e => setProfile({...profile, full_name: e.target.value})} className="w-full pl-14 pr-6 py-5 bg-slate-50 border border-slate-100 rounded-[1.75rem] text-sm font-bold focus:ring-8 focus:ring-blue-500/5 focus:border-blue-500 transition-all outline-none" placeholder="Tu nombre completo" />
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="flex items-center justify-between px-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Seguridad del Email</label><span className="text-[9px] font-black text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full uppercase tracking-widest">Solo lectura</span></div>
                  <div className="relative opacity-60">
                    <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                    <input disabled value={profile.email} className="w-full pl-14 pr-6 py-5 bg-slate-50 border border-slate-100 rounded-[1.75rem] text-sm font-bold outline-none cursor-not-allowed" />
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="flex items-center justify-between px-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Teléfono de Contacto</label><span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full uppercase tracking-widest">Editable</span></div>
                  <div className="relative group">
                    <Phone className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={20} />
                    <input value={profile.phone_number} onChange={e => setProfile({...profile, phone_number: e.target.value})} className="w-full pl-14 pr-6 py-5 bg-slate-50 border border-slate-100 rounded-[1.75rem] text-sm font-bold focus:ring-8 focus:ring-blue-500/5 focus:border-blue-500 transition-all outline-none" placeholder="+34 000 000 000" />
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="flex items-center justify-between px-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Última Conexión</label><span className="text-[9px] font-black text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full uppercase tracking-widest">Sistema</span></div>
                  <div className="relative opacity-60">
                    <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                    <input disabled value={profile.last_login ? new Date(profile.last_login).toLocaleString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : "Primera sesión"} className="w-full pl-14 pr-6 py-5 bg-slate-50 border border-slate-100 rounded-[1.75rem] text-sm font-bold outline-none cursor-not-allowed" />
                  </div>
                </div>
                <div className="space-y-6 md:col-span-2">
                  <div className="flex items-center justify-between px-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bio / Nota Profesional</label><span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full uppercase tracking-widest">Editable</span></div>
                  <div className="relative group">
                    <AlignLeft className="absolute left-5 top-6 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={20} />
                    <textarea value={profile.bio} onChange={e => setProfile({...profile, bio: e.target.value})} rows={4} className="w-full pl-14 pr-6 py-5 bg-slate-50 border border-slate-100 rounded-[1.75rem] text-sm font-bold focus:ring-8 focus:ring-blue-500/5 focus:border-blue-500 transition-all outline-none resize-none" placeholder="Escribe una breve descripción profesional..." />
                  </div>
                </div>
              </div>
              <div className="flex flex-col md:flex-row items-center justify-between gap-8 pt-8 border-t border-slate-50">
                <div className="flex items-center gap-4 text-center md:text-left">
                  <div className="w-14 h-14 bg-white border border-slate-100 rounded-2xl flex items-center justify-center shadow-inner text-blue-600"><ShieldCheck size={28} /></div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Acceso Concedido</p>
                    <span className={cn("inline-block mt-1 text-[10px] font-black px-4 py-1.5 rounded-xl uppercase tracking-widest border", profile.role === 'admin' ? "bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-900/20" : "bg-blue-50 text-blue-600 border-blue-100 shadow-sm")}>{roleLabels[profile.role] || profile.role}</span>
                  </div>
                </div>
                <button type="submit" disabled={saving} className="w-full md:w-auto px-12 py-5 bg-slate-900 text-white rounded-[1.75rem] font-black text-[11px] uppercase tracking-widest shadow-xl hover:bg-blue-600 transition-all active:scale-95 flex items-center justify-center gap-3">{saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} Guardar Identidad</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'security' && (
        <div className="space-y-10 animate-in zoom-in-95 duration-500">
          <div className="bg-white border border-slate-200 rounded-[3rem] p-10 shadow-sm">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-inner"><LayoutDashboard size={24} /></div>
              <div><h3 className="text-xl font-black text-slate-900 tracking-tighter">Cuentas Vinculadas</h3><p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-1">Conectividad y Acceso Rápido</p></div>
            </div>
            <LinkedAccounts />
          </div>
          <div className="bg-white border border-slate-200 rounded-[3rem] p-10 shadow-sm">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-inner"><Fingerprint size={24} /></div>
              <div><h3 className="text-xl font-black text-slate-900 tracking-tighter">Autenticación de Doble Factor (2FA)</h3><p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-1">Protección Adicional de Identidad</p></div>
            </div>
            <MFAConfiguration />
          </div>
          <div className={cn("border rounded-[3rem] p-10 shadow-xl transition-all duration-700 relative overflow-hidden", isRecovering ? "bg-blue-50 border-blue-200 ring-4 ring-blue-500/5" : "bg-white border-slate-200 shadow-sm")}>
            <div className="flex items-center gap-4 mb-10">
              <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner", isRecovering ? "bg-blue-600 text-white" : "bg-amber-50 text-amber-600")}>{isRecovering ? <ShieldAlert size={24} /> : <KeyRound size={24} />}</div>
              <div><h3 className="text-xl font-black text-slate-900 tracking-tighter leading-none">{isRecovering ? "Restablecer Acceso" : "Contraseña de la Cuenta"}</h3><p className={cn("text-[9px] font-black uppercase tracking-[0.3em] mt-1.5", isRecovering ? "text-blue-600" : "text-amber-600")}>{isRecovering ? "Verificación de Email Activa" : "Acceso y Credenciales"}</p></div>
            </div>
            <form onSubmit={handlePasswordUpdate} className="space-y-6 relative z-10">
              {!isRecovering && (
                <div className="space-y-2 animate-in fade-in duration-500">
                  <div className="flex justify-between items-center px-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contraseña Actual</label><button type="button" onClick={handleResetRequest} disabled={sendingReset} className="text-[10px] font-black text-blue-600 hover:text-blue-700 uppercase tracking-widest transition-all">{sendingReset ? "Enviando..." : "¿No la recuerdas?"}</button></div>
                  <div className="relative group">
                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-amber-500 transition-colors" size={20} />
                    <input type={showCurrentPass ? "text" : "password"} value={passwordData.currentPassword} onChange={e => setPasswordData({...passwordData, currentPassword: e.target.value})} className="w-full pl-14 pr-16 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-amber-500/5 transition-all outline-none" placeholder="Inserta tu clave actual" />
                    <button type="button" onClick={() => setShowCurrentPass(!showCurrentPass)} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600">{showCurrentPass ? <EyeOff size={20} /> : <Eye size={20} />}</button>
                  </div>
                </div>
              )}
              {isRecovering && <div className="p-4 bg-blue-100/50 border border-blue-200 rounded-2xl text-[11px] font-bold text-blue-700 mb-6 flex items-center gap-3 animate-in zoom-in-95"><Info size={16} />Has accedido mediante un enlace de recuperación. Define tu nueva contraseña.</div>}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-4 border-t border-slate-100">
                <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nueva Contraseña</label><div className="relative group"><input type={showNewPass ? "text" : "password"} value={passwordData.newPassword} onChange={e => setPasswordData({...passwordData, newPassword: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/5 transition-all outline-none" placeholder="Mín. 6 caracteres" /><button type="button" onClick={() => setShowNewPass(!showNewPass)} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600">{showNewPass ? <EyeOff size={20} /> : <Eye size={20} />}</button></div></div>
                <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Confirmar Nueva</label><input type={showNewPass ? "text" : "password"} value={passwordData.confirmPassword} onChange={e => setPasswordData({...passwordData, confirmPassword: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/5 transition-all outline-none" placeholder="Repite la clave" /></div>
              </div>
              {passwordMessage && <div className={cn("p-4 rounded-2xl text-xs font-bold flex items-center gap-3 animate-in slide-in-from-top-2", passwordMessage.type === 'success' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-red-50 text-red-600 border border-red-100")}>{passwordMessage.type === 'success' ? <CheckCircle2 size={16} /> : <Zap size={16} />}{passwordMessage.text}</div>}
              <div className="flex flex-col sm:flex-row gap-4 pt-4"><button type="submit" disabled={updatingPassword} className={cn("flex-grow py-5 rounded-[1.5rem] font-black text-[11px] uppercase tracking-widest shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3", isRecovering ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-slate-900 text-white hover:bg-amber-600")}>{updatingPassword ? <Loader2 className="animate-spin" size={18} /> : <Lock size={18} />}{updatingPassword ? "Procesando..." : isRecovering ? "Confirmar Nueva" : "Actualizar Clave"}{isRecovering && <button type="button" onClick={() => setIsRecovering(false)} className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-all border border-slate-200 rounded-[1.5rem]">Cancelar</button>}</button></div>
            </form>
          </div>
        </div>
      )}

      {profileMessage && (
        <div className="fixed bottom-8 right-8 z-[100] animate-in slide-in-from-right-10 duration-500">
          <div className={cn("p-6 rounded-[2rem] shadow-2xl border flex items-center gap-4 min-w-[300px]", profileMessage.type === 'success' ? "bg-white border-emerald-100 text-emerald-600" : "bg-white border-red-100 text-red-600")}>
            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner", profileMessage.type === 'success' ? "bg-emerald-50" : "bg-red-50")}>{profileMessage.type === 'success' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}</div>
            <div><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Notificación de Perfil</p><p className="text-sm font-bold text-slate-900">{profileMessage.text}</p></div>
            <button onClick={() => setProfileMessage(null)} className="ml-auto p-2 hover:bg-slate-50 rounded-xl text-slate-300 hover:text-slate-600 transition-all"><X size={20} /></button>
          </div>
        </div>
      )}

      <footer className="text-center pt-10 border-t border-slate-100"><p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">Begitality Identity & Performance Center • 2026</p></footer>
    </div>
  );
}
