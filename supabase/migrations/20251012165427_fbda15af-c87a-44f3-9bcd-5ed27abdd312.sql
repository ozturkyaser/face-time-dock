-- Add alternative date fields to vacation_requests table
ALTER TABLE public.vacation_requests 
ADD COLUMN IF NOT EXISTS alternative_start_date date,
ADD COLUMN IF NOT EXISTS alternative_end_date date,
ADD COLUMN IF NOT EXISTS alternative_total_days integer,
ADD COLUMN IF NOT EXISTS alternative_notes text;