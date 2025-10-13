/**
 * City Master Service
 * Manages custom city additions and persistence
 */

import { City } from './addressLookupService';

const STORAGE_KEY = 'custom_cities_master';

interface CustomCity extends City {
  createdAt: string;
  createdBy: string;
}

class CityMasterService {
  /**
   * Add a new custom city to the master list
   */
  async addCustomCity(cityName: string, stateId: string): Promise<City> {
    try {
      // Validate inputs
      const trimmedName = cityName.trim();
      if (!trimmedName || trimmedName.length < 2) {
        throw new Error('City name must be at least 2 characters');
      }
      
      if (!stateId) {
        throw new Error('State ID is required');
      }

      // Check for duplicates (case-insensitive)
      const exists = await this.cityExists(trimmedName, stateId);
      if (exists) {
        throw new Error('City already exists in this state');
      }

      // Generate unique ID
      const timestamp = Date.now();
      const newCity: CustomCity = {
        id: `CUSTOM_${stateId}_${timestamp}`,
        name: trimmedName,
        stateId,
        createdAt: new Date().toISOString(),
        createdBy: 'user'
      };

      // Save to storage
      const customCities = await this.getCustomCities();
      customCities.push(newCity);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(customCities));

      return {
        id: newCity.id,
        name: newCity.name,
        stateId: newCity.stateId
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all custom cities, optionally filtered by state
   */
  async getCustomCities(stateId?: string): Promise<City[]> {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];

      const customCities: CustomCity[] = JSON.parse(stored);
      
      if (stateId) {
        return customCities
          .filter(city => city.stateId === stateId)
          .map(({ id, name, stateId }) => ({ id, name, stateId }));
      }

      return customCities.map(({ id, name, stateId }) => ({ id, name, stateId }));
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
      const customCities = await this.getCustomCities(stateId);
      const lowerName = cityName.trim().toLowerCase();
      
      return customCities.some(
        city => city.name.toLowerCase() === lowerName && city.stateId === stateId
      );
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
      if (!cityId.startsWith('CUSTOM_')) {
        throw new Error('Can only delete custom cities');
      }

      const customCities = await this.getCustomCities();
      const filtered = customCities.filter(city => city.id !== cityId);
      
      // Get full custom cities data
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const fullData: CustomCity[] = JSON.parse(stored);
        const filteredFull = fullData.filter(city => city.id !== cityId);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredFull));
      }

      return true;
    } catch (error) {
      console.error('Error deleting custom city:', error);
      return false;
    }
  }

  /**
   * Get city by ID (checks custom cities only)
   */
  async getCustomCityById(cityId: string): Promise<City | null> {
    try {
      if (!cityId.startsWith('CUSTOM_')) return null;

      const customCities = await this.getCustomCities();
      return customCities.find(city => city.id === cityId) || null;
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
      localStorage.removeItem(STORAGE_KEY);
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
      
      // Validate structure
      if (!Array.isArray(importedCities)) {
        throw new Error('Invalid data format');
      }

      const customCities: CustomCity[] = importedCities.map(city => ({
        ...city,
        createdAt: new Date().toISOString(),
        createdBy: 'import'
      }));

      localStorage.setItem(STORAGE_KEY, JSON.stringify(customCities));
      return true;
    } catch (error) {
      console.error('Error importing custom cities:', error);
      return false;
    }
  }
}

export const cityMasterService = new CityMasterService();
