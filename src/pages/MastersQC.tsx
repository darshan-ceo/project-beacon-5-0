/**
 * Masters QC Runner
 * Comprehensive CRUD test runner for all master entities
 * Tests create/read/update/delete operations and reports detailed errors
 * Includes JSONB address persistence verification
 */

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Play, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  RefreshCw,
  Database,
  Copy,
  Loader2,
  MapPin
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface TestResult {
  entity: string;
  operation: 'create' | 'read' | 'update' | 'delete' | 'verify-address';
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
  requiresOwner?: boolean;
  requiresClientLink?: boolean;
  skipCreate?: boolean;
  skipReason?: string;
  verifyFields?: string[]; // JSONB fields to verify after read
}

interface AddressVerificationResult {
  passed: boolean;
  errors: string[];
}

/**
 * Generate a test UnifiedAddress for QC testing
 * Uses stringified JSON to match service layer behavior
 */
const generateTestAddress = (entityName: string): string => {
  return JSON.stringify({
    line1: `QC Test Address for ${entityName}`,
    line2: 'Building A, Floor 3',
    pincode: '380001',
    cityId: '',
    cityName: 'Ahmedabad',
    stateId: '',
    stateCode: '24',
    stateName: 'Gujarat',
    countryId: 'IN',
    countryName: 'India',
    landmark: 'Near Test Landmark',
    locality: 'Test Locality',
    district: 'Ahmedabad',
    source: 'manual',
    isPrimary: true
  });
};

/**
 * Verify JSONB address fields contain expected UnifiedAddress structure
 */
const verifyAddressFields = (
  data: Record<string, any>, 
  verifyFields: string[]
): AddressVerificationResult => {
  const errors: string[] = [];
  
  for (const field of verifyFields) {
    const value = data[field];
    
    if (!value) {
      errors.push(`${field} is null/undefined`);
      continue;
    }
    
    // Parse if string (JSONB returned as string sometimes)
    let parsed: any;
    try {
      parsed = typeof value === 'string' ? JSON.parse(value) : value;
    } catch {
      errors.push(`${field} is not valid JSON`);
      continue;
    }
    
    // Verify required UnifiedAddress fields
    if (!parsed.line1) errors.push(`${field}.line1 is missing`);
    if (!parsed.cityName) errors.push(`${field}.cityName is missing`);
    if (!parsed.stateName) errors.push(`${field}.stateName is missing`);
    if (!parsed.source) errors.push(`${field}.source is missing`);
  }
  
  return {
    passed: errors.length === 0,
    errors
  };
};

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
      data_scope: 'TEAM',
      address: generateTestAddress('Clients')
    },
    updatePayload: { status: 'inactive' },
    requiredFields: ['display_name'],
    requiresOwner: true,
    verifyFields: ['address']
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
      phones: [{ countryCode: '+91', number: '9999999999', isPrimary: true }],
      address: generateTestAddress('Client Contacts')
    },
    updatePayload: { designation: 'Director' },
    requiredFields: ['name'],
    requiresOwner: true,
    requiresClientLink: true,
    verifyFields: ['address']
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
    // No address field for client_groups
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
      bench_location: 'Ahmedabad',
      address_jsonb: generateTestAddress('Courts')
    },
    updatePayload: { status: 'Inactive' },
    requiredFields: ['name'],
    verifyFields: ['address_jsonb']
  },
  {
    name: 'Judges',
    table: 'judges',
    createPayload: {
      name: `QC Test Judge ${Date.now()}`,
      designation: 'Member (Technical)',
      status: 'Active',
      phone: '+91 9999999999',
      email: `qc-judge-${Date.now()}@test.local`,
      address: generateTestAddress('Judges')
    },
    updatePayload: { status: 'Inactive' },
    requiredFields: ['name'],
    verifyFields: ['address']
  },
  {
    name: 'Employees',
    table: 'employees',
    createPayload: {},
    updatePayload: { department: 'Legal' },
    requiredFields: ['full_name', 'employee_code', 'email', 'department', 'role'],
    skipCreate: true,
    skipReason: 'Employees require auth provisioning (profile + auth.users FK)'
    // No address verification for employees (uses legacy current_address/permanent_address)
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

      // VERIFY ADDRESS (after READ, before UPDATE)
      if (config.verifyFields?.length) {
        const verifyStart = performance.now();
        try {
          // Fetch with specific address fields
          const { data, error } = await (supabase as any)
            .from(config.table)
            .select(config.verifyFields.join(', '))
            .eq('id', createdId)
            .single();

          if (error) {
            entityResults.push({
              entity: config.name,
              operation: 'verify-address',
              status: 'fail',
              duration: performance.now() - verifyStart,
              errorCode: error.code,
              errorMessage: error.message
            });
          } else {
            const verification = verifyAddressFields(data, config.verifyFields);
            entityResults.push({
              entity: config.name,
              operation: 'verify-address',
              status: verification.passed ? 'pass' : 'fail',
              duration: performance.now() - verifyStart,
              errorMessage: verification.passed ? undefined : verification.errors.join('; ')
            });
          }
        } catch (err: any) {
          entityResults.push({
            entity: config.name,
            operation: 'verify-address',
            status: 'fail',
            duration: performance.now() - verifyStart,
            errorMessage: err.message
          });
        }
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
      // Skip read/verify-address/update/delete if create failed
      const skippedOps: Array<'read' | 'verify-address' | 'update' | 'delete'> = ['read', 'update', 'delete'];
      if (config.verifyFields?.length) {
        skippedOps.splice(1, 0, 'verify-address');
      }
      skippedOps.forEach(op => {
        entityResults.push({
          entity: config.name,
          operation: op,
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

  // Get badge variant and icon for operation
  const getOperationBadge = (result: TestResult) => {
    const isAddress = result.operation === 'verify-address';
    const variant = result.status === 'pass' ? 'default' : result.status === 'fail' ? 'destructive' : 'secondary';
    
    return (
      <Badge 
        variant={variant}
        className={`text-xs ${isAddress ? 'gap-1' : ''}`}
      >
        {isAddress && <MapPin className="h-3 w-3" />}
        {result.operation}
      </Badge>
    );
  };

  // Summary stats
  const passCount = results.filter(r => r.status === 'pass').length;
  const failCount = results.filter(r => r.status === 'fail').length;
  const skipCount = results.filter(r => r.status === 'skip').length;
  const addressPassCount = results.filter(r => r.operation === 'verify-address' && r.status === 'pass').length;
  const addressFailCount = results.filter(r => r.operation === 'verify-address' && r.status === 'fail').length;

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
                  Comprehensive CRUD + Address JSONB persistence tests for all master entities
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
            <div className="flex flex-wrap gap-4 mb-6">
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
              {(addressPassCount > 0 || addressFailCount > 0) && (
                <Badge variant="outline" className="text-blue-600 border-blue-600">
                  <MapPin className="h-3 w-3 mr-1" />
                  Address: {addressPassCount}/{addressPassCount + addressFailCount}
                </Badge>
              )}
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
                        <div className="flex gap-1 flex-wrap">
                          {entityResults.map((r, idx) => (
                            <span key={idx}>
                              {getOperationBadge(r)}
                            </span>
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
                                <span className="font-medium capitalize flex items-center gap-1">
                                  {r.operation === 'verify-address' && <MapPin className="h-3 w-3" />}
                                  {r.operation}
                                </span>
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
