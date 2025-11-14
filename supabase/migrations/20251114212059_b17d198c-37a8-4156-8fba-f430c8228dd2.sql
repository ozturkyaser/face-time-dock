-- Add setting for late check-in time
INSERT INTO public.system_settings (key, value, description)
VALUES 
  ('late_checkin_time', '{"hour": 9, "minute": 10}'::jsonb, 'Uhrzeit ab der Mitarbeiter als verspätet gelten')
ON CONFLICT (key) DO NOTHING;