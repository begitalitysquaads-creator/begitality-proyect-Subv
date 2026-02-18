-- Fix: agregar política UPDATE en storage.objects para que el upload pueda completarse.
-- Supabase Storage internamente realiza un INSERT seguido de un UPDATE al subir archivos.
-- Sin la política UPDATE, el upload se inicia pero falla al intentar finalizar.

CREATE POLICY "Users can update own files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'convocatoria-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'convocatoria-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
