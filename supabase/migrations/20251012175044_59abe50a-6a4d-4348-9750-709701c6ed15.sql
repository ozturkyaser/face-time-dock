-- Add CASCADE constraints for employee deletion
-- This ensures all related data is deleted when an employee is deleted

-- Drop existing foreign keys and recreate with CASCADE
ALTER TABLE public.face_profiles 
DROP CONSTRAINT IF EXISTS face_profiles_employee_id_fkey;

ALTER TABLE public.face_profiles
ADD CONSTRAINT face_profiles_employee_id_fkey 
FOREIGN KEY (employee_id) 
REFERENCES public.employees(id) 
ON DELETE CASCADE;

ALTER TABLE public.time_entries 
DROP CONSTRAINT IF EXISTS time_entries_employee_id_fkey;

ALTER TABLE public.time_entries
ADD CONSTRAINT time_entries_employee_id_fkey 
FOREIGN KEY (employee_id) 
REFERENCES public.employees(id) 
ON DELETE CASCADE;

ALTER TABLE public.vacation_requests 
DROP CONSTRAINT IF EXISTS vacation_requests_employee_id_fkey;

ALTER TABLE public.vacation_requests
ADD CONSTRAINT vacation_requests_employee_id_fkey 
FOREIGN KEY (employee_id) 
REFERENCES public.employees(id) 
ON DELETE CASCADE;

ALTER TABLE public.salary_advances 
DROP CONSTRAINT IF EXISTS salary_advances_employee_id_fkey;

ALTER TABLE public.salary_advances
ADD CONSTRAINT salary_advances_employee_id_fkey 
FOREIGN KEY (employee_id) 
REFERENCES public.employees(id) 
ON DELETE CASCADE;