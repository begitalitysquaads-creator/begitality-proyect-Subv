-- 013_add_contact_person_to_clients.sql

ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS contact_name TEXT,
ADD COLUMN IF NOT EXISTS contact_position TEXT;
