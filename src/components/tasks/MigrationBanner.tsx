import React, { useState, useEffect } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface MigrationBannerProps {
  migratedCount: number;
  onDismiss: () => void;
}

export const MigrationBanner: React.FC<MigrationBannerProps> = ({ 
  migratedCount, 
  onDismiss 
}) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const dismissed = localStorage.getItem('followup_migration_dismissed');
    if (dismissed) setVisible(false);
  }, []);

  const handleDismiss = () => {
    localStorage.setItem('followup_migration_dismissed', 'true');
    setVisible(false);
    onDismiss();
  };

  if (!visible || migratedCount === 0) return null;

  return (
    <Alert className="mb-4 border-blue-500 bg-blue-50 dark:bg-blue-950 relative">
      <CheckCircle2 className="h-4 w-4 text-blue-600" />
      <AlertTitle className="text-blue-900 dark:text-blue-100">Follow-up System Upgraded</AlertTitle>
      <AlertDescription className="text-blue-800 dark:text-blue-200">
        Successfully migrated {migratedCount} follow-up records to the new system. 
        Tasks with follow-ups are now locked to preserve audit trail.
      </AlertDescription>
      <Button
        variant="ghost"
        size="sm"
        className="absolute right-2 top-2 text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-100"
        onClick={handleDismiss}
      >
        <X className="h-4 w-4" />
      </Button>
    </Alert>
  );
};
