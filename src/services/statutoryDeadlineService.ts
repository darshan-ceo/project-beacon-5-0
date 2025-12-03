// Statutory Deadline Service - Core deadline calculation and management
import { supabase } from '@/integrations/supabase/client';
import { CaseStatutoryDeadline, StatutoryEventType } from '@/types/statutory';
import { holidayService } from './holidayService';
import { statutoryEventTypesService } from './statutoryEventTypesService';
import { toast } from 'sonner';
import { format, addDays, addMonths, differenceInDays, parseISO, isAfter, isBefore, isToday } from 'date-fns';

export interface DeadlineCalculationResult {
  calculatedDeadline: Date;
  extensionDeadline?: Date;
  daysRemaining: number;
  status: 'safe' | 'warning' | 'critical' | 'overdue';
  statusColor: 'green' | 'orange' | 'red';
  eventType: StatutoryEventType;
}

export interface CreateDeadlineRequest {
  caseId: string;
  eventTypeId: string;
  baseDate: string;
  remarks?: string;
}

class StatutoryDeadlineService {
  /**
   * Calculate deadline based on event type rules
   */
  async calculateDeadline(
    baseDate: Date,
    eventType: StatutoryEventType,
    state?: string
  ): Promise<DeadlineCalculationResult> {
    let calculatedDeadline: Date;
    let extensionDeadline: Date | undefined;

    // Calculate deadline based on type
    switch (eventType.deadlineType) {
      case 'days':
        calculatedDeadline = holidayService.calculateDeadlineByDays(baseDate, eventType.deadlineCount);
        break;
      case 'months':
        calculatedDeadline = holidayService.calculateDeadlineByMonths(baseDate, eventType.deadlineCount);
        break;
      case 'working_days':
        calculatedDeadline = await holidayService.calculateDeadlineByWorkingDays(
          baseDate,
          eventType.deadlineCount,
          state
        );
        break;
      default:
        calculatedDeadline = addDays(baseDate, eventType.deadlineCount);
    }

    // Calculate extension deadline if allowed
    if (eventType.extensionAllowed && eventType.extensionDays > 0) {
      extensionDeadline = addDays(calculatedDeadline, eventType.extensionDays);
    }

    // Calculate days remaining and status
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysRemaining = differenceInDays(calculatedDeadline, today);

    let status: 'safe' | 'warning' | 'critical' | 'overdue';
    let statusColor: 'green' | 'orange' | 'red';

    if (daysRemaining < 0) {
      status = 'overdue';
      statusColor = 'red';
    } else if (daysRemaining <= 7) {
      status = 'critical';
      statusColor = 'red';
    } else if (daysRemaining <= 15) {
      status = 'warning';
      statusColor = 'orange';
    } else {
      status = 'safe';
      statusColor = 'green';
    }

    return {
      calculatedDeadline,
      extensionDeadline,
      daysRemaining,
      status,
      statusColor,
      eventType
    };
  }

  /**
   * Calculate reply deadline for a case based on notice date and notice type
   */
  async calculateReplyDeadline(
    noticeDate: string,
    noticeType?: string
  ): Promise<DeadlineCalculationResult | null> {
    try {
      // Get event types for reply deadlines
      const eventTypes = await statutoryEventTypesService.getActiveForDeadlineCalc();
      
      // Find matching event type based on notice type or use default GST SCN
      let eventType = eventTypes.find(et => 
        noticeType && et.code.toLowerCase().includes(noticeType.toLowerCase())
      );
      
      // Default to GST SCN if no match found
      if (!eventType) {
        eventType = eventTypes.find(et => 
          et.code === 'SCN' || et.code === 'GST_SCN' || et.name.toLowerCase().includes('show cause')
        );
      }

      // If still no event type, use default 30 days
      if (!eventType) {
        const baseDate = parseISO(noticeDate);
        const calculatedDeadline = addDays(baseDate, 30);
        const today = new Date();
        const daysRemaining = differenceInDays(calculatedDeadline, today);

        return {
          calculatedDeadline,
          daysRemaining,
          status: daysRemaining < 0 ? 'overdue' : daysRemaining <= 15 ? 'warning' : 'safe',
          statusColor: daysRemaining < 0 ? 'red' : daysRemaining <= 15 ? 'orange' : 'green',
          eventType: {
            id: 'default',
            tenantId: '',
            actId: '',
            code: 'DEFAULT',
            name: 'Default Reply Period',
            baseDateType: 'notice_date',
            deadlineType: 'days',
            deadlineCount: 30,
            extensionAllowed: false,
            maxExtensionCount: 0,
            extensionDays: 0,
            isActive: true,
            createdAt: '',
            updatedAt: ''
          }
        };
      }

      const baseDate = parseISO(noticeDate);
      return this.calculateDeadline(baseDate, eventType);
    } catch (error) {
      console.error('[StatutoryDeadlineService] Error calculating reply deadline:', error);
      return null;
    }
  }

  /**
   * Get all deadlines for a case
   */
  async getDeadlinesForCase(caseId: string): Promise<CaseStatutoryDeadline[]> {
    try {
      const { data, error } = await supabase
        .from('case_statutory_deadlines')
        .select(`
          *,
          statutory_event_types!inner(name, code)
        `)
        .eq('case_id', caseId)
        .order('calculated_deadline');

      if (error) throw error;

      return (data || []).map(this.mapFromDatabase);
    } catch (error) {
      console.error('[StatutoryDeadlineService] Error fetching case deadlines:', error);
      return [];
    }
  }

  /**
   * Get upcoming deadlines across all cases
   */
  async getUpcomingDeadlines(daysAhead: number = 30): Promise<CaseStatutoryDeadline[]> {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const futureDate = format(addDays(new Date(), daysAhead), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('case_statutory_deadlines')
        .select(`
          *,
          statutory_event_types!inner(name, code),
          cases!inner(case_number, title)
        `)
        .gte('calculated_deadline', today)
        .lte('calculated_deadline', futureDate)
        .in('status', ['pending', 'extended'])
        .order('calculated_deadline');

      if (error) throw error;

      return (data || []).map(this.mapFromDatabase);
    } catch (error) {
      console.error('[StatutoryDeadlineService] Error fetching upcoming deadlines:', error);
      return [];
    }
  }

  /**
   * Get overdue deadlines
   */
  async getOverdueDeadlines(): Promise<CaseStatutoryDeadline[]> {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('case_statutory_deadlines')
        .select(`
          *,
          statutory_event_types!inner(name, code),
          cases!inner(case_number, title)
        `)
        .lt('calculated_deadline', today)
        .in('status', ['pending', 'extended'])
        .order('calculated_deadline');

      if (error) throw error;

      return (data || []).map(this.mapFromDatabase);
    } catch (error) {
      console.error('[StatutoryDeadlineService] Error fetching overdue deadlines:', error);
      return [];
    }
  }

  /**
   * Create a deadline record for a case
   */
  async createDeadline(request: CreateDeadlineRequest): Promise<CaseStatutoryDeadline | null> {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('User not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', userData.user.id)
        .single();

      if (!profile?.tenant_id) throw new Error('Tenant not found');

      // Get event type details
      const eventType = await statutoryEventTypesService.getById(request.eventTypeId);
      if (!eventType) throw new Error('Event type not found');

      // Calculate deadline
      const baseDate = parseISO(request.baseDate);
      const result = await this.calculateDeadline(baseDate, eventType);

      const { data, error } = await supabase
        .from('case_statutory_deadlines')
        .insert({
          tenant_id: profile.tenant_id,
          case_id: request.caseId,
          event_type_id: request.eventTypeId,
          base_date: request.baseDate,
          calculated_deadline: format(result.calculatedDeadline, 'yyyy-MM-dd'),
          extension_deadline: result.extensionDeadline 
            ? format(result.extensionDeadline, 'yyyy-MM-dd') 
            : null,
          status: 'pending',
          remarks: request.remarks || null
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Statutory deadline created');
      return data ? this.mapFromDatabase(data) : null;
    } catch (error: any) {
      console.error('[StatutoryDeadlineService] Error creating deadline:', error);
      toast.error(error.message || 'Failed to create deadline');
      return null;
    }
  }

  /**
   * Update deadline status
   */
  async updateStatus(id: string, status: 'pending' | 'completed' | 'overdue' | 'extended', completedDate?: string): Promise<boolean> {
    try {
      const updateData: Record<string, any> = { status };
      if (completedDate) {
        updateData.completed_date = completedDate;
      }

      const { error } = await supabase
        .from('case_statutory_deadlines')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      toast.success('Deadline status updated');
      return true;
    } catch (error: any) {
      console.error('[StatutoryDeadlineService] Error updating deadline status:', error);
      toast.error(error.message || 'Failed to update status');
      return false;
    }
  }

  /**
   * Apply extension to a deadline
   */
  async applyExtension(id: string, extensionDays: number, remarks?: string): Promise<CaseStatutoryDeadline | null> {
    try {
      // Get current deadline
      const { data: current, error: fetchError } = await supabase
        .from('case_statutory_deadlines')
        .select('*, statutory_event_types!inner(*)')
        .eq('id', id)
        .single();

      if (fetchError || !current) throw new Error('Deadline not found');

      const eventType = current.statutory_event_types;
      
      // Check if extension is allowed
      if (!eventType.extension_allowed) {
        toast.error('Extension is not allowed for this deadline type');
        return null;
      }

      // Check max extensions
      if (current.extension_count >= eventType.max_extension_count) {
        toast.error(`Maximum extensions (${eventType.max_extension_count}) already applied`);
        return null;
      }

      // Calculate new extension deadline
      const baseDeadline = current.extension_deadline 
        ? parseISO(current.extension_deadline)
        : parseISO(current.calculated_deadline);
      
      const newExtensionDeadline = addDays(baseDeadline, extensionDays);

      const { data, error } = await supabase
        .from('case_statutory_deadlines')
        .update({
          extension_deadline: format(newExtensionDeadline, 'yyyy-MM-dd'),
          extension_count: current.extension_count + 1,
          status: 'extended',
          remarks: remarks ? `${current.remarks || ''}\n${remarks}`.trim() : current.remarks
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      toast.success('Extension applied successfully');
      return data ? this.mapFromDatabase(data) : null;
    } catch (error: any) {
      console.error('[StatutoryDeadlineService] Error applying extension:', error);
      toast.error(error.message || 'Failed to apply extension');
      return null;
    }
  }

  /**
   * Get deadline status color class
   */
  getStatusColorClass(deadline: CaseStatutoryDeadline | Date): string {
    const deadlineDate = deadline instanceof Date 
      ? deadline 
      : parseISO(deadline.extensionDeadline || deadline.calculatedDeadline);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const daysRemaining = differenceInDays(deadlineDate, today);

    if (daysRemaining < 0) return 'bg-red-500 text-white'; // Overdue
    if (daysRemaining <= 7) return 'bg-red-100 text-red-800 border-red-300'; // Critical
    if (daysRemaining <= 15) return 'bg-orange-100 text-orange-800 border-orange-300'; // Warning
    return 'bg-green-100 text-green-800 border-green-300'; // Safe
  }

  /**
   * Map database record to TypeScript interface
   */
  private mapFromDatabase(record: any): CaseStatutoryDeadline {
    return {
      id: record.id,
      tenantId: record.tenant_id,
      caseId: record.case_id,
      eventTypeId: record.event_type_id,
      baseDate: record.base_date,
      calculatedDeadline: record.calculated_deadline,
      extensionDeadline: record.extension_deadline,
      extensionCount: record.extension_count,
      status: record.status,
      taskId: record.task_id,
      completedDate: record.completed_date,
      remarks: record.remarks,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
      eventTypeName: record.statutory_event_types?.name,
      caseName: record.cases?.title || record.cases?.case_number
    };
  }
}

export const statutoryDeadlineService = new StatutoryDeadlineService();
