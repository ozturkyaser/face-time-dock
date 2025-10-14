-- Drop the existing foreign key constraint on salary_advances.approved_by
ALTER TABLE salary_advances 
DROP CONSTRAINT IF EXISTS salary_advances_approved_by_fkey;

-- Recreate the foreign key with ON DELETE SET NULL
-- This allows employee deletion while preserving salary advance history
ALTER TABLE salary_advances
ADD CONSTRAINT salary_advances_approved_by_fkey 
FOREIGN KEY (approved_by) 
REFERENCES employees(id) 
ON DELETE SET NULL;

-- Also fix the employee_id foreign key to prevent similar issues
ALTER TABLE salary_advances
DROP CONSTRAINT IF EXISTS salary_advances_employee_id_fkey;

ALTER TABLE salary_advances
ADD CONSTRAINT salary_advances_employee_id_fkey
FOREIGN KEY (employee_id)
REFERENCES employees(id)
ON DELETE CASCADE;