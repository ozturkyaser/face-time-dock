-- Create system_settings table for global configuration
CREATE TABLE IF NOT EXISTS public.system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access to system_settings"
  ON public.system_settings
  FOR SELECT
  USING (true);

-- Allow public update access (in production, you'd want to restrict this to admins)
CREATE POLICY "Allow public update system_settings"
  ON public.system_settings
  FOR UPDATE
  USING (true);

-- Allow public insert access
CREATE POLICY "Allow public insert system_settings"
  ON public.system_settings
  FOR INSERT
  WITH CHECK (true);

-- Create trigger for updated_at
CREATE TRIGGER update_system_settings_updated_at
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default auto-checkout time setting (19:57)
INSERT INTO public.system_settings (key, value, description)
VALUES (
  'auto_checkout_time',
  '{"hour": 19, "minute": 57}'::jsonb,
  'Automatische Abmeldezeit im Format {"hour": HH, "minute": MM} (24-Stunden-Format)'
)
ON CONFLICT (key) DO NOTHING;