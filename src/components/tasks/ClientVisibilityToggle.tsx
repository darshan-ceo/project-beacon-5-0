import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

interface ClientVisibilityToggleProps {
  isVisible: boolean;
  onToggle: (visible: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export const ClientVisibilityToggle: React.FC<ClientVisibilityToggleProps> = ({
  isVisible,
  onToggle,
  disabled = false,
  className
}) => {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingValue, setPendingValue] = useState(false);

  const handleToggleClick = (newValue: boolean) => {
    if (newValue === true) {
      // Show confirmation when making visible to client
      setPendingValue(newValue);
      setShowConfirmDialog(true);
    } else {
      // No confirmation needed when hiding from client
      onToggle(newValue);
    }
  };

  const handleConfirm = () => {
    onToggle(pendingValue);
    setShowConfirmDialog(false);
  };

  return (
    <>
      <div className={cn(
        'flex items-center gap-2 text-xs',
        className
      )}>
        <Switch
          id="client-visibility"
          checked={isVisible}
          onCheckedChange={handleToggleClick}
          disabled={disabled}
          className="scale-75"
        />
        <Label
          htmlFor="client-visibility"
          className={cn(
            'flex items-center gap-1 cursor-pointer text-xs',
            isVisible ? 'text-cyan-600 dark:text-cyan-400' : 'text-muted-foreground'
          )}
        >
          {isVisible ? (
            <>
              <Eye className="h-3 w-3" />
              <span>Visible to Client</span>
            </>
          ) : (
            <>
              <EyeOff className="h-3 w-3" />
              <span>Internal Only</span>
            </>
          )}
        </Label>
      </div>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-cyan-600" />
              Make Visible to Client?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This update will be visible in the client portal. The client will be able to see:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>The message content</li>
                <li>Any attachments</li>
                <li>The timestamp</li>
              </ul>
              <p className="mt-3 text-amber-600 dark:text-amber-400">
                Please ensure the content is appropriate for client viewing.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} className="bg-cyan-600 hover:bg-cyan-700">
              Yes, Make Visible
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
