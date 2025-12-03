/**
 * GSP Consent Modal for Beacon Essential 5.0
 * Handles OTP-based GSP authorization flow with fallback manual entry
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Shield, Smartphone, CheckCircle, AlertTriangle, User, Plus, Trash2 } from 'lucide-react';
import { gspConsentService, ConsentInitResponse, ConsentVerifyResponse } from '@/services/gspConsentService';
import { toast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface GSPConsentModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  gstin: string;
  onSuccess: (profile: ConsentVerifyResponse) => void;
  onManualSignatories?: (signatories: ManualSignatory[]) => void;
}

interface ManualSignatory {
  name: string;
  email: string;
  mobile: string;
  designation: string;
}

type ConsentStep = 'init' | 'otp' | 'success';
type ModalTab = 'gsp' | 'manual';

export const GSPConsentModal: React.FC<GSPConsentModalProps> = ({
  isOpen,
  onClose,
  clientId,
  gstin,
  onSuccess,
  onManualSignatories
}) => {
  const [activeTab, setActiveTab] = useState<ModalTab>('gsp');
  const [step, setStep] = useState<ConsentStep>('init');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<any>(null);
  const [otp, setOtp] = useState('');
  const [gstUsername, setGstUsername] = useState('');
  const [consentData, setConsentData] = useState<ConsentInitResponse | null>(null);
  const [successData, setSuccessData] = useState<ConsentVerifyResponse | null>(null);
  
  // Manual entry state
  const [manualSignatories, setManualSignatories] = useState<ManualSignatory[]>([
    { name: '', email: '', mobile: '', designation: 'Authorized Signatory' }
  ]);

  const handleInitiate = async () => {
    if (!gstUsername.trim()) {
      setError('GST Portal Username is required');
      return;
    }
    
    setLoading(true);
    setError(null);
    setErrorDetails(null);

    try {
      const response = await gspConsentService.initiateConsent(clientId, gstin, gstUsername.trim());
      
      if (response.success && response.data) {
        setConsentData(response.data);
        setStep('otp');
        toast({
          title: 'OTP Sent',
          description: `OTP sent to ${response.data.maskedDestination}`,
        });
      } else {
        // Handle specific error types
        const errorCode = response.error;
        const details = (response as any).errorDetails;
        
        if (errorCode === 'GSP_CONSENT_NOT_CONFIGURED' || details) {
          setErrorDetails({
            code: errorCode || 'GSP_NOT_AVAILABLE',
            message: details?.message || 'GSP consent API is not available for this account.',
            action: details?.action || 'You can add signatories manually using the "Manual Entry" tab.',
            showManualFallback: true
          });
          setError('GSP Consent API not available');
        } else if (errorCode?.includes('Invalid request')) {
          setErrorDetails({
            code: 'INVALID_REQUEST',
            message: 'The GSP consent API returned an error.',
            action: 'This usually means the consent module is not enabled. Try manual entry instead.',
            showManualFallback: true
          });
          setError('GSP Consent API error');
        } else {
          setError(response.error || 'Failed to initiate consent');
        }
      }
    } catch (err) {
      setError('Network error. Please try again or use manual entry.');
      setErrorDetails({
        code: 'NETWORK_ERROR',
        message: 'Could not connect to the GSP service.',
        action: 'Check your network connection or add signatories manually.',
        showManualFallback: true
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!consentData) return;

    const validation = gspConsentService.validateOTP(otp);
    if (!validation.isValid) {
      setError(validation.error || 'Invalid OTP');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await gspConsentService.verifyOTP(consentData.txnId, otp, clientId, gstin);
      
      if (response.success && response.data) {
        setSuccessData(response.data);
        setStep('success');
        onSuccess(response.data);
        toast({
          title: 'Consent Granted',
          description: 'Successfully linked GSP account',
        });
      } else {
        setError(response.error || 'Invalid OTP');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep('init');
    setActiveTab('gsp');
    setOtp('');
    setGstUsername('');
    setError(null);
    setErrorDetails(null);
    setConsentData(null);
    setSuccessData(null);
    setManualSignatories([{ name: '', email: '', mobile: '', designation: 'Authorized Signatory' }]);
    onClose();
  };

  const handleAddManualSignatory = () => {
    setManualSignatories([
      ...manualSignatories,
      { name: '', email: '', mobile: '', designation: 'Authorized Signatory' }
    ]);
  };

  const handleRemoveManualSignatory = (index: number) => {
    if (manualSignatories.length > 1) {
      setManualSignatories(manualSignatories.filter((_, i) => i !== index));
    }
  };

  const handleManualSignatoryChange = (index: number, field: keyof ManualSignatory, value: string) => {
    const updated = [...manualSignatories];
    updated[index] = { ...updated[index], [field]: value };
    setManualSignatories(updated);
  };

  const handleSaveManualSignatories = () => {
    const validSignatories = manualSignatories.filter(s => s.name.trim());
    
    if (validSignatories.length === 0) {
      setError('Please add at least one signatory with a name');
      return;
    }

    if (onManualSignatories) {
      onManualSignatories(validSignatories);
    }

    toast({
      title: 'Signatories Added',
      description: `${validSignatories.length} signatory(ies) added manually`,
    });

    handleClose();
  };

  const renderGSPInitStep = () => (
    <div className="space-y-4">
      <Alert>
        <Smartphone className="h-4 w-4" />
        <AlertDescription>
          An OTP will be sent to the registered mobile number for GSTIN <strong>{gstin}</strong>. 
          Make sure you have access to the registered mobile number.
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <Label htmlFor="gstUsername">GST Portal Username <span className="text-destructive">*</span></Label>
        <Input
          id="gstUsername"
          placeholder="Enter your GST portal login username"
          value={gstUsername}
          onChange={(e) => {
            setGstUsername(e.target.value);
            setError(null);
            setErrorDetails(null);
          }}
        />
        <p className="text-xs text-muted-foreground">
          This is the username you use to login to gst.gov.in
        </p>
      </div>

      <div className="space-y-3">
        <div className="text-sm">
          <strong>What you'll get:</strong>
        </div>
        <ul className="text-sm text-muted-foreground space-y-1 ml-4">
          <li>• Authorized signatories with contact details</li>
          <li>• Registered email and mobile number</li>
          <li>• Filing frequency (Monthly/Quarterly)</li>
          <li>• E-invoice and E-waybill readiness status</li>
        </ul>
      </div>

      {errorDetails?.showManualFallback && (
        <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800 dark:text-amber-200">{errorDetails.message}</AlertTitle>
          <AlertDescription className="text-amber-700 dark:text-amber-300">
            <p>{errorDetails.action}</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2"
              onClick={() => setActiveTab('manual')}
            >
              <User className="h-4 w-4 mr-2" />
              Switch to Manual Entry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {error && !errorDetails?.showManualFallback && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={handleClose}>
          Cancel
        </Button>
        <Button onClick={handleInitiate} disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Send OTP
        </Button>
      </div>
    </div>
  );

  const renderOTPStep = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="otp">OTP</Label>
        <Input
          id="otp"
          type="text"
          placeholder="Enter 6-digit OTP"
          value={otp}
          onChange={(e) => {
            const value = e.target.value.replace(/\D/g, '').slice(0, 6);
            setOtp(value);
            setError(null);
          }}
          maxLength={6}
          className="text-center text-lg tracking-widest"
        />
        <p className="text-xs text-muted-foreground">
          OTP sent to {consentData?.maskedDestination}
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep('init')}>
          Back
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleVerifyOTP} 
            disabled={loading || otp.length !== 6}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Verify & Link
          </Button>
        </div>
      </div>
    </div>
  );

  const renderSuccessStep = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-green-600">
        <CheckCircle className="h-5 w-5" />
        <span className="font-medium">Consent Granted Successfully</span>
      </div>

      {successData && (
        <div className="space-y-3">
          <div className="text-sm">
            <strong>Import Summary:</strong>
          </div>
          <ul className="text-sm text-muted-foreground space-y-1 ml-4">
            <li>• Consent ID: {successData.consentId}</li>
            <li>• Authorized Signatories: {successData.profilePayload.authorizedSignatories?.length || 0}</li>
            <li>• Filing Frequency: {successData.profilePayload.filingFrequency}</li>
            <li>• E-Invoice: {successData.profilePayload.eInvoiceEnabled ? 'Enabled' : 'Disabled'}</li>
            <li>• Valid Till: {new Date(successData.tokenExpiry).toLocaleDateString()}</li>
          </ul>
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={handleClose}>
          Done
        </Button>
      </div>
    </div>
  );

  const renderManualEntry = () => (
    <div className="space-y-4">
      <Alert>
        <User className="h-4 w-4" />
        <AlertDescription>
          Add authorized signatories manually. This information will be saved to the client record.
        </AlertDescription>
      </Alert>

      <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
        {manualSignatories.map((signatory, index) => (
          <div key={index} className="p-3 border rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Signatory {index + 1}</span>
              {manualSignatories.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveManualSignatory(index)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Name *</Label>
                <Input
                  placeholder="Full name"
                  value={signatory.name}
                  onChange={(e) => handleManualSignatoryChange(index, 'name', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Designation</Label>
                <Input
                  placeholder="e.g., Director"
                  value={signatory.designation}
                  onChange={(e) => handleManualSignatoryChange(index, 'designation', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Email</Label>
                <Input
                  type="email"
                  placeholder="email@example.com"
                  value={signatory.email}
                  onChange={(e) => handleManualSignatoryChange(index, 'email', e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Mobile</Label>
                <Input
                  placeholder="+91-9876543210"
                  value={signatory.mobile}
                  onChange={(e) => handleManualSignatoryChange(index, 'mobile', e.target.value)}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={handleAddManualSignatory}
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Another Signatory
      </Button>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={handleClose}>
          Cancel
        </Button>
        <Button onClick={handleSaveManualSignatories}>
          Save Signatories
        </Button>
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            {step === 'success' ? 'Consent Granted' : 'Link GST Account / Add Signatories'}
          </DialogTitle>
          <DialogDescription>
            {step === 'success' 
              ? 'Your GSP account has been linked successfully.'
              : 'Connect via GSP for automatic import or add signatories manually.'
            }
          </DialogDescription>
        </DialogHeader>

        {step === 'success' ? (
          renderSuccessStep()
        ) : step === 'otp' ? (
          renderOTPStep()
        ) : (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ModalTab)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="gsp" className="flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                GSP (OTP)
              </TabsTrigger>
              <TabsTrigger value="manual" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Manual Entry
              </TabsTrigger>
            </TabsList>
            <TabsContent value="gsp" className="mt-4">
              {renderGSPInitStep()}
            </TabsContent>
            <TabsContent value="manual" className="mt-4">
              {renderManualEntry()}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};