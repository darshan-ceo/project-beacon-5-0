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
        <strong>Backend Error: {lastTestResult.error} ❌</strong>
        {lastTestResult.details && (
          <div className="text-sm mt-2 whitespace-pre-line">
            {lastTestResult.details}
          </div>
        )}
        <div className="text-xs mt-2 opacity-75">
          Last test: {lastTestResult.timestamp.toLocaleString()}
        </div>
      </AlertDescription>
    </Alert>
  );
}
