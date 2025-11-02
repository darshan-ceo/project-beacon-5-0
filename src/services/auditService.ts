/**
 * Audit Service
 * Logs security and business events to the audit_log table
 */

import { supabase } from '@/integrations/supabase/client';

export type AuditAction = 
  | 'login' 
  | 'logout' 
  | 'signup'
  | 'create_employee'
  | 'update_employee'
  | 'delete_employee'
  | 'assign_role'
  | 'revoke_role'
  | 'create_case'
  | 'update_case'
  | 'delete_case';

interface AuditLogEntry {
  action_type: AuditAction;
  entity_type?: string;
  entity_id?: string;
  user_id?: string;
  tenant_id: string;
  details?: any;
  ip_address?: string;
  user_agent?: string;
}

class AuditService {
  /**
   * Log an audit event
   */
  async log(
    action: AuditAction,
    tenantId: string,
    options: {
      entityType?: string;
      entityId?: string;
      userId?: string;
      details?: any;
    } = {}
  ): Promise<void> {
    try {
      const entry: AuditLogEntry = {
        action_type: action,
        tenant_id: tenantId,
        entity_type: options.entityType,
        entity_id: options.entityId,
        user_id: options.userId,
        details: options.details,
        user_agent: navigator.userAgent,
      };

      const { error } = await supabase
        .from('audit_log')
        .insert(entry);

      if (error) {
        console.error('Failed to log audit event:', error);
      }
    } catch (err) {
      console.error('Audit logging error:', err);
    }
  }

  /**
   * Get audit logs for a specific entity
   */
  async getEntityLogs(entityType: string, entityId: string, limit = 50) {
    const { data, error } = await supabase
      .from('audit_log')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to fetch audit logs:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get recent audit logs for current tenant
   */
  async getRecentLogs(limit = 100) {
    const { data, error } = await supabase
      .from('audit_log')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to fetch recent logs:', error);
      return [];
    }

    return data || [];
  }
}

export const auditService = new AuditService();
