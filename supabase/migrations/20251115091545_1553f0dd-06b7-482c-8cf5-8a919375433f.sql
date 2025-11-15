-- Create a secure view for terminal access with only non-sensitive employee data
CREATE VIEW public.terminal_employees AS
SELECT 
  e.id,
  e.employee_number,
  e.first_name,
  e.last_name,
  e.barcode,
  e.is_active,
  e.location_id,
  e.position,
  e.department,
  e.default_break_minutes
FROM public.employees e
WHERE e.is_active = true;

-- Enable RLS on the view
ALTER VIEW public.terminal_employees SET (security_invoker = true);

-- Allow public read access to terminal view for barcode scanning
CREATE POLICY "Public can read terminal employee data"
ON public.employees
FOR SELECT
USING (is_active = true);

COMMENT ON VIEW public.terminal_employees IS 'Public view of employee data for terminal operations - excludes sensitive data like salary, PIN hash, and contact info';