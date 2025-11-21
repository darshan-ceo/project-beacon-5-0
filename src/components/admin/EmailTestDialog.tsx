import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle2, XCircle, Mail } from 'lucide-react';
import { validateEmail } from '@/utils/emailValidation';
import type { EmailTestResult } from '@/types/email';

interface EmailTestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSendTest: (recipientEmail: string) => Promise<EmailTestResult>;
}

export function EmailTestDialog({ open, onOpenChange, onSendTest }: EmailTestDialogProps) {
  const [recipientEmail, setRecipientEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<EmailTestResult | null>(null);
  const [validationError, setValidationError] = useState<string>('');

  const handleEmailChange = (value: string) => {
    setRecipientEmail(value);
    setValidationError('');
    setResult(null);
  };

  const handleSendTest = async () => {
    // Validate email
    if (!recipientEmail.trim()) {
      setValidationError('Please enter a recipient email address');
      return;
    }

    if (!validateEmail(recipientEmail)) {
      setValidationError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const testResult = await onSendTest(recipientEmail);
      setResult(testResult);
    } catch (error) {
      setResult({
        success: false,
        error: 'Test failed',
        details: error instanceof Error ? error.message : 'An unexpected error occurred',
        timestamp: new Date()
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setRecipientEmail('');
    setValidationError('');
    setResult(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Send Test Email
          </DialogTitle>
          <DialogDescription>
            Send a test email to verify your configuration is working correctly.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="test-email">Recipient Email Address</Label>
            <Input
              id="test-email"
              type="email"
              placeholder="test@example.com"
              value={recipientEmail}
              onChange={(e) => handleEmailChange(e.target.value)}
              disabled={isLoading}
              className={validationError ? 'border-destructive' : ''}
            />
            {validationError && (
              <p className="text-sm text-destructive">{validationError}</p>
            )}
          </div>

          <Alert>
            <AlertDescription className="text-sm">
              <strong>Test Email Contents:</strong>
              <ul className="mt-2 space-y-1 list-disc list-inside text-muted-foreground">
                <li>Subject: "Test Email from Law Firm Case Management"</li>
                <li>Current timestamp and configuration details</li>
                <li>Confirmation message if delivery succeeds</li>
              </ul>
            </AlertDescription>
          </Alert>

          {result && (
            <Alert variant={result.success ? 'default' : 'destructive'}>
              <div className="flex items-start gap-2">
                {result.success ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                ) : (
                  <XCircle className="h-5 w-5 mt-0.5" />
                )}
                <div className="flex-1 space-y-1">
                  <div className="font-medium">
                    {result.success ? 'Test Email Sent Successfully!' : 'Test Email Failed'}
                  </div>
                  {result.error && !result.success && (
                    <div className="text-sm font-medium mt-1">
                      {result.error}
                    </div>
                  )}
                  {result.details && (
                    <div className="text-sm mt-1 whitespace-pre-line">
                      {result.details}
                    </div>
                  )}
                  {result.messageId && (
                    <div className="text-xs text-muted-foreground mt-2">
                      Message ID: {result.messageId}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground">
                    {result.timestamp.toLocaleString()}
                  </div>
                </div>
              </div>
            </Alert>
          )}

          {isLoading && (
            <div className="flex items-center justify-center gap-2 py-4 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Sending test email...</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Close
          </Button>
          <Button onClick={handleSendTest} disabled={isLoading || !recipientEmail}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              'Send Test Email'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
