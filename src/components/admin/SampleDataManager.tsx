import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { 
  Database, 
  Trash2, 
  RefreshCw, 
  Loader2,
  CheckCircle,
  AlertTriangle,
  FileText
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { sampleDataSeeder } from '@/services/sampleDataSeeder';

export const SampleDataManager: React.FC = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [hasSampleData, setHasSampleData] = useState(false);
  const [operationType, setOperationType] = useState<'cleanup' | 'seed' | 'reset' | null>(null);

  useEffect(() => {
    checkSampleData();
  }, []);

  const checkSampleData = async () => {
    try {
      const exists = await sampleDataSeeder.hasSampleData();
      setHasSampleData(exists);
    } catch (error) {
      console.error('Error checking sample data:', error);
    }
  };

  const handleCleanupAllCases = async () => {
    setIsLoading(true);
    setOperationType('cleanup');
    try {
      const result = await sampleDataSeeder.cleanupAllCases();
      
      if (result.success) {
        toast({
          title: "All Cases Deleted",
          description: `Removed ${result.casesDeleted} cases, ${result.hearingsDeleted} hearings, ${result.tasksDeleted} tasks, and all related data.`,
        });
        await checkSampleData();
      } else {
        toast({
          title: "Cleanup Failed",
          description: result.errors.join(', '),
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Cleanup Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setOperationType(null);
    }
  };

  const handleSeedSampleCases = async () => {
    setIsLoading(true);
    setOperationType('seed');
    try {
      const result = await sampleDataSeeder.seedSampleCases();
      
      if (result.success) {
        toast({
          title: "Sample Data Created",
          description: `Created ${result.casesCreated} cases, ${result.hearingsCreated} hearings, ${result.tasksCreated} tasks, ${result.transitionsCreated} transitions, and ${result.timelineEntriesCreated} timeline entries.`,
        });
        await checkSampleData();
      } else {
        toast({
          title: "Seeding Failed",
          description: result.errors.join(', '),
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Seeding Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setOperationType(null);
    }
  };

  const handleResetSampleData = async () => {
    setIsLoading(true);
    setOperationType('reset');
    try {
      const { cleanup, seed } = await sampleDataSeeder.resetSampleData();
      
      if (cleanup.success && seed.success) {
        toast({
          title: "Sample Data Reset Complete",
          description: `Deleted ${cleanup.casesDeleted} old cases and created ${seed.casesCreated} fresh sample cases with complete lifecycle data.`,
        });
        await checkSampleData();
      } else {
        const errors = [...cleanup.errors, ...seed.errors];
        toast({
          title: "Reset Failed",
          description: errors.join(', '),
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Reset Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setOperationType(null);
    }
  };

  return (
    <div className="space-y-6">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h2 className="text-2xl font-bold text-foreground">Sample Data Management</h2>
        <p className="text-muted-foreground mt-2">
          Manage sample cases for testing and development
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Status Card */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Database className="mr-2 h-5 w-5 text-primary" />
                Sample Data Status
              </CardTitle>
              <CardDescription>
                Current state of sample case data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Sample Cases</span>
                <Badge variant={hasSampleData ? "default" : "secondary"}>
                  {hasSampleData ? (
                    <>
                      <CheckCircle className="mr-1 h-3 w-3" />
                      Present
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="mr-1 h-3 w-3" />
                      Not Found
                    </>
                  )}
                </Badge>
              </div>
              
              <div className="space-y-2 pt-4 border-t">
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <p className="text-xs text-muted-foreground">
                    Sample cases use <code className="bg-muted px-1 rounded">SAMPLE/</code> prefix
                    for easy identification and cleanup
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Actions Card */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <RefreshCw className="mr-2 h-5 w-5 text-secondary" />
                Quick Actions
              </CardTitle>
              <CardDescription>
                Manage sample data with one click
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                onClick={handleSeedSampleCases}
                className="w-full"
                disabled={isLoading}
              >
                {isLoading && operationType === 'seed' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Sample Data...
                  </>
                ) : (
                  <>
                    <Database className="mr-2 h-4 w-4" />
                    Seed Sample Cases
                  </>
                )}
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="outline"
                    className="w-full"
                    disabled={isLoading}
                  >
                    {isLoading && operationType === 'reset' ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Resetting...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Reset Sample Data
                      </>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reset Sample Data?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will delete all existing sample cases (SAMPLE/ prefix) and create fresh sample data.
                      Regular cases will not be affected.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleResetSampleData}>
                      Reset Sample Data
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Danger Zone */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
      >
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center text-destructive">
              <AlertTriangle className="mr-2 h-5 w-5" />
              Danger Zone
            </CardTitle>
            <CardDescription>
              Irreversible actions that will delete ALL case data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-4 border border-destructive rounded-lg bg-destructive/10">
              <h4 className="font-semibold text-destructive mb-2">Clear ALL Cases</h4>
              <p className="text-sm text-muted-foreground mb-4">
                This will permanently delete ALL cases (including non-sample cases), hearings, tasks, 
                documents, stage transitions, and timeline entries. This action cannot be undone.
              </p>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    disabled={isLoading}
                  >
                    {isLoading && operationType === 'cleanup' ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Deleting All Cases...
                      </>
                    ) : (
                      <>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Clear ALL Cases
                      </>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete:
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li>ALL cases (sample and regular)</li>
                        <li>ALL hearings</li>
                        <li>ALL tasks</li>
                        <li>ALL documents</li>
                        <li>ALL stage transitions</li>
                        <li>ALL timeline entries</li>
                      </ul>
                      <p className="mt-3 font-semibold text-destructive">
                        This will reset your entire case database!
                      </p>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleCleanupAllCases}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Yes, delete everything
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};