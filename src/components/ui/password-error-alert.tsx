import * as React from "react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { ShieldAlert, CheckCircle2 } from "lucide-react";

interface PasswordErrorAlertProps {
  title: string;
  description: string;
  guidance?: string[];
  className?: string;
}

/**
 * Displays password errors with structured guidance for creating secure passwords.
 * Used when password validation fails (e.g., leaked password detection).
 */
export function PasswordErrorAlert({ 
  title, 
  description, 
  guidance,
  className 
}: PasswordErrorAlertProps) {
  return (
    <Alert variant="destructive" className={className}>
      <ShieldAlert className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="mt-2">
        <p>{description}</p>
        {guidance && guidance.length > 0 && (
          <div className="mt-3">
            <p className="font-medium text-sm">Tips for a secure password:</p>
            <ul className="mt-1 space-y-1">
              {guidance.map((tip, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-3 w-3 mt-1 shrink-0 text-destructive" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}
