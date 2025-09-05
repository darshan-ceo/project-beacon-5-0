/**
 * Address Configuration Service
 * Manages field visibility and validation rules per module
 */

import { apiService, ApiResponse } from './apiService';

export type AddressFieldName = 
  | 'line1' 
  | 'line2' 
  | 'landmark' 
  | 'locality' 
  | 'district' 
  | 'cityId' 
  | 'stateId' 
  | 'countryId' 
  | 'pincode' 
  | 'lat' 
  | 'lng';

export type ModuleName = 'employee' | 'judge' | 'client' | 'court';

export interface FieldConfig {
  visible: boolean;
  required: boolean;
  editable: boolean;
  allowManualInput?: boolean;
}

export interface AddressFieldConfig {
  [fieldName: string]: FieldConfig;
}

export interface ModuleAddressConfig {
  [moduleName: string]: AddressFieldConfig;
}

const defaultFieldConfig: FieldConfig = {
  visible: true,
  required: false,
  editable: true,
  allowManualInput: false
};

const defaultModuleConfig: ModuleAddressConfig = {
  employee: {
    line1: { visible: true, required: true, editable: true },
    line2: { visible: true, required: false, editable: true },
    landmark: { visible: true, required: false, editable: true },
    locality: { visible: true, required: false, editable: true },
    district: { visible: true, required: true, editable: true },
    cityId: { visible: true, required: true, editable: true, allowManualInput: false },
    stateId: { visible: true, required: true, editable: true },
    countryId: { visible: true, required: true, editable: false },
    pincode: { visible: true, required: true, editable: true },
    lat: { visible: false, required: false, editable: true },
    lng: { visible: false, required: false, editable: true }
  },
  judge: {
    line1: { visible: true, required: true, editable: true },
    line2: { visible: true, required: false, editable: true },
    landmark: { visible: true, required: false, editable: true },
    locality: { visible: true, required: false, editable: true },
    district: { visible: true, required: true, editable: true },
    cityId: { visible: true, required: true, editable: true, allowManualInput: false },
    stateId: { visible: true, required: true, editable: true },
    countryId: { visible: true, required: true, editable: false },
    pincode: { visible: true, required: true, editable: true },
    lat: { visible: false, required: false, editable: true },
    lng: { visible: false, required: false, editable: true }
  },
  client: {
    line1: { visible: true, required: true, editable: true },
    line2: { visible: true, required: false, editable: true },
    landmark: { visible: true, required: false, editable: true },
    locality: { visible: true, required: false, editable: true },
    district: { visible: true, required: true, editable: true },
    cityId: { visible: true, required: true, editable: true, allowManualInput: false },
    stateId: { visible: true, required: true, editable: true },
    countryId: { visible: true, required: true, editable: false },
    pincode: { visible: true, required: true, editable: true },
    lat: { visible: false, required: false, editable: true },
    lng: { visible: false, required: false, editable: true }
  },
  court: {
    line1: { visible: true, required: true, editable: true },
    line2: { visible: true, required: false, editable: true },
    landmark: { visible: true, required: false, editable: true },
    locality: { visible: true, required: false, editable: true },
    district: { visible: true, required: true, editable: true },
    cityId: { visible: true, required: true, editable: true, allowManualInput: false },
    stateId: { visible: true, required: true, editable: true },
    countryId: { visible: true, required: true, editable: false },
    pincode: { visible: true, required: true, editable: true },
    lat: { visible: false, required: false, editable: true },
    lng: { visible: false, required: false, editable: true }
  }
};

class AddressConfigService {
  private config: ModuleAddressConfig = { ...defaultModuleConfig };

  /**
   * Get configuration for a specific module
   */
  async getModuleConfig(moduleName: ModuleName): Promise<ApiResponse<AddressFieldConfig>> {
    try {
      const moduleConfig = this.config[moduleName] || defaultModuleConfig[moduleName];
      
      return {
        success: true,
        data: { ...moduleConfig },
        error: null
      };
    } catch (error) {
      return {
        success: false,
        data: {},
        error: error instanceof Error ? error.message : 'Failed to get module configuration'
      };
    }
  }

  /**
   * Get configuration for a specific field in a module
   */
  async getFieldConfig(moduleName: ModuleName, fieldName: AddressFieldName): Promise<ApiResponse<FieldConfig>> {
    try {
      const moduleConfig = this.config[moduleName] || defaultModuleConfig[moduleName];
      const fieldConfig = moduleConfig[fieldName] || defaultFieldConfig;
      
      return {
        success: true,
        data: { ...fieldConfig },
        error: null
      };
    } catch (error) {
      return {
        success: false,
        data: defaultFieldConfig,
        error: error instanceof Error ? error.message : 'Failed to get field configuration'
      };
    }
  }

  /**
   * Update configuration for a specific module
   */
  async updateModuleConfig(moduleName: ModuleName, config: AddressFieldConfig): Promise<ApiResponse<AddressFieldConfig>> {
    try {
      // Validate that all required fields are present
      const requiredFields: AddressFieldName[] = ['line1', 'district', 'stateId', 'countryId', 'pincode'];
      
      for (const field of requiredFields) {
        if (!config[field] || !config[field].visible) {
          return {
            success: false,
            data: {},
            error: `Field '${field}' must be visible and cannot be disabled`
          };
        }
      }

      this.config[moduleName] = { ...config };
      
      return {
        success: true,
        data: { ...config },
        error: null
      };
    } catch (error) {
      return {
        success: false,
        data: {},
        error: error instanceof Error ? error.message : 'Failed to update module configuration'
      };
    }
  }

  /**
   * Update configuration for a specific field in a module
   */
  async updateFieldConfig(moduleName: ModuleName, fieldName: AddressFieldName, fieldConfig: FieldConfig): Promise<ApiResponse<FieldConfig>> {
    try {
      // Validate required fields cannot be made invisible or non-required
      const requiredFields: AddressFieldName[] = ['line1', 'district', 'stateId', 'countryId', 'pincode'];
      
      if (requiredFields.includes(fieldName)) {
        if (!fieldConfig.visible) {
          return {
            success: false,
            data: defaultFieldConfig,
            error: `Field '${fieldName}' is required and cannot be hidden`
          };
        }
        if (!fieldConfig.required) {
          return {
            success: false,
            data: defaultFieldConfig,
            error: `Field '${fieldName}' is required and cannot be made optional`
          };
        }
      }

      if (!this.config[moduleName]) {
        this.config[moduleName] = { ...defaultModuleConfig[moduleName] };
      }

      this.config[moduleName][fieldName] = { ...fieldConfig };
      
      return {
        success: true,
        data: { ...fieldConfig },
        error: null
      };
    } catch (error) {
      return {
        success: false,
        data: defaultFieldConfig,
        error: error instanceof Error ? error.message : 'Failed to update field configuration'
      };
    }
  }

  /**
   * Get all module configurations
   */
  async getAllConfigs(): Promise<ApiResponse<ModuleAddressConfig>> {
    try {
      return {
        success: true,
        data: { ...this.config },
        error: null
      };
    } catch (error) {
      return {
        success: false,
        data: {},
        error: error instanceof Error ? error.message : 'Failed to get all configurations'
      };
    }
  }

  /**
   * Reset configuration for a module to defaults
   */
  async resetModuleConfig(moduleName: ModuleName): Promise<ApiResponse<AddressFieldConfig>> {
    try {
      this.config[moduleName] = { ...defaultModuleConfig[moduleName] };
      
      return {
        success: true,
        data: { ...this.config[moduleName] },
        error: null
      };
    } catch (error) {
      return {
        success: false,
        data: {},
        error: error instanceof Error ? error.message : 'Failed to reset module configuration'
      };
    }
  }

  /**
   * Check if a field should be visible for a module
   */
  async isFieldVisible(moduleName: ModuleName, fieldName: AddressFieldName): Promise<boolean> {
    try {
      const result = await this.getFieldConfig(moduleName, fieldName);
      return result.success ? result.data.visible : true;
    } catch {
      return true;
    }
  }

  /**
   * Check if a field is required for a module
   */
  async isFieldRequired(moduleName: ModuleName, fieldName: AddressFieldName): Promise<boolean> {
    try {
      const result = await this.getFieldConfig(moduleName, fieldName);
      return result.success ? result.data.required : false;
    } catch {
      return false;
    }
  }

  /**
   * Check if a field is editable for a module
   */
  async isFieldEditable(moduleName: ModuleName, fieldName: AddressFieldName): Promise<boolean> {
    try {
      const result = await this.getFieldConfig(moduleName, fieldName);
      return result.success ? result.data.editable : true;
    } catch {
      return true;
    }
  }

  /**
   * Export configuration to JSON
   */
  async exportConfig(): Promise<string> {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * Import configuration from JSON
   */
  async importConfig(configJson: string): Promise<ApiResponse<ModuleAddressConfig>> {
    try {
      const importedConfig = JSON.parse(configJson);
      
      // Validate imported configuration
      for (const moduleName of Object.keys(importedConfig)) {
        if (!['employee', 'judge', 'client', 'court'].includes(moduleName)) {
          return {
            success: false,
            data: {},
            error: `Invalid module name: ${moduleName}`
          };
        }
      }

      this.config = { ...importedConfig };
      
      return {
        success: true,
        data: { ...this.config },
        error: null
      };
    } catch (error) {
      return {
        success: false,
        data: {},
        error: error instanceof Error ? error.message : 'Failed to import configuration'
      };
    }
  }
}

export const addressConfigService = new AddressConfigService();