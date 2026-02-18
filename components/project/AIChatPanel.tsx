"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  MessageCircle,
  Send,
  Loader2,
  Trash2,
  X,
  Bot,
  User,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id?: string;
  role: "user" | "assistant";
  content: string;
  created_at?: string;
}

const SUGGESTIONS = [
  "¿Cuáles son los criterios de evaluación?",
  "¿Qué presupuesto máximo se puede solicitar?",
  "¿Cómo debería enfocar la sección de innovación?",
  "Resume los requisitos principales de la convocatoria",
];

export function AIChatPanel({ projectId }: { projectId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasLoadedRef = useRef(false);

  /* ── Scroll al último mensaje ── */
  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }, []);

  /* ── Cargar historial al abrir ── */
  useEffect(() => {
    if (!isOpen || hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    setLoading(true);
    fetch(`/api/projects/${projectId}/chat`)
      .then((res) => res.json())
      .then((data) => {
        if (data.messages?.length) {
          setMessages(
            data.messages.map((m: ChatMessage) => ({
              id: m.id,
              role: m.role,
              content: m.content,
              created_at: m.created_at,
            }))
          );
        }
      })
      .catch(() => {})
      .finally(() => {
        setLoading(false);
        scrollToBottom();
      });
  }, [isOpen, projectId, scrollToBottom]);

  /* ── Enviar mensaje ── */
  const handleSend = useCallback(
    async (text?: string) => {
      const msg = (text ?? input).trim();
      if (!msg || sending) return;

      setError(null);
      setInput("");
      const userMsg: ChatMessage = { role: "user", content: msg };
      setMessages((prev) => [...prev, userMsg]);
      scrollToBottom();
      setSending(true);

      try {
        const res = await fetch(`/api/projects/${projectId}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: msg }),
        });

        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Error al obtener respuesta");
          return;
        }

        const aiMsg: ChatMessage = {
          role: "assistant",
          content: data.content,
        };
        setMessages((prev) => [...prev, aiMsg]);
        scrollToBottom();
      } catch {
        setError("Error de conexión");
      } finally {
        setSending(false);
        inputRef.current?.focus();
      }
    },
    [input, sending, projectId, scrollToBottom]
  );

  /* ── Limpiar historial ── */
  const handleClear = useCallback(async () => {
    try {
      await fetch(`/api/projects/${projectId}/chat`, { method: "DELETE" });
      setMessages([]);
    } catch {
      // silently fail
    }
  }, [projectId]);

  /* ── Botón flotante cuando está cerrado ── */
  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 z-50",
          "w-14 h-14 rounded-full shadow-lg shadow-violet-500/25",
          "bg-gradient-to-r from-violet-600 to-blue-600 text-white",
          "flex items-center justify-center",
          "hover:shadow-xl hover:shadow-violet-500/30 hover:scale-105",
          "transition-all duration-200"
        )}
        title="Abrir asistente IA"
      >
        <MessageCircle size={24} />
      </button>
    );
  }

  /* ── Panel de chat abierto ── */
  return (
    <div
      className={cn(
        "fixed bottom-6 right-6 z-50",
        "w-[400px] h-[600px] max-h-[80vh]",
        "bg-white rounded-3xl shadow-2xl shadow-slate-900/10 border border-slate-200",
        "flex flex-col overflow-hidden",
        "animate-in slide-in-from-bottom-4 fade-in duration-300"
      )}
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-violet-600 to-blue-600 text-white rounded-t-3xl">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            <Sparkles size={16} />
          </div>
          <div>
            <h3 className="font-bold text-sm">Asistente IA</h3>
            <p className="text-[11px] text-white/70">
              Pregunta sobre tu convocatoria
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
              title="Limpiar chat"
            >
              <Trash2 size={14} />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
            title="Cerrar"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {loading && (
          <div className="flex justify-center py-8">
            <Loader2 size={24} className="animate-spin text-slate-400" />
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div className="text-center py-6 space-y-4">
            <div className="w-14 h-14 bg-gradient-to-br from-violet-100 to-blue-100 rounded-2xl flex items-center justify-center mx-auto">
              <Bot size={28} className="text-violet-600" />
            </div>
            <div>
              <p className="font-bold text-slate-900 text-sm">
                ¡Hola! Soy tu asistente IA
              </p>
              <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                Puedo ayudarte con dudas sobre la convocatoria, requisitos,
                criterios de evaluación y cómo redactar tu memoria.
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">
                Sugerencias
              </p>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleSend(s)}
                  className={cn(
                    "block w-full text-left px-3 py-2 rounded-xl text-xs",
                    "bg-slate-50 border border-slate-100 text-slate-600",
                    "hover:bg-violet-50 hover:border-violet-200 hover:text-violet-700",
                    "transition-colors"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={msg.id ?? i}
            className={cn(
              "flex gap-2.5",
              msg.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center shrink-0 mt-0.5">
                <Bot size={14} className="text-white" />
              </div>
            )}
            <div
              className={cn(
                "max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed",
                msg.role === "user"
                  ? "bg-gradient-to-r from-violet-600 to-blue-600 text-white rounded-br-md"
                  : "bg-slate-100 text-slate-800 rounded-bl-md"
              )}
            >
              {msg.content.split("\n").map((line, j) => (
                <span key={j}>
                  {line}
                  {j < msg.content.split("\n").length - 1 && <br />}
                </span>
              ))}
            </div>
            {msg.role === "user" && (
              <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                <User size={14} className="text-slate-600" />
              </div>
            )}
          </div>
        ))}

        {sending && (
          <div className="flex gap-2.5 justify-start">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center shrink-0">
              <Bot size={14} className="text-white" />
            </div>
            <div className="bg-slate-100 px-4 py-3 rounded-2xl rounded-bl-md">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="px-3 py-2 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs">
            {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Input ── */}
      <div className="border-t border-slate-100 px-4 py-3 bg-slate-50/50">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex gap-2"
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe tu pregunta..."
            disabled={sending}
            className={cn(
              "flex-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm",
              "focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500",
              "placeholder:text-slate-400 disabled:opacity-60"
            )}
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className={cn(
              "px-3.5 py-2.5 rounded-xl text-white font-bold text-sm",
              "bg-gradient-to-r from-violet-600 to-blue-600",
              "hover:from-violet-500 hover:to-blue-500",
              "disabled:opacity-40 transition-all",
              "flex items-center justify-center"
            )}
          >
            {sending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Send size={16} />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
