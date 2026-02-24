"use client";

import { useState, useEffect } from "react";
import { 
  Users, Plus, X, Loader2, Shield, User, 
  Trash2, Mail, Check, ShieldCheck, ShieldAlert,
  Search, ArrowLeft, KeyRound, Eye, EyeOff, AlertTriangle,
  Briefcase, Fingerprint, Edit2, Save
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import * as Dialog from "@radix-ui/react-dialog";
import { UserRole } from "@/lib/types";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { StyledTooltip } from "@/components/ui/Tooltip";

interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  last_login: string | null;
  phone_number: string | null;
  bio: string | null;
  has_authenticated: boolean;
  assigned_projects: any[];
  project_count: number;
}

const ROLES: { id: UserRole; label: string; icon: any; color: string; activeColor: string }[] = [
  { id: 'admin', label: 'Admin', icon: ShieldCheck, color: 'text-slate-400 border-slate-200 hover:border-slate-900 hover:text-slate-900', activeColor: 'bg-slate-900 text-white border-slate-900 shadow-xl shadow-slate-900/20' },
  { id: 'senior_consultant', label: 'Senior', icon: User, color: 'text-slate-400 border-slate-200 hover:border-blue-600 hover:text-blue-600', activeColor: 'bg-blue-600 text-white border-blue-600 shadow-xl shadow-blue-600/20' },
  { id: 'junior_consultant', label: 'Junior', icon: User, color: 'text-slate-400 border-slate-200 hover:border-blue-400 hover:text-blue-400', activeColor: 'bg-blue-400 text-white border-blue-400 shadow-xl shadow-blue-400/20' },
  { id: 'auditor', label: 'Auditor', icon: ShieldAlert, color: 'text-slate-400 border-slate-200 hover:border-amber-500 hover:text-amber-500', activeColor: 'bg-amber-50 text-white border-amber-500 shadow-xl shadow-amber-500/20' },
  { id: 'viewer', label: 'Lector', icon: Eye, color: 'text-slate-400 border-slate-200 hover:border-emerald-500 hover:text-emerald-500', activeColor: 'bg-emerald-500 text-white border-emerald-500 shadow-xl shadow-emerald-500/20' },
];

export default function AdminPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [search, setSearch] = useState("");
  
  // Confirm Dialog State
  const [confirmDelete, setConfirmDelete] = useState<{open: boolean, id: string, name: string}>({open: false, id: "", name: ""});
  const [deleting, setDeleting] = useState(false);
  
  // Generic Alert Dialog State
  const [alertDialog, setAlertDialog] = useState<{open: boolean, title: string, description: string, variant: "info" | "danger" | "warning"}>({
    open: false, title: "", description: "", variant: "info"
  });
  
  // New User Form
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<UserRole>('junior_consultant');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit User Form
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState<UserRole>('junior_consultant');
  const [updating, setUpdating] = useState(false);
  const [resending, setResending] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    async function setup() {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);

      // Verificación de seguridad adicional en cliente por si el middleware falló o el token no se refrescó
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        
        if (profile?.role !== 'admin') {
          // Si no es admin, redirigir al dashboard (ya lo hace el middleware pero esto es refuerzo)
          window.location.href = "/dashboard";
          return;
        }
      }
      
      fetchUsers();
    }
    setup();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      if (Array.isArray(data)) {
        const sorted = [...data].sort((a, b) => {
          if (a.role === 'admin' && b.role !== 'admin') return -1;
          if (a.role !== 'admin' && b.role === 'admin') return 1;
          return (a.full_name || "").localeCompare(b.full_name || "");
        });
        setUsers(sorted);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleResendInvitation = async (u: Profile) => {
    setResending(u.id);
    try {
      const res = await fetch("/api/admin/users/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: u.email, full_name: u.full_name })
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error?.includes("rate limit")) {
          throw new Error("Límite de correos excedido. Por favor, espera un minuto antes de reintentar.");
        }
        throw new Error(data.error || "Error al reenviar invitación");
      }
      setAlertDialog({
        open: true,
        title: "Invitación Enviada",
        description: `Se ha reenviado el correo de acceso a ${u.email} correctamente.`,
        variant: "info"
      });
    } catch (err: any) {
      setAlertDialog({
        open: true,
        title: "Error de Envío",
        description: err.message,
        variant: "danger"
      });
    } finally {
      setResending(null);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newEmail,
          full_name: newName,
          role: newRole
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al crear usuario");
      
      setIsAddOpen(false);
      setNewEmail("");
      setNewName("");
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setUpdating(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingUser.id,
          full_name: editName,
          email: editEmail,
          role: editRole
        })
      });
      if (!res.ok) throw new Error("Error al actualizar");
      setIsEditOpen(false);
      fetchUsers();
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteUser = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/users?id=${confirmDelete.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Error al eliminar");
      setConfirmDelete({open: false, id: "", name: ""});
      fetchUsers();
    } catch (err: any) {
      setAlertDialog({
        open: true,
        title: "Error al eliminar",
        description: err.message,
        variant: "danger"
      });
    } finally {
      setDeleting(false);
    }
  };

  const roleLabels: Record<string, string> = {
    admin: "Administrador",
    senior_consultant: "Consultor Senior",
    junior_consultant: "Consultor Junior",
    auditor: "Auditor Técnico",
    viewer: "Lector"
  };

  const filteredUsers = users.filter(u => 
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in duration-700 pb-20">
      <header className="flex justify-between items-end gap-6 flex-wrap px-2">
        <div className="flex-1 min-w-[300px]">
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter uppercase">
            Administración
          </h1>
          <p className="text-slate-500 font-medium mt-2 text-lg">
            Gestión centralizada de accesos, roles y seguridad
          </p>
        </div>
        
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-64 group">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
            <input
              type="text"
              placeholder="Buscar trabajador..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-slate-200 bg-white focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all text-sm font-bold shadow-sm"
            />
          </div>
          <button
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-2 px-6 py-3.5 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl active:scale-95 shrink-0"
          >
            <Plus size={18} />
            Nuevo Acceso
          </button>
        </div>
      </header>

      {/* STATS SUMMARY */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* TOTAL TRABAJADORES */}
        <div className="bg-white border border-slate-200 rounded-[3rem] p-10 shadow-sm hover:shadow-2xl hover:shadow-blue-500/10 transition-all group relative overflow-hidden flex flex-col justify-between min-h-[220px]">
          <div className="relative z-10">
            <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/20 mb-6 group-hover:scale-110 transition-transform duration-500">
              <Users size={24} />
            </div>
            <p className="text-6xl font-black text-slate-900 tracking-tighter leading-none mb-2">{users.length}</p>
            <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em]">Total Trabajadores</span>
          </div>
          <div className="absolute -right-6 -bottom-6 opacity-[0.03] group-hover:scale-125 transition-transform duration-1000 text-blue-600">
            <Users size={180} />
          </div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 opacity-50 group-hover:scale-150 transition-transform duration-1000" />
        </div>

        {/* ADMINISTRADORES */}
        <div className="bg-slate-900 border border-slate-800 rounded-[3rem] p-10 shadow-2xl hover:shadow-slate-900/40 transition-all group relative overflow-hidden flex flex-col justify-between min-h-[220px]">
          <div className="relative z-10">
            <div className="w-12 h-12 bg-white/10 text-white rounded-2xl flex items-center justify-center backdrop-blur-xl border border-white/10 mb-6 group-hover:rotate-12 transition-transform duration-500">
              <ShieldCheck size={24} />
            </div>
            <p className="text-6xl font-black text-white tracking-tighter leading-none mb-2">
              {users.length > 0 ? Math.round((users.filter(u => u.role === 'admin').length / users.length) * 100) : 0}%
            </p>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Administradores</span>
          </div>
          <div className="absolute -right-6 -bottom-6 opacity-10 group-hover:scale-125 transition-transform duration-1000 text-slate-700">
            <ShieldCheck size={180} />
          </div>
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
        </div>

        {/* EQUIPO TÉCNICO */}
        <div className="bg-emerald-600 border border-emerald-500 rounded-[3rem] p-10 shadow-xl hover:shadow-emerald-600/30 transition-all group relative overflow-hidden flex flex-col justify-between min-h-[220px]">
          <div className="relative z-10">
            <div className="w-12 h-12 bg-white text-emerald-600 rounded-2xl flex items-center justify-center shadow-lg mb-6 group-hover:-translate-y-1 transition-transform duration-500">
              <Briefcase size={24} />
            </div>
            <p className="text-6xl font-black text-white tracking-tighter leading-none mb-2">
              {users.length > 0 ? Math.round((users.filter(u => u.role.includes('consultant')).length / users.length) * 100) : 0}%
            </p>
            <span className="text-[10px] font-black text-emerald-100 uppercase tracking-[0.3em]">Equipo Técnico</span>
          </div>
          <div className="absolute -right-6 -bottom-6 opacity-20 group-hover:scale-125 transition-transform duration-1000 text-emerald-800">
            <Briefcase size={180} />
          </div>
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl" />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-[3rem] p-4 shadow-sm relative overflow-hidden">
        <div className="absolute -right-20 -bottom-20 opacity-[0.015] pointer-events-none group-hover:scale-110 transition-transform duration-1000">
          <Fingerprint size={450} />
        </div>

        {loading ? (
          <div className="py-24 text-center"><Loader2 size={40} className="animate-spin text-blue-600 mx-auto" /></div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-24 text-center opacity-30">
            <Users size={64} className="mx-auto mb-6 text-slate-200" />
            <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">Canal Seguro Vacío</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2 relative z-10">
            {filteredUsers.map(u => (
              <div key={u.id} className="flex items-center justify-between p-6 bg-slate-50/30 border border-transparent hover:border-slate-100 hover:bg-white hover:shadow-2xl hover:shadow-slate-200/40 rounded-[2.5rem] transition-all duration-500 group">
                <div className="flex items-center gap-6">
                  <div className={cn(
                    "w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm transition-transform duration-500 group-hover:scale-110",
                    u.role === 'admin' ? "bg-slate-900 text-white shadow-xl shadow-slate-900/20" : "bg-white border border-slate-100 text-blue-600"
                  )}>
                    {u.role === 'admin' ? <ShieldCheck size={32} /> : <User size={32} />}
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-black text-slate-900 tracking-tight">{u.full_name || "Pendiente de alta"}</h3>
                      <span className={cn(
                        "text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-xl border shadow-sm",
                        u.role === 'admin' 
                          ? "bg-slate-900 text-white border-slate-900 shadow-slate-900/20" 
                          : "bg-blue-50 text-blue-600 border-blue-100 shadow-blue-600/5"
                      )}>
                        {roleLabels[u.role] || u.role}
                      </span>
                      {currentUserId === u.id && (
                        <span className="text-[8px] font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full uppercase tracking-widest border border-blue-100/50 animate-pulse">Tú</span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-slate-400 mt-1">{u.email}</p>
                    
                    {/* ACTIVE PROJECTS ACTIVITY */}
                    <div className="mt-4 flex flex-wrap gap-2">
                      {u.assigned_projects?.length > 0 ? (
                        <>
                          <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest self-center mr-1">Actividad:</span>
                          {u.assigned_projects.slice(0, 3).map((p: any) => (
                            <div key={p.id} className="flex items-center gap-2 bg-white border border-slate-100 px-2.5 py-1 rounded-lg shadow-sm">
                              <div className={cn("w-1.5 h-1.5 rounded-full", 
                                p.status === 'ready_export' ? "bg-emerald-500" : "bg-blue-500"
                              )} />
                              <span className="text-[9px] font-bold text-slate-600 truncate max-w-[100px]">{p.name}</span>
                            </div>
                          ))}
                          {u.assigned_projects.length > 3 && (
                            <span className="text-[9px] font-black text-slate-400 self-center">+{u.assigned_projects.length - 3}</span>
                          )}
                        </>
                      ) : (
                        <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Sin proyectos asignados</span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-right hidden md:block mr-4">
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-none mb-1">Actividad</p>
                    <p className="text-xs font-bold text-slate-500">{u.last_login ? new Date(u.last_login).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Nunca'}</p>
                  </div>
                  <div className="text-right hidden md:block mr-4 border-l border-slate-100 pl-4">
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-none mb-1">Registro</p>
                    <p className="text-xs font-bold text-slate-500">{new Date(u.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {currentUserId !== u.id && (
                      <>
                        {!u.is_active && (
                          <StyledTooltip content="Reenviar invitación (Pendiente)">
                            <button 
                              onClick={() => handleResendInvitation(u)}
                              disabled={resending === u.id}
                              className="p-3 text-slate-300 hover:text-amber-500 hover:bg-amber-50 rounded-2xl transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50"
                            >
                              {resending === u.id ? <Loader2 size={20} className="animate-spin" /> : <Mail size={20} />}
                            </button>
                          </StyledTooltip>
                        )}

                        <StyledTooltip content="Editar trabajador">
                          <button 
                            onClick={() => {
                              setEditingUser(u);
                              setEditName(u.full_name);
                              setEditEmail(u.email);
                              setEditRole(u.role);
                              setIsEditOpen(true);
                            }}
                            className="p-3 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Edit2 size={20} />
                          </button>
                        </StyledTooltip>

                        <StyledTooltip content="Eliminar acceso">
                          <button 
                            onClick={() => setConfirmDelete({open: true, id: u.id, name: u.full_name})}
                            className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 size={20} />
                          </button>
                        </StyledTooltip>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CONFIRM DELETE DIALOG */}
      <ConfirmDialog 
        open={confirmDelete.open}
        onOpenChange={(open: boolean) => setConfirmDelete({...confirmDelete, open})}
        title="Eliminar Trabajador"
        description={`¿Estás seguro de que deseas eliminar a ${confirmDelete.name}? Se revocará todo su acceso a la infraestructura de Begitality de forma inmediata.`}
        confirmText="Eliminar permanentemente"
        variant="danger"
        loading={deleting}
        onConfirm={handleDeleteUser}
      />

      {/* ALERT DIALOG */}
      <ConfirmDialog 
        open={alertDialog.open}
        onOpenChange={(open: boolean) => setAlertDialog({...alertDialog, open})}
        title={alertDialog.title}
        description={alertDialog.description}
        confirmText="Entendido"
        showCancel={false}
        variant={alertDialog.variant}
        onConfirm={() => setAlertDialog({...alertDialog, open: false})}
      />

      {/* ADD USER MODAL */}
      <Dialog.Root open={isAddOpen} onOpenChange={setIsAddOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] animate-in fade-in duration-300" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-[3rem] p-10 shadow-2xl z-[101] outline-none animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg"><User size={24} /></div>
                <div>
                  <Dialog.Title className="text-2xl font-black text-slate-900 tracking-tighter uppercase leading-none">Alta de Equipo</Dialog.Title>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mt-2">Acceso a Infraestructura Begitality</p>
                </div>
              </div>
              <button onClick={() => setIsAddOpen(false)} className="p-3 hover:bg-slate-100 rounded-2xl text-slate-400 transition-all"><X size={24} /></button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-8">
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre Completo</label>
                  <input required value={newName} onChange={e => setNewName(e.target.value)} placeholder="Ej: Elena Martínez" className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50/50 text-sm font-bold focus:ring-4 focus:ring-blue-500/5 outline-none transition-all" />
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Correo Begitality</label>
                  <input required type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="elena@begitality.com" className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50/50 text-sm font-bold focus:ring-4 focus:ring-blue-500/5 outline-none transition-all" />
                </div>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl space-y-2">
                <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
                  <Mail size={14} /> Proceso de Invitación
                </p>
                <p className="text-[11px] text-blue-700 font-medium leading-relaxed">
                  Se enviará un correo electrónico oficial a esta dirección para que el nuevo trabajador establezca su propia contraseña y active su cuenta.
                </p>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Privilegios y Permisos</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {ROLES.map(r => (
                    <button
                      key={r.id} type="button" onClick={() => setNewRole(r.id)}
                      className={cn(
                        "flex items-center justify-center gap-2 py-3.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all active:scale-95",
                        newRole === r.id ? r.activeColor : r.color
                      )}
                    >
                      <r.icon size={14} />
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              {error && <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-red-100 animate-pulse">⚠️ {error}</div>}

              <button
                type="submit" disabled={creating}
                className="w-full py-5 bg-blue-600 text-white rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.25em] shadow-2xl shadow-blue-600/30 hover:bg-blue-500 transition-all active:scale-95 flex items-center justify-center gap-3"
              >
                {creating ? <Loader2 className="animate-spin" size={20} /> : <Mail size={20} />}
                {creating ? "Enviando Invitación..." : "Enviar Invitación de Acceso"}
              </button>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* EDIT USER MODAL */}
      <Dialog.Root open={isEditOpen} onOpenChange={setIsEditOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] animate-in fade-in duration-300" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-[3rem] p-10 shadow-2xl z-[101] outline-none animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-lg"><Edit2 size={24} /></div>
                <div>
                  <Dialog.Title className="text-2xl font-black text-slate-900 tracking-tighter uppercase leading-none">Editar Perfil</Dialog.Title>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mt-2">Modificación de Credenciales</p>
                </div>
              </div>
              <button onClick={() => setIsEditOpen(false)} className="p-3 hover:bg-slate-100 rounded-2xl text-slate-400 transition-all"><X size={24} /></button>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-8">
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre Completo</label>
                  <input required value={editName} onChange={e => setEditName(e.target.value)} className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50/50 text-sm font-bold focus:ring-4 focus:ring-blue-500/5 outline-none transition-all" />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Correo Begitality</label>
                  <input required type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50/50 text-sm font-bold focus:ring-4 focus:ring-blue-500/5 outline-none transition-all" />
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Actualizar Privilegios</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {ROLES.map(r => (
                    <button
                      key={r.id} type="button" onClick={() => setEditRole(r.id)}
                      className={cn(
                        "flex items-center justify-center gap-2 py-3.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all active:scale-95",
                        editRole === r.id ? r.activeColor : r.color
                      )}
                    >
                      <r.icon size={14} />
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit" disabled={updating}
                className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.25em] shadow-xl hover:bg-blue-600 transition-all active:scale-95 flex items-center justify-center gap-3"
              >
                {updating ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                Actualizar Información
              </button>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
