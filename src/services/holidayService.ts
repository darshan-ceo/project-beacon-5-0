// Holiday Service - For managing holidays and working day calculations
import { supabase } from '@/integrations/supabase/client';
import { Holiday, HolidayFormData } from '@/types/statutory';
import { toast } from 'sonner';
import { format, addDays, isWeekend, isSameDay, parseISO } from 'date-fns';

class HolidayService {
  private holidayCache: Map<string, Holiday[]> = new Map();

  /**
   * Get all holidays for the current tenant
   */
  async getAll(): Promise<Holiday[]> {
    try {
      const { data, error } = await supabase
        .from('holidays')
        .select('*')
        .order('date');

      if (error) throw error;

      return (data || []).map(this.mapFromDatabase);
    } catch (error) {
      console.error('[HolidayService] Error fetching holidays:', error);
      return [];
    }
  }

  /**
   * Get holidays for a specific year
   */
  async getByYear(year: number): Promise<Holiday[]> {
    const cacheKey = `year_${year}`;
    
    if (this.holidayCache.has(cacheKey)) {
      return this.holidayCache.get(cacheKey)!;
    }

    try {
      const startDate = `${year}-01-01`;
      const endDate = `${year}-12-31`;

      const { data, error } = await supabase
        .from('holidays')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)
        .eq('is_active', true)
        .order('date');

      if (error) throw error;

      const holidays = (data || []).map(this.mapFromDatabase);
      this.holidayCache.set(cacheKey, holidays);
      return holidays;
    } catch (error) {
      console.error('[HolidayService] Error fetching holidays by year:', error);
      return [];
    }
  }

  /**
   * Check if a date is a holiday
   */
  async isHoliday(date: Date, state?: string): Promise<boolean> {
    const year = date.getFullYear();
    const holidays = await this.getByYear(year);
    const dateStr = format(date, 'yyyy-MM-dd');

    return holidays.some(h => {
      const holidayDate = h.date.split('T')[0];
      const matchesDate = holidayDate === dateStr;
      const matchesState = !state || h.state === 'ALL' || h.state === state;
      return matchesDate && matchesState;
    });
  }

  /**
   * Check if a date is a working day (not weekend and not holiday)
   */
  async isWorkingDay(date: Date, state?: string): Promise<boolean> {
    if (isWeekend(date)) return false;
    const holiday = await this.isHoliday(date, state);
    return !holiday;
  }

  /**
   * Calculate deadline by adding days (calendar days)
   */
  calculateDeadlineByDays(baseDate: Date, days: number): Date {
    return addDays(baseDate, days);
  }

  /**
   * Calculate deadline by adding months
   */
  calculateDeadlineByMonths(baseDate: Date, months: number): Date {
    const result = new Date(baseDate);
    result.setMonth(result.getMonth() + months);
    return result;
  }

  /**
   * Calculate deadline by adding working days (excluding weekends and holidays)
   */
  async calculateDeadlineByWorkingDays(baseDate: Date, workingDays: number, state?: string): Promise<Date> {
    let currentDate = new Date(baseDate);
    let daysAdded = 0;

    while (daysAdded < workingDays) {
      currentDate = addDays(currentDate, 1);
      const isWorking = await this.isWorkingDay(currentDate, state);
      if (isWorking) {
        daysAdded++;
      }
    }

    return currentDate;
  }

  /**
   * Get working days between two dates
   */
  async getWorkingDaysBetween(startDate: Date, endDate: Date, state?: string): Promise<number> {
    let count = 0;
    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const isWorking = await this.isWorkingDay(currentDate, state);
      if (isWorking) {
        count++;
      }
      currentDate = addDays(currentDate, 1);
    }

    return count;
  }

  /**
   * Create a new holiday
   */
  async create(formData: HolidayFormData): Promise<Holiday | null> {
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
        .from('holidays')
        .insert({
          tenant_id: profile.tenant_id,
          date: formData.date,
          name: formData.name,
          type: formData.type,
          state: formData.state || 'ALL',
          is_active: formData.isActive,
          created_by: userData.user.id
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          toast.error('This holiday already exists for this date and state');
          return null;
        }
        throw error;
      }

      // Clear cache
      this.holidayCache.clear();

      toast.success('Holiday created successfully');
      return data ? this.mapFromDatabase(data) : null;
    } catch (error: any) {
      console.error('[HolidayService] Error creating holiday:', error);
      toast.error(error.message || 'Failed to create holiday');
      return null;
    }
  }

  /**
   * Update a holiday
   */
  async update(id: string, formData: Partial<HolidayFormData>): Promise<Holiday | null> {
    try {
      const updateData: Record<string, any> = {};
      
      if (formData.date !== undefined) updateData.date = formData.date;
      if (formData.name !== undefined) updateData.name = formData.name;
      if (formData.type !== undefined) updateData.type = formData.type;
      if (formData.state !== undefined) updateData.state = formData.state || 'ALL';
      if (formData.isActive !== undefined) updateData.is_active = formData.isActive;

      const { data, error } = await supabase
        .from('holidays')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Clear cache
      this.holidayCache.clear();

      toast.success('Holiday updated successfully');
      return data ? this.mapFromDatabase(data) : null;
    } catch (error: any) {
      console.error('[HolidayService] Error updating holiday:', error);
      toast.error(error.message || 'Failed to update holiday');
      return null;
    }
  }

  /**
   * Delete a holiday
   */
  async delete(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('holidays')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Clear cache
      this.holidayCache.clear();

      toast.success('Holiday deleted successfully');
      return true;
    } catch (error: any) {
      console.error('[HolidayService] Error deleting holiday:', error);
      toast.error(error.message || 'Failed to delete holiday');
      return false;
    }
  }

  /**
   * Map database record to TypeScript interface
   */
  private mapFromDatabase(record: any): Holiday {
    return {
      id: record.id,
      tenantId: record.tenant_id,
      date: record.date,
      name: record.name,
      type: record.type,
      state: record.state,
      isActive: record.is_active,
      createdAt: record.created_at,
      createdBy: record.created_by
    };
  }
}

export const holidayService = new HolidayService();
