-- Erstelle Cron-Job für automatische Abmeldung um 20:00 Uhr
-- Stelle sicher, dass pg_cron Extension aktiviert ist
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Erstelle Cron-Job der täglich um 20:00 Uhr Berlin Zeit ausgeführt wird
-- Hinweis: Cron läuft in UTC, 20:00 Berlin Zeit ist 18:00 UTC (Winterzeit) oder 19:00 UTC (Sommerzeit)
-- Wir verwenden 18:00 UTC für Winterzeit
SELECT cron.schedule(
  'auto-checkout-at-8pm',
  '0 18 * * *', -- Täglich um 18:00 UTC (20:00 Berlin Winterzeit)
  $$
  SELECT
    net.http_post(
        url:='https://zwtcjxlcyeexutwihjbs.supabase.co/functions/v1/auto-checkout',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3dGNqeGxjeWVleHV0d2loamJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyMjg0MDMsImV4cCI6MjA3NTgwNDQwM30.vXq4iIFdCFKbGgJWtWMImyUNTvKoKGlJdeyt1Goo11E"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);
