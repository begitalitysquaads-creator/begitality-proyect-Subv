"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Briefcase,
  Users,
  User,
  Zap,
  LogOut,
  Shield,
  Settings,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import * as Avatar from "@radix-ui/react-avatar";
import * as Separator from "@radix-ui/react-separator";
import * as ScrollArea from "@radix-ui/react-scroll-area";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Panel" },
  { href: "/dashboard/projects", icon: FileText, label: "Proyectos" },
  { href: "/dashboard/clients", icon: Users, label: "Clientes" },
  { href: "/dashboard/history", icon: Briefcase, label: "Histórico" },
];

export function AppSidebar() {
  const pathname = usePathname();
  const [profile, setProfile] = useState<{name: string, role: string} | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function getProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("full_name, role")
        .eq("id", user.id)
        .single();
      
      if (data) {
        setProfile({
          name: data.full_name || "Consultor",
          role: data.role || "junior_consultant"
        });
      }
    }
    getProfile();
  }, [supabase]);

  const roleLabels: Record<string, string> = {
    admin: "Administrador",
    senior_consultant: "Consultor Senior",
    junior_consultant: "Consultor Junior",
    auditor: "Auditor Técnico",
    viewer: "Lector"
  };

  const roleProgress: Record<string, string> = {
    admin: "w-full",
    senior_consultant: "w-3/4",
    junior_consultant: "w-1/4",
    auditor: "w-1/2",
    viewer: "w-[10%]"
  };

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <aside className="w-64 border-r border-slate-200 bg-white/80 backdrop-blur-md flex flex-col fixed h-screen z-10">
      <div className="p-8 flex items-center gap-3">
        <Link
          href="/dashboard"
          className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-600/20"
        >
          <Zap size={24} fill="currentColor" />
        </Link>
        <span className="font-black text-2xl tracking-tighter text-slate-900 uppercase">
          Begitality
        </span>
      </div>

      <ScrollArea.Root className="flex-1 px-4 py-4">
        <ScrollArea.Viewport className="h-full w-full">
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
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

      <div className="p-6 space-y-2">
        {profile?.role === 'admin' && (
          <Link
            href="/dashboard/admin"
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all font-bold text-sm mb-2",
              pathname === "/dashboard/admin"
                ? "bg-slate-900 text-white shadow-lg shadow-slate-900/20"
                : "text-slate-400 hover:text-slate-900 hover:bg-slate-50"
            )}
          >
            <Shield size={20} className={pathname === "/dashboard/admin" ? "text-blue-400" : ""} />
            Administración
          </Link>
        )}

        <Link
          href="/dashboard/profile"
          className={cn(
            "w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all font-bold text-sm",
            pathname === "/dashboard/profile"
              ? "bg-blue-50 text-blue-600"
              : "text-slate-400 hover:text-slate-900 hover:bg-slate-50"
          )}
        >
          <User size={20} />
          Mi Perfil
        </Link>

        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
            Rango Actual
          </p>
          <p className="text-sm font-bold text-slate-900">
            {profile ? roleLabels[profile.role] : "Cargando..."}
          </p>
          <div className="mt-2 h-1 w-full bg-slate-200 rounded-full overflow-hidden">
            <div className={cn("h-full bg-blue-600 rounded-full transition-all duration-1000", profile ? roleProgress[profile.role] : "w-0")} />
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="mt-4 w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-slate-500 hover:text-red-600 hover:bg-red-50 font-bold text-sm transition-all"
        >
          <LogOut size={18} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
