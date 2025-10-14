-- Drop the existing foreign key constraint on vacation_requests.approved_by
ALTER TABLE vacation_requests 
DROP CONSTRAINT IF EXISTS vacation_requests_approved_by_fkey;

-- Recreate the foreign key with ON DELETE SET NULL
-- This allows employee deletion while preserving vacation request history
ALTER TABLE vacation_requests
ADD CONSTRAINT vacation_requests_approved_by_fkey 
FOREIGN KEY (approved_by) 
REFERENCES employees(id) 
ON DELETE SET NULL;

-- Also fix the employee_id foreign key to prevent similar issues
ALTER TABLE vacation_requests
DROP CONSTRAINT IF EXISTS vacation_requests_employee_id_fkey;

ALTER TABLE vacation_requests
ADD CONSTRAINT vacation_requests_employee_id_fkey
FOREIGN KEY (employee_id)
REFERENCES employees(id)
ON DELETE CASCADE;