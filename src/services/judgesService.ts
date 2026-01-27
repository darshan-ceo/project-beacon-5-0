import { Judge } from '@/contexts/AppStateContext';
import { storageManager } from '@/data/StorageManager';
import { toast } from '@/hooks/use-toast';
import { normalizeJudgePayload } from '@/utils/formatters';

// Helper to safely format date fields (handles Date objects, strings, null/undefined)
function formatDateFieldSafe(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().split('T')[0];
  if (typeof value === 'string') return value;
  return null;
}

export interface CreateJudgeData {
  name: string;
  designation: string;
  status: 'Active' | 'On Leave' | 'Retired' | 'Transferred' | 'Deceased';
  courtId: string;
  bench?: string;
  jurisdiction?: string;
  city?: string;
  state?: string;
  appointmentDate: string;
  retirementDate?: string;
  specializations?: string[];
  chambers?: string;
  email?: string;
  phone?: string;
  assistant?: {
    name?: string;
    email?: string;
    phone?: string;
  };
}

export interface UpdateJudgeData extends Partial<CreateJudgeData> {
  id: string;
}

class JudgesService {
  /**
   * Create a new judge with persistence and dispatch
   */
  async create(judgeData: Partial<Judge>, dispatch: any): Promise<Judge> {
    try {
      const storage = storageManager.getStorage();

      // Normalize payload before persistence
      const normalizedData = normalizeJudgePayload(judgeData);

      // Calculate years of service
      const yearsOfService = normalizedData.appointmentDate
        ? Math.floor((new Date().getTime() - new Date(normalizedData.appointmentDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
        : 0;

      // Build complete judge object
      const newJudge: Judge = {
        id: '', // Server will generate UUID
        name: normalizedData.name || '',
        designation: normalizedData.designation || '',
        status: normalizedData.status || 'Active',
        courtId: normalizedData.courtId || '',
        bench: normalizedData.bench,
        jurisdiction: normalizedData.jurisdiction,
        city: normalizedData.city,
        state: normalizedData.state,
        appointmentDate: judgeData.appointmentDate || undefined,
        retirementDate: judgeData.retirementDate || undefined,
        yearsOfService,
        specialization: judgeData.specialization || [],
        chambers: judgeData.chambers,
        email: judgeData.email,
        phone: judgeData.phone,
        assistant: judgeData.assistant,
        address: judgeData.address,
        availability: judgeData.availability,
        tags: judgeData.tags,
        notes: judgeData.notes,
        totalCases: 0,
        avgDisposalTime: '0 days',
        contactInfo: {
          chambers: judgeData.chambers || '',
          phone: judgeData.phone,
          email: judgeData.email
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Persist to Supabase
      const created = await storage.create('judges', {
        name: newJudge.name,
        designation: newJudge.designation,
        court_id: newJudge.courtId,
        email: newJudge.email,
        phone: newJudge.phone,
        status: newJudge.status,
        bench: newJudge.bench,
        jurisdiction: newJudge.jurisdiction,
        city: newJudge.city,
        state: newJudge.state,
        appointment_date: newJudge.appointmentDate || null,
        retirement_date: newJudge.retirementDate || null,
        years_of_service: yearsOfService,
        specialization: newJudge.specialization || [],
        chambers: newJudge.chambers,
        assistant: newJudge.assistant || {},
        availability: newJudge.availability || {},
        tags: newJudge.tags || [],
        notes: newJudge.notes,
        photo_url: newJudge.photoUrl,
        // Phase 1 fields
        member_type: judgeData.memberType || null,
        authority_level: judgeData.authorityLevel || null,
        qualifications: judgeData.qualifications ? JSON.stringify(judgeData.qualifications) : null,
        tenure_details: judgeData.tenureDetails ? JSON.stringify({
          tenureStartDate: formatDateFieldSafe(judgeData.tenureDetails.tenureStartDate),
          tenureEndDate: formatDateFieldSafe(judgeData.tenureDetails.tenureEndDate),
          maxTenureYears: judgeData.tenureDetails.maxTenureYears,
          extensionGranted: judgeData.tenureDetails.extensionGranted,
          ageLimit: judgeData.tenureDetails.ageLimit
        }) : null,
      } as any);

      // Get server-generated UUID
      const persistedJudge = { ...newJudge, id: created.id };

      // Dispatch to context
      dispatch({ type: 'ADD_JUDGE', payload: persistedJudge });

      // Show success toast
      toast({
        title: "Judge Added",
        description: `Judge "${persistedJudge.name}" has been added successfully.`,
      });

      return persistedJudge;
    } catch (error) {
      console.error('Failed to create judge:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add judge. Please try again.",
        variant: "destructive"
      });
      throw error;
    }
  }

  /**
   * Update an existing judge
   */
  async update(judgeId: string, updates: Partial<Judge>, dispatch: any, userId?: string): Promise<Judge> {
    try {
      const storage = storageManager.getStorage();

      // Normalize payload before persistence
      const normalizedUpdates = normalizeJudgePayload(updates);

      // Fetch existing judge to get appointment_date for years calculation
      const existingJudge = await storage.getById<any>('judges', judgeId);
      
      // Recalculate years of service from appointment date (use update value or existing)
      const appointmentDateStr = updates.appointmentDate || existingJudge?.appointment_date;
      let yearsOfService = 0;
      if (appointmentDateStr) {
        const appointmentDate = new Date(appointmentDateStr);
        yearsOfService = Math.floor(
          (Date.now() - appointmentDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
        );
      }

      // Persist to Supabase - include ALL fields including Phase 1
      await storage.update('judges', judgeId, {
        ...(updates.name && { name: updates.name }),
        ...(updates.designation && { designation: updates.designation }),
        ...(updates.courtId && { court_id: updates.courtId }),
        ...(updates.email && { email: updates.email }),
        ...(updates.phone && { phone: updates.phone }),
        ...(updates.status && { status: updates.status }),
        ...(updates.bench && { bench: updates.bench }),
        ...(updates.jurisdiction && { jurisdiction: updates.jurisdiction }),
        ...(updates.city && { city: updates.city }),
        ...(updates.state && { state: updates.state }),
        ...(updates.appointmentDate && { appointment_date: updates.appointmentDate }),
        ...(updates.retirementDate && { retirement_date: updates.retirementDate }),
        years_of_service: yearsOfService, // Always update years of service
        ...(updates.specialization && { specialization: updates.specialization }),
        ...(updates.chambers && { chambers: updates.chambers }),
        ...(updates.assistant && { assistant: JSON.stringify(updates.assistant) }),
        ...(updates.availability && { availability: JSON.stringify(updates.availability) }),
        ...(updates.tags && { tags: updates.tags }),
        ...(updates.notes !== undefined && { notes: updates.notes }),
        ...(updates.photoUrl && { photo_url: updates.photoUrl }),
        // Phase 1 fields
        ...(updates.memberType !== undefined && { member_type: updates.memberType }),
        ...(updates.authorityLevel !== undefined && { authority_level: updates.authorityLevel }),
        ...(updates.qualifications && { qualifications: JSON.stringify(updates.qualifications) }),
        ...(updates.tenureDetails && { 
          tenure_details: JSON.stringify({
            tenureStartDate: formatDateFieldSafe(updates.tenureDetails.tenureStartDate),
            tenureEndDate: formatDateFieldSafe(updates.tenureDetails.tenureEndDate),
            maxTenureYears: updates.tenureDetails.maxTenureYears,
            extensionGranted: updates.tenureDetails.extensionGranted,
            ageLimit: updates.tenureDetails.ageLimit
          })
        }),
        ...(updates.address && { address: JSON.stringify(updates.address) }),
        updated_at: new Date().toISOString(),
        ...(userId && { updated_by: userId }),
      } as any);

      // Fetch the full updated judge from database
      const updatedJudge = await storage.getById<any>('judges', judgeId);
      const fullJudge: Judge = {
        id: judgeId,
        name: updatedJudge?.name || updates.name || '',
        designation: updatedJudge?.designation || updates.designation || '',
        status: updatedJudge?.status || updates.status || 'Active',
        courtId: updatedJudge?.court_id || updates.courtId || '',
        bench: updatedJudge?.bench || updates.bench,
        jurisdiction: updatedJudge?.jurisdiction || updates.jurisdiction,
        city: updatedJudge?.city || updates.city,
        state: updatedJudge?.state || updates.state,
        appointmentDate: updatedJudge?.appointment_date || updates.appointmentDate || '',
        retirementDate: updatedJudge?.retirement_date || updates.retirementDate,
        yearsOfService: yearsOfService ?? updatedJudge?.years_of_service ?? 0,
        specialization: updatedJudge?.specialization || updates.specialization || [],
        chambers: updatedJudge?.chambers || updates.chambers,
        email: updatedJudge?.email || updates.email,
        phone: updatedJudge?.phone || updates.phone,
        assistant: updatedJudge?.assistant || updates.assistant || {},
        availability: updatedJudge?.availability || updates.availability || {},
        tags: updatedJudge?.tags || updates.tags || [],
        notes: updatedJudge?.notes ?? updates.notes,
        photoUrl: updatedJudge?.photo_url || updates.photoUrl,
        totalCases: 0,
        avgDisposalTime: '0 days',
        contactInfo: {
          chambers: updatedJudge?.chambers || updates.chambers || '',
          phone: updatedJudge?.phone || updates.phone,
          email: updatedJudge?.email || updates.email
        },
        ...updates // Apply updates on top
      };

      // Dispatch full judge object to context
      dispatch({ type: 'UPDATE_JUDGE', payload: fullJudge });

      // Show success toast
      toast({
        title: "Judge Updated",
        description: `Judge "${updates.name || judgeId}" has been updated successfully.`,
      });

      return fullJudge;
    } catch (error) {
      console.error('Failed to update judge:', error);
      toast({
        title: "Error",
        description: "Failed to update judge. Please try again.",
        variant: "destructive"
      });
      throw error;
    }
  }

  /**
   * Delete a judge
   */
  async delete(judgeId: string, dispatch: any): Promise<void> {
    try {
      const storage = storageManager.getStorage();

      // Delete from Supabase
      await storage.delete('judges', judgeId);

      // Dispatch to context
      dispatch({ type: 'DELETE_JUDGE', payload: judgeId });

      // Show success toast
      toast({
        title: "Judge Deleted",
        description: "Judge has been deleted successfully.",
      });
    } catch (error) {
      console.error('Failed to delete judge:', error);
      toast({
        title: "Error",
        description: "Failed to delete judge. Please try again.",
        variant: "destructive"
      });
      throw error;
    }
  }

  /**
   * List all judges from Supabase with profile resolution for created/updated by
   */
  async list(): Promise<Judge[]> {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: judges, error } = await supabase
        .from('judges')
        .select(`
          *,
          created_by_profile:profiles!judges_created_by_fkey(full_name),
          updated_by_profile:profiles!judges_updated_by_fkey(full_name)
        `);
      
      if (error) throw error;
      
      return (judges || []).map((j: any) => {
        // Dynamic years of service calculation
        const yearsOfService = j.appointment_date 
          ? Math.floor((Date.now() - new Date(j.appointment_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
          : 0;
        
        // Parse JSONB fields
        const qualifications = j.qualifications ? (typeof j.qualifications === 'string' ? JSON.parse(j.qualifications) : j.qualifications) : undefined;
        const tenureDetails = j.tenure_details ? (typeof j.tenure_details === 'string' ? JSON.parse(j.tenure_details) : j.tenure_details) : undefined;
        const address = j.address ? (typeof j.address === 'string' ? JSON.parse(j.address) : j.address) : undefined;
        const assistant = j.assistant ? (typeof j.assistant === 'string' ? JSON.parse(j.assistant) : j.assistant) : {};
        const availability = j.availability ? (typeof j.availability === 'string' ? JSON.parse(j.availability) : j.availability) : {};
        
        return {
          id: j.id,
          name: j.name,
          designation: j.designation,
          courtId: j.court_id,
          email: j.email,
          phone: j.phone,
          status: j.status,
          bench: j.bench,
          jurisdiction: j.jurisdiction,
          city: j.city,
          state: j.state,
          appointmentDate: j.appointment_date,
          retirementDate: j.retirement_date,
          yearsOfService,
          specialization: j.specialization || [],
          chambers: j.chambers,
          assistant,
          availability,
          tags: j.tags || [],
          notes: j.notes,
          photoUrl: j.photo_url,
          // Phase 1 fields
          memberType: j.member_type,
          authorityLevel: j.authority_level,
          qualifications,
          tenureDetails,
          address,
          // Audit fields with resolved names
          createdAt: j.created_at,
          updatedAt: j.updated_at,
          createdBy: j.created_by,
          updatedBy: j.updated_by,
          createdByName: j.created_by_profile?.full_name || 'Unknown',
          updatedByName: j.updated_by_profile?.full_name || 'Unknown',
        } as Judge;
      });
    } catch (error) {
      console.error('Failed to list judges:', error);
      throw error;
    }
  }

  /**
   * Get single judge by ID with profile resolution
   */
  async getById(judgeId: string): Promise<Judge | null> {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: judge, error } = await supabase
        .from('judges')
        .select(`
          *,
          created_by_profile:profiles!judges_created_by_fkey(full_name),
          updated_by_profile:profiles!judges_updated_by_fkey(full_name)
        `)
        .eq('id', judgeId)
        .single();
      
      if (error || !judge) return null;
      
      // Dynamic years of service calculation
      const yearsOfService = judge.appointment_date 
        ? Math.floor((Date.now() - new Date(judge.appointment_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
        : 0;
      
      // Parse JSONB fields
      const qualifications = judge.qualifications ? (typeof judge.qualifications === 'string' ? JSON.parse(judge.qualifications) : judge.qualifications) : undefined;
      const tenureDetails = judge.tenure_details ? (typeof judge.tenure_details === 'string' ? JSON.parse(judge.tenure_details) : judge.tenure_details) : undefined;
      const address = judge.address ? (typeof judge.address === 'string' ? JSON.parse(judge.address) : judge.address) : undefined;
      const assistant = judge.assistant ? (typeof judge.assistant === 'string' ? JSON.parse(judge.assistant) : judge.assistant) : {};
      const availability = judge.availability ? (typeof judge.availability === 'string' ? JSON.parse(judge.availability) : judge.availability) : {};
      
      return {
        id: judge.id,
        name: judge.name,
        designation: judge.designation,
        courtId: judge.court_id,
        email: judge.email,
        phone: judge.phone,
        status: judge.status,
        bench: judge.bench,
        jurisdiction: judge.jurisdiction,
        city: judge.city,
        state: judge.state,
        appointmentDate: judge.appointment_date,
        retirementDate: judge.retirement_date,
        yearsOfService,
        specialization: judge.specialization || [],
        chambers: judge.chambers,
        assistant,
        availability,
        tags: judge.tags || [],
        notes: judge.notes,
        photoUrl: judge.photo_url,
        // Phase 1 fields
        memberType: judge.member_type,
        authorityLevel: judge.authority_level,
        qualifications,
        tenureDetails,
        address,
        // Audit fields with resolved names
        createdAt: judge.created_at,
        updatedAt: judge.updated_at,
        createdBy: judge.created_by,
        updatedBy: judge.updated_by,
        createdByName: (judge as any).created_by_profile?.full_name || 'Unknown',
        updatedByName: (judge as any).updated_by_profile?.full_name || 'Unknown',
      } as Judge;
    } catch (error) {
      console.error('Failed to get judge:', error);
      throw error;
    }
  }
}

export const judgesService = new JudgesService();
