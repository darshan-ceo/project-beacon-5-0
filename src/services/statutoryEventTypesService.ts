// Statutory Event Types Service - CRUD operations for Event Type Master
import { supabase } from '@/integrations/supabase/client';
import { StatutoryEventType, StatutoryEventTypeFormData } from '@/types/statutory';
import { toast } from 'sonner';

class StatutoryEventTypesService {
  /**
   * Get all statutory event types for the current tenant
   */
  async getAll(): Promise<StatutoryEventType[]> {
    try {
      const { data, error } = await supabase
        .from('statutory_event_types')
        .select(`
          *,
          statutory_acts!inner(name)
        `)
        .order('name');

      if (error) throw error;

      return (data || []).map(record => this.mapFromDatabase(record));
    } catch (error) {
      console.error('[StatutoryEventTypesService] Error fetching event types:', error);
      return [];
    }
  }

  /**
   * Get event types by act ID
   */
  async getByActId(actId: string): Promise<StatutoryEventType[]> {
    try {
      const { data, error } = await supabase
        .from('statutory_event_types')
        .select(`
          *,
          statutory_acts!inner(name)
        `)
        .eq('act_id', actId)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      return (data || []).map(record => this.mapFromDatabase(record));
    } catch (error) {
      console.error('[StatutoryEventTypesService] Error fetching event types by act:', error);
      return [];
    }
  }

  /**
   * Get active event types for deadline calculation
   */
  async getActiveForDeadlineCalc(): Promise<StatutoryEventType[]> {
    try {
      const { data, error } = await supabase
        .from('statutory_event_types')
        .select(`
          *,
          statutory_acts!inner(name, is_active)
        `)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      // Filter out event types where the parent act is inactive
      return (data || [])
        .filter((record: any) => record.statutory_acts?.is_active !== false)
        .map(record => this.mapFromDatabase(record));
    } catch (error) {
      console.error('[StatutoryEventTypesService] Error fetching active event types:', error);
      return [];
    }
  }

  /**
   * Get a single event type by ID
   */
  async getById(id: string): Promise<StatutoryEventType | null> {
    try {
      const { data, error } = await supabase
        .from('statutory_event_types')
        .select(`
          *,
          statutory_acts!inner(name)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      return data ? this.mapFromDatabase(data) : null;
    } catch (error) {
      console.error('[StatutoryEventTypesService] Error fetching event type:', error);
      return null;
    }
  }

  /**
   * Create a new event type
   */
  async create(formData: StatutoryEventTypeFormData): Promise<StatutoryEventType | null> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('User not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', userData.user.id)
        .single();

      if (!profile?.tenant_id) throw new Error('Tenant not found');

      const { data, error } = await supabase
        .from('statutory_event_types')
        .insert({
          tenant_id: profile.tenant_id,
          act_id: formData.actId,
          code: formData.code.toUpperCase(),
          name: formData.name,
          base_date_type: formData.baseDateType,
          deadline_type: formData.deadlineType,
          deadline_count: formData.deadlineCount,
          extension_allowed: formData.extensionAllowed,
          max_extension_count: formData.maxExtensionCount,
          extension_days: formData.extensionDays,
          legal_reference: formData.legalReference || null,
          description: formData.description || null,
          is_active: formData.isActive,
          created_by: userData.user.id
        })
        .select(`
          *,
          statutory_acts!inner(name)
        `)
        .single();

      if (error) {
        if (error.code === '23505') {
          toast.error('An event type with this code already exists for this act');
          return null;
        }
        throw error;
      }

      toast.success('Event Type created successfully');
      return data ? this.mapFromDatabase(data) : null;
    } catch (error: any) {
      console.error('[StatutoryEventTypesService] Error creating event type:', error);
      toast.error(error.message || 'Failed to create event type');
      return null;
    }
  }

  /**
   * Update an existing event type
   */
  async update(id: string, formData: Partial<StatutoryEventTypeFormData>): Promise<StatutoryEventType | null> {
    try {
      const updateData: Record<string, any> = {};
      
      if (formData.actId !== undefined) updateData.act_id = formData.actId;
      if (formData.code !== undefined) updateData.code = formData.code.toUpperCase();
      if (formData.name !== undefined) updateData.name = formData.name;
      if (formData.baseDateType !== undefined) updateData.base_date_type = formData.baseDateType;
      if (formData.deadlineType !== undefined) updateData.deadline_type = formData.deadlineType;
      if (formData.deadlineCount !== undefined) updateData.deadline_count = formData.deadlineCount;
      if (formData.extensionAllowed !== undefined) updateData.extension_allowed = formData.extensionAllowed;
      if (formData.maxExtensionCount !== undefined) updateData.max_extension_count = formData.maxExtensionCount;
      if (formData.extensionDays !== undefined) updateData.extension_days = formData.extensionDays;
      if (formData.legalReference !== undefined) updateData.legal_reference = formData.legalReference || null;
      if (formData.description !== undefined) updateData.description = formData.description || null;
      if (formData.isActive !== undefined) updateData.is_active = formData.isActive;

      const { data, error } = await supabase
        .from('statutory_event_types')
        .update(updateData)
        .eq('id', id)
        .select(`
          *,
          statutory_acts!inner(name)
        `)
        .single();

      if (error) {
        if (error.code === '23505') {
          toast.error('An event type with this code already exists for this act');
          return null;
        }
        throw error;
      }

      toast.success('Event Type updated successfully');
      return data ? this.mapFromDatabase(data) : null;
    } catch (error: any) {
      console.error('[StatutoryEventTypesService] Error updating event type:', error);
      toast.error(error.message || 'Failed to update event type');
      return null;
    }
  }

  /**
   * Delete an event type
   */
  async delete(id: string): Promise<boolean> {
    try {
      // Check if there are case deadlines linked to this event type
      const { data: deadlines } = await supabase
        .from('case_statutory_deadlines')
        .select('id')
        .eq('event_type_id', id)
        .limit(1);

      if (deadlines && deadlines.length > 0) {
        toast.error('Cannot delete: This event type has deadlines linked to it');
        return false;
      }

      const { error } = await supabase
        .from('statutory_event_types')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Event Type deleted successfully');
      return true;
    } catch (error: any) {
      console.error('[StatutoryEventTypesService] Error deleting event type:', error);
      toast.error(error.message || 'Failed to delete event type');
      return false;
    }
  }

  /**
   * Map database record to TypeScript interface
   */
  private mapFromDatabase(record: any): StatutoryEventType {
    return {
      id: record.id,
      tenantId: record.tenant_id,
      actId: record.act_id,
      code: record.code,
      name: record.name,
      baseDateType: record.base_date_type,
      deadlineType: record.deadline_type,
      deadlineCount: record.deadline_count,
      extensionAllowed: record.extension_allowed,
      maxExtensionCount: record.max_extension_count,
      extensionDays: record.extension_days,
      legalReference: record.legal_reference,
      description: record.description,
      isActive: record.is_active,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
      createdBy: record.created_by,
      actName: record.statutory_acts?.name
    };
  }
}

export const statutoryEventTypesService = new StatutoryEventTypesService();
