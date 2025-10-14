-- Make email and last_name nullable in employees table
ALTER TABLE employees 
ALTER COLUMN email DROP NOT NULL;

ALTER TABLE employees 
ALTER COLUMN last_name DROP NOT NULL;