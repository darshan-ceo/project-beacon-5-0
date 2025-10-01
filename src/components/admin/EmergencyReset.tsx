import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/data/db';

export const EmergencyReset: React.FC = () => {
  const { toast } = useToast();

  const handleEmergencyReset = async () => {
    try {
      // Clear all localStorage data
      localStorage.removeItem('lawfirm_app_data');
      localStorage.removeItem('user_profile');
      
      // Clear HofficeDB
      await db.delete();
      
      toast({
        title: "Emergency Reset Complete",
        description: "All local data has been cleared. The page will reload.",
      });

      // Reload the page after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      toast({
        title: "Reset Failed",
        description: "Could not clear local data. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-4 border border-destructive/20 rounded-lg bg-destructive/5">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="h-4 w-4 text-destructive" />
        <h3 className="font-medium text-destructive">Emergency Reset</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-3">
        Use this only if the app becomes unresponsive. This will clear all local data and reload the page.
      </p>
      <Button
        variant="destructive"
        size="sm"
        onClick={handleEmergencyReset}
        className="gap-2"
      >
        <RefreshCw className="h-3 w-3" />
        Reset App Data
      </Button>
    </div>
  );
};