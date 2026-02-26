"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Camera, Loader2, User, Link2, Upload, CheckCircle2, Globe, Monitor, Sparkles, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface AvatarUploadProps {
  currentUrl?: string;
  onUploadComplete: (url: string) => void;
  userId: string;
}

export function AvatarUpload({ currentUrl, onUploadComplete, userId }: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [mode, setMode] = useState<'upload' | 'url'>('upload');
  const [urlInput, setUrlInput] = useState(currentUrl || "");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona una imagen válida.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert('La imagen debe ser menor a 2MB.');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    await uploadAvatar(file);
  }

  async function uploadAvatar(file: File) {
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      onUploadComplete(publicUrl);
    } catch (error: any) {
      alert('Error subiendo avatar: ' + error.message);
    } finally {
      setUploading(false);
    }
  }

  const handleUrlSubmit = () => {
    if (urlInput.trim()) {
      onUploadComplete(urlInput.trim());
      setPreviewUrl(urlInput.trim());
    }
  };

  return (
    <div className="w-full animate-in fade-in duration-700">
      <div className="flex flex-col lg:flex-row items-center gap-12">
        {/* Avatar Preview Section (Sin sombreado de fondo) */}
        <div className="relative shrink-0">
          <div 
            className="relative w-40 h-40 rounded-[3.5rem] p-1.5 bg-slate-100 relative z-10"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >

            <div className="w-full h-full rounded-[3rem] bg-white overflow-hidden relative border-4 border-white shadow-inner">
              {(previewUrl || currentUrl) ? (
                <img 
                  src={previewUrl || currentUrl} 
                  className={cn("w-full h-full object-cover transition-all duration-700", uploading && "opacity-40 blur-sm", isHovered && "scale-110")} 
                />
              ) : (
                <div className="w-full h-full bg-slate-50 flex flex-col items-center justify-center text-slate-200">
                  <User size={56} strokeWidth={1.5} />
                </div>
              )}
              
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/40 backdrop-blur-md">
                  <Loader2 className="animate-spin text-blue-600" size={32} />
                </div>
              )}
              
              <div className={cn(
                "absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] flex flex-col items-center justify-center gap-2 transition-all duration-300",
                isHovered ? "opacity-100" : "opacity-0 pointer-events-none"
              )}>
                <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md border border-white/30">
                  <Camera className="text-white" size={24} />
                </div>
                <p className="text-[9px] font-black text-white uppercase tracking-[0.2em]">Actualizar</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Panel Section */}
        <div className="flex-grow w-full max-w-2xl space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-100 pb-6">
            <div className="text-center sm:text-left">
              <h4 className="text-2xl font-black text-slate-900 tracking-tighter uppercase flex items-center gap-3">
                <ImageIcon className="text-blue-600" size={24} />
                Imagen de Perfil
              </h4>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">Personalización de Identidad</p>
            </div>

            <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200/50 shadow-inner shrink-0">
              <button
                type="button"
                onClick={() => setMode('upload')}
                className={cn(
                  "flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  mode === 'upload' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                )}
              >
                <Monitor size={14} /> Equipo
              </button>
              <button
                type="button"
                onClick={() => setMode('url')}
                className={cn(
                  "flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  mode === 'url' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                )}
              >
                <Globe size={14} /> Enlace
              </button>
            </div>
          </div>

          <div className="relative h-[80px]"> {/* Stable Height Container */}
            {mode === 'upload' ? (
              <div className="animate-in slide-in-from-top-4 duration-500 h-full">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-full bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center gap-4 text-slate-400 font-bold hover:border-blue-500 hover:bg-white hover:text-blue-600 transition-all group"
                >
                  <Upload size={20} className="group-hover:scale-110 transition-transform" />
                  <span className="text-[11px] uppercase tracking-[0.2em] font-black">Seleccionar archivo (Máx 2MB)</span>
                </button>
              </div>
            ) : (
              <div className="flex gap-4 animate-in slide-in-from-top-4 duration-500 h-full">
                <div className="relative flex-grow group h-full">
                  <Link2 className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-600 transition-colors" size={20} />
                  <input
                    type="text"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://ejemplo.com/mi-avatar.jpg"
                    className="w-full h-full pl-16 pr-6 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-8 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleUrlSubmit}
                  className="px-8 h-full bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-all active:scale-95 shadow-xl flex items-center justify-center gap-3 shrink-0"
                >
                  <CheckCircle2 size={18} />
                  Aplicar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
    </div>
  );
}
