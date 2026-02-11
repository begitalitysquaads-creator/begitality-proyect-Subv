-- Bucket para PDFs de bases de convocatoria (privado)
INSERT INTO storage.buckets (id, name, public)
VALUES ('convocatoria-files', 'convocatoria-files', false)
ON CONFLICT (id) DO NOTHING;

-- Ruta esperada en el bucket: {user_id}/{project_id}/{filename}
-- Solo el dueño puede subir en su carpeta
CREATE POLICY "Users can upload to own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'convocatoria-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Solo el dueño puede leer sus archivos
CREATE POLICY "Users can read own files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'convocatoria-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Solo el dueño puede borrar sus archivos
CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'convocatoria-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
