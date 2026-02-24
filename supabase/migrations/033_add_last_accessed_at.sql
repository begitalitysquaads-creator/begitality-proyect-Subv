-- Add last_accessed_at to projects table
ALTER TABLE public.projects ADD COLUMN last_accessed_at TIMESTAMPTZ DEFAULT NOW();

-- Index for performance on dashboard sorting
CREATE INDEX idx_projects_last_accessed_at ON public.projects(last_accessed_at DESC);

-- Update all existing projects to have a default last_accessed_at equal to updated_at
UPDATE public.projects SET last_accessed_at = updated_at;
