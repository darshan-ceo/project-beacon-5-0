-- Add file storage columns to hearings table
ALTER TABLE hearings
ADD COLUMN IF NOT EXISTS order_file_path TEXT,
ADD COLUMN IF NOT EXISTS order_file_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN hearings.order_file_path IS 'Path to order document in Supabase Storage';
COMMENT ON COLUMN hearings.order_file_url IS 'Public URL for order document';