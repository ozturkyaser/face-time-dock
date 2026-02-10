
-- Add is_permanent and geofence_disabled columns to terminals
ALTER TABLE public.terminals ADD COLUMN is_permanent boolean NOT NULL DEFAULT false;
ALTER TABLE public.terminals ADD COLUMN geofence_disabled boolean NOT NULL DEFAULT false;
