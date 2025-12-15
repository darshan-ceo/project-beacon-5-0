import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { reportsService } from '@/services/reportsService';
import { addressLookupService } from '@/services/addressLookupService';
import { addressMasterService, EnhancedAddressData } from '@/services/addressMasterService';
import { motion } from 'framer-motion';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Upload,
  Eye,
  Edit,
  Trash2,
  Building2,
  MapPin,
  Phone,
  Mail,
  FileText,
  HelpCircle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UnifiedClientSearch } from '@/components/masters/UnifiedClientSearch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ClientModal } from '@/components/modals/ClientModal';
import { CaseModal } from '@/components/modals/CaseModal';
import { ImportWizard } from '@/components/importExport/ImportWizard';
import { ExportWizard } from '@/components/importExport/ExportWizard';
import { Client, useAppState } from '@/contexts/AppStateContext';
import { InlineHelp } from '@/components/help/InlineHelp';
import { useRelationships } from '@/hooks/useRelationships';
import { useRBAC } from '@/hooks/useAdvancedRBAC';
import { featureFlagService } from '@/services/featureFlagService';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { HelpButton } from '@/components/ui/help-button';
import { ThreeLayerHelp } from '@/components/ui/three-layer-help';
import { useImportRefresh } from '@/hooks/useImportRefresh';

export const ClientMasters: React.FC = () => {
  const { state, dispatch } = useAppState();
  const { hasPermission } = useRBAC();
  const { checkDependencies, safeDelete } = useRelationships();
  const { reloadClients } = useImportRefresh();
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'Active' | 'Inactive' | 'Pending'>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [clientModal, setClientModal] = useState<{ isOpen: boolean; mode: 'create' | 'edit' | 'view'; client?: Client | null }>({
    isOpen: false,
    mode: 'create',
    client: null
  });
  const [caseModal, setCaseModal] = useState<{ isOpen: boolean; contextClientId?: string }>({
    isOpen: false,
    contextClientId: undefined
  });
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [statesMap, setStatesMap] = useState<Record<string, string>>({});
  const [entityAddresses, setEntityAddresses] = useState<Record<string, EnhancedAddressData | null>>({});

  // Load state ID -> name mapping once on mount
  useEffect(() => {
    const loadStates = async () => {
      const statesList = await addressLookupService.getStates('IN');
      const map = Object.fromEntries(statesList.map(s => [s.id, s.name]));
      setStatesMap(map);
    };
    loadStates();
  }, []);

  // Read type parameter from URL
  useEffect(() => {
    const typeParam = searchParams.get('type');
    if (typeParam) {
      setFilterType(typeParam);
    } else {
      setFilterType('all');
    }
  }, [searchParams]);

  const filteredClients = state.clients.filter(client => {
    const matchesSearch = 
      // Client ID
      (client.id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      // Client Name
      (client.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      // GSTN
      (client.gstin || client.gstNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      // PAN
      (client.pan || client.panNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      // Contact Name
      (() => {
        if (client.signatories && client.signatories.length > 0) {
          const primary = client.signatories.find(s => s.isPrimary) || client.signatories[0];
          return (primary.fullName || '').toLowerCase().includes(searchTerm.toLowerCase());
        }
        return false;
      })() ||
      // Contact Email
      (() => {
        if (client.signatories && client.signatories.length > 0) {
          const primary = client.signatories.find(s => s.isPrimary) || client.signatories[0];
          const primaryEmailObj =
            primary.emails?.find(e => e.isPrimary) ||
            primary.emails?.[0];
          const emailToSearch =
            primaryEmailObj?.email ||
            primary.email ||
            client.email ||
            '';
          return emailToSearch.toLowerCase().includes(searchTerm.toLowerCase());
        }
        return (client.email || '').toLowerCase().includes(searchTerm.toLowerCase());
      })();
      
    const matchesFilter = filterStatus === 'all' || client.status === filterStatus;
    const matchesType = filterType === 'all' || 
      (filterType === 'Other' 
        ? (!client.type || client.type === 'Other')
        : client.type === filterType);
    
    return matchesSearch && matchesFilter && matchesType;
  });

  // Compute case counts for each client
  const clientCaseCounts = useMemo(() => {
    const counts: Record<string, { active: number; total: number }> = {};
    state.cases.forEach(c => {
      const clientId = c.clientId;
      if (clientId) {
        if (!counts[clientId]) {
          counts[clientId] = { active: 0, total: 0 };
        }
        counts[clientId].total++;
        if (c.status === 'Active') {
          counts[clientId].active++;
        }
      }
    });
    return counts;
  }, [state.cases]);

  // Compute stats from real data
  const stats = useMemo(() => {
    const totalClients = state.clients.length;
    const activeCasesTotal = state.cases.filter(c => 
      c.status === 'Active'
    ).length;
    const portalAccessCount = state.clients.filter(c => 
      c.portalAccess?.allowLogin
    ).length;
    const pendingReview = 0; // Clients don't have "Pending" status - keep at 0
    
    return { totalClients, activeCasesTotal, portalAccessCount, pendingReview };
  }, [state.clients, state.cases]);

  const getPrimaryContact = (client: Client) => {
    // First, try to get from signatories (new way)
    if (client.signatories && client.signatories.length > 0) {
      const primarySignatory = client.signatories.find(s => s.isPrimary) || client.signatories[0];

      const primaryEmailObj =
        primarySignatory.emails?.find(e => e.isPrimary) ||
        primarySignatory.emails?.[0];
      const email =
        primaryEmailObj?.email ||
        primarySignatory.email ||
        client.email ||
        'N/A';

      const primaryPhoneObj =
        primarySignatory.phones?.find(p => p.isPrimary) ||
        primarySignatory.phones?.[0];
      const phone =
        (primaryPhoneObj ? `${primaryPhoneObj.countryCode} ${primaryPhoneObj.number}` : undefined) ||
        primarySignatory.mobile ||
        primarySignatory.phone ||
        client.phone ||
        'N/A';

      return { email, phone };
    }
    
    // Fallback to legacy fields (old way)
    return {
      email: client.email || 'N/A',
      phone: client.phone || 'N/A'
    };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-success text-success-foreground';
      case 'Inactive': return 'bg-muted text-muted-foreground';
      case 'Pending': return 'bg-warning text-warning-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  // Preload linked addresses for visible clients
  useEffect(() => {
    let cancelled = false;
    
    const loadEntityAddresses = async () => {
      const clientIds = filteredClients.map(c => c.id);
      const missingIds = clientIds.filter(id => !(id in entityAddresses));
      
      if (missingIds.length === 0) return;
      
      const results = await Promise.all(
        missingIds.map(id => addressMasterService.getEntityAddress('client', id))
      );
      
      if (cancelled) return;
      
      const patch: Record<string, EnhancedAddressData | null> = {};
      missingIds.forEach((id, i) => {
        patch[id] = results[i].success ? results[i].data : null;
      });
      
      setEntityAddresses(prev => ({ ...prev, ...patch }));
    };
    
    loadEntityAddresses();
    
    return () => {
      cancelled = true;
    };
  }, [filteredClients, state.clients.length]);

  // Compute unique client groups for filters
  const uniqueClientGroups = useMemo(() => {
    return state.clientGroups
      .filter(g => g.status === 'Active')
      .map(g => g.name)
      .sort();
  }, [state.clientGroups]);

  // Compute unique consultants from employees
  const uniqueConsultants = useMemo(() => {
    return state.employees
      .filter(e => e.status === 'Active')
      .map(e => e.full_name)
      .sort();
  }, [state.employees]);

  // Helper to resolve state label from various address formats
  const getStateLabel = (client: Client): string => {
    // First, try inline address (for legacy or enhanced inline format)
    let addr: any = (client && typeof client.address === 'object') ? client.address : null;
    
    // If no inline address, try cached entity address (Address Master mode)
    if (!addr) {
      addr = entityAddresses[client.id] || null;
    }
    
    if (addr) {
      // Prefer full state name
      const byName = addr.stateName || addr.state;
      if (byName && byName.trim()) return byName;
      
      // Map stateId to full name using statesMap
      if (addr.stateId && statesMap[addr.stateId]) {
        return statesMap[addr.stateId];
      }
      
      // Last resort from address object: show the code if no name found
      const stateCode = addr.stateId;
      if (stateCode) return stateCode;
    }
    
    // Fallback to top-level state field (for imported clients or legacy data)
    if (client.state && client.state.trim()) {
      return client.state;
    }
    
    return 'N/A';
  };

  // Compute unique states from client addresses
  const uniqueStates = useMemo(() => {
    const stateSet = new Set<string>();
    
    state.clients.forEach(client => {
      const stateLabel = getStateLabel(client);
      if (stateLabel && stateLabel !== 'N/A') {
        stateSet.add(stateLabel);
      }
    });
    
    return Array.from(stateSet).sort();
  }, [state.clients, statesMap, entityAddresses]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex justify-between items-center"
      >
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Client Masters</h1>
            <p className="text-muted-foreground mt-2">
              Manage client information, GSTIN, PAN, and portal access
            </p>
          </div>
          <InlineHelp module="client-master" />
        </div>
        <div className="flex space-x-3">
          {featureFlagService.isEnabled('data_io_v1') && hasPermission('io.import.client', 'write') && (
            <HelpButton 
              helpId="button-import-clients"
              variant="outline" 
              onClick={() => setIsImportOpen(true)}
              className="flex items-center space-x-2"
            >
              <Upload className="h-4 w-4" />
              <span>Import Excel</span>
            </HelpButton>
          )}
          {featureFlagService.isEnabled('data_io_v1') && hasPermission('io.export.client', 'write') && (
            <HelpButton 
              helpId="button-export-clients"
              variant="outline" 
              onClick={() => setIsExportOpen(true)}
              className="flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Export Excel</span>
            </HelpButton>
          )}
          <HelpButton 
            helpId="button-add-client"
            className="bg-primary hover:bg-primary-hover"
            onClick={() => setClientModal({ isOpen: true, mode: 'create', client: null })}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add New Client
          </HelpButton>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-6"
      >
        <Card>
          <CardContent className="p-6">
            <ThreeLayerHelp helpId="card-total-clients" showExplanation={false}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Clients</p>
                  <p className="text-2xl font-bold text-foreground">{stats.totalClients}</p>
                </div>
                <Building2 className="h-8 w-8 text-primary" />
              </div>
            </ThreeLayerHelp>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Cases</p>
                <p className="text-2xl font-bold text-foreground">{stats.activeCasesTotal}</p>
              </div>
              <FileText className="h-8 w-8 text-secondary" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <ThreeLayerHelp helpId="card-portal-access" showExplanation={false}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Portal Access</p>
                  <p className="text-2xl font-bold text-foreground">{stats.portalAccessCount}</p>
                </div>
                <Eye className="h-8 w-8 text-success" />
              </div>
            </ThreeLayerHelp>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Review</p>
                <p className="text-2xl font-bold text-foreground">{stats.pendingReview}</p>
              </div>
              <FileText className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Search and Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <UnifiedClientSearch
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          activeFilters={{
            status: filterStatus !== 'all' ? filterStatus : undefined
          }}
          onFiltersChange={(filters) => {
            setFilterStatus(filters.status || 'all');
          }}
          clientGroups={uniqueClientGroups}
          states={uniqueStates}
          consultants={uniqueConsultants}
          industries={['Manufacturing', 'Services', 'Trading', 'IT/Software', 'Healthcare', 'Real Estate']}
        />
      </motion.div>

      {/* Clients Table */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Client Directory</CardTitle>
            <CardDescription>
              Complete list of registered clients with their details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Client Name</TableHead>
                    <TableHead className="w-[180px]">GSTN / PAN / State</TableHead>
                    <TableHead className="w-[140px] hidden md:table-cell">Client Group</TableHead>
                    <TableHead className="w-[200px] hidden md:table-cell">Contact Details</TableHead>
                    <TableHead className="w-[140px] hidden lg:table-cell">Constitution</TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                    <TableHead className="w-[80px]">Cases</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
              <TableBody>
                 {filteredClients.map((client, index) => (
                   <motion.tr
                    key={client.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="hover:bg-muted/50 cursor-pointer"
                    onClick={() => setClientModal({ isOpen: true, mode: 'view', client })}
                  >
                    {/* Column 1: Client Name */}
                    <TableCell>
                      <p className="font-medium text-foreground hover:text-primary transition-colors">
                        {client.name}
                      </p>
                    </TableCell>

                    {/* Column 3: GSTN / PAN / State */}
                    <TableCell>
                      <div className="space-y-1">
                        <p className="text-sm font-mono">
                          {client.gstin || client.gstNumber || 'N/A'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {client.pan || client.panNumber || 'N/A'}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {getStateLabel(client)}
                        </p>
                      </div>
                    </TableCell>

                    {/* Column 4: Client Group */}
                    <TableCell className="hidden md:table-cell">
                      {client.clientGroupId ? (
                        <Badge variant="outline" className="gap-1">
                          <Building2 className="h-3 w-3" />
                          {state.clientGroups.find(g => g.id === client.clientGroupId)?.name || 'Unknown'}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">–</span>
                      )}
                    </TableCell>

                    {/* Column 5: Contact */}
                    <TableCell className="hidden md:table-cell">
                      {(() => {
                        const primaryContact = (() => {
                          // Parse signatories if it's a JSON string (legacy data)
                          let signatories = client.signatories;
                          if (typeof signatories === 'string') {
                            try {
                              signatories = JSON.parse(signatories);
                            } catch {
                              signatories = null;
                            }
                          }
                          
                          if (signatories && Array.isArray(signatories) && signatories.length > 0) {
                            const primary = signatories.find(s => s.isPrimary) || signatories[0];
                            
                            // Get primary email (new multi-email support)
                            const primaryEmail = (() => {
                              if (primary.emails && primary.emails.length > 0) {
                                const pEmail = primary.emails.find(e => e.isPrimary) || primary.emails[0];
                                return pEmail.email;
                              }
                              // Fallback to legacy field
                              return primary.email || 'N/A';
                            })();
                            
                            // Get primary phone (new multi-phone support)
                            const primaryPhone = (() => {
                              if (primary.phones && primary.phones.length > 0) {
                                const pPhone = primary.phones.find(p => p.isPrimary) || primary.phones[0];
                                return `${pPhone.countryCode} ${pPhone.number}`;
                              }
                              // Fallback to legacy fields
                              return primary.mobile || primary.phone || 'N/A';
                            })();
                            
                            return {
                              name: primary.fullName || 'N/A',
                              email: primaryEmail,
                              mobile: primaryPhone
                            };
                          }
                          return {
                            name: 'N/A',
                            email: client.email || 'N/A',
                            mobile: client.phone || 'N/A'
                          };
                        })();

                        return (
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-foreground">
                              {primaryContact.name}
                            </p>
                            <div className="flex items-center gap-3 text-xs">
                              {primaryContact.email !== 'N/A' && (
                                <a 
                                  href={`mailto:${primaryContact.email}`}
                                  className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Mail className="h-3 w-3" />
                                  <span className="truncate max-w-[120px]" title={primaryContact.email}>
                                    {primaryContact.email}
                                  </span>
                                </a>
                              )}
                              {primaryContact.mobile !== 'N/A' && (
                                <a 
                                  href={`tel:${primaryContact.mobile}`}
                                  className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Phone className="h-3 w-3" />
                                  <span>{primaryContact.mobile}</span>
                                </a>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </TableCell>

                    {/* Column 6: Constitution */}
                    <TableCell className="hidden lg:table-cell">
                      <Badge variant="outline" className="text-xs whitespace-nowrap">
                        {client.type || 'N/A'}
                      </Badge>
                    </TableCell>

                    {/* Column 7: Status */}
                    <TableCell>
                      <Badge variant="secondary" className={getStatusColor(client.status)}>
                        {client.status}
                      </Badge>
                    </TableCell>

                    {/* Column 8: Cases */}
                    <TableCell className="text-center">
                      <p className="text-lg font-bold text-foreground">
                        {clientCaseCounts[client.id]?.active || 0}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        of {clientCaseCounts[client.id]?.total || 0} total
                      </p>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            •••
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem
                            onClick={() => {
                              try {
                                setClientModal({ isOpen: true, mode: 'view', client });
                              } catch (error) {
                                console.error('Error opening client view:', error);
                                toast({
                                  title: "Error",
                                  description: "Failed to open client details",
                                  variant: "destructive"
                                });
                              }
                            }}
                          >
                            <ThreeLayerHelp helpId="menu-view-client" showExplanation={false}>
                              <div className="flex items-center">
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </div>
                            </ThreeLayerHelp>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              try {
                                setClientModal({ isOpen: true, mode: 'edit', client });
                              } catch (error) {
                                console.error('Error opening client edit:', error);
                                toast({
                                  title: "Error",
                                  description: "Failed to open client editor",
                                  variant: "destructive"
                                });
                              }
                            }}
                          >
                            <ThreeLayerHelp helpId="menu-edit-client" showExplanation={false}>
                              <div className="flex items-center">
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Client
                              </div>
                            </ThreeLayerHelp>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              try {
                                setCaseModal({ isOpen: true, contextClientId: client.id });
                              } catch (error) {
                                console.error('Error opening case modal:', error);
                                toast({
                                  title: "Error",
                                  description: "Failed to open new case form",
                                  variant: "destructive"
                                });
                              }
                            }}
                          >
                            <ThreeLayerHelp helpId="menu-new-case-client" showExplanation={false}>
                              <div className="flex items-center">
                                <Plus className="mr-2 h-4 w-4" />
                                New Case
                              </div>
                            </ThreeLayerHelp>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => {
                              try {
                                const dependencies = checkDependencies('client', client.id);
                                let confirmMessage = `Are you sure you want to delete ${client.name}? This action cannot be undone.`;
                                
                                if (dependencies.length > 0) {
                                  confirmMessage += `\n\nThis client has ${dependencies.join(', ')}. These will also be deleted.`;
                                }
                                
                                if (confirm(confirmMessage)) {
                                  const success = safeDelete('client', client.id, dependencies.length > 0);
                                  if (success) {
                                    toast({
                                      title: "Client Deleted",
                                      description: `${client.name} has been removed`,
                                      variant: "destructive",
                                    });
                                  }
                                }
                              } catch (error) {
                                console.error('Error deleting client:', error);
                                toast({
                                  title: "Error",
                                  description: "Failed to delete client",
                                  variant: "destructive"
                                });
                              }
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <ErrorBoundary>
        <ClientModal
          isOpen={clientModal.isOpen}
          onClose={async () => {
            // Refresh client data after editing to show updated address
            if (clientModal.mode === 'edit' && clientModal.client) {
              const client = state.clients.find(c => c.id === clientModal.client!.id);
              if (client && featureFlagService.isEnabled('address_master_v1')) {
                const result = await addressMasterService.getEntityAddress('client', clientModal.client.id);
                if (result.success && result.data) {
                  dispatch({
                    type: 'UPDATE_CLIENT',
                    payload: {
                      ...client,
                      address: result.data
                    }
                  });
                }
              }
            }
            setClientModal({ isOpen: false, mode: 'create', client: null });
          }}
          client={clientModal.client}
          mode={clientModal.mode}
        />
      </ErrorBoundary>

      <ErrorBoundary>
        <CaseModal
          isOpen={caseModal.isOpen}
          onClose={() => setCaseModal({ isOpen: false, contextClientId: undefined })}
          mode="create"
          contextClientId={caseModal.contextClientId}
        />
      </ErrorBoundary>

      {/* Import/Export Wizards */}
      <ImportWizard
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        entityType="client"
        onImportComplete={async (job) => {
          console.log('Client import completed:', job);
          if (job.counts.processed > 0) {
            await reloadClients();
            toast({
              title: 'Import Complete',
              description: `${job.counts.processed} clients imported successfully`,
            });
          }
        }}
      />

      <ExportWizard
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        entityType="client"
      />
    </div>
  );
};