/**
 * GSP Consent Modal for Beacon Essential 5.0
 * Handles OTP-based GSP authorization flow
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Shield, Smartphone, CheckCircle } from 'lucide-react';
import { gspConsentService, ConsentInitResponse, ConsentVerifyResponse } from '@/services/gspConsentService';
import { toast } from '@/hooks/use-toast';

interface GSPConsentModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  gstin: string;
  onSuccess: (profile: ConsentVerifyResponse) => void;
}

type ConsentStep = 'init' | 'otp' | 'success';

export const GSPConsentModal: React.FC<GSPConsentModalProps> = ({
  isOpen,
  onClose,
  clientId,
  gstin,
  onSuccess
}) => {
  const [step, setStep] = useState<ConsentStep>('init');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const [gstUsername, setGstUsername] = useState('');
  const [consentData, setConsentData] = useState<ConsentInitResponse | null>(null);
  const [successData, setSuccessData] = useState<ConsentVerifyResponse | null>(null);

  const handleInitiate = async () => {
    if (!gstUsername.trim()) {
      setError('GST Portal Username is required');
      return;
    }
    
    setLoading(true);
    setError(null);

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
        if (response.error === 'GSP_CONSENT_NOT_CONFIGURED' || (response as any).errorDetails) {
          const details = (response as any).errorDetails;
          setError(details?.message || 'GSP consent API is not available. Contact MasterGST support to enable this feature.');
        } else {
          setError(response.error || 'Failed to initiate consent');
        }
      }
    } catch (err) {
      setError('Network error. Please try again.');
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
    setOtp('');
    setGstUsername('');
    setError(null);
    setConsentData(null);
    setSuccessData(null);
    onClose();
  };

  const renderInitStep = () => (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Link via GSP (OTP Consent)
        </DialogTitle>
        <DialogDescription>
          Connect to GST Service Provider to access detailed profile information including authorized signatories.
        </DialogDescription>
      </DialogHeader>

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
            <li>• AATO band information (if applicable)</li>
          </ul>
        </div>

        {error && (
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
    </>
  );

  const renderOTPStep = () => (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-primary" />
          Enter OTP
        </DialogTitle>
        <DialogDescription>
          Enter the 6-digit OTP sent to {consentData?.maskedDestination}
        </DialogDescription>
      </DialogHeader>

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
    </>
  );

  const renderSuccessStep = () => (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-success" />
          Consent Granted Successfully
        </DialogTitle>
        <DialogDescription>
          Your GSP account has been linked successfully. Profile data has been imported.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        {successData && (
          <div className="space-y-3">
            <div className="text-sm">
              <strong>Import Summary:</strong>
            </div>
            <ul className="text-sm text-muted-foreground space-y-1 ml-4">
              <li>• Consent ID: {successData.consentId}</li>
              <li>• Authorized Signatories: {successData.profilePayload.authorizedSignatories.length}</li>
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
    </>
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {step === 'init' && renderInitStep()}
        {step === 'otp' && renderOTPStep()}
        {step === 'success' && renderSuccessStep()}
      </DialogContent>
    </Dialog>
  );
};