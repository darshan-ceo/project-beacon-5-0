import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useDataPersistence } from '@/hooks/useDataPersistence';
import { useToast } from '@/hooks/use-toast';
import { 
  Download, 
  Upload, 
  Trash2, 
  Database, 
  Shield,
  AlertTriangle,
  CheckCircle,
  Save
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

export const DataManagement: React.FC = () => {
  const { exportData, importData, clearAllData, saveToStorage } = useDataPersistence();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);

  const handleExport = () => {
    try {
      exportData();
      toast({
        title: "Data Exported",
        description: "Your data has been successfully exported to a JSON file.",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export data. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const success = await importData(file);
      if (success) {
        toast({
          title: "Data Imported",
          description: "Your data has been successfully imported and restored.",
        });
      } else {
        toast({
          title: "Import Failed",
          description: "Invalid file format or structure. Please check your backup file.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Import Error",
        description: "An error occurred while importing data.",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleClearData = () => {
    try {
      clearAllData();
      toast({
        title: "Data Cleared",
        description: "All application data has been cleared.",
        variant: "destructive",
      });
    } catch (error) {
      toast({
        title: "Clear Failed",
        description: "Failed to clear data. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleManualSave = () => {
    try {
      saveToStorage();
      toast({
        title: "Data Saved",
        description: "Current state has been saved to local storage.",
      });
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Failed to save data. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h2 className="text-2xl font-bold text-foreground">Data Management</h2>
        <p className="text-muted-foreground mt-2">
          Backup, restore, and manage your application data
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Backup & Export */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Download className="mr-2 h-5 w-5 text-primary" />
                Data Backup
              </CardTitle>
              <CardDescription>
                Export your data for backup or migration purposes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  <CheckCircle className="mr-1 h-3 w-3" />
                  Auto-save Active
                </Badge>
                <p className="text-sm text-muted-foreground">
                  Data is automatically saved every 30 seconds and before page close
                </p>
              </div>
              
              <div className="flex flex-col space-y-2">
                <Button 
                  onClick={handleManualSave}
                  variant="outline"
                  className="w-full"
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save Now
                </Button>
                
                <Button 
                  onClick={handleExport}
                  className="w-full"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export Data
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Restore & Import */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Upload className="mr-2 h-5 w-5 text-secondary" />
                Data Restore
              </CardTitle>
              <CardDescription>
                Import data from a previous backup file
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  <Database className="mr-1 h-3 w-3" />
                  JSON Format
                </Badge>
                <p className="text-sm text-muted-foreground">
                  Only JSON backup files exported from this system are supported
                </p>
              </div>
              
              <div className="space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  className="hidden"
                />
                <Button 
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  className="w-full"
                  disabled={isImporting}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {isImporting ? 'Importing...' : 'Import Data'}
                </Button>
              </div>
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
              Irreversible actions that will affect all your data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 border border-destructive rounded-lg bg-destructive/10">
                <h4 className="font-semibold text-destructive mb-2">Clear All Data</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  This will permanently delete all cases, tasks, clients, and other data. 
                  This action cannot be undone.
                </p>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Clear All Data
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete all 
                        your data including:
                        <ul className="list-disc list-inside mt-2 space-y-1">
                          <li>All cases and case data</li>
                          <li>All tasks and assignments</li>
                          <li>All client information</li>
                          <li>All documents and uploads</li>
                          <li>All legal forum and judge records</li>
                          <li>All application settings</li>
                        </ul>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={handleClearData}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Yes, delete everything
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};