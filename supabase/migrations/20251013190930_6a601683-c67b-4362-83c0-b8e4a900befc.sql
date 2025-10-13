-- Add vacation days fields to employees table
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS vacation_days_total integer DEFAULT 30,
ADD COLUMN IF NOT EXISTS vacation_days_used integer DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN public.employees.vacation_days_total IS 'Total vacation days per year for the employee';
COMMENT ON COLUMN public.employees.vacation_days_used IS 'Number of vacation days already used in the current year';