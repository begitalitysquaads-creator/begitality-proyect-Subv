"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Cloud,
  CloudOff,
  Loader2,
  CheckCircle2,
  ExternalLink,
  Unplug,
} from "lucide-react";

interface GoogleDriveButtonProps {
  projectId: string;
  /** URL actual del proyecto para redirect después de OAuth */
  returnUrl: string;
}

type ConnectionStatus = "checking" | "connected" | "disconnected";
type UploadStatus = "idle" | "uploading" | "success" | "error";

interface UploadResult {
  webViewLink: string;
  fileName: string;
}

export function GoogleDriveButton({
  projectId,
  returnUrl,
}: GoogleDriveButtonProps) {
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("checking");
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [selectedFormat, setSelectedFormat] = useState<"pdf" | "docx">("pdf");

  // Verificar conexión con Google Drive al montar
  const checkConnection = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/google/status", {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setConnectionStatus(data.connected ? "connected" : "disconnected");
      } else {
        setConnectionStatus("disconnected");
      }
    } catch {
      setConnectionStatus("disconnected");
    }
  }, []);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  // Detectar si acabamos de conectar (query param google_connected=true)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("google_connected") === "true") {
      setConnectionStatus("connected");
      // Limpiar el query param de la URL
      const url = new URL(window.location.href);
      url.searchParams.delete("google_connected");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  const handleConnect = () => {
    const url = `/api/auth/google?returnUrl=${encodeURIComponent(returnUrl)}`;
    window.location.href = url;
  };

  const handleDisconnect = async () => {
    try {
      await fetch("/api/auth/google/status", {
        method: "DELETE",
        credentials: "include",
      });
      setConnectionStatus("disconnected");
      setUploadResult(null);
      setUploadStatus("idle");
    } catch {
      // Ignorar errores
    }
  };

  const handleUpload = async () => {
    setUploadStatus("uploading");
    setErrorMessage("");
    setUploadResult(null);

    try {
      const res = await fetch("/api/export/drive", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, format: selectedFormat }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.code === "GOOGLE_NOT_CONNECTED") {
          setConnectionStatus("disconnected");
          setUploadStatus("error");
          setErrorMessage(
            "Tu conexión con Google Drive ha expirado. Conéctate de nuevo."
          );
          return;
        }
        throw new Error(data.error || "Error al subir a Google Drive");
      }

      setUploadResult({
        webViewLink: data.webViewLink,
        fileName: data.fileName,
      });
      setUploadStatus("success");
    } catch (err) {
      setUploadStatus("error");
      setErrorMessage(
        err instanceof Error ? err.message : "Error desconocido"
      );
    }
  };

  // Estado: verificando conexión
  if (connectionStatus === "checking") {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-slate-50 rounded-xl">
            <Loader2 size={24} className="animate-spin text-slate-400" />
          </div>
          <div>
            <h4 className="font-bold text-slate-900">Google Drive</h4>
            <p className="text-xs text-slate-500">
              Verificando conexión...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Estado: no conectado
  if (connectionStatus === "disconnected") {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-slate-50 rounded-xl text-slate-400">
            <CloudOff size={24} />
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-slate-900">Google Drive</h4>
            <p className="text-xs text-slate-500">
              Conecta tu cuenta para guardar directamente en Drive
            </p>
          </div>
        </div>
        {errorMessage && (
          <p className="text-xs text-red-500 bg-red-50 p-2 rounded-lg">
            {errorMessage}
          </p>
        )}
        <button
          onClick={handleConnect}
          className="w-full py-3 bg-white border-2 border-slate-200 hover:border-blue-500 hover:bg-blue-50 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 text-slate-700 hover:text-blue-600"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden>
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Conectar con Google Drive
        </button>
      </div>
    );
  }

  // Estado: conectado
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
          <Cloud size={24} />
        </div>
        <div className="flex-1">
          <h4 className="font-bold text-slate-900">Google Drive</h4>
          <p className="text-xs text-emerald-600 font-medium">
            Cuenta conectada
          </p>
        </div>
        <button
          onClick={handleDisconnect}
          title="Desconectar Google Drive"
          className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
        >
          <Unplug size={16} />
        </button>
      </div>

      {/* Selector de formato */}
      <div className="flex gap-2">
        <button
          onClick={() => setSelectedFormat("pdf")}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
            selectedFormat === "pdf"
              ? "bg-blue-50 text-blue-600 border border-blue-200"
              : "bg-slate-50 text-slate-500 border border-slate-100 hover:border-slate-200"
          }`}
        >
          PDF
        </button>
        <button
          onClick={() => setSelectedFormat("docx")}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
            selectedFormat === "docx"
              ? "bg-blue-50 text-blue-600 border border-blue-200"
              : "bg-slate-50 text-slate-500 border border-slate-100 hover:border-slate-200"
          }`}
        >
          DOCX
        </button>
      </div>

      {/* Botón de subida */}
      <button
        onClick={handleUpload}
        disabled={uploadStatus === "uploading"}
        className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-70 rounded-xl font-bold text-sm text-white transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
      >
        {uploadStatus === "uploading" ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Subiendo a Drive...
          </>
        ) : (
          <>
            <Cloud size={16} />
            Guardar en Google Drive
          </>
        )}
      </button>

      {/* Resultado exitoso */}
      {uploadStatus === "success" && uploadResult && (
        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl space-y-2 animate-in zoom-in-95">
          <div className="flex items-center gap-2 text-emerald-700">
            <CheckCircle2 size={18} />
            <span className="font-bold text-sm">Subido a Google Drive</span>
          </div>
          <p className="text-xs text-emerald-600 truncate">
            {uploadResult.fileName}
          </p>
          <a
            href={uploadResult.webViewLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-500 transition-colors"
          >
            Abrir en Drive <ExternalLink size={12} />
          </a>
        </div>
      )}

      {/* Error */}
      {uploadStatus === "error" && errorMessage && (
        <div className="p-3 bg-red-50 border border-red-100 rounded-xl">
          <p className="text-xs text-red-600">{errorMessage}</p>
        </div>
      )}
    </div>
  );
}
