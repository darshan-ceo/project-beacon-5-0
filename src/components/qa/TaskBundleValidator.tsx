import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  RefreshCw,
  Package,
  Workflow,
  Play
} from 'lucide-react';
import { StorageManager } from '@/data/StorageManager';
import { seedDataService } from '@/services/seedDataService';
import { toast } from '@/hooks/use-toast';

interface BundleValidationResult {
  id: string;
  name: string;
  status: 'valid' | 'invalid' | 'warning';
  issues: string[];
  itemCount: number;
  trigger: string;
  stageCode?: string;
}

export const TaskBundleValidator: React.FC = () => {
  const [validationResults, setValidationResults] = useState<BundleValidationResult[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [lastValidation, setLastValidation] = useState<Date | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    valid: 0,
    warnings: 0,
    invalid: 0
  });

  const validateTaskBundles = async () => {
    setIsValidating(true);
    try {
      await StorageManager.getInstance().initialize();
      const repository = StorageManager.getInstance().getTaskBundleRepository();
      const bundles = await repository.getAllWithItems();
      
      const results: BundleValidationResult[] = [];
      
      for (const bundle of bundles) {
        const issues: string[] = [];
        let status: 'valid' | 'invalid' | 'warning' = 'valid';
        
        // Validate bundle structure
        if (!bundle.name || bundle.name.trim() === '') {
          issues.push('Bundle name is empty');
          status = 'invalid';
        }
        
        if (!bundle.trigger) {
          issues.push('No trigger specified');
          status = 'invalid';
        }
        
        if (!bundle.items || bundle.items.length === 0) {
          issues.push('No task items defined');
          status = 'invalid';
        } else {
          // Validate task items
          bundle.items.forEach((item, index) => {
            if (!item.title || item.title.trim() === '') {
              issues.push(`Task item ${index + 1} has no title`);
              status = status === 'valid' ? 'warning' : status;
            }
            
            if (!item.priority) {
              issues.push(`Task item ${index + 1} has no priority`);
              status = status === 'valid' ? 'warning' : status;
            }
            
            if (!item.estimated_hours || item.estimated_hours <= 0) {
              issues.push(`Task item ${index + 1} has invalid estimated hours`);
              status = status === 'valid' ? 'warning' : status;
            }
          });
        }
        
        // Check for duplicate order indices
        if (bundle.items) {
          const orderIndices = bundle.items.map(item => item.order_index).filter(idx => idx !== undefined);
          const uniqueIndices = new Set(orderIndices);
          if (orderIndices.length !== uniqueIndices.size) {
            issues.push('Duplicate order indices found');
            status = status === 'valid' ? 'warning' : status;
          }
        }
        
        results.push({
          id: bundle.id,
          name: bundle.name,
          status,
          issues,
          itemCount: bundle.items?.length || 0,
          trigger: bundle.trigger,
          stageCode: bundle.stage_code
        });
      }
      
      // Calculate stats
      const newStats = {
        total: results.length,
        valid: results.filter(r => r.status === 'valid').length,
        warnings: results.filter(r => r.status === 'warning').length,
        invalid: results.filter(r => r.status === 'invalid').length
      };
      
      setValidationResults(results);
      setStats(newStats);
      setLastValidation(new Date());
      
      toast({
        title: "Validation Complete",
        description: `Validated ${newStats.total} task bundles. ${newStats.valid} valid, ${newStats.warnings} warnings, ${newStats.invalid} invalid.`,
      });
      
    } catch (error) {
      console.error('Bundle validation failed:', error);
      toast({
        title: "Validation Failed",
        description: "Failed to validate task bundles",
        variant: "destructive"
      });
    } finally {
      setIsValidating(false);
    }
  };

  const generateSampleBundles = async () => {
    try {
      await seedDataService.generateComprehensiveSeedData();
      toast({
        title: "Sample Data Generated",
        description: "Comprehensive task bundles have been generated",
      });
      // Re-validate after generation
      await validateTaskBundles();
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: "Failed to generate sample task bundles",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    validateTaskBundles();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'valid':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'invalid':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'valid': return 'text-green-600 dark:text-green-400';
      case 'warning': return 'text-yellow-600 dark:text-yellow-400';
      case 'invalid': return 'text-red-600 dark:text-red-400';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Package className="h-6 w-6" />
            Task Bundle Validator
          </h2>
          <p className="text-muted-foreground">
            Validate task bundle structure and automation configuration
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={generateSampleBundles}
          >
            <Workflow className="h-4 w-4 mr-2" />
            Generate Sample Data
          </Button>
          <Button 
            onClick={validateTaskBundles}
            disabled={isValidating}
          >
            {isValidating ? (
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Validate Bundles
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total Bundles</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{stats.valid}</div>
            <p className="text-xs text-muted-foreground">Valid</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-600">{stats.warnings}</div>
            <p className="text-xs text-muted-foreground">Warnings</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">{stats.invalid}</div>
            <p className="text-xs text-muted-foreground">Invalid</p>
          </CardContent>
        </Card>
      </div>

      {/* Validation Results */}
      <Card>
        <CardHeader>
          <CardTitle>Validation Results</CardTitle>
          {lastValidation && (
            <p className="text-sm text-muted-foreground">
              Last validated: {lastValidation.toLocaleString()}
            </p>
          )}
        </CardHeader>
        <CardContent>
          {validationResults.length === 0 ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                No task bundles found. Click "Generate Sample Data" to create comprehensive test bundles.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              {validationResults.map((result) => (
                <div 
                  key={result.id} 
                  className="border rounded-lg p-4 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(result.status)}
                      <h3 className="font-medium">{result.name}</h3>
                      <Badge variant="outline" className="text-xs">
                        {result.trigger}
                      </Badge>
                      {result.stageCode && (
                        <Badge variant="secondary" className="text-xs">
                          {result.stageCode}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {result.itemCount} tasks
                      </Badge>
                      <Badge 
                        variant={result.status === 'valid' ? 'default' : 'secondary'} 
                        className={`text-xs ${getStatusColor(result.status)}`}
                      >
                        {result.status.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                  
                  {result.issues.length > 0 && (
                    <div className="ml-6">
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {result.issues.map((issue, index) => (
                          <li key={index} className="flex items-center gap-2">
                            <div className="w-1 h-1 bg-current rounded-full" />
                            {issue}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};