import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, 
  CheckCircle2, 
  AlertTriangle,
  ArrowRight,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUIStateMigration } from '@/hooks/useUIState';

export const UIStateMigrationPanel: React.FC = () => {
  const { toast } = useToast();
  const { isMigrated, isLoading, migrate } = useUIStateMigration();
  const [migrationResult, setMigrationResult] = React.useState<{
    migrated: number;
    errors: string[];
  } | null>(null);

  const handleMigrate = async () => {
    try {
      const result = await migrate();
      
      setMigrationResult({
        migrated: result.migrated,
        errors: result.errors
      });

      if (result.success) {
        toast({
          title: 'Migration Complete',
          description: `Successfully migrated ${result.migrated} UI preferences to Supabase`
        });
      } else {
        toast({
          title: 'Migration Issues',
          description: `Migrated ${result.migrated} items, but ${result.errors.length} errors occurred`,
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Migration Failed',
        description: String(error),
        variant: 'destructive'
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          <div className="flex-1">
            <CardTitle>UI State Migration</CardTitle>
            <CardDescription>
              Migrate your UI preferences, filters, and view settings from browser storage to Supabase
            </CardDescription>
          </div>
          {isMigrated && (
            <Badge variant="default">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Migrated
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isMigrated ? (
          <>
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Migration Available</AlertTitle>
              <AlertDescription>
                Your UI preferences are currently stored in browser localStorage. 
                Migrate them to Supabase to sync across devices and preserve them after browser cache clears.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <div className="text-sm font-medium">Items to Migrate:</div>
              <div className="grid grid-cols-2 gap-2">
                <div className="text-sm text-muted-foreground">• Case filters & sorting</div>
                <div className="text-sm text-muted-foreground">• Task preferences</div>
                <div className="text-sm text-muted-foreground">• Document view settings</div>
                <div className="text-sm text-muted-foreground">• Column visibility</div>
                <div className="text-sm text-muted-foreground">• Layout preferences</div>
                <div className="text-sm text-muted-foreground">• Theme settings</div>
              </div>
            </div>

            <Button
              onClick={handleMigrate}
              disabled={isLoading}
              className="gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Migrating...
                </>
              ) : (
                <>
                  <ArrowRight className="h-4 w-4" />
                  Start Migration
                </>
              )}
            </Button>
          </>
        ) : (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Migration Complete</AlertTitle>
            <AlertDescription>
              Your UI preferences have been successfully migrated to Supabase. 
              They will now sync across all your devices.
            </AlertDescription>
          </Alert>
        )}

        {migrationResult && (
          <div className="space-y-2 pt-4 border-t">
            <div className="text-sm font-medium">Migration Results:</div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 border rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">Items Migrated</div>
                <div className="text-2xl font-bold text-green-600">{migrationResult.migrated}</div>
              </div>
              
              <div className="p-3 border rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">Errors</div>
                <div className="text-2xl font-bold text-red-600">{migrationResult.errors.length}</div>
              </div>
            </div>

            {migrationResult.errors.length > 0 && (
              <div className="space-y-1">
                <div className="text-sm font-medium text-destructive">Errors:</div>
                {migrationResult.errors.map((error, idx) => (
                  <Alert key={idx} variant="destructive" className="py-2">
                    <AlertDescription className="text-xs">{error}</AlertDescription>
                  </Alert>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
