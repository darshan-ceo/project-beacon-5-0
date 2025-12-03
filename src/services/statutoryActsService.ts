// Statutory Acts Service - CRUD operations for Act Master
import { supabase } from '@/integrations/supabase/client';
import { StatutoryAct, StatutoryActFormData } from '@/types/statutory';
import { toast } from 'sonner';

class StatutoryActsService {
  /**
   * Get all statutory acts for the current tenant
   */
  async getAll(): Promise<StatutoryAct[]> {
    try {
      const { data, error } = await supabase
        .from('statutory_acts')
        .select('*')
        .order('name');

      if (error) throw error;

      return (data || []).map(this.mapFromDatabase);
    } catch (error) {
      console.error('[StatutoryActsService] Error fetching acts:', error);
      return [];
    }
  }

  /**
   * Get active statutory acts only
   */
  async getActive(): Promise<StatutoryAct[]> {
    try {
      const { data, error } = await supabase
        .from('statutory_acts')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      return (data || []).map(this.mapFromDatabase);
    } catch (error) {
      console.error('[StatutoryActsService] Error fetching active acts:', error);
      return [];
    }
  }

  /**
   * Get a single statutory act by ID
   */
  async getById(id: string): Promise<StatutoryAct | null> {
    try {
      const { data, error } = await supabase
        .from('statutory_acts')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      return data ? this.mapFromDatabase(data) : null;
    } catch (error) {
      console.error('[StatutoryActsService] Error fetching act:', error);
      return null;
    }
  }

  /**
   * Create a new statutory act
   */
  async create(formData: StatutoryActFormData): Promise<StatutoryAct | null> {
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
        .from('statutory_acts')
        .insert({
          tenant_id: profile.tenant_id,
          code: formData.code.toUpperCase(),
          name: formData.name,
          description: formData.description || null,
          is_active: formData.isActive,
          created_by: userData.user.id
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          toast.error('An act with this code already exists');
          return null;
        }
        throw error;
      }

      toast.success('Statutory Act created successfully');
      return data ? this.mapFromDatabase(data) : null;
    } catch (error: any) {
      console.error('[StatutoryActsService] Error creating act:', error);
      toast.error(error.message || 'Failed to create statutory act');
      return null;
    }
  }

  /**
   * Update an existing statutory act
   */
  async update(id: string, formData: Partial<StatutoryActFormData>): Promise<StatutoryAct | null> {
    try {
      const updateData: Record<string, any> = {};
      
      if (formData.code !== undefined) updateData.code = formData.code.toUpperCase();
      if (formData.name !== undefined) updateData.name = formData.name;
      if (formData.description !== undefined) updateData.description = formData.description || null;
      if (formData.isActive !== undefined) updateData.is_active = formData.isActive;

      const { data, error } = await supabase
        .from('statutory_acts')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          toast.error('An act with this code already exists');
          return null;
        }
        throw error;
      }

      toast.success('Statutory Act updated successfully');
      return data ? this.mapFromDatabase(data) : null;
    } catch (error: any) {
      console.error('[StatutoryActsService] Error updating act:', error);
      toast.error(error.message || 'Failed to update statutory act');
      return null;
    }
  }

  /**
   * Delete a statutory act
   */
  async delete(id: string): Promise<boolean> {
    try {
      // Check if there are event types linked to this act
      const { data: eventTypes } = await supabase
        .from('statutory_event_types')
        .select('id')
        .eq('act_id', id)
        .limit(1);

      if (eventTypes && eventTypes.length > 0) {
        toast.error('Cannot delete: This act has event types linked to it');
        return false;
      }

      const { error } = await supabase
        .from('statutory_acts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Statutory Act deleted successfully');
      return true;
    } catch (error: any) {
      console.error('[StatutoryActsService] Error deleting act:', error);
      toast.error(error.message || 'Failed to delete statutory act');
      return false;
    }
  }

  /**
   * Toggle active status
   */
  async toggleStatus(id: string, isActive: boolean): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('statutory_acts')
        .update({ is_active: isActive })
        .eq('id', id);

      if (error) throw error;

      toast.success(`Act ${isActive ? 'activated' : 'deactivated'} successfully`);
      return true;
    } catch (error: any) {
      console.error('[StatutoryActsService] Error toggling status:', error);
      toast.error(error.message || 'Failed to update status');
      return false;
    }
  }

  /**
   * Map database record to TypeScript interface
   */
  private mapFromDatabase(record: any): StatutoryAct {
    return {
      id: record.id,
      tenantId: record.tenant_id,
      code: record.code,
      name: record.name,
      description: record.description,
      isActive: record.is_active,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
      createdBy: record.created_by
    };
  }
}

export const statutoryActsService = new StatutoryActsService();
