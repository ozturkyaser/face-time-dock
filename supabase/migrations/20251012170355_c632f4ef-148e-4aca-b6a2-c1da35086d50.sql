-- Drop the old check constraint
ALTER TABLE public.vacation_requests DROP CONSTRAINT IF EXISTS vacation_requests_request_type_check;

-- Add new check constraint with all allowed request types
ALTER TABLE public.vacation_requests 
ADD CONSTRAINT vacation_requests_request_type_check 
CHECK (request_type IN ('vacation', 'sick', 'sick_leave', 'unpaid', 'personal', 'other'));

-- Update storage policies for vacation-pdfs bucket to allow uploads
DROP POLICY IF EXISTS "Allow authenticated uploads to vacation-pdfs" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to vacation-pdfs" ON storage.objects;

CREATE POLICY "Allow authenticated uploads to vacation-pdfs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'vacation-pdfs');

CREATE POLICY "Allow public read access to vacation-pdfs"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'vacation-pdfs');