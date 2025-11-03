-- Create courts table
CREATE TABLE IF NOT EXISTS public.courts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text,
  type text,
  level text,
  city text,
  state text,
  jurisdiction text,
  address text,
  established_year integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id)
);

-- Create indexes for courts
CREATE INDEX IF NOT EXISTS idx_courts_tenant_id ON public.courts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_courts_name ON public.courts(name);
CREATE INDEX IF NOT EXISTS idx_courts_code ON public.courts(code);
CREATE INDEX IF NOT EXISTS idx_courts_type ON public.courts(type);

-- Enable RLS for courts
ALTER TABLE public.courts ENABLE ROW LEVEL SECURITY;

-- RLS policies for courts
CREATE POLICY "Users can view courts in their tenant"
  ON public.courts FOR SELECT
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Authorized users can create courts"
  ON public.courts FOR INSERT
  WITH CHECK (
    tenant_id = get_user_tenant_id() 
    AND (
      has_role(auth.uid(), 'admin'::app_role) 
      OR has_role(auth.uid(), 'partner'::app_role) 
      OR has_role(auth.uid(), 'manager'::app_role)
    )
  );

CREATE POLICY "Authorized users can update courts"
  ON public.courts FOR UPDATE
  USING (
    tenant_id = get_user_tenant_id() 
    AND (
      has_role(auth.uid(), 'admin'::app_role) 
      OR has_role(auth.uid(), 'partner'::app_role) 
      OR has_role(auth.uid(), 'manager'::app_role)
    )
  );

CREATE POLICY "Admins can delete courts"
  ON public.courts FOR DELETE
  USING (
    tenant_id = get_user_tenant_id() 
    AND has_role(auth.uid(), 'admin'::app_role)
  );

-- Create judges table
CREATE TABLE IF NOT EXISTS public.judges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  court_id uuid REFERENCES public.courts(id) ON DELETE SET NULL,
  designation text,
  phone text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id)
);

-- Create indexes for judges
CREATE INDEX IF NOT EXISTS idx_judges_tenant_id ON public.judges(tenant_id);
CREATE INDEX IF NOT EXISTS idx_judges_court_id ON public.judges(court_id);
CREATE INDEX IF NOT EXISTS idx_judges_name ON public.judges(name);

-- Enable RLS for judges
ALTER TABLE public.judges ENABLE ROW LEVEL SECURITY;

-- RLS policies for judges
CREATE POLICY "Users can view judges in their tenant"
  ON public.judges FOR SELECT
  USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Authorized users can create judges"
  ON public.judges FOR INSERT
  WITH CHECK (
    tenant_id = get_user_tenant_id() 
    AND (
      has_role(auth.uid(), 'admin'::app_role) 
      OR has_role(auth.uid(), 'partner'::app_role) 
      OR has_role(auth.uid(), 'manager'::app_role)
    )
  );

CREATE POLICY "Authorized users can update judges"
  ON public.judges FOR UPDATE
  USING (
    tenant_id = get_user_tenant_id() 
    AND (
      has_role(auth.uid(), 'admin'::app_role) 
      OR has_role(auth.uid(), 'partner'::app_role) 
      OR has_role(auth.uid(), 'manager'::app_role)
    )
  );

CREATE POLICY "Admins can delete judges"
  ON public.judges FOR DELETE
  USING (
    tenant_id = get_user_tenant_id() 
    AND has_role(auth.uid(), 'admin'::app_role)
  );

-- Add foreign key from hearings to courts if column exists
DO $$ 
BEGIN
  -- Check if court_id column exists in hearings table
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'hearings' 
    AND column_name = 'court_id'
  ) THEN
    -- Add foreign key constraint if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'hearings_court_id_fkey'
      AND table_name = 'hearings'
    ) THEN
      ALTER TABLE public.hearings 
        ADD CONSTRAINT hearings_court_id_fkey 
        FOREIGN KEY (court_id) 
        REFERENCES public.courts(id) 
        ON DELETE RESTRICT;
    END IF;
  END IF;
END $$;

-- Add automated timestamp triggers
CREATE TRIGGER update_courts_updated_at
  BEFORE UPDATE ON public.courts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_judges_updated_at
  BEFORE UPDATE ON public.judges
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();