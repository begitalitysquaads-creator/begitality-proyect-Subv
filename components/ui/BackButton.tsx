"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface BackButtonProps {
  className?: string;
  iconClassName?: string;
  variant?: "default" | "minimal";
}

export function BackButton({ className, iconClassName, variant = "default" }: BackButtonProps) {
  const router = useRouter();

  if (variant === "minimal") {
    return (
      <button
        onClick={() => router.back()}
        className={cn("text-slate-400 hover:text-blue-600 transition-colors", className)}
      >
        <ArrowLeft size={20} className={iconClassName} />
      </button>
    );
  }

  return (
    <button
      onClick={() => router.back()}
      className={cn(
        "p-4 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-blue-600 transition-all shadow-sm group active:scale-95",
        className
      )}
    >
      <ArrowLeft size={20} className={cn("group-hover:-translate-x-1 transition-transform", iconClassName)} />
    </button>
  );
}
