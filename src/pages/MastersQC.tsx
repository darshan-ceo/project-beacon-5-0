/**
 * Masters QC Runner
 * Comprehensive CRUD test runner for all master entities
 * Tests create/read/update/delete operations and reports detailed errors
 */

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Play, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  RefreshCw,
  Database,
  Copy,
  Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface TestResult {
  entity: string;
  operation: 'create' | 'read' | 'update' | 'delete';
  status: 'pass' | 'fail' | 'skip';
  duration: number;
  errorCode?: string;
  errorMessage?: string;
  errorDetails?: string;
  recordId?: string;
}

interface EntityTestConfig {
  name: string;
  table: string;
  createPayload: Record<string, any>;
  updatePayload: Record<string, any>;
  requiredFields: string[];
}

// Entity test config with optional special handling flags
interface EntityTestConfig {
  name: string;
  table: string;
  createPayload: Record<string, any>;
  updatePayload: Record<string, any>;
  requiredFields: string[];
  requiresOwner?: boolean; // Set owner_id/owner_user_id to current user
  requiresClientLink?: boolean; // Create temp client first
  skipCreate?: boolean; // Skip create/delete (e.g., employees need provisioning)
  skipReason?: string;
}

// Test configurations for each master entity
const MASTER_ENTITIES: EntityTestConfig[] = [
  {
    name: 'Clients',
    table: 'clients',
    createPayload: {
      display_name: `QC Test Client ${Date.now()}`,
      email: `qc-test-${Date.now()}@test.local`,
      phone: '+91 9999999999',
      status: 'active',
      type: 'Proprietorship',
      state: 'Gujarat',
      city: 'Ahmedabad',
      data_scope: 'TEAM'
    },
    updatePayload: { status: 'inactive' },
    requiredFields: ['display_name'],
    requiresOwner: true
  },
  {
    name: 'Client Contacts',
    table: 'client_contacts',
    createPayload: {
      name: `QC Test Contact ${Date.now()}`,
      designation: 'Manager',
      is_primary: false,
      is_active: true,
      data_scope: 'TEAM',
      emails: [{ email: 'test@example.com', isPrimary: true }],
      phones: [{ countryCode: '+91', number: '9999999999', isPrimary: true }]
    },
    updatePayload: { designation: 'Director' },
    requiredFields: ['name'],
    requiresOwner: true,
    requiresClientLink: true
  },
  {
    name: 'Client Groups',
    table: 'client_groups',
    createPayload: {
      name: `QC Test Group ${Date.now()}`,
      code: `QC-${Date.now().toString().slice(-6)}`,
      description: 'QC Test Group Description',
      total_clients: 0
    },
    updatePayload: { description: 'Updated by QC test' },
    requiredFields: ['name', 'code']
  },
  {
    name: 'Legal Authorities (Courts)',
    table: 'courts',
    createPayload: {
      name: `QC Test Forum ${Date.now()}`,
      type: 'Tribunal',
      level: 'First Appeal',
      jurisdiction: 'State',
      state: 'Gujarat',
      city: 'Ahmedabad',
      status: 'Active',
      tax_jurisdiction: 'CGST',
      officer_designation: 'Commissioner (Appeals)',
      bench_location: 'Ahmedabad'
    },
    updatePayload: { status: 'Inactive' },
    requiredFields: ['name']
  },
  {
    name: 'Judges',
    table: 'judges',
    createPayload: {
      name: `QC Test Judge ${Date.now()}`,
      designation: 'Member (Technical)',
      status: 'Active',
      phone: '+91 9999999999',
      email: `qc-judge-${Date.now()}@test.local`
    },
    updatePayload: { status: 'Inactive' },
    requiredFields: ['name']
  },
  {
    name: 'Employees',
    table: 'employees',
    createPayload: {},
    updatePayload: { department: 'Legal' },
    requiredFields: ['full_name', 'employee_code', 'email', 'department', 'role'],
    skipCreate: true,
    skipReason: 'Employees require auth provisioning (profile + auth.users FK)'
  }
];

export default function MastersQC() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentEntity, setCurrentEntity] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);

  // Fetch tenant ID and user ID from current user
  const fetchUserContext = async (): Promise<{ tenantId: string; userId: string } | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();
    
    if (!profile?.tenant_id) return null;
    return { tenantId: profile.tenant_id, userId: user.id };
  };

  // Run a single CRUD test for an entity
  const runEntityTest = async (
    config: EntityTestConfig, 
    tid: string, 
    userId: string
  ): Promise<TestResult[]> => {
    const entityResults: TestResult[] = [];
    let createdId: string | null = null;
    let tempClientId: string | null = null;

    // Handle entities that skip create (like employees that need provisioning)
    if (config.skipCreate) {
      entityResults.push({
        entity: config.name,
        operation: 'create',
        status: 'skip',
        duration: 0,
        errorMessage: config.skipReason || 'Create skipped'
      });

      // For employees, test read on existing record
      if (config.table === 'employees') {
        const readStart = performance.now();
        try {
          const { data, error } = await (supabase as any)
            .from(config.table)
            .select('id, full_name')
            .eq('tenant_id', tid)
            .limit(1)
            .single();

          if (error || !data) {
            entityResults.push({
              entity: config.name,
              operation: 'read',
              status: 'skip',
              duration: performance.now() - readStart,
              errorMessage: 'No existing employee to test read'
            });
          } else {
            entityResults.push({
              entity: config.name,
              operation: 'read',
              status: 'pass',
              duration: performance.now() - readStart,
              recordId: data.id
            });
          }
        } catch {
          entityResults.push({
            entity: config.name,
            operation: 'read',
            status: 'skip',
            duration: 0,
            errorMessage: 'Read test skipped'
          });
        }
      }

      // Skip update/delete for entities that skip create
      ['update', 'delete'].forEach(op => {
        entityResults.push({
          entity: config.name,
          operation: op as any,
          status: 'skip',
          duration: 0,
          errorMessage: config.skipReason || 'Skipped - requires provisioning'
        });
      });

      return entityResults;
    }

    // If this entity requires a client link, create a temp client first
    if (config.requiresClientLink) {
      try {
        const { data: tempClient } = await (supabase as any)
          .from('clients')
          .insert({ 
            display_name: `QC Temp Client ${Date.now()}`,
            tenant_id: tid,
            owner_id: userId,
            status: 'active'
          })
          .select('id')
          .single();
        tempClientId = tempClient?.id;
      } catch {
        // Continue without client link
      }
    }

    // Build create payload with owner and client_id if needed
    const createPayload: Record<string, any> = { 
      ...config.createPayload, 
      tenant_id: tid 
    };
    
    if (config.requiresOwner) {
      if (config.table === 'clients') {
        createPayload.owner_id = userId;
      } else if (config.table === 'client_contacts') {
        createPayload.owner_user_id = userId;
        if (tempClientId) {
          createPayload.client_id = tempClientId;
        }
      }
    }

    // CREATE
    const createStart = performance.now();
    try {
      const { data, error } = await (supabase as any)
        .from(config.table)
        .insert(createPayload)
        .select()
        .single();

      if (error) {
        entityResults.push({
          entity: config.name,
          operation: 'create',
          status: 'fail',
          duration: performance.now() - createStart,
          errorCode: error.code,
          errorMessage: error.message,
          errorDetails: error.details || error.hint
        });
      } else {
        createdId = data?.id;
        entityResults.push({
          entity: config.name,
          operation: 'create',
          status: 'pass',
          duration: performance.now() - createStart,
          recordId: createdId || undefined
        });
      }
    } catch (err: any) {
      entityResults.push({
        entity: config.name,
        operation: 'create',
        status: 'fail',
        duration: performance.now() - createStart,
        errorMessage: err.message
      });
    }

    // READ (only if create succeeded)
    if (createdId) {
      const readStart = performance.now();
      try {
        const { data, error } = await (supabase as any)
          .from(config.table)
          .select('*')
          .eq('id', createdId)
          .eq('tenant_id', tid)
          .single();

        if (error) {
          entityResults.push({
            entity: config.name,
            operation: 'read',
            status: 'fail',
            duration: performance.now() - readStart,
            errorCode: error.code,
            errorMessage: error.message
          });
        } else {
          entityResults.push({
            entity: config.name,
            operation: 'read',
            status: data ? 'pass' : 'fail',
            duration: performance.now() - readStart,
            recordId: createdId
          });
        }
      } catch (err: any) {
        entityResults.push({
          entity: config.name,
          operation: 'read',
          status: 'fail',
          duration: performance.now() - readStart,
          errorMessage: err.message
        });
      }

      // UPDATE
      const updateStart = performance.now();
      try {
        const { error } = await (supabase as any)
          .from(config.table)
          .update(config.updatePayload)
          .eq('id', createdId)
          .eq('tenant_id', tid);

        if (error) {
          entityResults.push({
            entity: config.name,
            operation: 'update',
            status: 'fail',
            duration: performance.now() - updateStart,
            errorCode: error.code,
            errorMessage: error.message
          });
        } else {
          entityResults.push({
            entity: config.name,
            operation: 'update',
            status: 'pass',
            duration: performance.now() - updateStart,
            recordId: createdId
          });
        }
      } catch (err: any) {
        entityResults.push({
          entity: config.name,
          operation: 'update',
          status: 'fail',
          duration: performance.now() - updateStart,
          errorMessage: err.message
        });
      }

      // DELETE (cleanup)
      const deleteStart = performance.now();
      try {
        const { error } = await (supabase as any)
          .from(config.table)
          .delete()
          .eq('id', createdId)
          .eq('tenant_id', tid);

        if (error) {
          entityResults.push({
            entity: config.name,
            operation: 'delete',
            status: 'fail',
            duration: performance.now() - deleteStart,
            errorCode: error.code,
            errorMessage: error.message
          });
        } else {
          entityResults.push({
            entity: config.name,
            operation: 'delete',
            status: 'pass',
            duration: performance.now() - deleteStart,
            recordId: createdId
          });
        }
      } catch (err: any) {
        entityResults.push({
          entity: config.name,
          operation: 'delete',
          status: 'fail',
          duration: performance.now() - deleteStart,
          errorMessage: err.message
        });
      }
    } else {
      // Skip read/update/delete if create failed
      ['read', 'update', 'delete'].forEach(op => {
        entityResults.push({
          entity: config.name,
          operation: op as any,
          status: 'skip',
          duration: 0,
          errorMessage: 'Skipped - create failed'
        });
      });
    }

    // Cleanup temp client if created
    if (tempClientId) {
      try {
        await (supabase as any)
          .from('clients')
          .delete()
          .eq('id', tempClientId);
      } catch {
        // Ignore cleanup errors
      }
    }

    return entityResults;
  };

  // Run all tests
  const runAllTests = useCallback(async () => {
    setIsRunning(true);
    setResults([]);
    
    const ctx = await fetchUserContext();
    if (!ctx) {
      toast({
        title: 'Error',
        description: 'Could not fetch user context. Please ensure you are logged in.',
        variant: 'destructive'
      });
      setIsRunning(false);
      return;
    }
    setTenantId(ctx.tenantId);

    const allResults: TestResult[] = [];

    for (const config of MASTER_ENTITIES) {
      setCurrentEntity(config.name);
      const entityResults = await runEntityTest(config, ctx.tenantId, ctx.userId);
      allResults.push(...entityResults);
      setResults([...allResults]);
    }

    setCurrentEntity(null);
    setIsRunning(false);
    
    const passCount = allResults.filter(r => r.status === 'pass').length;
    const failCount = allResults.filter(r => r.status === 'fail').length;
    
    toast({
      title: 'QC Tests Complete',
      description: `${passCount} passed, ${failCount} failed out of ${allResults.length} tests`,
      variant: failCount > 0 ? 'destructive' : 'default'
    });
  }, []);

  // Copy error to clipboard
  const copyError = (result: TestResult) => {
    const text = `Entity: ${result.entity}
Operation: ${result.operation}
Error Code: ${result.errorCode || 'N/A'}
Error Message: ${result.errorMessage || 'N/A'}
Error Details: ${result.errorDetails || 'N/A'}`;
    
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied to clipboard' });
  };

  // Summary stats
  const passCount = results.filter(r => r.status === 'pass').length;
  const failCount = results.filter(r => r.status === 'fail').length;
  const skipCount = results.filter(r => r.status === 'skip').length;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Database className="h-6 w-6 text-primary" />
              <div>
                <CardTitle>Masters QC Runner</CardTitle>
                <CardDescription>
                  Comprehensive CRUD test for all master entities
                </CardDescription>
              </div>
            </div>
            <Button 
              onClick={runAllTests} 
              disabled={isRunning}
              size="lg"
            >
              {isRunning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Run All Tests
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Summary */}
          {results.length > 0 && (
            <div className="flex gap-4 mb-6">
              <Badge variant="outline" className="text-green-600 border-green-600">
                <CheckCircle className="h-3 w-3 mr-1" />
                {passCount} Passed
              </Badge>
              <Badge variant="outline" className="text-red-600 border-red-600">
                <XCircle className="h-3 w-3 mr-1" />
                {failCount} Failed
              </Badge>
              <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {skipCount} Skipped
              </Badge>
            </div>
          )}

          {/* Current entity indicator */}
          {currentEntity && (
            <div className="flex items-center gap-2 mb-4 p-3 bg-muted rounded-lg">
              <RefreshCw className="h-4 w-4 animate-spin text-primary" />
              <span className="text-sm">Testing: <strong>{currentEntity}</strong></span>
            </div>
          )}

          {/* Results table */}
          <ScrollArea className="h-[500px]">
            <div className="space-y-2">
              {MASTER_ENTITIES.map(entity => {
                const entityResults = results.filter(r => r.entity === entity.name);
                if (entityResults.length === 0 && !isRunning) return null;

                return (
                  <Card key={entity.name} className="border">
                    <CardHeader className="py-3 px-4">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{entity.name}</span>
                        <div className="flex gap-1">
                          {entityResults.map((r, idx) => (
                            <Badge 
                              key={idx}
                              variant={r.status === 'pass' ? 'default' : r.status === 'fail' ? 'destructive' : 'secondary'}
                              className="text-xs"
                            >
                              {r.operation}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </CardHeader>
                    {entityResults.some(r => r.status === 'fail') && (
                      <CardContent className="py-2 px-4 bg-destructive/5">
                        {entityResults.filter(r => r.status === 'fail').map((r, idx) => (
                          <div key={idx} className="flex items-start justify-between text-sm py-2">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <XCircle className="h-4 w-4 text-destructive" />
                                <span className="font-medium capitalize">{r.operation}</span>
                                {r.errorCode && (
                                  <Badge variant="outline" className="text-xs">
                                    {r.errorCode}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-muted-foreground ml-6">
                                {r.errorMessage}
                              </p>
                              {r.errorDetails && (
                                <p className="text-xs text-muted-foreground ml-6">
                                  {r.errorDetails}
                                </p>
                              )}
                            </div>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => copyError(r)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Tenant ID info */}
      {tenantId && (
        <div className="text-xs text-muted-foreground">
          Tenant ID: {tenantId}
        </div>
      )}
    </div>
  );
}
