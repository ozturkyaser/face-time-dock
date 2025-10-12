-- Create employees table
CREATE TABLE public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_number TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  department TEXT,
  position TEXT,
  hourly_rate DECIMAL(10,2),
  salary DECIMAL(10,2),
  employment_start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  employment_end_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create face_profiles table for facial recognition
CREATE TABLE public.face_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  face_descriptor JSONB NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(employee_id)
);

-- Create time_entries table
CREATE TABLE public.time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  check_in TIMESTAMPTZ NOT NULL DEFAULT now(),
  check_out TIMESTAMPTZ,
  break_duration_minutes INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create vacation_requests table
CREATE TABLE public.vacation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days INTEGER NOT NULL,
  request_type TEXT NOT NULL CHECK (request_type IN ('vacation', 'sick_leave', 'personal')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  notes TEXT,
  approved_by UUID REFERENCES public.employees(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create salary_advances table
CREATE TABLE public.salary_advances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  request_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
  approved_by UUID REFERENCES public.employees(id),
  approved_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_face_profiles_updated_at BEFORE UPDATE ON public.face_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_time_entries_updated_at BEFORE UPDATE ON public.time_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vacation_requests_updated_at BEFORE UPDATE ON public.vacation_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_salary_advances_updated_at BEFORE UPDATE ON public.salary_advances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.face_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vacation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salary_advances ENABLE ROW LEVEL SECURITY;

-- RLS Policies for public access (for terminal usage)
CREATE POLICY "Allow public read access to employees" ON public.employees FOR SELECT USING (true);
CREATE POLICY "Allow public read access to face_profiles" ON public.face_profiles FOR SELECT USING (true);

-- RLS Policies for time_entries
CREATE POLICY "Allow public insert time_entries" ON public.time_entries FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public read time_entries" ON public.time_entries FOR SELECT USING (true);
CREATE POLICY "Allow public update time_entries" ON public.time_entries FOR UPDATE USING (true);

-- RLS Policies for vacation_requests
CREATE POLICY "Allow public insert vacation_requests" ON public.vacation_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public read vacation_requests" ON public.vacation_requests FOR SELECT USING (true);
CREATE POLICY "Allow public update vacation_requests" ON public.vacation_requests FOR UPDATE USING (true);

-- RLS Policies for salary_advances
CREATE POLICY "Allow public insert salary_advances" ON public.salary_advances FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public read salary_advances" ON public.salary_advances FOR SELECT USING (true);
CREATE POLICY "Allow public update salary_advances" ON public.salary_advances FOR UPDATE USING (true);

-- Create indexes for better performance
CREATE INDEX idx_time_entries_employee_id ON public.time_entries(employee_id);
CREATE INDEX idx_time_entries_check_in ON public.time_entries(check_in);
CREATE INDEX idx_vacation_requests_employee_id ON public.vacation_requests(employee_id);
CREATE INDEX idx_vacation_requests_dates ON public.vacation_requests(start_date, end_date);
CREATE INDEX idx_salary_advances_employee_id ON public.salary_advances(employee_id);