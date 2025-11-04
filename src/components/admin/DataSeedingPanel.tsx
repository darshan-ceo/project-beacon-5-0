import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Sprout, CheckCircle, XCircle, AlertCircle, Sparkles } from 'lucide-react';
import { GSTLitigationDataSeeder } from '@/services/gstLitigationDataSeeder';
import { comprehensiveGSTDataSeeder } from '@/services/comprehensiveGSTDataSeeder';
import mockDataset from '@/data/seedData/gstLitigationMockData.json';

export const DataSeedingPanel = () => {
  const [isSeeding, setIsSeeding] = useState(false);
  const [isSeedingComprehensive, setIsSeedingComprehensive] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [comprehensiveResult, setComprehensiveResult] = useState<any>(null);
  const { toast } = useToast();

  const handleSeedComprehensiveData = async () => {
    setIsSeedingComprehensive(true);
    setComprehensiveResult(null);

    try {
      toast({
        title: "🌱 Starting Comprehensive Data Seeding",
        description: "This will populate all master modules with production-ready data.",
      });

      const seedResult = await comprehensiveGSTDataSeeder.seedAll();

      setComprehensiveResult(seedResult);

      if (seedResult.success) {
        toast({
          title: "✅ Comprehensive Data Seeding Completed",
          description: `Successfully seeded ${seedResult.totalRecords} records across all master modules.`,
        });
      } else {
        toast({
          title: "⚠️ Comprehensive Data Seeding Failed",
          description: seedResult.errors.join(', '),
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "❌ Comprehensive Seeding Error",
        description: error.message,
        variant: "destructive",
      });
      setComprehensiveResult({
        success: false,
        totalRecords: 0,
        breakdown: {},
        errors: [error.message]
      });
    } finally {
      setIsSeedingComprehensive(false);
    }
  };

  const handleSeedData = async () => {
    setIsSeeding(true);
    setResult(null);

    try {
      const seeder = new GSTLitigationDataSeeder();
      const seedResult = await seeder.seedAll(mockDataset);
      
      setResult(seedResult);

      if (seedResult.success) {
        toast({
          title: "✅ Seeding Completed",
          description: `Successfully seeded ${seedResult.totalRecords} records across all modules.`,
        });
      } else {
        toast({
          title: "⚠️ Seeding Completed with Errors",
          description: `Seeded ${seedResult.totalRecords} records, but encountered ${seedResult.errors.length} errors.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Seeding error:', error);
      toast({
        title: "❌ Seeding Failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
      setResult({
        success: false,
        totalRecords: 0,
        details: {},
        errors: [String(error)]
      });
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sprout className="h-5 w-5 text-primary" />
          GST Litigation Demo Data Seeder
        </CardTitle>
        <CardDescription>
          Populate your database with sample GST litigation data for testing and demonstration purposes.
          This includes users, clients, courts, cases, hearings, tasks, and documents.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            This will add sample data to your current tenant. Make sure you're in a test environment.
          </AlertDescription>
        </Alert>

        <div className="grid gap-3">
          <Button 
            onClick={handleSeedComprehensiveData} 
            disabled={isSeedingComprehensive || isSeeding}
            className="w-full"
          >
            {isSeedingComprehensive ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Seeding Comprehensive Data...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Seed Comprehensive Master Data
              </>
            )}
          </Button>

          <Button 
            onClick={handleSeedData} 
            disabled={isSeeding || isSeedingComprehensive}
            className="w-full"
            variant="outline"
          >
            {isSeeding ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Seeding Legacy Data...
              </>
            ) : (
              <>
                <Sprout className="mr-2 h-4 w-4" />
                Seed Legacy Sample Data
              </>
            )}
          </Button>
        </div>

        {comprehensiveResult && (
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center gap-2">
              {comprehensiveResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-destructive" />
              )}
              <span className="font-medium">
                Comprehensive Seeding {comprehensiveResult.success ? 'Successful' : 'Failed'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between p-2 bg-muted/50 rounded">
                <span>Courts:</span>
                <span className="font-mono">{comprehensiveResult.breakdown.courts || 0}</span>
              </div>
              <div className="flex justify-between p-2 bg-muted/50 rounded">
                <span>Judges:</span>
                <span className="font-mono">{comprehensiveResult.breakdown.judges || 0}</span>
              </div>
              <div className="flex justify-between p-2 bg-muted/50 rounded">
                <span>Clients:</span>
                <span className="font-mono">{comprehensiveResult.breakdown.clients || 0}</span>
              </div>
              <div className="flex justify-between p-2 bg-muted/50 rounded">
                <span>Employees:</span>
                <span className="font-mono">{comprehensiveResult.breakdown.employees || 0}</span>
              </div>
            </div>

            <div className="p-3 bg-primary/5 rounded border border-primary/20">
              <div className="font-medium">Total Records: {comprehensiveResult.totalRecords}</div>
            </div>

            {comprehensiveResult.errors && comprehensiveResult.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertDescription>
                  <div className="font-medium mb-1">Errors ({comprehensiveResult.errors.length}):</div>
                  <ul className="list-disc pl-4 space-y-1 text-xs">
                    {comprehensiveResult.errors.slice(0, 5).map((error: string, idx: number) => (
                      <li key={idx}>{error}</li>
                    ))}
                    {comprehensiveResult.errors.length > 5 && (
                      <li className="text-muted-foreground">...and {comprehensiveResult.errors.length - 5} more</li>
                    )}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {result && (
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center gap-2">
              {result.success ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-destructive" />
              )}
              <span className="font-medium">
                Legacy Seeding {result.success ? 'Successful' : 'Failed'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between p-2 bg-muted/50 rounded">
                <span>Users:</span>
                <span className="font-mono">{result.details.users || 0}</span>
              </div>
              <div className="flex justify-between p-2 bg-muted/50 rounded">
                <span>Clients:</span>
                <span className="font-mono">{result.details.clients || 0}</span>
              </div>
              <div className="flex justify-between p-2 bg-muted/50 rounded">
                <span>Forums:</span>
                <span className="font-mono">{result.details.forums || 0}</span>
              </div>
              <div className="flex justify-between p-2 bg-muted/50 rounded">
                <span>Cases:</span>
                <span className="font-mono">{result.details.cases || 0}</span>
              </div>
              <div className="flex justify-between p-2 bg-muted/50 rounded">
                <span>Hearings:</span>
                <span className="font-mono">{result.details.hearings || 0}</span>
              </div>
              <div className="flex justify-between p-2 bg-muted/50 rounded">
                <span>Tasks:</span>
                <span className="font-mono">{result.details.tasks || 0}</span>
              </div>
              <div className="flex justify-between p-2 bg-muted/50 rounded col-span-2">
                <span>Documents:</span>
                <span className="font-mono">{result.details.documents || 0}</span>
              </div>
            </div>

            <div className="p-3 bg-primary/5 rounded border border-primary/20">
              <div className="font-medium">Total Records: {result.totalRecords}</div>
            </div>

            {result.errors && result.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertDescription>
                  <div className="font-medium mb-1">Errors ({result.errors.length}):</div>
                  <ul className="list-disc pl-4 space-y-1 text-xs">
                    {result.errors.slice(0, 5).map((error: string, idx: number) => (
                      <li key={idx}>{error}</li>
                    ))}
                    {result.errors.length > 5 && (
                      <li className="text-muted-foreground">...and {result.errors.length - 5} more</li>
                    )}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
