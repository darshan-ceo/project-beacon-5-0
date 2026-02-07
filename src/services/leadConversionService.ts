/**
 * Lead Conversion Service
 * Handles the workflow of converting a lead (contact) into a client
 */

import { supabase } from '@/integrations/supabase/client';
import { Lead, ConversionOptions, ConversionResult } from '@/types/lead';
import { leadService } from './leadService';

class LeadConversionService {
  /**
   * Convert a lead to a client
   * 1. Validates the lead is eligible for conversion
   * 2. Creates a new client record
   * 3. Links the contact to the new client
   * 4. Updates lead status to 'won'
   * 5. Optionally creates a first case
   */
  async convertToClient(
    contactId: string,
    options: ConversionOptions
  ): Promise<ConversionResult> {
    try {
      // 1. Fetch and validate the lead
      const leadResult = await leadService.getLead(contactId);
      if (!leadResult.success || !leadResult.data) {
        return { success: false, error: 'Lead not found' };
      }

      const lead = leadResult.data;

      // Validate eligibility
      if (lead.client_id) {
        return { 
          success: false, 
          error: 'This contact is already linked to a client' 
        };
      }

      if (lead.lead_status === 'converted' && lead.converted_at) {
        return { 
          success: false, 
          error: 'This inquiry has already been converted' 
        };
      }

      // 2. Get current user's tenant
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (!profile) {
        return { success: false, error: 'Profile not found' };
      }

      // 3. Create the new client
      const clientPayload = {
        tenant_id: profile.tenant_id,
        display_name: options.clientData.display_name,
        type: options.clientData.type || 'individual',
        gstin: options.clientData.gstin || null,
        pan: options.clientData.pan || null,
        email: options.clientData.email || this.getPrimaryEmail(lead),
        phone: options.clientData.phone || this.getPrimaryPhone(lead),
        address: options.clientData.address || null,
        state: options.clientData.state || null,
        city: options.clientData.city || null,
        status: 'active',
        owner_id: lead.owner_user_id || user.id,
        data_scope: lead.data_scope || 'OWN',
      };

      const { data: newClient, error: clientError } = await supabase
        .from('clients')
        .insert(clientPayload as any)
        .select()
        .single();

      if (clientError) {
        console.error('Error creating client:', clientError);
        return { success: false, error: `Failed to create client: ${clientError.message}` };
      }

      // 4. Update the contact to link to the new client and mark as converted
      const { data: updatedContact, error: contactError } = await supabase
        .from('client_contacts')
        .update({
          client_id: newClient.id,
          lead_status: 'converted',
          converted_at: new Date().toISOString(),
          last_activity_at: new Date().toISOString(),
        } as any)
        .eq('id', contactId)
        .select()
        .single();

      if (contactError) {
        // Rollback: delete the created client
        await supabase.from('clients').delete().eq('id', newClient.id);
        console.error('Error updating contact:', contactError);
        return { success: false, error: `Failed to update contact: ${contactError.message}` };
      }

      // 5. Log conversion activity
      await leadService.addActivity(contactId, {
        activity_type: 'conversion',
        subject: 'Converted to Client',
        description: `Lead converted to client: ${newClient.display_name}`,
        outcome: 'success',
      });

      // 6. Optionally create first case
      let newCase = null;
      if (options.createFirstCase && options.caseData) {
        const caseResult = await this.createFirstCase(
          profile.tenant_id,
          newClient.id,
          user.id,
          options.caseData
        );
        if (caseResult.success) {
          newCase = caseResult.data;
        }
      }

      return {
        success: true,
        client: newClient,
        contact: updatedContact as unknown as Lead,
        case: newCase,
      };
    } catch (error: any) {
      console.error('Error in lead conversion:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create the first case for a newly converted client
   */
  private async createFirstCase(
    tenantId: string,
    clientId: string,
    userId: string,
    caseData: { title: string; description?: string }
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // Generate a case number
      const caseNumber = await this.generateCaseNumber(tenantId);

      const { data, error } = await supabase
        .from('cases')
        .insert({
          tenant_id: tenantId,
          client_id: clientId,
          case_number: caseNumber,
          title: caseData.title,
          description: caseData.description || null,
          status: 'active',
          priority: 'medium',
          owner_id: userId,
          assigned_to: userId,
        })
        .select()
        .single();

      if (error) throw error;

      return { success: true, data };
    } catch (error: any) {
      console.error('Error creating first case:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate a unique case number
   */
  private async generateCaseNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `CASE-${year}`;

    // Get the count of cases for this tenant this year
    const { count } = await supabase
      .from('cases')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .like('case_number', `${prefix}%`);

    const sequence = String((count || 0) + 1).padStart(4, '0');
    return `${prefix}-${sequence}`;
  }

  /**
   * Get primary email from lead's emails array
   */
  private getPrimaryEmail(lead: Lead): string | null {
    if (!lead.emails || lead.emails.length === 0) return null;
    const primary = lead.emails.find(e => e.isPrimary);
    return primary?.email || lead.emails[0]?.email || null;
  }

  /**
   * Get primary phone from lead's phones array
   */
  private getPrimaryPhone(lead: Lead): string | null {
    if (!lead.phones || lead.phones.length === 0) return null;
    const primary = lead.phones.find(p => p.isPrimary);
    if (primary) {
      return `${primary.countryCode || ''}${primary.number}`;
    }
    const first = lead.phones[0];
    return first ? `${first.countryCode || ''}${first.number}` : null;
  }

  /**
   * Check if a lead is eligible for conversion
   */
  async checkConversionEligibility(contactId: string): Promise<{
    eligible: boolean;
    reason?: string;
    lead?: Lead;
  }> {
    const leadResult = await leadService.getLead(contactId);
    
    if (!leadResult.success || !leadResult.data) {
      return { eligible: false, reason: 'Lead not found' };
    }

    const lead = leadResult.data;

    if (lead.client_id) {
      return { 
        eligible: false, 
        reason: 'Already linked to a client',
        lead 
      };
    }

    if (lead.lead_status === 'converted' && lead.converted_at) {
      return { 
        eligible: false, 
        reason: 'Already converted',
        lead 
      };
    }

    if (lead.lead_status === 'not_proceeding') {
      return { 
        eligible: false, 
        reason: 'Inquiry is marked as not proceeding',
        lead 
      };
    }

    return { eligible: true, lead };
  }

  /**
   * Get conversion preview data
   */
  async getConversionPreview(contactId: string): Promise<{
    success: boolean;
    data?: {
      contact: Lead;
      suggestedClientName: string;
      suggestedEmail: string | null;
      suggestedPhone: string | null;
    };
    error?: string;
  }> {
    const leadResult = await leadService.getLead(contactId);
    
    if (!leadResult.success || !leadResult.data) {
      return { success: false, error: 'Lead not found' };
    }

    const lead = leadResult.data;

    return {
      success: true,
      data: {
        contact: lead,
        suggestedClientName: lead.name,
        suggestedEmail: this.getPrimaryEmail(lead),
        suggestedPhone: this.getPrimaryPhone(lead),
      },
    };
  }
}

export const leadConversionService = new LeadConversionService();
