-- Add foreign key constraint for stage_transitions.created_by
ALTER TABLE stage_transitions 
ADD CONSTRAINT fk_stage_transitions_created_by 
FOREIGN KEY (created_by) 
REFERENCES profiles(id) 
ON DELETE SET NULL;