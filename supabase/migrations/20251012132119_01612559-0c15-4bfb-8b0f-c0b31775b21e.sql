-- Create locations table
CREATE TABLE public.locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create terminals table for terminal authentication
CREATE TABLE public.terminals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add location_id to employees table
ALTER TABLE public.employees 
ADD COLUMN location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.terminals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for locations
CREATE POLICY "Allow public read access to locations" 
ON public.locations 
FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert locations" 
ON public.locations 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public update locations" 
ON public.locations 
FOR UPDATE 
USING (true);

CREATE POLICY "Allow public delete locations" 
ON public.locations 
FOR DELETE 
USING (true);

-- RLS Policies for terminals
CREATE POLICY "Allow public read access to terminals" 
ON public.terminals 
FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert terminals" 
ON public.terminals 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public update terminals" 
ON public.terminals 
FOR UPDATE 
USING (true);

CREATE POLICY "Allow public delete terminals" 
ON public.terminals 
FOR DELETE 
USING (true);

-- Triggers for updated_at
CREATE TRIGGER update_locations_updated_at
BEFORE UPDATE ON public.locations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_terminals_updated_at
BEFORE UPDATE ON public.terminals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();