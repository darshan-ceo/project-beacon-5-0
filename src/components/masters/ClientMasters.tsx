import React, { useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { reportsService } from '@/services/reportsService';
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

export const ClientMasters: React.FC = () => {
  const { state, dispatch } = useAppState();
  const { hasPermission } = useRBAC();
  const { checkDependencies, safeDelete } = useRelationships();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'Active' | 'Inactive' | 'Pending'>('all');
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
          return (primary.email || '').toLowerCase().includes(searchTerm.toLowerCase());
        }
        return (client.email || '').toLowerCase().includes(searchTerm.toLowerCase());
      })();
      
    const matchesFilter = filterStatus === 'all' || client.status === filterStatus;
    
    return matchesSearch && matchesFilter;
  });

  const getPrimaryContact = (client: Client) => {
    // First, try to get from signatories (new way)
    if (client.signatories && client.signatories.length > 0) {
      const primarySignatory = client.signatories.find(s => s.isPrimary) || client.signatories[0];
      return {
        email: primarySignatory.email || 'N/A',
        phone: primarySignatory.phone || 'N/A'
      };
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
                  <p className="text-2xl font-bold text-foreground">847</p>
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
                <p className="text-2xl font-bold text-foreground">156</p>
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
                  <p className="text-2xl font-bold text-foreground">623</p>
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
                <p className="text-2xl font-bold text-foreground">23</p>
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
          clientGroups={[]}
          states={[]}
          consultants={[]}
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
                    <TableHead className="w-[100px]">Client ID</TableHead>
                    <TableHead className="w-[200px]">Client Name</TableHead>
                    <TableHead className="w-[180px]">GSTN / PAN / State</TableHead>
                    <TableHead className="w-[140px] hidden md:table-cell">Client Group</TableHead>
                    <TableHead className="w-[200px] hidden md:table-cell">Contact</TableHead>
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
                    className="hover:bg-muted/50"
                  >
                    {/* Column 1: Client ID */}
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {client.id || 'N/A'}
                    </TableCell>

                    {/* Column 2: Client Name */}
                    <TableCell>
                      <button
                        onClick={() => setClientModal({ isOpen: true, mode: 'edit', client })}
                        className="text-left hover:underline focus:outline-none"
                      >
                        <p className="font-medium text-foreground hover:text-primary transition-colors">
                          {client.name}
                        </p>
                      </button>
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
                          {(() => {
                            if (typeof client.address === 'object' && client.address !== null) {
                              return client.address.stateName || client.address.state || 'N/A';
                            }
                            return 'N/A';
                          })()}
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
                          if (client.signatories && client.signatories.length > 0) {
                            const primary = client.signatories.find(s => s.isPrimary) || client.signatories[0];
                            return {
                              name: primary.fullName || 'N/A',
                              email: primary.email || 'N/A',
                              mobile: primary.mobile || primary.phone || 'N/A'
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
                        {client.activeCases || client.totalCases || 0}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {client.activeCases ? 'active' : 'total'}
                      </p>
                    </TableCell>
                    <TableCell>
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
          onClose={() => setClientModal({ isOpen: false, mode: 'create', client: null })}
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
        onImportComplete={(job) => {
          console.log('Client import completed:', job);
          // Refresh client data if needed
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