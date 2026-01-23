/**
 * City Master Service
 * Manages custom city additions with Supabase persistence
 */

import { City } from './addressLookupService';
import { supabase } from '@/integrations/supabase/client';

interface CustomCity extends City {
  createdAt: string;
  createdBy: string;
}

class CityMasterService {
  private tenantId: string | null = null;

  private async getTenantId(): Promise<string> {
    if (this.tenantId) return this.tenantId;
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();
    
    if (!profile?.tenant_id) throw new Error('Tenant not found');
    this.tenantId = profile.tenant_id;
    return this.tenantId;
  }

  /**
   * Add a new custom city to the master list
   */
  async addCustomCity(cityName: string, stateId: string): Promise<City> {
    const trimmedName = cityName.trim();
    if (!trimmedName || trimmedName.length < 2) {
      throw new Error('City name must be at least 2 characters');
    }
    
    if (!stateId) {
      throw new Error('State ID is required');
    }

    const tenantId = await this.getTenantId();
    const { data: { user } } = await supabase.auth.getUser();

    // Check for duplicates (case-insensitive)
    const exists = await this.cityExists(trimmedName, stateId);
    if (exists) {
      throw new Error('City already exists in this state');
    }

    const { data, error } = await supabase
      .from('custom_cities')
      .insert({
        tenant_id: tenantId,
        city_name: trimmedName,
        state_id: stateId,
        created_by: user?.id
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      name: data.city_name,
      stateId: data.state_id
    };
  }

  /**
   * Get all custom cities, optionally filtered by state
   */
  async getCustomCities(stateId?: string): Promise<City[]> {
    try {
      const tenantId = await this.getTenantId();
      
      let query = supabase
        .from('custom_cities')
        .select('id, city_name, state_id')
        .eq('tenant_id', tenantId);
      
      if (stateId) {
        query = query.eq('state_id', stateId);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error('Error loading custom cities:', error);
        return [];
      }

      return (data || []).map(city => ({
        id: city.id,
        name: city.city_name,
        stateId: city.state_id
      }));
    } catch (error) {
      console.error('Error loading custom cities:', error);
      return [];
    }
  }

  /**
   * Check if a city already exists (case-insensitive)
   */
  async cityExists(cityName: string, stateId: string): Promise<boolean> {
    try {
      const tenantId = await this.getTenantId();
      const lowerName = cityName.trim().toLowerCase();
      
      const { data, error } = await supabase
        .from('custom_cities')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('state_id', stateId)
        .ilike('city_name', lowerName);
      
      if (error) {
        console.error('Error checking city existence:', error);
        return false;
      }

      return (data?.length || 0) > 0;
    } catch (error) {
      console.error('Error checking city existence:', error);
      return false;
    }
  }

  /**
   * Merge custom cities with default cities
   */
  async mergeWithDefaultCities(defaultCities: City[], stateId: string): Promise<City[]> {
    try {
      const customCities = await this.getCustomCities(stateId);
      
      // Combine and sort alphabetically
      const merged = [...defaultCities, ...customCities];
      merged.sort((a, b) => a.name.localeCompare(b.name));
      
      return merged;
    } catch (error) {
      console.error('Error merging cities:', error);
      return defaultCities;
    }
  }

  /**
   * Delete a custom city
   */
  async deleteCustomCity(cityId: string): Promise<boolean> {
    try {
      const tenantId = await this.getTenantId();
      
      const { error } = await supabase
        .from('custom_cities')
        .delete()
        .eq('id', cityId)
        .eq('tenant_id', tenantId);

      if (error) {
        console.error('Error deleting custom city:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error deleting custom city:', error);
      return false;
    }
  }

  /**
   * Get city by ID
   */
  async getCustomCityById(cityId: string): Promise<City | null> {
    try {
      const tenantId = await this.getTenantId();

      const { data, error } = await supabase
        .from('custom_cities')
        .select('id, city_name, state_id')
        .eq('id', cityId)
        .eq('tenant_id', tenantId)
        .single();

      if (error || !data) return null;

      return {
        id: data.id,
        name: data.city_name,
        stateId: data.state_id
      };
    } catch (error) {
      console.error('Error getting custom city:', error);
      return null;
    }
  }

  /**
   * Clear all custom cities (for testing/admin purposes)
   */
  async clearAllCustomCities(): Promise<void> {
    try {
      const tenantId = await this.getTenantId();
      
      await supabase
        .from('custom_cities')
        .delete()
        .eq('tenant_id', tenantId);
    } catch (error) {
      console.error('Error clearing custom cities:', error);
    }
  }

  /**
   * Export custom cities to JSON
   */
  async exportCustomCities(): Promise<string> {
    try {
      const customCities = await this.getCustomCities();
      return JSON.stringify(customCities, null, 2);
    } catch (error) {
      console.error('Error exporting custom cities:', error);
      return '[]';
    }
  }

  /**
   * Import custom cities from JSON
   */
  async importCustomCities(jsonData: string): Promise<boolean> {
    try {
      const importedCities: City[] = JSON.parse(jsonData);
      
      if (!Array.isArray(importedCities)) {
        throw new Error('Invalid data format');
      }

      const tenantId = await this.getTenantId();
      const { data: { user } } = await supabase.auth.getUser();

      const citiesToInsert = importedCities.map(city => ({
        tenant_id: tenantId,
        city_name: city.name,
        state_id: city.stateId,
        created_by: user?.id
      }));

      const { error } = await supabase
        .from('custom_cities')
        .upsert(citiesToInsert, { onConflict: 'tenant_id,city_name,state_id' });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error importing custom cities:', error);
      return false;
    }
  }
}

export const cityMasterService = new CityMasterService();
