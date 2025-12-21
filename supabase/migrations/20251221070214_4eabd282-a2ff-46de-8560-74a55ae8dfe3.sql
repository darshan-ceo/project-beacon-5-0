-- Create WhatsApp configuration table (mirrors sms_config)
CREATE TABLE public.whatsapp_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  provider VARCHAR NOT NULL DEFAULT 'enotify',
  instance_id VARCHAR,
  is_active BOOLEAN DEFAULT false,
  daily_limit INTEGER DEFAULT 1000,
  monthly_limit INTEGER DEFAULT 30000,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id)
);

-- Create WhatsApp delivery logs table (mirrors sms_delivery_logs)
CREATE TABLE public.whatsapp_delivery_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  template_id UUID REFERENCES sms_templates(id) ON DELETE SET NULL,
  recipient_phone VARCHAR NOT NULL,
  message_text TEXT NOT NULL,
  status VARCHAR NOT NULL DEFAULT 'pending',
  provider_message_id VARCHAR,
  delivery_timestamp TIMESTAMPTZ,
  error_message TEXT,
  related_entity_type VARCHAR,
  related_entity_id UUID,
  credits_used INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on both tables
ALTER TABLE public.whatsapp_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_delivery_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for whatsapp_config
CREATE POLICY "Admins can manage WhatsApp config"
  ON public.whatsapp_config
  FOR ALL
  USING (
    tenant_id = get_user_tenant_id() 
    AND has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Users can view WhatsApp config in their tenant"
  ON public.whatsapp_config
  FOR SELECT
  USING (tenant_id = get_user_tenant_id());

-- RLS policies for whatsapp_delivery_logs
CREATE POLICY "System can create WhatsApp delivery logs"
  ON public.whatsapp_delivery_logs
  FOR INSERT
  WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY "Users can view WhatsApp delivery logs in their tenant"
  ON public.whatsapp_delivery_logs
  FOR SELECT
  USING (tenant_id = get_user_tenant_id());

-- Create indexes for performance
CREATE INDEX idx_whatsapp_delivery_logs_tenant ON public.whatsapp_delivery_logs(tenant_id);
CREATE INDEX idx_whatsapp_delivery_logs_status ON public.whatsapp_delivery_logs(status);
CREATE INDEX idx_whatsapp_delivery_logs_created_at ON public.whatsapp_delivery_logs(created_at DESC);

-- Add trigger for updated_at on whatsapp_config
CREATE TRIGGER update_whatsapp_config_updated_at
  BEFORE UPDATE ON public.whatsapp_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();