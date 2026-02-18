"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText, Loader2, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const BUCKET = "convocatoria-files";
const MAX_SIZE_MB = 50;
const ACCEPT = "application/pdf";

interface BaseFile {
  id: string;
  name: string;
  file_path: string | null;
  file_size: number | null;
  created_at: string;
}

export function CargarBasesConvocatoria({
  projectId,
  files: initialFiles,
}: {
  projectId: string;
  files: BaseFile[];
}) {
  const [files, setFiles] = useState<BaseFile[]>(initialFiles);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();
  const router = useRouter();

  const refreshFiles = useCallback(async () => {
    const { data } = await supabase
      .from("convocatoria_bases")
      .select("id, name, file_path, file_size, created_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    setFiles(data ?? []);
    router.refresh(); // Notificar a la página de los cambios
  }, [projectId, router]);

  const handleUpload = useCallback(
    async (fileList: FileList | null) => {
      // CAPTURA INMEDIATA: Convertimos a Array antes de cualquier await
      const filesToUpload = fileList ? Array.from(fileList) : [];
      if (filesToUpload.length === 0) return;
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("Sesión expirada. Vuelve a iniciar sesión.");
        return;
      }
      
      setError(null);
      setUploading(true);

      console.log(`Iniciando proceso para ${filesToUpload.length} archivos...`);

      for (const file of filesToUpload) {
        // Validación básica de tamaño
        if (file.size > MAX_SIZE_MB * 1024 * 1024) {
          setError(`El archivo ${file.name} es demasiado grande (máx ${MAX_SIZE_MB}MB).`);
          continue;
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).slice(2)}-${Date.now()}.${fileExt}`;
        const path = `${user.id}/${projectId}/${fileName}`;
        
        console.log(`Subiendo: ${file.name} a la ruta: ${path}`);

        const { error: uploadErr } = await supabase.storage.from(BUCKET).upload(path, file, {
          cacheControl: "3600",
          upsert: false,
        });

        if (uploadErr) {
          console.error("Error en Supabase Storage:", uploadErr);
          setError(`Error en ${file.name}: ${uploadErr.message}`);
          break; // Detener en caso de error de permisos/storage
        }

        const { error: insertErr } = await supabase.from("convocatoria_bases").insert({
          project_id: projectId,
          name: file.name,
          file_path: path,
          file_size: file.size,
        });

        if (insertErr) {
          console.error("Error en Base de Datos:", insertErr);
          setError(`Error al registrar ${file.name}: ${insertErr.message}`);
          break;
        }
      }
      
      await refreshFiles();
      setUploading(false);
    },
    [projectId, supabase, refreshFiles]
  );

  const handleDelete = useCallback(
    async (id: string, filePath: string | null) => {
      setError(null);
      if (filePath) {
        await supabase.storage.from(BUCKET).remove([filePath]);
      }
      const { error: deleteErr } = await supabase.from("convocatoria_bases").delete().eq("id", id);
      if (deleteErr) setError(deleteErr.message);
      else await refreshFiles();
    },
    [supabase, refreshFiles]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      handleUpload(e.dataTransfer.files);
    },
    [handleUpload]
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
  }, []);

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-8">
      <h2 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
        <Upload size={18} />
        Cargar bases de la convocatoria
      </h2>
      <p className="text-slate-500 text-sm mb-4">
        Sube los PDFs de la convocatoria (máx. {MAX_SIZE_MB} MB por archivo). La IA usará su contenido como contexto.
      </p>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm">
          {error}
        </div>
      )}

      <label
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className={cn(
          "block border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-colors",
          dragging ? "border-blue-400 bg-blue-50/50 text-blue-700" : "border-slate-200 text-slate-400 hover:border-slate-300 hover:bg-slate-50/50"
        )}
      >
        <input
          type="file"
          accept={ACCEPT}
          multiple
          className="hidden"
          disabled={uploading}
          onChange={(e) => {
            handleUpload(e.target.files);
            e.target.value = "";
          }}
        />
        {uploading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 size={24} className="animate-spin" />
            Subiendo…
          </span>
        ) : (
          <>Arrastra PDFs aquí o haz clic para seleccionar</>
        )}
      </label>

      {files.length > 0 && (
        <ul className="mt-6 space-y-2">
          {files.map((f) => (
            <li
              key={f.id}
              className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100"
            >
              <div className="flex items-center gap-3 min-w-0">
                <FileText size={20} className="text-slate-400 shrink-0" />
                <span className="font-medium text-slate-900 truncate" title={f.name}>
                  {f.name}
                </span>
                {f.file_size != null && (
                  <span className="text-slate-400 text-sm shrink-0">
                    {(f.file_size / 1024).toFixed(1)} KB
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleDelete(f.id, f.file_path)}
                className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                aria-label="Eliminar"
              >
                <Trash2 size={18} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
