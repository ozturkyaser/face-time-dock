-- ============================================
-- SECURITY FIX: Restrict sensitive tables to admin-only access
-- This addresses multiple critical security findings:
-- - employees_table_exposure (PUBLIC_DATA_EXPOSURE)
-- - master_reset_destruction (prevents unauthorized deletion)
-- - system_settings_exposure (PUBLIC_DATA_EXPOSURE)
-- ============================================

-- Drop all existing public policies on employees table
DROP POLICY IF EXISTS "Allow public read access to employees" ON public.employees;
DROP POLICY IF EXISTS "Allow public insert employees" ON public.employees;
DROP POLICY IF EXISTS "Allow public update employees" ON public.employees;
DROP POLICY IF EXISTS "Allow public delete employees" ON public.employees;

-- Create admin-only policies for employees table
CREATE POLICY "Admins can view all employees"
ON public.employees
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert employees"
ON public.employees
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update employees"
ON public.employees
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete employees"
ON public.employees
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- Secure face_profiles table (biometric data)
-- ============================================

DROP POLICY IF EXISTS "Allow public read access to face_profiles" ON public.face_profiles;
DROP POLICY IF EXISTS "Allow public insert face_profiles" ON public.face_profiles;
DROP POLICY IF EXISTS "Allow public update face_profiles" ON public.face_profiles;
DROP POLICY IF EXISTS "Allow public delete face_profiles" ON public.face_profiles;

CREATE POLICY "Admins can view all face profiles"
ON public.face_profiles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert face profiles"
ON public.face_profiles
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update face profiles"
ON public.face_profiles
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete face profiles"
ON public.face_profiles
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- Secure system_settings table
-- ============================================

DROP POLICY IF EXISTS "Allow public read access to system_settings" ON public.system_settings;
DROP POLICY IF EXISTS "Allow public insert system_settings" ON public.system_settings;
DROP POLICY IF EXISTS "Allow public update system_settings" ON public.system_settings;

CREATE POLICY "Admins can view system settings"
ON public.system_settings
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert system settings"
ON public.system_settings
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update system settings"
ON public.system_settings
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- Secure terminals table
-- ============================================

DROP POLICY IF EXISTS "Allow public read access to terminals" ON public.terminals;
DROP POLICY IF EXISTS "Allow public insert terminals" ON public.terminals;
DROP POLICY IF EXISTS "Allow public update terminals" ON public.terminals;
DROP POLICY IF EXISTS "Allow public delete terminals" ON public.terminals;

CREATE POLICY "Admins can view terminals"
ON public.terminals
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert terminals"
ON public.terminals
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update terminals"
ON public.terminals
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete terminals"
ON public.terminals
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- Secure time_entries, vacation_requests, salary_advances
-- ============================================

DROP POLICY IF EXISTS "Allow public read time_entries" ON public.time_entries;
DROP POLICY IF EXISTS "Allow public insert time_entries" ON public.time_entries;
DROP POLICY IF EXISTS "Allow public update time_entries" ON public.time_entries;

CREATE POLICY "Admins can view time entries"
ON public.time_entries
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert time entries"
ON public.time_entries
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update time entries"
ON public.time_entries
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Vacation requests
DROP POLICY IF EXISTS "Allow public read vacation_requests" ON public.vacation_requests;
DROP POLICY IF EXISTS "Allow public insert vacation_requests" ON public.vacation_requests;
DROP POLICY IF EXISTS "Allow public update vacation_requests" ON public.vacation_requests;

CREATE POLICY "Admins can view vacation requests"
ON public.vacation_requests
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert vacation requests"
ON public.vacation_requests
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update vacation requests"
ON public.vacation_requests
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Salary advances
DROP POLICY IF EXISTS "Allow public read salary_advances" ON public.salary_advances;
DROP POLICY IF EXISTS "Allow public insert salary_advances" ON public.salary_advances;
DROP POLICY IF EXISTS "Allow public update salary_advances" ON public.salary_advances;

CREATE POLICY "Admins can view salary advances"
ON public.salary_advances
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert salary advances"
ON public.salary_advances
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update salary advances"
ON public.salary_advances
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- Secure locations table (keep read access public for terminals)
-- ============================================

DROP POLICY IF EXISTS "Allow public insert locations" ON public.locations;
DROP POLICY IF EXISTS "Allow public update locations" ON public.locations;
DROP POLICY IF EXISTS "Allow public delete locations" ON public.locations;

CREATE POLICY "Admins can insert locations"
ON public.locations
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update locations"
ON public.locations
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete locations"
ON public.locations
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));