-- Add remand-specific columns to stage_transitions
ALTER TABLE stage_transitions 
ADD COLUMN IF NOT EXISTS remand_type varchar(20),
ADD COLUMN IF NOT EXISTS reason_category varchar(50),
ADD COLUMN IF NOT EXISTS reason_details text,
ADD COLUMN IF NOT EXISTS order_number varchar(100),
ADD COLUMN IF NOT EXISTS order_date date,
ADD COLUMN IF NOT EXISTS order_document_id uuid REFERENCES documents(id),
ADD COLUMN IF NOT EXISTS client_visible_summary text,
ADD COLUMN IF NOT EXISTS preserves_future_history boolean DEFAULT true;

-- Create index for filtering remand transitions
CREATE INDEX IF NOT EXISTS idx_stage_transitions_remand 
ON stage_transitions(case_id, transition_type) 
WHERE transition_type = 'Remand';

-- Add comment for documentation
COMMENT ON COLUMN stage_transitions.remand_type IS 'Remand or Reopen - distinguishes legal remand from internal reopen';
COMMENT ON COLUMN stage_transitions.reason_category IS 'Categorized reason for remand/reopen (e.g., Court Order, Fresh Evidence)';
COMMENT ON COLUMN stage_transitions.reason_details IS 'Detailed mandatory notes explaining the remand/reopen';
COMMENT ON COLUMN stage_transitions.order_number IS 'Court order number if remand is due to court direction';
COMMENT ON COLUMN stage_transitions.order_date IS 'Date of the court order';
COMMENT ON COLUMN stage_transitions.order_document_id IS 'Reference to uploaded order document';
COMMENT ON COLUMN stage_transitions.client_visible_summary IS 'Optional summary visible to client in portal';
COMMENT ON COLUMN stage_transitions.preserves_future_history IS 'Whether future stage history is preserved as read-only';