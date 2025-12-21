/**
 * WhatsApp Service - Mirrors SMS Service functionality for WhatsApp messaging
 * Uses eNotify API for WhatsApp delivery
 */

import { supabase } from '@/integrations/supabase/client';

export interface WhatsAppConfig {
  id: string;
  tenant_id: string;
  provider: string;
  instance_id: string | null;
  is_active: boolean;
  daily_limit: number;
  monthly_limit: number;
  created_at: string;
  updated_at: string;
}

export interface WhatsAppDeliveryLog {
  id: string;
  tenant_id: string;
  template_id: string | null;
  recipient_phone: string;
  message_text: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  provider_message_id: string | null;
  delivery_timestamp: string | null;
  error_message: string | null;
  related_entity_type: string | null;
  related_entity_id: string | null;
  credits_used: number;
  created_at: string;
}

export interface SendWhatsAppRequest {
  phone: string;
  message: string;
  templateId?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
}

export interface SendWhatsAppResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

// Helper to get tenant ID
async function getTenantId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single();
  
  return profile?.tenant_id || null;
}

// Extract template variables
function extractVariables(text: string): string[] {
  const regex = /\{([^}]+)\}/g;
  const variables: string[] = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    variables.push(match[1]);
  }
  return [...new Set(variables)];
}

// Apply template variables
function applyTemplateVariables(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }
  return result;
}

export const whatsappService = {
  /**
   * Send a direct WhatsApp message
   */
  async sendWhatsApp(request: SendWhatsAppRequest): Promise<SendWhatsAppResponse> {
    try {
      const tenantId = await getTenantId();
      
      const { data, error } = await supabase.functions.invoke('send-whatsapp', {
        body: {
          phone: request.phone,
          message: request.message,
          tenantId,
          templateId: request.templateId,
          relatedEntityType: request.relatedEntityType,
          relatedEntityId: request.relatedEntityId
        }
      });

      if (error) {
        console.error('WhatsApp send error:', error);
        return { success: false, error: error.message };
      }

      return data as SendWhatsAppResponse;
    } catch (error: any) {
      console.error('WhatsApp service error:', error);
      return { success: false, error: error.message || 'Failed to send WhatsApp message' };
    }
  },

  /**
   * Send WhatsApp using SMS template (reuse SMS templates for WhatsApp)
   */
  async sendTemplatedWhatsApp(
    phone: string,
    templateId: string,
    variables: Record<string, string>,
    relatedEntityType?: string,
    relatedEntityId?: string
  ): Promise<SendWhatsAppResponse> {
    try {
      const tenantId = await getTenantId();
      if (!tenantId) {
        return { success: false, error: 'User not authenticated' };
      }

      // Fetch the SMS template (reused for WhatsApp)
      const { data: template, error: templateError } = await supabase
        .from('sms_templates')
        .select('*')
        .eq('id', templateId)
        .eq('tenant_id', tenantId)
        .single();

      if (templateError || !template) {
        return { success: false, error: 'Template not found' };
      }

      // Apply variables to template
      const message = applyTemplateVariables(template.template_text, variables);

      return this.sendWhatsApp({
        phone,
        message,
        templateId,
        relatedEntityType,
        relatedEntityId
      });
    } catch (error: any) {
      console.error('Templated WhatsApp error:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get WhatsApp configuration for tenant
   */
  async getConfig(): Promise<WhatsAppConfig | null> {
    try {
      const tenantId = await getTenantId();
      if (!tenantId) return null;

      const { data, error } = await supabase
        .from('whatsapp_config')
        .select('*')
        .eq('tenant_id', tenantId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching WhatsApp config:', error);
        return null;
      }

      return data as WhatsAppConfig | null;
    } catch (error) {
      console.error('WhatsApp config error:', error);
      return null;
    }
  },

  /**
   * Save WhatsApp configuration
   */
  async saveConfig(config: Partial<WhatsAppConfig>): Promise<boolean> {
    try {
      const tenantId = await getTenantId();
      if (!tenantId) return false;

      const existingConfig = await this.getConfig();

      if (existingConfig) {
        // Update existing
        const { error } = await supabase
          .from('whatsapp_config')
          .update({
            ...config,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingConfig.id);

        if (error) {
          console.error('Error updating WhatsApp config:', error);
          return false;
        }
      } else {
        // Create new
        const { error } = await supabase
          .from('whatsapp_config')
          .insert({
            tenant_id: tenantId,
            provider: 'enotify',
            ...config
          });

        if (error) {
          console.error('Error creating WhatsApp config:', error);
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Save WhatsApp config error:', error);
      return false;
    }
  },

  /**
   * Get WhatsApp delivery logs
   */
  async getDeliveryLogs(
    limit: number = 50,
    offset: number = 0,
    status?: string
  ): Promise<WhatsAppDeliveryLog[]> {
    try {
      const tenantId = await getTenantId();
      if (!tenantId) return [];

      let query = supabase
        .from('whatsapp_delivery_logs')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching WhatsApp logs:', error);
        return [];
      }

      return (data || []) as WhatsAppDeliveryLog[];
    } catch (error) {
      console.error('WhatsApp logs error:', error);
      return [];
    }
  },

  /**
   * Get WhatsApp delivery statistics
   */
  async getDeliveryStats(startDate?: string, endDate?: string): Promise<{
    total: number;
    sent: number;
    delivered: number;
    failed: number;
    successRate: number;
  }> {
    try {
      const tenantId = await getTenantId();
      if (!tenantId) {
        return { total: 0, sent: 0, delivered: 0, failed: 0, successRate: 0 };
      }

      let query = supabase
        .from('whatsapp_delivery_logs')
        .select('status')
        .eq('tenant_id', tenantId);

      if (startDate) {
        query = query.gte('created_at', startDate);
      }
      if (endDate) {
        query = query.lte('created_at', endDate);
      }

      const { data, error } = await query;

      if (error || !data) {
        return { total: 0, sent: 0, delivered: 0, failed: 0, successRate: 0 };
      }

      const total = data.length;
      const sent = data.filter(d => d.status === 'sent').length;
      const delivered = data.filter(d => d.status === 'delivered').length;
      const failed = data.filter(d => d.status === 'failed').length;
      const successRate = total > 0 ? ((sent + delivered) / total) * 100 : 0;

      return { total, sent, delivered, failed, successRate: Math.round(successRate * 100) / 100 };
    } catch (error) {
      console.error('WhatsApp stats error:', error);
      return { total: 0, sent: 0, delivered: 0, failed: 0, successRate: 0 };
    }
  },

  /**
   * Test WhatsApp connection by sending a test message
   */
  async testConnection(phone: string): Promise<SendWhatsAppResponse> {
    try {
      const config = await this.getConfig();
      
      if (!config?.is_active) {
        return { success: false, error: 'WhatsApp is not enabled. Please activate it first.' };
      }

      return this.sendWhatsApp({
        phone,
        message: 'This is a test message from your application. WhatsApp integration is working correctly! 🎉'
      });
    } catch (error: any) {
      return { success: false, error: error.message || 'Connection test failed' };
    }
  },

  /**
   * Get SMS templates (shared with SMS for WhatsApp)
   */
  async getTemplates(): Promise<Array<{
    id: string;
    name: string;
    template_text: string;
    category: string;
    is_active: boolean;
  }>> {
    try {
      const tenantId = await getTenantId();
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from('sms_templates')
        .select('id, name, template_text, category, is_active')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('Error fetching templates:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Templates error:', error);
      return [];
    }
  }
};

export default whatsappService;
