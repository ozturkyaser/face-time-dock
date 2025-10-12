-- Make vacation-pdfs bucket public
UPDATE storage.buckets 
SET public = true 
WHERE id = 'vacation-pdfs';