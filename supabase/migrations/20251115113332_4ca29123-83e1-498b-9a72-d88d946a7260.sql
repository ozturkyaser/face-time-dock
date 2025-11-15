-- Allow public insert and update for time entries (for terminal usage)
-- This is necessary because terminal users are not authenticated
CREATE POLICY "Allow public insert for time entries"
ON public.time_entries
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Allow public update for time entries"
ON public.time_entries
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

-- Allow public read for active time entries (for terminal display)
CREATE POLICY "Allow public read for time entries"
ON public.time_entries
FOR SELECT
TO public
USING (true);