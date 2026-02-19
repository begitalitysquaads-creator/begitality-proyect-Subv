"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  LayoutDashboard,
  FileText,
  Briefcase,
  Zap,
  LogOut,
  User,
  Settings,
  ChevronUp,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import * as Separator from "@radix-ui/react-separator";
import * as ScrollArea from "@radix-ui/react-scroll-area";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Panel" },
  { href: "/dashboard/projects", icon: FileText, label: "Proyectos" },
  { href: "/dashboard/history", icon: Briefcase, label: "Histórico" },
  { href: "/dashboard/profile", icon: User, label: "Mi Perfil" },
];

const PLAN_LABELS: Record<string, string> = {
  starter: "Starter",
  consultant: "Consultant",
  senior_consultant: "Senior Consultant",
  enterprise: "Enterprise",
};

const PLAN_COLORS: Record<string, string> = {
  starter: "text-slate-500",
  consultant: "text-blue-600",
  senior_consultant: "text-violet-600",
  enterprise: "text-amber-600",
};

// ─── Avatar ───────────────────────────────────────────────────────────────────

function UserAvatar({
  avatarUrl,
  fullName,
  email,
  size = "md",
}: {
  avatarUrl?: string | null;
  fullName?: string | null;
  email?: string | null;
  size?: "sm" | "md";
}) {
  const initials = (() => {
    if (fullName) {
      const parts = fullName.trim().split(" ");
      return parts.length >= 2
        ? (parts[0][0] + parts[1][0]).toUpperCase()
        : parts[0].slice(0, 2).toUpperCase();
    }
    if (email) return email[0].toUpperCase();
    return "U";
  })();

  const sizeClass = size === "sm" ? "w-8 h-8 text-xs" : "w-10 h-10 text-sm";

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={fullName ?? "Avatar"}
        className={cn("rounded-full object-cover shrink-0", sizeClass)}
      />
    );
  }
  return (
    <div
      className={cn(
        "rounded-full bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center text-white font-black shrink-0",
        sizeClass
      )}
    >
      {initials}
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [profile, setProfile] = useState<{
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
    plan: string;
  } | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Cargar perfil del usuario
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from("profiles")
        .select("full_name, email, avatar_url, plan")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          if (data) setProfile(data);
          else {
            // Fallback desde auth metadata
            setProfile({
              full_name: user.user_metadata?.full_name ?? null,
              email: user.email ?? null,
              avatar_url: null,
              plan: "senior_consultant",
            });
          }
        });
    });
  }, []);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const planLabel = profile ? (PLAN_LABELS[profile.plan] ?? profile.plan) : "Cargando…";
  const planColor = profile ? (PLAN_COLORS[profile.plan] ?? "text-slate-500") : "text-slate-400";
  const displayName = profile?.full_name ?? profile?.email ?? "Usuario";
  const shortName = displayName.split(" ")[0];

  return (
    <aside className="w-64 border-r border-slate-200 bg-white/80 backdrop-blur-md flex flex-col fixed h-screen z-10">
      {/* Logo */}
      <div className="p-8 flex items-center gap-3">
        <Link
          href="/dashboard"
          className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-600/20"
        >
          <Zap size={24} fill="currentColor" />
        </Link>
        <span className="font-black text-2xl tracking-tighter text-slate-900">Begitality</span>
      </div>

      {/* Navegación */}
      <ScrollArea.Root className="flex-1 px-4 py-4">
        <ScrollArea.Viewport className="h-full w-full">
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all font-bold text-sm",
                    isActive
                      ? "bg-blue-50 text-blue-600"
                      : "text-slate-400 hover:text-slate-900 hover:bg-slate-50"
                  )}
                >
                  <item.icon size={20} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar orientation="vertical" className="w-1" />
      </ScrollArea.Root>

      <Separator.Root className="shrink-0 bg-slate-200 h-px" />

      {/* Sección de usuario */}
      <div className="p-4">
        <div className="relative" ref={dropdownRef}>
          {/* Dropdown menu */}
          {dropdownOpen && (
            <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-900/10 overflow-hidden animate-in slide-in-from-bottom-2 duration-200 z-50">
              {/* Header del dropdown */}
              <div className="p-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <UserAvatar
                    avatarUrl={profile?.avatar_url}
                    fullName={profile?.full_name}
                    email={profile?.email}
                    size="md"
                  />
                  <div className="min-w-0">
                    <p className="font-black text-slate-900 text-sm truncate">{displayName}</p>
                    <p className="text-xs text-slate-400 truncate">{profile?.email}</p>
                    <p className={cn("text-xs font-bold mt-0.5", planColor)}>{planLabel}</p>
                  </div>
                </div>
              </div>

              {/* Opciones */}
              <div className="p-2">
                <Link
                  href="/dashboard/profile"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                >
                  <User size={16} className="text-slate-400" />
                  Mi perfil
                </Link>
                <button
                  type="button"
                  onClick={() => setDropdownOpen(false)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                >
                  <Settings size={16} className="text-slate-400" />
                  Configuración
                </button>
                <Separator.Root className="bg-slate-100 h-px my-1" />
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-red-500 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={16} />
                  Cerrar sesión
                </button>
              </div>
            </div>
          )}

          {/* Botón del usuario (trigger del dropdown) */}
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className={cn(
              "w-full flex items-center gap-3 p-3 rounded-2xl transition-all",
              dropdownOpen
                ? "bg-slate-100 border border-slate-200"
                : "hover:bg-slate-50 border border-transparent"
            )}
          >
            <UserAvatar
              avatarUrl={profile?.avatar_url}
              fullName={profile?.full_name}
              email={profile?.email}
              size="sm"
            />
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-black text-slate-900 truncate">{shortName}</p>
              <p className={cn("text-xs font-bold truncate", planColor)}>{planLabel}</p>
            </div>
            <ChevronUp
              size={16}
              className={cn(
                "text-slate-400 shrink-0 transition-transform duration-200",
                dropdownOpen ? "rotate-180" : ""
              )}
            />
          </button>
        </div>
      </div>
    </aside>
  );
}
