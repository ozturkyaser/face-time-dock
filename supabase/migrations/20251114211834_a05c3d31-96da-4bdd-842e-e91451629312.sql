-- Add settings for weekend auto-checkout time
INSERT INTO public.system_settings (key, value, description)
VALUES 
  ('auto_checkout_time_weekend', '{"hour": 18, "minute": 0}'::jsonb, 'Automatische Abmeldezeit am Wochenende (Samstag und Sonntag)')
ON CONFLICT (key) DO NOTHING;