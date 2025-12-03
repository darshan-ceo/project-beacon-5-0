import { supabase } from '@/integrations/supabase/client';
import statutoryMasterData from '@/data/seedData/statutoryMasterData.json';
import { toast } from 'sonner';

export interface SeedResult {
  success: boolean;
  actsSeeded: number;
  eventTypesSeeded: number;
  holidaysSeeded: number;
  errors: string[];
}

class StatutoryMasterDataSeeder {
  private tenantId: string | null = null;
  private userId: string | null = null;
  private actIdMap: Map<string, string> = new Map();

  async initialize(): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }
      this.userId = user.id;

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (profileError || !profile?.tenant_id) {
        throw new Error('Could not retrieve tenant ID');
      }

      this.tenantId = profile.tenant_id;
      return true;
    } catch (error) {
      console.error('Failed to initialize seeder:', error);
      return false;
    }
  }

  async checkExistingData(): Promise<{ acts: number; eventTypes: number; holidays: number }> {
    if (!this.tenantId) {
      return { acts: 0, eventTypes: 0, holidays: 0 };
    }

    const [actsResult, eventTypesResult, holidaysResult] = await Promise.all([
      supabase.from('statutory_acts').select('id', { count: 'exact', head: true }).eq('tenant_id', this.tenantId),
      supabase.from('statutory_event_types').select('id', { count: 'exact', head: true }).eq('tenant_id', this.tenantId),
      supabase.from('holidays').select('id', { count: 'exact', head: true }).eq('tenant_id', this.tenantId)
    ]);

    return {
      acts: actsResult.count || 0,
      eventTypes: eventTypesResult.count || 0,
      holidays: holidaysResult.count || 0
    };
  }

  async seedStatutoryActs(): Promise<number> {
    if (!this.tenantId || !this.userId) {
      throw new Error('Seeder not initialized');
    }

    const acts = statutoryMasterData.statutory_acts.map(act => ({
      tenant_id: this.tenantId,
      code: act.code,
      name: act.name,
      description: act.description,
      is_active: true,
      created_by: this.userId
    }));

    const { data, error } = await supabase
      .from('statutory_acts')
      .insert(acts)
      .select('id, code');

    if (error) {
      console.error('Error seeding statutory acts:', error);
      throw new Error(`Failed to seed statutory acts: ${error.message}`);
    }

    // Build act code to ID map for event types
    if (data) {
      data.forEach(act => {
        this.actIdMap.set(act.code, act.id);
      });
    }

    return data?.length || 0;
  }

  async seedEventTypes(): Promise<number> {
    if (!this.tenantId || !this.userId) {
      throw new Error('Seeder not initialized');
    }

    const eventTypes = statutoryMasterData.event_types
      .map(et => {
        const actId = this.actIdMap.get(et.act_code);
        if (!actId) {
          console.warn(`Act code ${et.act_code} not found for event type ${et.code}`);
          return null;
        }
        return {
          tenant_id: this.tenantId,
          act_id: actId,
          code: et.code,
          name: et.name,
          base_date_type: et.base_date_type,
          deadline_type: et.deadline_type,
          deadline_count: et.deadline_count,
          extension_allowed: et.extension_allowed,
          max_extension_count: et.max_extension_count || 0,
          extension_days: et.extension_days || 0,
          legal_reference: et.legal_reference,
          description: et.description,
          is_active: true,
          created_by: this.userId
        };
      })
      .filter(Boolean);

    const { data, error } = await supabase
      .from('statutory_event_types')
      .insert(eventTypes)
      .select('id');

    if (error) {
      console.error('Error seeding event types:', error);
      throw new Error(`Failed to seed event types: ${error.message}`);
    }

    return data?.length || 0;
  }

  async seedHolidays(): Promise<number> {
    if (!this.tenantId || !this.userId) {
      throw new Error('Seeder not initialized');
    }

    const allHolidays = [
      ...statutoryMasterData.holidays_2024,
      ...statutoryMasterData.holidays_2025
    ];

    const holidays = allHolidays.map(h => ({
      tenant_id: this.tenantId,
      date: h.date,
      name: h.name,
      type: h.type,
      state: h.state,
      is_active: true,
      created_by: this.userId
    }));

    const { data, error } = await supabase
      .from('holidays')
      .insert(holidays)
      .select('id');

    if (error) {
      console.error('Error seeding holidays:', error);
      throw new Error(`Failed to seed holidays: ${error.message}`);
    }

    return data?.length || 0;
  }

  async seedAll(skipDuplicateCheck = false): Promise<SeedResult> {
    const result: SeedResult = {
      success: false,
      actsSeeded: 0,
      eventTypesSeeded: 0,
      holidaysSeeded: 0,
      errors: []
    };

    try {
      // Initialize
      const initialized = await this.initialize();
      if (!initialized) {
        result.errors.push('Failed to initialize seeder. Please ensure you are logged in.');
        return result;
      }

      // Check for existing data
      if (!skipDuplicateCheck) {
        const existing = await this.checkExistingData();
        if (existing.acts > 0 || existing.eventTypes > 0 || existing.holidays > 0) {
          result.errors.push(
            `Data already exists: ${existing.acts} acts, ${existing.eventTypes} event types, ${existing.holidays} holidays. ` +
            'Use "Force Seed" to override.'
          );
          return result;
        }
      }

      // Seed in order: Acts → Event Types → Holidays
      toast.info('Seeding statutory acts...');
      result.actsSeeded = await this.seedStatutoryActs();
      
      toast.info('Seeding event types...');
      result.eventTypesSeeded = await this.seedEventTypes();
      
      toast.info('Seeding holidays...');
      result.holidaysSeeded = await this.seedHolidays();

      result.success = true;
      return result;
    } catch (error: any) {
      result.errors.push(error.message || 'Unknown error occurred');
      return result;
    }
  }

  async seedHolidaysOnly(skipDuplicateCheck = false): Promise<SeedResult> {
    const result: SeedResult = {
      success: false,
      actsSeeded: 0,
      eventTypesSeeded: 0,
      holidaysSeeded: 0,
      errors: []
    };

    try {
      const initialized = await this.initialize();
      if (!initialized) {
        result.errors.push('Failed to initialize seeder. Please ensure you are logged in.');
        return result;
      }

      // Check only for existing holidays
      if (!skipDuplicateCheck) {
        const existing = await this.checkExistingData();
        if (existing.holidays > 0) {
          result.errors.push(`${existing.holidays} holidays already exist. Use "Force Seed" to override.`);
          return result;
        }
      }

      toast.info('Seeding holidays...');
      result.holidaysSeeded = await this.seedHolidays();
      result.success = true;
      return result;
    } catch (error: any) {
      result.errors.push(error.message || 'Unknown error occurred');
      return result;
    }
  }
}

export const statutoryMasterDataSeeder = new StatutoryMasterDataSeeder();
