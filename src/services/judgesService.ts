import { Judge } from '@/contexts/AppStateContext';
import { storageManager } from '@/data/StorageManager';
import { toast } from '@/hooks/use-toast';

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

      // Calculate years of service
      const yearsOfService = judgeData.appointmentDate
        ? Math.floor((new Date().getTime() - new Date(judgeData.appointmentDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
        : 0;

      // Build complete judge object
      const newJudge: Judge = {
        id: '', // Server will generate UUID
        name: judgeData.name || '',
        designation: judgeData.designation || '',
        status: judgeData.status || 'Active',
        courtId: judgeData.courtId || '',
        bench: judgeData.bench,
        jurisdiction: judgeData.jurisdiction,
        city: judgeData.city,
        state: judgeData.state,
        appointmentDate: judgeData.appointmentDate || '',
        retirementDate: judgeData.retirementDate,
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
        createdBy: 'system',
        updatedBy: 'system'
      };

      // Persist to Supabase
      const created = await storage.create('judges', {
        name: newJudge.name,
        designation: newJudge.designation,
        court_id: newJudge.courtId,
        email: newJudge.email,
        phone: newJudge.phone,
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

      // Recalculate years of service if appointment date changes
      let yearsOfService = updates.yearsOfService;
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
        updated_at: new Date().toISOString(),
      } as any);

      // Build updated judge
      const updatedJudge = { ...updates, id: judgeId, yearsOfService } as Judge;

      // Dispatch to context
      dispatch({ type: 'UPDATE_JUDGE', payload: updatedJudge });

      // Show success toast
      toast({
        title: "Judge Updated",
        description: `Judge "${updates.name || judgeId}" has been updated successfully.`,
      });

      return updatedJudge;
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
}

export const judgesService = new JudgesService();
