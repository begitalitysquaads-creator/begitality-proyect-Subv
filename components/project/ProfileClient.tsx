"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    User,
    Mail,
    Shield,
    Save,
    Loader2,
    CheckCircle2,
    Camera,
    Sparkles,
    Calendar,
    FileText,
    TrendingUp,
    Award,
    AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Profile {
    id: string;
    email: string | null;
    full_name: string | null;
    avatar_url: string | null;
    plan: "starter" | "consultant" | "senior_consultant" | "enterprise";
    created_at: string;
    updated_at: string;
}

interface ProfileStats {
    totalProjects: number;
    completedProjects: number;
    totalSections: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PLAN_CONFIG = {
    starter: {
        label: "Starter",
        color: "text-slate-600",
        bg: "bg-slate-100",
        border: "border-slate-200",
        bar: "bg-slate-400",
        barWidth: "w-1/4",
        projects: 3,
        description: "Hasta 3 proyectos activos",
    },
    consultant: {
        label: "Consultant",
        color: "text-blue-600",
        bg: "bg-blue-50",
        border: "border-blue-200",
        bar: "bg-blue-500",
        barWidth: "w-2/4",
        projects: 10,
        description: "Hasta 10 proyectos activos",
    },
    senior_consultant: {
        label: "Senior Consultant",
        color: "text-violet-600",
        bg: "bg-violet-50",
        border: "border-violet-200",
        bar: "bg-violet-500",
        barWidth: "w-3/4",
        projects: 30,
        description: "Hasta 30 proyectos activos",
    },
    enterprise: {
        label: "Enterprise",
        color: "text-amber-600",
        bg: "bg-amber-50",
        border: "border-amber-200",
        bar: "bg-amber-500",
        barWidth: "w-full",
        projects: Infinity,
        description: "Proyectos ilimitados",
    },
};

function getInitials(name: string | null, email: string | null): string {
    if (name) {
        const parts = name.trim().split(" ");
        return parts.length >= 2
            ? (parts[0][0] + parts[1][0]).toUpperCase()
            : parts[0].slice(0, 2).toUpperCase();
    }
    if (email) return email[0].toUpperCase();
    return "U";
}

// ─── Avatar Component ─────────────────────────────────────────────────────────

function AvatarDisplay({
    avatarUrl,
    fullName,
    email,
    size = "lg",
}: {
    avatarUrl: string | null;
    fullName: string | null;
    email: string | null;
    size?: "sm" | "lg";
}) {
    const initials = getInitials(fullName, email);
    const sizeClass = size === "lg" ? "w-24 h-24 text-3xl" : "w-10 h-10 text-sm";

    if (avatarUrl) {
        return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
                src={avatarUrl}
                alt={fullName ?? "Avatar"}
                className={cn("rounded-full object-cover", sizeClass)}
            />
        );
    }
    return (
        <div
            className={cn(
                "rounded-full bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center text-white font-black",
                sizeClass
            )}
        >
            {initials}
        </div>
    );
}

// ─── Componente principal ─────────────────────────────────────────────────────

interface ProfileClientProps {
    profile: Profile;
    stats: ProfileStats;
}

export function ProfileClient({ profile, stats }: ProfileClientProps) {
    const [fullName, setFullName] = useState(profile.full_name ?? "");
    const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? "");
    const [saving, setSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [avatarPreview, setAvatarPreview] = useState(profile.avatar_url ?? "");
    const avatarInputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    const plan = PLAN_CONFIG[profile.plan];
    const memberSince = new Date(profile.created_at).toLocaleDateString("es-ES", {
        year: "numeric",
        month: "long",
    });

    const hasChanges =
        fullName.trim() !== (profile.full_name ?? "") ||
        avatarUrl.trim() !== (profile.avatar_url ?? "");

    // Actualizar preview de avatar al cambiar URL
    useEffect(() => {
        const trimmed = avatarUrl.trim();
        if (!trimmed || trimmed.startsWith("http")) {
            setAvatarPreview(trimmed);
        }
    }, [avatarUrl]);

    async function handleSave() {
        if (!hasChanges) return;
        setSaving(true);
        setErrorMsg(null);
        setSaveStatus("idle");

        try {
            const body: Record<string, string> = {};
            if (fullName.trim() !== (profile.full_name ?? "")) body.full_name = fullName.trim();
            if (avatarUrl.trim() !== (profile.avatar_url ?? "")) body.avatar_url = avatarUrl.trim();

            const res = await fetch("/api/profile", {
                method: "PATCH",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (res.ok) {
                setSaveStatus("saved");
                setTimeout(() => setSaveStatus("idle"), 3000);
                router.refresh();
            } else {
                setSaveStatus("error");
                setErrorMsg(data.error || "Error al guardar");
            }
        } catch {
            setSaveStatus("error");
            setErrorMsg("Error de conexión");
        } finally {
            setSaving(false);
        }
    }

    const completionRate =
        stats.totalProjects > 0
            ? Math.round((stats.completedProjects / stats.totalProjects) * 100)
            : 0;

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <header>
                <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Mi Perfil</h1>
                <p className="text-slate-500 mt-1">Gestiona tu información personal y preferencias</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* ── Columna izquierda: avatar + plan ── */}
                <div className="space-y-5">
                    {/* Tarjeta de avatar */}
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 flex flex-col items-center text-center space-y-4">
                        <div className="relative group">
                            <AvatarDisplay
                                avatarUrl={avatarPreview || null}
                                fullName={fullName || profile.full_name}
                                email={profile.email}
                                size="lg"
                            />
                            <button
                                type="button"
                                onClick={() => avatarInputRef.current?.focus()}
                                className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                title="Cambiar avatar"
                            >
                                <Camera size={20} className="text-white" />
                            </button>
                        </div>

                        <div>
                            <p className="font-black text-slate-900 text-lg leading-tight">
                                {fullName || profile.full_name || "Sin nombre"}
                            </p>
                            <p className="text-slate-400 text-sm mt-0.5">{profile.email}</p>
                        </div>

                        {/* Badge de plan */}
                        <div
                            className={cn(
                                "w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl border font-bold text-sm",
                                plan.bg,
                                plan.border,
                                plan.color
                            )}
                        >
                            <Award size={16} />
                            {plan.label}
                        </div>

                        {/* Miembro desde */}
                        <div className="flex items-center gap-1.5 text-xs text-slate-400">
                            <Calendar size={12} />
                            Miembro desde {memberSince}
                        </div>
                    </div>

                    {/* Tarjeta de plan */}
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4">
                        <div className="flex items-center gap-2">
                            <div
                                className={cn(
                                    "w-8 h-8 rounded-xl flex items-center justify-center",
                                    plan.bg
                                )}
                            >
                                <Sparkles size={16} className={plan.color} />
                            </div>
                            <div>
                                <p className="font-black text-slate-900 text-sm">Plan actual</p>
                                <p className={cn("text-xs font-bold", plan.color)}>{plan.label}</p>
                            </div>
                        </div>

                        <p className="text-xs text-slate-500">{plan.description}</p>

                        <div>
                            <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                                <span>Proyectos usados</span>
                                <span className="font-bold">
                                    {stats.totalProjects}
                                    {plan.projects !== Infinity ? ` / ${plan.projects}` : ""}
                                </span>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className={cn("h-full rounded-full transition-all duration-700", plan.bar)}
                                    style={{
                                        width:
                                            plan.projects === Infinity
                                                ? "100%"
                                                : `${Math.min(100, (stats.totalProjects / plan.projects) * 100)}%`,
                                    }}
                                />
                            </div>
                        </div>

                        <button
                            type="button"
                            className="w-full py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 transition-all shadow-md shadow-violet-500/20"
                        >
                            Mejorar plan →
                        </button>
                    </div>
                </div>

                {/* ── Columna derecha: formulario + estadísticas ── */}
                <div className="lg:col-span-2 space-y-5">
                    {/* Formulario de edición */}
                    <div className="bg-white border border-slate-200 rounded-3xl p-8 space-y-6">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center">
                                <User size={16} className="text-blue-600" />
                            </div>
                            <h2 className="font-black text-slate-900">Información personal</h2>
                        </div>

                        {/* Nombre */}
                        <div className="space-y-2">
                            <label htmlFor="fullName" className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                                <User size={14} className="text-slate-400" />
                                Nombre completo
                            </label>
                            <input
                                id="fullName"
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                placeholder="Tu nombre completo"
                                maxLength={200}
                                className={cn(
                                    "w-full px-4 py-3 rounded-xl border bg-slate-50/50 text-sm",
                                    "focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500",
                                    "border-slate-200 transition-colors"
                                )}
                            />
                        </div>

                        {/* Email (solo lectura) */}
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                                <Mail size={14} className="text-slate-400" />
                                Email
                                <span className="text-xs font-normal text-slate-400 ml-1">(no editable)</span>
                            </label>
                            <div className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 text-sm text-slate-400 flex items-center gap-2">
                                <Shield size={14} className="text-slate-300 shrink-0" />
                                {profile.email}
                            </div>
                        </div>

                        {/* URL de avatar */}
                        <div className="space-y-2">
                            <label htmlFor="avatarUrl" className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                                <Camera size={14} className="text-slate-400" />
                                URL de foto de perfil
                                <span className="text-xs font-normal text-slate-400 ml-1">(opcional)</span>
                            </label>
                            <input
                                id="avatarUrl"
                                ref={avatarInputRef}
                                type="url"
                                value={avatarUrl}
                                onChange={(e) => setAvatarUrl(e.target.value)}
                                placeholder="https://ejemplo.com/tu-foto.jpg"
                                className={cn(
                                    "w-full px-4 py-3 rounded-xl border bg-slate-50/50 text-sm",
                                    "focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500",
                                    "border-slate-200 transition-colors"
                                )}
                            />
                            <p className="text-xs text-slate-400">
                                Pega la URL de una imagen pública (Gravatar, LinkedIn, etc.)
                            </p>
                        </div>

                        {/* Error */}
                        {errorMsg && (
                            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm">
                                <AlertCircle size={14} className="shrink-0" />
                                {errorMsg}
                            </div>
                        )}

                        {/* Botón guardar */}
                        <div className="flex items-center justify-between pt-2">
                            {saveStatus === "saved" && (
                                <div className="flex items-center gap-1.5 text-emerald-600 text-sm font-bold animate-in fade-in">
                                    <CheckCircle2 size={16} />
                                    Cambios guardados
                                </div>
                            )}
                            {saveStatus !== "saved" && <div />}

                            <button
                                type="button"
                                onClick={handleSave}
                                disabled={saving || !hasChanges}
                                className={cn(
                                    "flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all",
                                    hasChanges && !saving
                                        ? "bg-blue-600 text-white hover:bg-blue-500 shadow-md shadow-blue-500/20"
                                        : "bg-slate-100 text-slate-400 cursor-not-allowed"
                                )}
                            >
                                {saving ? (
                                    <Loader2 size={16} className="animate-spin" />
                                ) : (
                                    <Save size={16} />
                                )}
                                {saving ? "Guardando…" : "Guardar cambios"}
                            </button>
                        </div>
                    </div>

                    {/* Estadísticas */}
                    <div className="bg-white border border-slate-200 rounded-3xl p-8">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-8 h-8 bg-violet-50 rounded-xl flex items-center justify-center">
                                <TrendingUp size={16} className="text-violet-600" />
                            </div>
                            <h2 className="font-black text-slate-900">Estadísticas de actividad</h2>
                        </div>

                        <div className="grid grid-cols-3 gap-4 mb-6">
                            <div className="text-center p-4 bg-slate-50 rounded-2xl">
                                <p className="text-3xl font-black text-slate-900">{stats.totalProjects}</p>
                                <p className="text-xs text-slate-500 font-medium mt-1">Proyectos totales</p>
                            </div>
                            <div className="text-center p-4 bg-emerald-50 rounded-2xl">
                                <p className="text-3xl font-black text-emerald-700">{stats.completedProjects}</p>
                                <p className="text-xs text-slate-500 font-medium mt-1">Listos para envío</p>
                            </div>
                            <div className="text-center p-4 bg-blue-50 rounded-2xl">
                                <p className="text-3xl font-black text-blue-700">{stats.totalSections}</p>
                                <p className="text-xs text-slate-500 font-medium mt-1">Secciones escritas</p>
                            </div>
                        </div>

                        {/* Tasa de completitud */}
                        {stats.totalProjects > 0 && (
                            <div>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-slate-500 font-medium flex items-center gap-1.5">
                                        <FileText size={14} />
                                        Tasa de completitud
                                    </span>
                                    <span className="font-black text-slate-900">{completionRate}%</span>
                                </div>
                                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-1000"
                                        style={{ width: `${completionRate}%` }}
                                    />
                                </div>
                                <p className="text-xs text-slate-400 mt-2">
                                    {stats.completedProjects} de {stats.totalProjects} proyectos listos para exportar
                                </p>
                            </div>
                        )}

                        {stats.totalProjects === 0 && (
                            <div className="text-center py-4 text-slate-400 text-sm">
                                Aún no has creado ningún proyecto. ¡Empieza ahora!
                            </div>
                        )}
                    </div>

                    {/* Seguridad */}
                    <div className="bg-white border border-slate-200 rounded-3xl p-8">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-8 h-8 bg-slate-50 rounded-xl flex items-center justify-center">
                                <Shield size={16} className="text-slate-500" />
                            </div>
                            <h2 className="font-black text-slate-900">Seguridad</h2>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                                <div>
                                    <p className="text-sm font-bold text-slate-700">Contraseña</p>
                                    <p className="text-xs text-slate-400 mt-0.5">Última actualización desconocida</p>
                                </div>
                                <button
                                    type="button"
                                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 border border-slate-200 hover:bg-white hover:border-slate-300 transition-colors"
                                >
                                    Cambiar
                                </button>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                                <div>
                                    <p className="text-sm font-bold text-slate-700">Autenticación de dos factores</p>
                                    <p className="text-xs text-slate-400 mt-0.5">No configurada</p>
                                </div>
                                <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
                                    Recomendado
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
