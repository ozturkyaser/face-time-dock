-- Add barcode field to employees table
ALTER TABLE public.employees
ADD COLUMN barcode TEXT UNIQUE;

-- Add index for faster barcode lookups
CREATE INDEX idx_employees_barcode ON public.employees(barcode);

COMMENT ON COLUMN public.employees.barcode IS 'Unique barcode for employee identification and time tracking';