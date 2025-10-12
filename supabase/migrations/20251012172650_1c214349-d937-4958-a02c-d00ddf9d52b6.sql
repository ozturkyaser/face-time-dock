-- Add employee_signature and pdf_url columns to salary_advances table
ALTER TABLE public.salary_advances 
ADD COLUMN IF NOT EXISTS employee_signature TEXT,
ADD COLUMN IF NOT EXISTS pdf_url TEXT;