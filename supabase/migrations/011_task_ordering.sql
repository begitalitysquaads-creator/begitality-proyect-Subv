-- 011_task_ordering.sql

-- Add sort_order to tasks
ALTER TABLE public.project_tasks ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0;

-- Update existing tasks to have a sequential sort_order
WITH ordered_tasks AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY created_at) - 1 as new_order
  FROM public.project_tasks
)
UPDATE public.project_tasks
SET sort_order = ordered_tasks.new_order
FROM ordered_tasks
WHERE public.project_tasks.id = ordered_tasks.id;
