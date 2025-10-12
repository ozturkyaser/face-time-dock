-- Update storage policies for vacation-pdfs bucket to allow public uploads
DROP POLICY IF EXISTS "Allow authenticated uploads to vacation-pdfs" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to vacation-pdfs" ON storage.objects;

CREATE POLICY "Allow public uploads to vacation-pdfs"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'vacation-pdfs');

CREATE POLICY "Allow public read access to vacation-pdfs"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'vacation-pdfs');