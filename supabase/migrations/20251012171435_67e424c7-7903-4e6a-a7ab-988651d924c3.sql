-- Drop the old status check constraint
ALTER TABLE public.vacation_requests DROP CONSTRAINT IF EXISTS vacation_requests_status_check;

-- Add new check constraint with alternative_proposed status
ALTER TABLE public.vacation_requests 
ADD CONSTRAINT vacation_requests_status_check 
CHECK (status IN ('pending', 'approved', 'rejected', 'alternative_proposed'));