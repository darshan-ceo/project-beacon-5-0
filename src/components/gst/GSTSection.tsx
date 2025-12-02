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
  EyeOff,
  User,
  Search
} from 'lucide-react';
import { gstPublicService, GSTTaxpayerInfo } from '@/services/gstPublicService';
import { gspConsentService, ConsentVerifyResponse } from '@/services/gspConsentService';
import { gstCacheService } from '@/services/gstCacheService';
import { SourceChip, DataSource } from '@/components/ui/source-chip';
import { GSPConsentModal } from './GSPConsentModal';
import { SignatorySelectionModal } from './SignatorySelectionModal';
import { toast } from '@/hooks/use-toast';
import { envConfig } from '../../utils/envConfig';

interface GSTSectionProps {
  clientId: string;
  formData: any;
  onFormDataChange: (updates: any) => void;
  mode?: 'create' | 'edit' | 'view';
  onSignatoriesImport?: (signatories: any[]) => void;
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
  mode = 'edit',
  onSignatoriesImport
}) => {
  const [hasGSTIN, setHasGSTIN] = useState(!!formData.gstin);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [gstData, setGstData] = useState<GSTTaxpayerInfo | null>(null);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [consentData, setConsentData] = useState<ConsentVerifyResponse | null>(null);
  const [fieldStates, setFieldStates] = useState<Record<string, GSTFieldState>>({});
  const [needsReVerification, setNeedsReVerification] = useState(false);
  const [lastSnapShotTime, setLastSnapShotTime] = useState<Date | null>(null);
  const [showSignatoryModal, setShowSignatoryModal] = useState(false);
  const [gspSignatories, setGspSignatories] = useState<any[]>([]);
  
  // Use centralized environment configuration with URL overrides
  const { GST_ON, MOCK_ON, GST_EDGE_FUNCTION_ENABLED } = envConfig;
  
  // GST is enabled if edge function is available or explicitly turned on
  const isGSTEnabled = GST_ON || GST_EDGE_FUNCTION_ENABLED;
  
  // Don't render if feature is disabled (except in development)
  if (!isGSTEnabled && import.meta.env.MODE !== 'development') {
    return null;
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

  const handleFetchGSTIN = async (bypassCache: boolean = false) => {
    if (!formData.gstin) {
      setFetchError('Please enter GSTIN');
      return;
    }

    const validation = gstPublicService.validateGSTIN(formData.gstin);
    if (!validation.isValid) {
      setFetchError(validation.error || 'Invalid GSTIN');
      return;
    }

    // Check if re-verification is needed
    if (!bypassCache && gstCacheService.needsReVerification(formData.gstin)) {
      setNeedsReVerification(true);
    }

    setLoading(true);
    setFetchError(null);

    try {
      const response = await gstPublicService.fetchTaxpayer(formData.gstin, bypassCache);
      
      if (response.success && response.data) {
        const gstInfo = response.data;
        setGstData(gstInfo);
        setLastSnapShotTime(new Date());
        setNeedsReVerification(false);
        
        // Auto-fill form fields with source tracking - complete mapping
        const updates: any = {
          name: gstInfo.legalName,
          tradeName: gstInfo.tradeName,
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
          lastUpdated: gstInfo.lastUpdated,
        };

        // Update addresses if available
        if (gstInfo.principalAddress) {
          const mappedAddress = gstPublicService.mapToAddressFormat(gstInfo.principalAddress);
          Object.assign(updates, {
            address: {
              ...formData.address,
              ...mappedAddress
            }
          });
        }

        // Update field states to track source
        const newFieldStates: Record<string, GSTFieldState> = {};
        Object.keys(updates).forEach(key => {
          if (key !== 'address') { // Handle address separately
            newFieldStates[key] = {
              value: updates[key],
              source: 'public',
              isLocked: true,
              originalValue: updates[key]
            };
          }
        });

        setFieldStates(newFieldStates);
        onFormDataChange(updates);
        
        toast({
          title: 'GST Data Fetched Successfully',
          description: `Public taxpayer information imported${bypassCache ? ' (fresh data)' : ''} | Snapshot saved`,
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
      eInvoiceEnabled: profile.profilePayload.eInvoiceEnabled,
      eWayBillEnabled: profile.profilePayload.eWayBillEnabled,
    };

    // Update field states for GSP data
    const newFieldStates = { ...fieldStates };
    Object.keys(gspUpdates).forEach(key => {
      if (gspUpdates[key] !== undefined) {
        newFieldStates[key] = {
          value: gspUpdates[key],
          source: 'gsp',
          isLocked: true,
          originalValue: gspUpdates[key]
        };
      }
    });

    setFieldStates(newFieldStates);
    onFormDataChange(gspUpdates);

    // Store signatories for selection modal
    if (profile.profilePayload.authorizedSignatories && profile.profilePayload.authorizedSignatories.length > 0) {
      setGspSignatories(profile.profilePayload.authorizedSignatories);
      setShowSignatoryModal(true);
    }
    
    toast({
      title: 'GSP Profile Linked Successfully',
      description: `Found ${profile.profilePayload.authorizedSignatories?.length || 0} authorized signatories`,
    });
  };

  const handleSignatoryImport = (selectedSignatories: any[]) => {
    const signatoryContacts = selectedSignatories.map(signatory => {
      // Map GSP role to valid ContactRole
      const mapRole = (gspRole: string): 'authorized_signatory' | 'primary' => {
        if (signatory.isPrimary) return 'primary';
        return 'authorized_signatory'; // Default for GSP signatories
      };

      return {
        id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Temporary ID
        clientId: clientId,
        name: signatory.name,
        email: signatory.email || undefined,
        phone: signatory.mobile || undefined,
        roles: [mapRole(signatory.role)] as ('authorized_signatory' | 'primary')[],
        isPrimary: !!signatory.isPrimary,
        source: 'gsp' as const,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    });

    // Notify parent about new contacts from GSP
    onFormDataChange({
      gspSignatories: signatoryContacts
    });

    // Pass to parent handler if available
    if (onSignatoriesImport) {
      onSignatoriesImport(signatoryContacts);
    }

    toast({
      title: 'Signatories Imported',
      description: `${selectedSignatories.length} signator${selectedSignatories.length === 1 ? 'y' : 'ies'} added to contacts`,
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
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            GST Registration & Auto-fill
          </div>
          {lastSnapShotTime && (
            <div className="text-xs text-muted-foreground">
              Auto-fill snapshot saved: {lastSnapShotTime.toLocaleTimeString()}
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* GST Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label>I have GST registration</Label>
            <p className="text-sm text-muted-foreground">
              Auto-fill client details from public GST database
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
                  <div className="flex gap-2 items-center">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleFetchGSTIN(false)}
                      disabled={loading || !formData.gstin || (!GST_EDGE_FUNCTION_ENABLED && !MOCK_ON)}
                      title={(!GST_EDGE_FUNCTION_ENABLED && !MOCK_ON) ? "GST service not configured" : undefined}
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                      {GST_EDGE_FUNCTION_ENABLED ? 'Fetch' : 'Mock Fetch'}
                    </Button>
                    {needsReVerification && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => handleFetchGSTIN(true)}
                        disabled={loading}
                      >
                        Re-verify
                      </Button>
                    )}
                    {!GST_EDGE_FUNCTION_ENABLED && !MOCK_ON && (
                      <div className="text-xs text-destructive">
                        GST service not configured
                      </div>
                    )}
                  </div>
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

                        {consentData.profilePayload.authorizedSignatories.length > 0 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setGspSignatories(consentData.profilePayload.authorizedSignatories);
                              setShowSignatoryModal(true);
                            }}
                          >
                            <User className="h-4 w-4 mr-2" />
                            Add Signatories to Contacts
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* Modals */}
        <GSPConsentModal
          isOpen={showConsentModal}
          onClose={() => setShowConsentModal(false)}
          clientId={clientId}
          gstin={formData.gstin || ''}
          onSuccess={handleGSPConsentSuccess}
        />

        <SignatorySelectionModal
          isOpen={showSignatoryModal}
          onClose={() => setShowSignatoryModal(false)}
          signatories={gspSignatories}
          onImportSelected={handleSignatoryImport}
        />
      </CardContent>
    </Card>
  );
};