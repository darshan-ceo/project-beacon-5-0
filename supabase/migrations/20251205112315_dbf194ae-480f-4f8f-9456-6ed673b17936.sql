-- Add default UUID generation to employees table id column
ALTER TABLE employees 
ALTER COLUMN id SET DEFAULT gen_random_uuid();