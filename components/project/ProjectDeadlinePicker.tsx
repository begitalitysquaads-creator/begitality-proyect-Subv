"use client";

import { useState } from "react";
import { Calendar, Clock, Check, X, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { PremiumDatePicker } from "@/components/ui/PremiumDatePicker";

interface ProjectDeadlinePickerProps {
    projectId: string;
    initialDeadline: string | null;
}

export function ProjectDeadlinePicker({
    projectId,
    initialDeadline,
}: ProjectDeadlinePickerProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [deadline, setDeadline] = useState(initialDeadline || "");
    const [loading, setLoading] = useState(false);
    const supabase = createClient();
    const router = useRouter();

    const handleSave = async () => {
        setLoading(true);
        const { error } = await supabase
            .from("projects")
            .update({ project_deadline: deadline || null })
            .eq("id", projectId);

        if (!error) {
            setIsEditing(false);
            router.refresh();
        }
        setLoading(false);
    };

    if (isEditing) {
        return (
            <div className="flex items-center gap-2 animate-in fade-in zoom-in-95 duration-200">
                <PremiumDatePicker
                    value={deadline}
                    onChange={setDeadline}
                    showIcon={false}
                    className="py-1 px-3 text-[10px] min-w-[140px]"
                />
                <button
                    onClick={handleSave}
                    disabled={loading}
                    className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                >
                    {loading ? (
                        <Loader2 size={14} className="animate-spin" />
                    ) : (
                        <Check size={14} />
                    )}
                </button>
                <button
                    onClick={() => {
                        setIsEditing(false);
                        setDeadline(initialDeadline || "");
                    }}
                    disabled={loading}
                    className="p-1.5 bg-slate-50 text-slate-400 rounded-lg hover:bg-slate-200 transition-all"
                >
                    <X size={14} />
                </button>
            </div>
        );
    }

    return (
        <button
            onClick={() => setIsEditing(true)}
            className={cn(
                "flex items-center gap-1.5 transition-all group outline-none",
                initialDeadline
                    ? "text-blue-600 hover:text-blue-700"
                    : "text-slate-400 hover:text-slate-600"
            )}
        >
            <Clock size={12} className={cn(
                "transition-colors",
                initialDeadline ? "text-blue-500" : "text-slate-300 group-hover:text-slate-400"
            )} />
            <span className="text-[10px] font-black uppercase tracking-widest leading-none border-b border-transparent group-hover:border-current transition-all">
                {initialDeadline
                    ? `ENTREGA: ${new Date(initialDeadline).toLocaleDateString("es-ES", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                    })}`
                    : "ESTABLECER FECHA DE ENTREGA"}
            </span>
        </button>
    );
}
