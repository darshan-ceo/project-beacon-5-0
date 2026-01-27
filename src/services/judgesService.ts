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
  async update(judgeId: string, updates: Partial<Judge>, dispatch: any): Promise<Judge> {
    try {
      const storage = storageManager.getStorage();

      // Normalize payload before persistence
      const normalizedUpdates = normalizeJudgePayload(updates);

      // Recalculate years of service if appointment date changes
      let yearsOfService = normalizedUpdates.yearsOfService;
      if (updates.appointmentDate) {
        yearsOfService = Math.floor(
          (new Date().getTime() - new Date(updates.appointmentDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
        );
      }

      // Persist to Supabase
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
        ...(yearsOfService !== undefined && { years_of_service: yearsOfService }),
        ...(updates.specialization && { specialization: updates.specialization }),
        ...(updates.chambers && { chambers: updates.chambers }),
        ...(updates.assistant && { assistant: updates.assistant }),
        ...(updates.availability && { availability: updates.availability }),
        ...(updates.tags && { tags: updates.tags }),
        ...(updates.notes !== undefined && { notes: updates.notes }),
        ...(updates.photoUrl && { photo_url: updates.photoUrl }),
        updated_at: new Date().toISOString(),
      } as any);

      // Fetch the full updated judge from database
      const existingJudge = await storage.getById<any>('judges', judgeId);
      const fullJudge: Judge = {
        id: judgeId,
        name: existingJudge?.name || updates.name || '',
        designation: existingJudge?.designation || updates.designation || '',
        status: existingJudge?.status || updates.status || 'Active',
        courtId: existingJudge?.court_id || updates.courtId || '',
        bench: existingJudge?.bench || updates.bench,
        jurisdiction: existingJudge?.jurisdiction || updates.jurisdiction,
        city: existingJudge?.city || updates.city,
        state: existingJudge?.state || updates.state,
        appointmentDate: existingJudge?.appointment_date || updates.appointmentDate || '',
        retirementDate: existingJudge?.retirement_date || updates.retirementDate,
        yearsOfService: yearsOfService ?? existingJudge?.years_of_service ?? 0,
        specialization: existingJudge?.specialization || updates.specialization || [],
        chambers: existingJudge?.chambers || updates.chambers,
        email: existingJudge?.email || updates.email,
        phone: existingJudge?.phone || updates.phone,
        assistant: existingJudge?.assistant || updates.assistant || {},
        availability: existingJudge?.availability || updates.availability || {},
        tags: existingJudge?.tags || updates.tags || [],
        notes: existingJudge?.notes ?? updates.notes,
        photoUrl: existingJudge?.photo_url || updates.photoUrl,
        totalCases: 0,
        avgDisposalTime: '0 days',
        contactInfo: {
          chambers: existingJudge?.chambers || updates.chambers || '',
          phone: existingJudge?.phone || updates.phone,
          email: existingJudge?.email || updates.email
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
   * List all judges from Supabase
   */
  async list(): Promise<Judge[]> {
    try {
      const storage = storageManager.getStorage();
      const judges = await storage.getAll('judges');
      
      return judges.map((j: any) => ({
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
        yearsOfService: j.years_of_service || 0,
        specialization: j.specialization || [],
        chambers: j.chambers,
        assistant: j.assistant || {},
        availability: j.availability || {},
        tags: j.tags || [],
        notes: j.notes,
        photoUrl: j.photo_url,
      } as Judge));
    } catch (error) {
      console.error('Failed to list judges:', error);
      throw error;
    }
  }

  /**
   * Get single judge by ID
   */
  async getById(judgeId: string): Promise<Judge | null> {
    try {
      const storage = storageManager.getStorage();
      const judge = await storage.getById('judges', judgeId) as any;
      
      if (!judge) return null;
      
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
        yearsOfService: judge.years_of_service || 0,
        specialization: judge.specialization || [],
        chambers: judge.chambers,
        assistant: judge.assistant || {},
        availability: judge.availability || {},
        tags: judge.tags || [],
        notes: judge.notes,
        photoUrl: judge.photo_url,
      } as Judge;
    } catch (error) {
      console.error('Failed to get judge:', error);
      throw error;
    }
  }
}

export const judgesService = new JudgesService();
