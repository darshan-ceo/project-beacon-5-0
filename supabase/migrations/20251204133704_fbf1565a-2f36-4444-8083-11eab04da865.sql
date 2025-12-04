-- SMS Templates table for TRAI DLT-approved templates
CREATE TABLE public.sms_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  template_text TEXT NOT NULL,
  dlt_template_id VARCHAR(50),
  category VARCHAR(50) NOT NULL DEFAULT 'general',
  variables JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  character_count INTEGER GENERATED ALWAYS AS (length(template_text)) STORED,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id)
);

-- SMS Configuration table per tenant
CREATE TABLE public.sms_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL DEFAULT 'sms24',
  sender_id VARCHAR(10) NOT NULL,
  dlt_entity_id VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  daily_limit INTEGER DEFAULT 1000,
  monthly_limit INTEGER DEFAULT 30000,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- SMS Delivery Logs for audit trail
CREATE TABLE public.sms_delivery_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.sms_templates(id) ON DELETE SET NULL,
  recipient_phone VARCHAR(15) NOT NULL,
  message_text TEXT NOT NULL,
  dlt_template_id VARCHAR(50),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  provider_message_id VARCHAR(100),
  delivery_timestamp TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  credits_used INTEGER DEFAULT 1,
  related_entity_type VARCHAR(50),
  related_entity_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sms_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_delivery_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sms_templates
CREATE POLICY "Users can view SMS templates in their tenant"
ON public.sms_templates FOR SELECT
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Admins can manage SMS templates"
ON public.sms_templates FOR ALL
USING (tenant_id = get_user_tenant_id() AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'partner')))
WITH CHECK (tenant_id = get_user_tenant_id() AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'partner')));

-- RLS Policies for sms_config
CREATE POLICY "Users can view SMS config in their tenant"
ON public.sms_config FOR SELECT
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Admins can manage SMS config"
ON public.sms_config FOR ALL
USING (tenant_id = get_user_tenant_id() AND has_role(auth.uid(), 'admin'))
WITH CHECK (tenant_id = get_user_tenant_id() AND has_role(auth.uid(), 'admin'));

-- RLS Policies for sms_delivery_logs
CREATE POLICY "Users can view SMS delivery logs in their tenant"
ON public.sms_delivery_logs FOR SELECT
USING (tenant_id = get_user_tenant_id());

CREATE POLICY "System can create SMS delivery logs"
ON public.sms_delivery_logs FOR INSERT
WITH CHECK (tenant_id = get_user_tenant_id());

-- Indexes for performance
CREATE INDEX idx_sms_templates_tenant ON public.sms_templates(tenant_id);
CREATE INDEX idx_sms_templates_category ON public.sms_templates(category);
CREATE INDEX idx_sms_delivery_logs_tenant ON public.sms_delivery_logs(tenant_id);
CREATE INDEX idx_sms_delivery_logs_status ON public.sms_delivery_logs(status);
CREATE INDEX idx_sms_delivery_logs_created ON public.sms_delivery_logs(created_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_sms_templates_updated_at
BEFORE UPDATE ON public.sms_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sms_config_updated_at
BEFORE UPDATE ON public.sms_config
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();