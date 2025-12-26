-- First, clear any invalid escalated_to values that aren't valid UUIDs
UPDATE escalation_events SET escalated_to = NULL 
WHERE escalated_to IS NOT NULL 
AND escalated_to !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Change escalated_to column from TEXT to UUID
ALTER TABLE escalation_events 
ALTER COLUMN escalated_to TYPE uuid USING escalated_to::uuid;

-- Add foreign key constraint to employees table
ALTER TABLE escalation_events
ADD CONSTRAINT escalation_events_escalated_to_employees_fkey 
FOREIGN KEY (escalated_to) REFERENCES employees(id) ON DELETE SET NULL;