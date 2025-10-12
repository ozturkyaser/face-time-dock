-- Add signature and PDF fields to vacation_requests
ALTER TABLE public.vacation_requests 
ADD COLUMN IF NOT EXISTS employee_signature text,
ADD COLUMN IF NOT EXISTS admin_signature text,
ADD COLUMN IF NOT EXISTS pdf_url text;

-- Create storage bucket for vacation PDFs
INSERT INTO storage.buckets (id, name, public) 
VALUES ('vacation-pdfs', 'vacation-pdfs', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for vacation PDFs
CREATE POLICY "Authenticated users can view vacation PDFs"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'vacation-pdfs');

CREATE POLICY "System can insert vacation PDFs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'vacation-pdfs');