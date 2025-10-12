-- Add missing RLS policies for employees table
CREATE POLICY "Allow public insert employees" ON public.employees FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update employees" ON public.employees FOR UPDATE USING (true);
CREATE POLICY "Allow public delete employees" ON public.employees FOR DELETE USING (true);

-- Add missing RLS policies for face_profiles table
CREATE POLICY "Allow public insert face_profiles" ON public.face_profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update face_profiles" ON public.face_profiles FOR UPDATE USING (true);
CREATE POLICY "Allow public delete face_profiles" ON public.face_profiles FOR DELETE USING (true);