"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { AlertTriangle, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "info" | "warning";
  loading?: boolean;
  showCancel?: boolean;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  variant = "warning",
  loading = false,
  showCancel = true,
}: ConfirmDialogProps) {
  
  const colors = {
    danger: "bg-red-600 hover:bg-red-700 shadow-red-600/20 text-white",
    warning: "bg-amber-500 hover:bg-amber-600 shadow-amber-500/20 text-white",
    info: "bg-blue-600 hover:bg-blue-700 shadow-blue-600/20 text-white"
  };

  const icons = {
    danger: <X size={24} className="text-red-600" />,
    warning: <AlertTriangle size={24} className="text-amber-500" />,
    info: <Check size={24} className="text-blue-600" />
  };

  const bgIcons = {
    danger: "bg-red-50",
    warning: "bg-amber-50",
    info: "bg-blue-50"
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] animate-in fade-in duration-300" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-[2.5rem] p-10 shadow-2xl z-[201] outline-none animate-in zoom-in-95 duration-200">
          <div className="flex flex-col items-center text-center space-y-6">
            <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center shadow-inner", bgIcons[variant])}>
              {icons[variant]}
            </div>
            
            <div className="space-y-2">
              <Dialog.Title className="text-2xl font-black text-slate-900 tracking-tighter uppercase">
                {title}
              </Dialog.Title>
              <Dialog.Description className="text-slate-500 text-sm font-medium leading-relaxed">
                {description}
              </Dialog.Description>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full pt-4">
              {showCancel && (
                <button
                  onClick={() => onOpenChange(false)}
                  className="flex-1 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest text-slate-400 bg-slate-50 hover:bg-slate-100 transition-all order-2 sm:order-1"
                >
                  {cancelText}
                </button>
              )}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  onConfirm();
                }}
                disabled={loading}
                className={cn(
                  "flex-1 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2 order-1 sm:order-2",
                  colors[variant]
                )}
              >
                {loading && <X size={14} className="animate-spin" />}
                {confirmText}
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
