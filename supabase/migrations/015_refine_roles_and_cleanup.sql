-- 015_refine_roles_and_cleanup.sql

-- 1. Update the user_role enum with more specific roles
-- We need to drop the old one if we want to change it significantly, 
-- or just add values. Dropping and recreating is cleaner if we handle data migration.
DO $$
BEGIN
  -- We assume 014 already created the type. We drop it to redefine.
  -- Warning: This requires casting columns that use it.
  ALTER TABLE public.profiles ALTER COLUMN role TYPE TEXT;
  DROP TYPE IF EXISTS user_role;
  CREATE TYPE user_role AS ENUM ('admin', 'senior_consultant', 'junior_consultant', 'auditor', 'viewer');
  ALTER TABLE public.profiles ALTER COLUMN role TYPE user_role USING role::user_role;
END $$;

-- 2. Migrate data from 'plan' if necessary, then drop 'plan'
-- Mapping: starter -> junior, consultant -> senior, etc.
UPDATE public.profiles 
SET role = CASE 
  WHEN plan = 'starter' THEN 'junior_consultant'::user_role
  WHEN plan = 'consultant' THEN 'senior_consultant'::user_role
  WHEN plan = 'enterprise' THEN 'admin'::user_role
  ELSE role
END;

-- 3. Drop the plan column as it's being replaced by role
ALTER TABLE public.profiles DROP COLUMN IF EXISTS plan;

-- 4. Set default role for new profiles
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'junior_consultant';
