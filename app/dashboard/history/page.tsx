import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  FileText,
  Upload,
  Sparkles,
  Wand2,
  Download,
  ArrowRightLeft,
  FolderPlus,
  Clock,
} from "lucide-react";

const ACTION_CONFIG: Record<
  string,
  { icon: typeof FileText; color: string; bg: string }
> = {
  project_created: {
    icon: FolderPlus,
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  status_changed: {
    icon: ArrowRightLeft,
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
  convocatoria_uploaded: {
    icon: Upload,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  sections_generated: {
    icon: Sparkles,
    color: "text-violet-600",
    bg: "bg-violet-50",
  },
  section_content_generated: {
    icon: Wand2,
    color: "text-purple-600",
    bg: "bg-purple-50",
  },
  exported_pdf: {
    icon: Download,
    color: "text-red-600",
    bg: "bg-red-50",
  },
  exported_docx: {
    icon: Download,
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
};

const DEFAULT_CONFIG = {
  icon: Clock,
  color: "text-slate-600",
  bg: "bg-slate-50",
};

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Ahora mismo";
  if (diffMins < 60) return `Hace ${diffMins} min`;
  if (diffHours < 24) return `Hace ${diffHours}h`;
  if (diffDays < 7) return `Hace ${diffDays} día${diffDays > 1 ? "s" : ""}`;
  return date.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

interface ActivityItem {
  id: string;
  action: string;
  description: string | null;
  metadata: Record<string, unknown> | null;
  project_id: string | null;
  created_at: string;
}

function groupByDate(
  items: ActivityItem[]
): Record<string, ActivityItem[]> {
  const groups: Record<string, ActivityItem[]> = {};
  for (const item of items) {
    const date = new Date(item.created_at);
    const key = date.toLocaleDateString("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }
  return groups;
}

export default async function HistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Obtener actividad reciente (últimos 100 registros)
  const { data: activities } = await supabase
    .from("activity_log")
    .select("id, action, description, metadata, project_id, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  // Obtener nombres de proyectos referenciados
  const projectIds = [
    ...new Set(
      (activities ?? [])
        .map((a) => a.project_id)
        .filter(Boolean)
    ),
  ];

  let projectNames: Record<string, string> = {};
  if (projectIds.length > 0) {
    const { data: projects } = await supabase
      .from("projects")
      .select("id, name")
      .in("id", projectIds);
    projectNames = Object.fromEntries(
      (projects ?? []).map((p) => [p.id, p.name])
    );
  }

  const grouped = groupByDate((activities ?? []) as ActivityItem[]);

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in duration-500">
      <header>
        <h1 className="text-5xl font-black text-slate-900 tracking-tighter">
          Histórico
        </h1>
        <p className="text-slate-500 font-medium mt-2 text-lg">
          Toda la actividad de tus proyectos
        </p>
      </header>

      {!activities?.length ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Clock size={32} className="text-slate-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">
            Sin actividad aún
          </h2>
          <p className="text-slate-500 max-w-sm mx-auto">
            Cuando empieces a trabajar en tus proyectos, toda tu actividad
            aparecerá aquí.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([date, items]) => (
            <div key={date}>
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 first-letter:uppercase">
                {date}
              </h3>
              <div className="space-y-1">
                {items.map((activity) => {
                  const config =
                    ACTION_CONFIG[activity.action] ?? DEFAULT_CONFIG;
                  const Icon = config.icon;
                  const projectName = activity.project_id
                    ? projectNames[activity.project_id]
                    : null;

                  return (
                    <div
                      key={activity.id}
                      className="flex items-start gap-4 p-4 rounded-2xl hover:bg-white hover:shadow-sm transition-all group"
                    >
                      <div
                        className={`p-2.5 rounded-xl ${config.bg} ${config.color} shrink-0 mt-0.5`}
                      >
                        <Icon size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-900">
                          {activity.description}
                        </p>
                        {projectName && activity.project_id && (
                          <Link
                            href={`/dashboard/projects/${activity.project_id}`}
                            className="text-xs text-blue-600 font-medium hover:underline mt-0.5 inline-block"
                          >
                            {projectName}
                          </Link>
                        )}
                      </div>
                      <span className="text-xs text-slate-400 font-medium shrink-0 mt-1">
                        {formatRelativeDate(activity.created_at)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
