"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import * as Label from "@radix-ui/react-label";
import { cn } from "@/lib/utils";

export default function NewProjectPage() {
  const [name, setName] = useState("");
  const [grantName, setGrantName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Sesión no válida");
      setLoading(false);
      return;
    }
    const { data, error: err } = await supabase
      .from("projects")
      .insert({
        user_id: user.id,
        name: name || "Sin título",
        grant_name: grantName || "Convocatoria",
      })
      .select("id")
      .single();
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    router.push(`/dashboard/projects/${data.id}`);
    router.refresh();
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <header className="flex items-center gap-4">
        <Link
          href="/dashboard"
          className="p-2 hover:bg-white rounded-full border border-slate-200 transition-all"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-slate-900">
            Nuevo proyecto
          </h1>
          <p className="text-slate-500 text-sm">
            Crea un espacio de trabajo para esta convocatoria
          </p>
        </div>
      </header>

      <form
        onSubmit={handleSubmit}
        className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm space-y-6"
      >
        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm">
            {error}
          </div>
        )}
        <div className="space-y-2">
          <Label.Root htmlFor="name" className="text-sm font-bold text-slate-700">
            Nombre del proyecto
          </Label.Root>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={cn(
              "w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50",
              "focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            )}
            placeholder="Ej: Begitality AI Expansion"
          />
        </div>
        <div className="space-y-2">
          <Label.Root
            htmlFor="grantName"
            className="text-sm font-bold text-slate-700"
          >
            Nombre de la convocatoria
          </Label.Root>
          <input
            id="grantName"
            type="text"
            value={grantName}
            onChange={(e) => setGrantName(e.target.value)}
            className={cn(
              "w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50",
              "focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            )}
            placeholder="Ej: ICEX Next - Convocatoria 2024"
          />
        </div>
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-500 disabled:opacity-60"
          >
            {loading ? "Creando…" : "Crear proyecto"}
          </button>
          <Link
            href="/dashboard"
            className="px-6 py-3 border border-slate-200 rounded-2xl font-bold text-slate-600 hover:bg-slate-50"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
