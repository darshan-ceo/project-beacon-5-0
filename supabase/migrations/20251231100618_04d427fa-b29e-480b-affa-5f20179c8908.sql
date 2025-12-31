-- Remove the old 'advocate' role for Mahesh (keeping only 'staff')
DELETE FROM user_roles 
WHERE user_id = 'dfb45acf-abd6-4c49-b9e6-942b0363c951' 
  AND role = 'advocate';

-- Sync Mahesh's profile with employee record
UPDATE profiles
SET 
  full_name = (SELECT full_name FROM employees WHERE id = 'dfb45acf-abd6-4c49-b9e6-942b0363c951'),
  phone = (SELECT mobile FROM employees WHERE id = 'dfb45acf-abd6-4c49-b9e6-942b0363c951')
WHERE id = 'dfb45acf-abd6-4c49-b9e6-942b0363c951';

-- Create function to sync employee role changes to user_roles
CREATE OR REPLACE FUNCTION sync_employee_role_to_user_roles()
RETURNS TRIGGER AS $$
DECLARE
  target_role app_role;
BEGIN
  -- Map employee role to RBAC role
  target_role := CASE LOWER(NEW.role)
    WHEN 'partner' THEN 'partner'::app_role
    WHEN 'ca' THEN 'ca'::app_role
    WHEN 'advocate' THEN 'advocate'::app_role
    WHEN 'manager' THEN 'manager'::app_role
    WHEN 'staff' THEN 'staff'::app_role
    WHEN 'rm' THEN 'manager'::app_role
    WHEN 'finance' THEN 'manager'::app_role
    WHEN 'admin' THEN 'admin'::app_role
    WHEN 'clerk' THEN 'clerk'::app_role
    ELSE 'staff'::app_role
  END;
  
  -- Only proceed if role changed
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    -- Remove old RBAC roles (except 'user' base role)
    DELETE FROM user_roles 
    WHERE user_id = NEW.id 
      AND role != 'user'::app_role;
    
    -- Insert new role
    INSERT INTO user_roles (user_id, role, granted_by, is_active)
    VALUES (NEW.id, target_role, NEW.id, true)
    ON CONFLICT (user_id, role) DO UPDATE SET is_active = true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for employee role sync
DROP TRIGGER IF EXISTS employee_role_sync_trigger ON employees;
CREATE TRIGGER employee_role_sync_trigger
  AFTER UPDATE OF role ON employees
  FOR EACH ROW
  EXECUTE FUNCTION sync_employee_role_to_user_roles();