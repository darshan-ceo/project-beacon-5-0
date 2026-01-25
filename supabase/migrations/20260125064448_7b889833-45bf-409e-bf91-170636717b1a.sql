-- Add weekly_off_days column for custom weekly off configuration
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS weekly_off_days text[] DEFAULT NULL;

COMMENT ON COLUMN employees.weekly_off_days IS 
'Array of day names when weekly_off is Custom. E.g., ["Saturday", "Sunday"]. Used for employee configuration and future attendance/payroll integration.';