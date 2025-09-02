/**
 * GST Section Component for Client Modal
 * Handles GSTIN fetch and GSP consent functionality
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Loader2, 
  Download, 
  Shield, 
  AlertTriangle, 
  CheckCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { gstPublicService, GSTTaxpayerInfo } from '@/services/gstPublicService';
import { gspConsentService, ConsentVerifyResponse } from '@/services/gspConsentService';
import { SourceChip, DataSource } from '@/components/ui/source-chip';
import { GSPConsentModal } from './GSPConsentModal';
import { toast } from '@/hooks/use-toast';
import { featureFlagService } from '@/services/featureFlagService';

interface GSTSectionProps {
  clientId: string;
  formData: any;
  onFormDataChange: (updates: any) => void;
  mode?: 'create' | 'edit' | 'view';
}

interface GSTFieldState {
  value: any;
  source: DataSource;
  isLocked: boolean;
  originalValue?: any;
}

export const GSTSection: React.FC<GSTSectionProps> = ({
  clientId,
  formData,
  onFormDataChange,
  mode = 'edit'
}) => {
  const [hasGSTIN, setHasGSTIN] = useState(!!formData.gstin);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [gstData, setGstData] = useState<GSTTaxpayerInfo | null>(null);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [consentData, setConsentData] = useState<ConsentVerifyResponse | null>(null);
  const [fieldStates, setFieldStates] = useState<Record<string, GSTFieldState>>({});
  
  // Check if GST feature is enabled
  const isGSTFeatureEnabled = featureFlagService.isEnabled('gst_client_autofill_v1');
  
  if (!isGSTFeatureEnabled) {
    return null; // Don't render if feature is disabled
  }

  const handleGSTINToggle = (enabled: boolean) => {
    setHasGSTIN(enabled);
    if (!enabled) {
      // Clear GST-related data
      onFormDataChange({
        gstin: '',
        gstStatus: undefined,
        gstRegistrationDate: undefined,
        gstCancellationDate: undefined,
        natureOfBusiness: undefined,
        filingFrequency: undefined
      });
      setGstData(null);
      setFieldStates({});
      setFetchError(null);
    }
  };

  const handleFetchGSTIN = async () => {
    if (!formData.gstin) {
      setFetchError('Please enter GSTIN');
      return;
    }

    const validation = gstPublicService.validateGSTIN(formData.gstin);
    if (!validation.isValid) {
      setFetchError(validation.error || 'Invalid GSTIN');
      return;
    }

    setLoading(true);
    setFetchError(null);

    try {
      const response = await gstPublicService.fetchTaxpayer(formData.gstin);
      
      if (response.success && response.data) {
        const gstInfo = response.data;
        setGstData(gstInfo);
        
        // Auto-fill form fields with source tracking
        const updates: any = {
          name: gstInfo.legalName,
          gstin: gstInfo.gstin,
          gstStatus: gstInfo.status,
          gstRegistrationDate: gstInfo.registrationDate,
          gstCancellationDate: gstInfo.cancellationDate,
          constitution: gstInfo.constitution,
          taxpayerType: gstInfo.taxpayerType,
          natureOfBusiness: gstInfo.natureOfBusiness.join(', '),
          centreJurisdiction: gstInfo.centreJurisdiction,
          stateJurisdiction: gstInfo.stateJurisdiction,
          filingFrequency: gstInfo.filingFrequency,
          eInvoiceEnabled: gstInfo.isEInvoiceEnabled,
          eWayBillEnabled: gstInfo.isEWayBillEnabled,
        };

        // Update field states to track source
        const newFieldStates: Record<string, GSTFieldState> = {};
        Object.keys(updates).forEach(key => {
          newFieldStates[key] = {
            value: updates[key],
            source: 'public',
            isLocked: true,
            originalValue: updates[key]
          };
        });

        setFieldStates(newFieldStates);
        onFormDataChange(updates);
        
        toast({
          title: 'GSTIN Data Fetched',
          description: 'Public taxpayer information has been imported',
        });
      } else {
        setFetchError(response.error || 'Failed to fetch GSTIN data');
      }
    } catch (error) {
      setFetchError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFieldEdit = (fieldName: string) => {
    const currentState = fieldStates[fieldName];
    if (currentState) {
      setFieldStates(prev => ({
        ...prev,
        [fieldName]: {
          ...currentState,
          isLocked: !currentState.isLocked,
          source: currentState.isLocked ? 'edited' : currentState.source
        }
      }));
    }
  };

  const handleGSPConsentSuccess = (profile: ConsentVerifyResponse) => {
    setConsentData(profile);
    
    // Auto-fill additional fields from GSP data
    const gspUpdates: any = {
      registeredEmail: profile.profilePayload.registeredEmail,
      registeredMobile: profile.profilePayload.registeredMobile,
      filingFrequency: profile.profilePayload.filingFrequency,
      aatoBand: profile.profilePayload.aatoBand,
    };

    // Update field states for GSP data
    const newFieldStates = { ...fieldStates };
    Object.keys(gspUpdates).forEach(key => {
      newFieldStates[key] = {
        value: gspUpdates[key],
        source: 'gsp',
        isLocked: true,
        originalValue: gspUpdates[key]
      };
    });

    setFieldStates(newFieldStates);
    onFormDataChange(gspUpdates);
    
    toast({
      title: 'GSP Profile Linked',
      description: `Imported ${profile.profilePayload.authorizedSignatories.length} authorized signatories`,
    });
  };

  const renderFieldWithSource = (fieldName: string, label: string, component: React.ReactNode) => {
    const fieldState = fieldStates[fieldName];
    
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>{label}</Label>
          {fieldState && (
            <SourceChip
              source={fieldState.source}
              isLocked={fieldState.isLocked}
              canEdit={fieldState.source !== 'manual'}
              onToggleEdit={() => handleFieldEdit(fieldName)}
            />
          )}
        </div>
        {component}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          GST Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* GST Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label>I have GSTIN</Label>
            <p className="text-sm text-muted-foreground">
              Enable GST-related features and auto-fill
            </p>
          </div>
          <Switch
            checked={hasGSTIN}
            onCheckedChange={handleGSTINToggle}
            disabled={mode === 'view'}
          />
        </div>

        {hasGSTIN && (
          <>
            <Separator />
            
            {/* GSTIN Input and Fetch */}
            <div className="space-y-4">
              <div className="flex gap-2">
                <div className="flex-1">
                  {renderFieldWithSource(
                    'gstin',
                    'GSTIN',
                    <Input
                      value={formData.gstin || ''}
                      onChange={(e) => {
                        const value = e.target.value.toUpperCase();
                        onFormDataChange({ gstin: value });
                        setFetchError(null);
                      }}
                      placeholder="Enter 15-digit GSTIN"
                      maxLength={15}
                      disabled={mode === 'view' || fieldStates.gstin?.isLocked}
                    />
                  )}
                </div>
                {mode !== 'view' && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleFetchGSTIN}
                    disabled={loading || !formData.gstin}
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    Fetch
                  </Button>
                )}
              </div>

              {fetchError && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{fetchError}</AlertDescription>
                </Alert>
              )}

              {/* GST Status Alert */}
              {gstData?.status === 'Cancelled' && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    This GSTIN was cancelled on {new Date(gstData.cancellationDate!).toLocaleDateString()}.
                    You can still save this client record for reference.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Auto-filled GST Information */}
            {gstData && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {renderFieldWithSource(
                    'gstStatus',
                    'GST Status',
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={gstData.status === 'Active' ? 'default' : 'destructive'}
                      >
                        {gstData.status}
                      </Badge>
                    </div>
                  )}

                  {renderFieldWithSource(
                    'constitution',
                    'Constitution',
                    <Input
                      value={formData.constitution || ''}
                      onChange={(e) => onFormDataChange({ constitution: e.target.value })}
                      disabled={mode === 'view' || fieldStates.constitution?.isLocked}
                    />
                  )}

                  {renderFieldWithSource(
                    'taxpayerType',
                    'Taxpayer Type',
                    <Input
                      value={formData.taxpayerType || ''}
                      onChange={(e) => onFormDataChange({ taxpayerType: e.target.value })}
                      disabled={mode === 'view' || fieldStates.taxpayerType?.isLocked}
                    />
                  )}

                  {renderFieldWithSource(
                    'filingFrequency',
                    'Filing Frequency',
                    <Input
                      value={formData.filingFrequency || ''}
                      onChange={(e) => onFormDataChange({ filingFrequency: e.target.value })}
                      disabled={mode === 'view' || fieldStates.filingFrequency?.isLocked}
                    />
                  )}
                </div>

                {/* E-Invoice Status */}
                {gstData.isEInvoiceEnabled !== undefined && (
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      {gstData.isEInvoiceEnabled ? (
                        <CheckCircle className="h-4 w-4 text-success" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="text-sm">
                        E-Invoice: {gstData.isEInvoiceEnabled ? 'Enabled' : 'Not Enabled'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {gstData.isEWayBillEnabled ? (
                        <CheckCircle className="h-4 w-4 text-success" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="text-sm">
                        E-Waybill: {gstData.isEWayBillEnabled ? 'Enabled' : 'Not Enabled'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* GSP Consent Section */}
            {mode !== 'view' && gstData && (
              <>
                <Separator />
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">GSP Authorization (Optional)</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Link with GST Service Provider to access detailed profile information including authorized signatories.
                    </p>
                    
                    {!consentData ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowConsentModal(true)}
                      >
                        <Shield className="h-4 w-4 mr-2" />
                        Link via GSP (OTP Consent)
                      </Button>
                    ) : (
                      <div className="space-y-3">
                        <Alert>
                          <CheckCircle className="h-4 w-4" />
                          <AlertDescription>
                            GSP account linked successfully. Consent ID: {consentData.consentId}
                          </AlertDescription>
                        </Alert>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Authorized Signatories:</span>
                            <span className="ml-2 font-medium">
                              {consentData.profilePayload.authorizedSignatories.length}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Valid Till:</span>
                            <span className="ml-2 font-medium">
                              {new Date(consentData.tokenExpiry).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* GSP Consent Modal */}
        <GSPConsentModal
          isOpen={showConsentModal}
          onClose={() => setShowConsentModal(false)}
          clientId={clientId}
          gstin={formData.gstin || ''}
          onSuccess={handleGSPConsentSuccess}
        />
      </CardContent>
    </Card>
  );
};