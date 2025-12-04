/**
 * SMS Service - SMS24 Integration for TRAI-compliant messaging
 */

import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface SMSTemplate {
  id: string;
  tenantId: string;
  name: string;
  templateText: string;
  dltTemplateId: string | null;
  category: string;
  variables: string[];
  isActive: boolean;
  characterCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SMSConfig {
  id: string;
  tenantId: string;
  provider: string;
  senderId: string;
  dltEntityId: string | null;
  isActive: boolean;
  dailyLimit: number;
  monthlyLimit: number;
  createdAt: string;
  updatedAt: string;
}

export interface SMSDeliveryLog {
  id: string;
  tenantId: string;
  templateId: string | null;
  recipientPhone: string;
  messageText: string;
  dltTemplateId: string | null;
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  providerMessageId: string | null;
  deliveryTimestamp: string | null;
  errorMessage: string | null;
  creditsUsed: number;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  createdAt: string;
}

export interface SendSMSRequest {
  phone: string;
  message: string;
  dltTemplateId?: string;
  templateId?: string;
  relatedEntityType?: 'case' | 'hearing' | 'task' | 'deadline';
  relatedEntityId?: string;
}

export interface SendSMSResponse {
  success: boolean;
  messageId?: string;
  credits?: number;
  error?: string;
  errorCode?: string;
}

// Helper to get tenant context
const getTenantId = async (): Promise<string | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single();

  return profile?.tenant_id || null;
};

// Extract variables from template text (TRAI format: {#var#})
const extractVariables = (templateText: string): string[] => {
  const matches = templateText.match(/\{#var#\}/g);
  return matches ? matches.map((_, index) => `var${index + 1}`) : [];
};

// Replace variables in template with actual values
const applyTemplateVariables = (templateText: string, variables: Record<string, string>): string => {
  let result = templateText;
  const varKeys = Object.keys(variables).sort((a, b) => {
    // Sort by number if present (var1, var2, etc.)
    const numA = parseInt(a.replace(/\D/g, '')) || 0;
    const numB = parseInt(b.replace(/\D/g, '')) || 0;
    return numA - numB;
  });

  varKeys.forEach(key => {
    result = result.replace('{#var#}', variables[key] || '');
  });

  return result;
};

export const smsService = {
  /**
   * Send SMS via SMS24 gateway
   */
  sendSMS: async (request: SendSMSRequest): Promise<SendSMSResponse> => {
    try {
      const tenantId = await getTenantId();
      if (!tenantId) {
        throw new Error('User not authenticated');
      }

      console.log('[smsService] Sending SMS:', { phone: request.phone, messageLength: request.message.length });

      const { data, error } = await supabase.functions.invoke('send-sms', {
        body: {
          phone: request.phone,
          message: request.message,
          dltTemplateId: request.dltTemplateId,
          tenantId,
          templateId: request.templateId,
          relatedEntityType: request.relatedEntityType,
          relatedEntityId: request.relatedEntityId
        }
      });

      if (error) {
        console.error('[smsService] Edge function error:', error);
        throw new Error(error.message || 'Failed to send SMS');
      }

      if (!data.success) {
        console.error('[smsService] SMS send failed:', data.error);
        return {
          success: false,
          error: data.error || 'Failed to send SMS',
          errorCode: data.errorCode
        };
      }

      console.log('[smsService] SMS sent successfully:', data.messageId);
      return {
        success: true,
        messageId: data.messageId,
        credits: data.credits
      };

    } catch (error) {
      console.error('[smsService] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  },

  /**
   * Send SMS using a pre-defined template
   */
  sendTemplatedSMS: async (
    phone: string,
    templateId: string,
    variables: Record<string, string>,
    relatedEntityType?: 'case' | 'hearing' | 'task' | 'deadline',
    relatedEntityId?: string
  ): Promise<SendSMSResponse> => {
    try {
      const tenantId = await getTenantId();
      if (!tenantId) {
        throw new Error('User not authenticated');
      }

      // Fetch template
      const { data: template, error: templateError } = await supabase
        .from('sms_templates')
        .select('*')
        .eq('id', templateId)
        .eq('is_active', true)
        .single();

      if (templateError || !template) {
        throw new Error('Template not found or inactive');
      }

      // Apply variables to template
      const message = applyTemplateVariables(template.template_text, variables);

      return smsService.sendSMS({
        phone,
        message,
        dltTemplateId: template.dlt_template_id,
        templateId: template.id,
        relatedEntityType,
        relatedEntityId
      });

    } catch (error) {
      console.error('[smsService] Template SMS error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  },

  /**
   * Get all SMS templates for tenant
   */
  getTemplates: async (): Promise<SMSTemplate[]> => {
    try {
      const { data, error } = await supabase
        .from('sms_templates')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;

      return (data || []).map(t => ({
        id: t.id,
        tenantId: t.tenant_id,
        name: t.name,
        templateText: t.template_text,
        dltTemplateId: t.dlt_template_id,
        category: t.category,
        variables: t.variables as string[] || extractVariables(t.template_text),
        isActive: t.is_active,
        characterCount: t.character_count,
        createdAt: t.created_at,
        updatedAt: t.updated_at
      }));
    } catch (error) {
      console.error('[smsService] Failed to fetch templates:', error);
      return [];
    }
  },

  /**
   * Create new SMS template
   */
  createTemplate: async (template: Partial<SMSTemplate>): Promise<SMSTemplate | null> => {
    try {
      const tenantId = await getTenantId();
      if (!tenantId) throw new Error('User not authenticated');

      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('sms_templates')
        .insert({
          tenant_id: tenantId,
          name: template.name,
          template_text: template.templateText,
          dlt_template_id: template.dltTemplateId,
          category: template.category || 'general',
          variables: template.variables || extractVariables(template.templateText || ''),
          is_active: template.isActive ?? true,
          created_by: user?.id
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Template Created",
        description: `SMS template "${template.name}" created successfully.`
      });

      return {
        id: data.id,
        tenantId: data.tenant_id,
        name: data.name,
        templateText: data.template_text,
        dltTemplateId: data.dlt_template_id,
        category: data.category,
        variables: data.variables as string[],
        isActive: data.is_active,
        characterCount: data.character_count,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };

    } catch (error) {
      console.error('[smsService] Failed to create template:', error);
      toast({
        title: "Error",
        description: "Failed to create SMS template.",
        variant: "destructive"
      });
      return null;
    }
  },

  /**
   * Update existing SMS template
   */
  updateTemplate: async (id: string, updates: Partial<SMSTemplate>): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('sms_templates')
        .update({
          name: updates.name,
          template_text: updates.templateText,
          dlt_template_id: updates.dltTemplateId,
          category: updates.category,
          variables: updates.variables,
          is_active: updates.isActive
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Template Updated",
        description: "SMS template updated successfully."
      });

      return true;
    } catch (error) {
      console.error('[smsService] Failed to update template:', error);
      toast({
        title: "Error",
        description: "Failed to update SMS template.",
        variant: "destructive"
      });
      return false;
    }
  },

  /**
   * Delete SMS template
   */
  deleteTemplate: async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('sms_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Template Deleted",
        description: "SMS template deleted successfully."
      });

      return true;
    } catch (error) {
      console.error('[smsService] Failed to delete template:', error);
      toast({
        title: "Error",
        description: "Failed to delete SMS template.",
        variant: "destructive"
      });
      return false;
    }
  },

  /**
   * Get SMS configuration for tenant
   */
  getConfig: async (): Promise<SMSConfig | null> => {
    try {
      const { data, error } = await supabase
        .from('sms_config')
        .select('*')
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // No config found
        throw error;
      }

      return {
        id: data.id,
        tenantId: data.tenant_id,
        provider: data.provider,
        senderId: data.sender_id,
        dltEntityId: data.dlt_entity_id,
        isActive: data.is_active,
        dailyLimit: data.daily_limit,
        monthlyLimit: data.monthly_limit,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    } catch (error) {
      console.error('[smsService] Failed to fetch config:', error);
      return null;
    }
  },

  /**
   * Save SMS configuration
   */
  saveConfig: async (config: Partial<SMSConfig>): Promise<boolean> => {
    try {
      const tenantId = await getTenantId();
      if (!tenantId) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('sms_config')
        .upsert({
          tenant_id: tenantId,
          provider: config.provider || 'sms24',
          sender_id: config.senderId,
          dlt_entity_id: config.dltEntityId,
          is_active: config.isActive ?? true,
          daily_limit: config.dailyLimit || 1000,
          monthly_limit: config.monthlyLimit || 30000
        }, { onConflict: 'tenant_id' });

      if (error) throw error;

      toast({
        title: "Configuration Saved",
        description: "SMS configuration saved successfully."
      });

      return true;
    } catch (error) {
      console.error('[smsService] Failed to save config:', error);
      toast({
        title: "Error",
        description: "Failed to save SMS configuration.",
        variant: "destructive"
      });
      return false;
    }
  },

  /**
   * Get delivery logs
   */
  getDeliveryLogs: async (filters?: {
    status?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<SMSDeliveryLog[]> => {
    try {
      let query = supabase
        .from('sms_delivery_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(filters?.limit || 100);

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.startDate) {
        query = query.gte('created_at', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('created_at', filters.endDate);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map(log => ({
        id: log.id,
        tenantId: log.tenant_id,
        templateId: log.template_id,
        recipientPhone: log.recipient_phone,
        messageText: log.message_text,
        dltTemplateId: log.dlt_template_id,
        status: log.status as 'pending' | 'sent' | 'delivered' | 'failed',
        providerMessageId: log.provider_message_id,
        deliveryTimestamp: log.delivery_timestamp,
        errorMessage: log.error_message,
        creditsUsed: log.credits_used,
        relatedEntityType: log.related_entity_type,
        relatedEntityId: log.related_entity_id,
        createdAt: log.created_at
      }));
    } catch (error) {
      console.error('[smsService] Failed to fetch delivery logs:', error);
      return [];
    }
  },

  /**
   * Get delivery statistics
   */
  getDeliveryStats: async (period: 'day' | 'week' | 'month' = 'day'): Promise<{
    total: number;
    sent: number;
    delivered: number;
    failed: number;
    credits: number;
  }> => {
    try {
      const now = new Date();
      let startDate: Date;

      switch (period) {
        case 'week':
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case 'month':
          startDate = new Date(now.setMonth(now.getMonth() - 1));
          break;
        default:
          startDate = new Date(now.setHours(0, 0, 0, 0));
      }

      const { data, error } = await supabase
        .from('sms_delivery_logs')
        .select('status, credits_used')
        .gte('created_at', startDate.toISOString());

      if (error) throw error;

      const stats = {
        total: data?.length || 0,
        sent: data?.filter(d => d.status === 'sent').length || 0,
        delivered: data?.filter(d => d.status === 'delivered').length || 0,
        failed: data?.filter(d => d.status === 'failed').length || 0,
        credits: data?.reduce((sum, d) => sum + (d.credits_used || 0), 0) || 0
      };

      return stats;
    } catch (error) {
      console.error('[smsService] Failed to fetch stats:', error);
      return { total: 0, sent: 0, delivered: 0, failed: 0, credits: 0 };
    }
  },

  /**
   * Test SMS configuration - uses first active DLT template
   */
  testConnection: async (phone: string): Promise<SendSMSResponse> => {
    try {
      const tenantId = await getTenantId();
      if (!tenantId) {
        return { success: false, error: 'User not authenticated' };
      }

      // Fetch first active DLT template for testing
      const { data: templates, error: templateError } = await supabase
        .from('sms_templates')
        .select('*')
        .eq('is_active', true)
        .not('dlt_template_id', 'is', null)
        .limit(1);

      if (templateError) {
        return { success: false, error: 'Failed to fetch templates' };
      }

      if (!templates || templates.length === 0) {
        return { 
          success: false, 
          error: 'No DLT templates configured. Please add a template with a valid DLT Template ID in SMS Template Manager first. TRAI requires all promotional/transactional SMS to use pre-registered DLT templates.'
        };
      }

      const template = templates[0];
      
      // For test, replace variables with sample values
      let testMessage = template.template_text;
      const variables = extractVariables(testMessage);
      variables.forEach(v => {
        testMessage = testMessage.replace(new RegExp(`\\{#${v}#\\}`, 'g'), `[${v}]`);
      });

      console.log('[smsService] Testing with DLT template:', template.name, template.dlt_template_id);

      return smsService.sendSMS({ 
        phone, 
        message: testMessage,
        dltTemplateId: template.dlt_template_id,
        templateId: template.id
      });
    } catch (error) {
      console.error('[smsService] Test connection error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Test failed' 
      };
    }
  }
};
