import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, 
  AlertTriangle,
  Rocket,
  TestTube,
  Lock
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
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
import { useToast } from '@/hooks/use-toast';

const PRODUCTION_MODE_KEY = 'beacon_production_mode';

export const ProductionModeToggle: React.FC = () => {
  const [isProductionMode, setIsProductionMode] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const stored = localStorage.getItem(PRODUCTION_MODE_KEY);
    setIsProductionMode(stored === 'true');
  }, []);

  const handleToggle = (checked: boolean) => {
    if (checked) {
      setShowConfirmDialog(true);
    } else {
      // Disabling production mode
      localStorage.setItem(PRODUCTION_MODE_KEY, 'false');
      setIsProductionMode(false);
      toast({
        title: "Development Mode Enabled",
        description: "Test data tools are now visible.",
      });
    }
  };

  const confirmProductionMode = () => {
    localStorage.setItem(PRODUCTION_MODE_KEY, 'true');
    setIsProductionMode(true);
    setShowConfirmDialog(false);
    toast({
      title: "Production Mode Enabled",
      description: "Sample data tools are now hidden. All delete operations will require confirmation.",
    });
  };

  return (
    <>
      <Card className={isProductionMode ? 'border-green-500' : 'border-yellow-500'}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              {isProductionMode ? (
                <Rocket className="mr-2 h-5 w-5 text-green-500" />
              ) : (
                <TestTube className="mr-2 h-5 w-5 text-yellow-500" />
              )}
              Environment Mode
            </div>
            <Badge variant={isProductionMode ? 'default' : 'secondary'} 
                   className={isProductionMode ? 'bg-green-500' : 'bg-yellow-500 text-yellow-900'}>
              {isProductionMode ? 'Production' : 'Development'}
            </Badge>
          </CardTitle>
          <CardDescription>
            {isProductionMode 
              ? 'System is in production mode. Sample data tools are hidden.'
              : 'Development mode allows access to test data tools.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="space-y-1">
              <Label htmlFor="production-mode" className="font-medium">
                Production Mode
              </Label>
              <p className="text-sm text-muted-foreground">
                Enable to hide sample data tools and add extra confirmations
              </p>
            </div>
            <Switch
              id="production-mode"
              checked={isProductionMode}
              onCheckedChange={handleToggle}
            />
          </div>

          {/* Mode Features */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={`p-4 rounded-lg border ${isProductionMode ? 'bg-muted/30' : 'bg-yellow-50/50 dark:bg-yellow-950/20'}`}>
              <div className="flex items-center gap-2 mb-2">
                <TestTube className="h-4 w-4 text-yellow-600" />
                <span className="font-medium text-sm">Development Mode</span>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Sample data seeder visible</li>
                <li>• Bulk delete tools available</li>
                <li>• Test data patterns highlighted</li>
                <li>• Quick reset options enabled</li>
              </ul>
            </div>
            
            <div className={`p-4 rounded-lg border ${isProductionMode ? 'bg-green-50/50 dark:bg-green-950/20' : 'bg-muted/30'}`}>
              <div className="flex items-center gap-2 mb-2">
                <Rocket className="h-4 w-4 text-green-600" />
                <span className="font-medium text-sm">Production Mode</span>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Sample data tools hidden</li>
                <li>• All deletes require confirmation</li>
                <li>• Audit logging enhanced</li>
                <li>• Accidental deletion prevention</li>
              </ul>
            </div>
          </div>

          {isProductionMode && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 p-3 rounded-lg bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400"
            >
              <Lock className="h-4 w-4" />
              <span className="text-sm font-medium">
                Production safeguards are active
              </span>
            </motion.div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center">
              <Shield className="mr-2 h-5 w-5 text-primary" />
              Enable Production Mode?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>This will enable production safeguards:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Sample Data Manager will be hidden</li>
                <li>All delete operations will require confirmation</li>
                <li>Test data patterns will be flagged for review</li>
              </ul>
              <p className="text-sm font-medium mt-4">
                Make sure you have completed the Production Readiness Check before enabling this.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmProductionMode} className="bg-green-600 hover:bg-green-700">
              <Rocket className="mr-2 h-4 w-4" />
              Enable Production Mode
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

// Export utility hook for other components
export const useProductionMode = () => {
  const [isProductionMode, setIsProductionMode] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(PRODUCTION_MODE_KEY);
    setIsProductionMode(stored === 'true');
  }, []);

  return isProductionMode;
};
