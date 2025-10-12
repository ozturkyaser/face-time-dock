-- Add PIN field to employees table for employee portal login
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS pin_hash text;