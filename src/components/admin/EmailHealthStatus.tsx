import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { EmailTestResult } from '@/types/email';

interface EmailHealthStatusProps {
  lastTestResult: EmailTestResult | null;
}

export function EmailHealthStatus({ lastTestResult }: EmailHealthStatusProps) {
  if (!lastTestResult) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Backend Status:</strong> Not tested yet. Send a test email to verify configuration.
        </AlertDescription>
      </Alert>
    );
  }

  if (lastTestResult.success) {
    return (
      <Alert className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
        <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
        <AlertDescription>
          <strong className="text-green-900 dark:text-green-100">Backend: Connected to Resend ✅</strong>
          <div className="text-sm text-green-700 dark:text-green-300 mt-1">
            Last successful test: {lastTestResult.timestamp.toLocaleString()}
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert variant="destructive">
      <XCircle className="h-4 w-4" />
      <AlertDescription>
        <strong className="block mb-2">Backend Error: {lastTestResult.error} ❌</strong>
        {lastTestResult.details && (
          <div className="text-sm mt-2 whitespace-pre-line bg-destructive/10 p-3 rounded border border-destructive/20">
            {lastTestResult.details}
          </div>
        )}
        {lastTestResult.error?.includes('Resend') && (
          <div className="text-xs mt-3 p-2 bg-muted rounded">
            <strong>Quick Fix:</strong>
            <ol className="list-decimal ml-4 mt-1 space-y-1">
              <li>Visit <a href="https://resend.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">resend.com/api-keys</a></li>
              <li>Create a new API key (starts with "re_")</li>
              <li>Go to Cloud → Secrets and update RESEND_API_KEY</li>
              <li>Return here and send another test email</li>
            </ol>
          </div>
        )}
        <div className="text-xs mt-2 opacity-75">
          Last test: {lastTestResult.timestamp.toLocaleString()}
        </div>
      </AlertDescription>
    </Alert>
  );
}
