-- Phase 1: Add Order/Appeal Date Milestone Fields to Cases Table
ALTER TABLE public.cases 
ADD COLUMN IF NOT EXISTS order_date DATE,
ADD COLUMN IF NOT EXISTS order_received_date DATE,
ADD COLUMN IF NOT EXISTS appeal_filed_date DATE,
ADD COLUMN IF NOT EXISTS impugned_order_no VARCHAR(100),
ADD COLUMN IF NOT EXISTS impugned_order_date DATE,
ADD COLUMN IF NOT EXISTS impugned_order_amount NUMERIC(15,2);

-- Add descriptive comments for documentation
COMMENT ON COLUMN cases.order_date IS 'Date of adjudication order (DRC-07) - triggers appeal deadline calculation';
COMMENT ON COLUMN cases.order_received_date IS 'Date order was actually received - may differ from order_date for statutory limits';
COMMENT ON COLUMN cases.appeal_filed_date IS 'Date appeal was filed (APL-01) - tracks filing milestone';
COMMENT ON COLUMN cases.impugned_order_no IS 'Order number being appealed against (e.g., DRC-07/2025/001)';
COMMENT ON COLUMN cases.impugned_order_date IS 'Date of the impugned order being challenged';
COMMENT ON COLUMN cases.impugned_order_amount IS 'Amount in dispute from the impugned order';