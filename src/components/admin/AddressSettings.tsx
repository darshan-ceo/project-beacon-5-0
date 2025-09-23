/**
 * Address Settings Component
 * Admin interface for configuring address fields per module
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Settings, 
  Save, 
  RotateCcw, 
  Eye, 
  EyeOff, 
  AlertTriangle,
  Download,
  Upload,
  CheckCircle2
} from 'lucide-react';
import { 
  addressConfigService, 
  ModuleName, 
  AddressFieldName, 
  AddressFieldConfig,
  FieldConfig 
} from '@/services/addressConfigService';
import { toast } from 'sonner';
import { featureFlagService } from '@/services/featureFlagService';
import { apiService } from '@/services/apiService';

const MODULE_LABELS: Record<ModuleName, string> = {
  employee: 'Employees',
  judge: 'Judges',
  client: 'Clients',
  court: 'Courts'
};

const FIELD_LABELS: Record<AddressFieldName, string> = {
  line1: 'Address Line 1',
  line2: 'Address Line 2',
  landmark: 'Landmark',
  locality: 'Locality/Area',
  district: 'District',
  cityId: 'City',
  stateId: 'State',
  countryId: 'Country',
  pincode: 'Pincode',
  lat: 'Latitude',
  lng: 'Longitude'
};

const REQUIRED_FIELDS: AddressFieldName[] = ['line1', 'stateId', 'countryId', 'pincode'];

export const AddressSettings: React.FC = () => {
  const [configs, setConfigs] = useState<Record<ModuleName, AddressFieldConfig>>({
    employee: {},
    judge: {},
    client: {},
    court: {}
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeModule, setActiveModule] = useState<ModuleName>('employee');

  useEffect(() => {
    loadConfigurations();
  }, []);

  const loadConfigurations = async () => {
    setIsLoading(true);
    try {
      if (featureFlagService.isEnabled('address_settings_v2')) {
        // Use real API endpoints
        const response = await apiService.get<Record<ModuleName, AddressFieldConfig>>('/api/settings/address');
        if (response.success && response.data) {
          // Ensure all modules exist with proper structure
          const safeConfigs = {
            employee: response.data.employee || {},
            judge: response.data.judge || {},
            client: response.data.client || {},
            court: response.data.court || {}
          };
          setConfigs(safeConfigs);
        } else {
          // Fallback to service if API fails
          const result = await addressConfigService.getAllConfigs();
          if (result.success && result.data) {
            const safeConfigs = {
              employee: result.data.employee || {},
              judge: result.data.judge || {},
              client: result.data.client || {},
              court: result.data.court || {}
            };
            setConfigs(safeConfigs);
          } else {
            toast.error('Failed to load configurations');
          }
        }
      } else {
        // Use existing service
        const result = await addressConfigService.getAllConfigs();
        if (result.success && result.data) {
          const safeConfigs = {
            employee: result.data.employee || {},
            judge: result.data.judge || {},
            client: result.data.client || {},
            court: result.data.court || {}
          };
          setConfigs(safeConfigs);
        } else {
          toast.error('Failed to load configurations');
        }
      }
    } catch (error) {
      console.error('Error loading address configurations:', error);
      toast.error('Error loading configurations');
    } finally {
      setIsLoading(false);
    }
  };

  const updateFieldConfig = (
    moduleName: ModuleName, 
    fieldName: AddressFieldName, 
    property: keyof FieldConfig, 
    value: boolean
  ) => {
    setConfigs(prev => ({
      ...prev,
      [moduleName]: {
        ...prev[moduleName],
        [fieldName]: {
          ...prev[moduleName][fieldName],
          [property]: value
        }
      }
    }));
    setHasChanges(true);
  };

  const saveConfigurations = async () => {
    setSaving(true);
    try {
      if (featureFlagService.isEnabled('address_settings_v2')) {
        // Use real API endpoint
        const response = await apiService.post('/api/settings/address', configs);
        if (response.success) {
          toast.success('Configurations saved successfully');
          setHasChanges(false);
        } else {
          toast.error(response.error || 'Failed to save configurations');
        }
      } else {
        // Use existing service
        const promises = Object.entries(configs).map(([moduleName, config]) =>
          addressConfigService.updateModuleConfig(moduleName as ModuleName, config)
        );

        const results = await Promise.all(promises);
        const hasErrors = results.some(result => !result.success);

        if (hasErrors) {
          toast.error('Some configurations failed to save');
        } else {
          toast.success('Configurations saved successfully');
          setHasChanges(false);
        }
      }
    } catch (error) {
      toast.error('Error saving configurations');
    } finally {
      setSaving(false);
    }
  };

  const resetModuleConfig = async (moduleName: ModuleName) => {
    try {
      const result = await addressConfigService.resetModuleConfig(moduleName);
      if (result.success) {
        setConfigs(prev => ({
          ...prev,
          [moduleName]: result.data
        }));
        setHasChanges(true);
        toast.success(`${MODULE_LABELS[moduleName]} configuration reset to defaults`);
      } else {
        toast.error('Failed to reset configuration');
      }
    } catch (error) {
      toast.error('Error resetting configuration');
    }
  };

  const exportConfiguration = async () => {
    try {
      const configJson = await addressConfigService.exportConfig();
      const blob = new Blob([configJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'address-configuration.json';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Configuration exported successfully');
    } catch (error) {
      toast.error('Error exporting configuration');
    }
  };

  const importConfiguration = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const result = await addressConfigService.importConfig(text);
        if (result.success) {
          setConfigs(result.data as Record<ModuleName, AddressFieldConfig>);
          setHasChanges(true);
          toast.success('Configuration imported successfully');
        } else {
          toast.error(result.error || 'Failed to import configuration');
        }
      } catch (error) {
        toast.error('Error importing configuration');
      }
    };
    input.click();
  };

  const renderFieldConfig = (moduleName: ModuleName, fieldName: AddressFieldName) => {
    const moduleConfig = configs[moduleName] || {};
    const fieldConfig = moduleConfig[fieldName] || { visible: true, required: false, editable: true };
    const isRequired = REQUIRED_FIELDS.includes(fieldName);
    const isDisabled = isRequired && (fieldName === 'line1' || fieldName === 'stateId' || fieldName === 'countryId' || fieldName === 'pincode');

    return (
      <div key={fieldName} className="space-y-3 p-4 border rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Label className="font-medium">{FIELD_LABELS[fieldName]}</Label>
            {isRequired && (
              <Badge variant="destructive" className="text-xs">Required</Badge>
            )}
          </div>
          {fieldConfig.visible ? (
            <Eye className="h-4 w-4 text-green-600" />
          ) : (
            <EyeOff className="h-4 w-4 text-muted-foreground" />
          )}
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="flex items-center space-x-2">
            <Switch
              checked={fieldConfig.visible}
              onCheckedChange={(checked) => 
                updateFieldConfig(moduleName, fieldName, 'visible', checked)
              }
              disabled={isDisabled}
            />
            <Label className="text-sm">Visible</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              checked={fieldConfig.required}
              onCheckedChange={(checked) => 
                updateFieldConfig(moduleName, fieldName, 'required', checked)
              }
              disabled={isDisabled || !fieldConfig.visible}
            />
            <Label className="text-sm">Required</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              checked={fieldConfig.editable}
              onCheckedChange={(checked) => 
                updateFieldConfig(moduleName, fieldName, 'editable', checked)
              }
              disabled={!fieldConfig.visible}
            />
            <Label className="text-sm">Editable</Label>
          </div>
        </div>

        {fieldName === 'cityId' && fieldConfig.visible && (
          <div className="mt-3 p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center space-x-2">
              <Switch
                checked={fieldConfig.allowManualInput || false}
                onCheckedChange={(checked) => 
                  updateFieldConfig(moduleName, fieldName, 'allowManualInput', checked)
                }
              />
              <Label className="text-sm">Allow Manual City Input</Label>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Enable text input as fallback when no cities are available in dropdown
            </p>
          </div>
        )}

        {isDisabled && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              This field is required for address validation and cannot be disabled.
            </AlertDescription>
          </Alert>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="text-muted-foreground">Loading address configuration...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6" />
            Address Field Configuration
          </h2>
          <p className="text-muted-foreground">
            Configure which address fields are visible, required, and editable for each module
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={exportConfiguration}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" onClick={importConfiguration}>
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          {hasChanges && (
            <Button onClick={saveConfigurations} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          )}
        </div>
      </div>

      {hasChanges && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            You have unsaved changes. Click "Save Changes" to apply your configuration.
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeModule} onValueChange={(value) => setActiveModule(value as ModuleName)}>
        <TabsList className="grid w-full grid-cols-4">
          {Object.entries(MODULE_LABELS).map(([key, label]) => (
            <TabsTrigger key={key} value={key}>
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        {Object.entries(MODULE_LABELS).map(([moduleName, moduleLabel]) => (
          <TabsContent key={moduleName} value={moduleName} className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{moduleLabel} Address Configuration</CardTitle>
                    <CardDescription>
                      Configure address field visibility and validation for {moduleLabel.toLowerCase()}
                    </CardDescription>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={() => resetModuleConfig(moduleName as ModuleName)}
                    className="text-sm"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset to Defaults
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.keys(FIELD_LABELS).map(fieldName => 
                  renderFieldConfig(moduleName as ModuleName, fieldName as AddressFieldName)
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Configuration Preview</CardTitle>
          <CardDescription>
            Preview how address forms will appear with current configuration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">Visible Fields</h4>
              <div className="space-y-1">
                {Object.entries(FIELD_LABELS).map(([fieldName, label]) => {
                  const moduleConfig = configs[activeModule] || {};
                  const fieldConfig = moduleConfig[fieldName as AddressFieldName] || { visible: true, required: false, editable: true };
                  if (fieldConfig.visible) {
                    return (
                      <div key={fieldName} className="flex items-center gap-2 text-sm">
                        <Badge variant={fieldConfig.required ? "destructive" : "outline"} className="text-xs">
                          {fieldConfig.required ? "Required" : "Optional"}
                        </Badge>
                        <span className={fieldConfig.editable ? "" : "text-muted-foreground"}>
                          {label} {!fieldConfig.editable && "(Read-only)"}
                        </span>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Hidden Fields</h4>
              <div className="space-y-1">
                {Object.entries(FIELD_LABELS).map(([fieldName, label]) => {
                  const moduleConfig = configs[activeModule] || {};
                  const fieldConfig = moduleConfig[fieldName as AddressFieldName] || { visible: true, required: false, editable: true };
                  if (!fieldConfig.visible) {
                    return (
                      <div key={fieldName} className="text-sm text-muted-foreground">
                        {label}
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};