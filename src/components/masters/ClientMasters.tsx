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
import { INDIAN_STATES } from '@/services/clientsService';

export const ClientMasters: React.FC = () => {
  const { state, dispatch } = useAppState();
  const { hasPermission } = useRBAC();
  const { checkDependencies, safeDelete } = useRelationships();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');
  const [clientModal, setClientModal] = useState<{ isOpen: boolean; mode: 'create' | 'edit' | 'view'; client?: Client | null }>({
    isOpen: false,
    mode: 'create',
    client: null
  });
  const [caseModal, setCaseModal] = useState<{ isOpen: boolean; contextClientId?: string }>({
    isOpen: false,
    contextClientId: undefined
  });
  const [filterStatus, setFilterStatus] = useState<'all' | 'Active' | 'Inactive' | 'Pending'>('all');
  const [filterClientGroup, setFilterClientGroup] = useState<string>('all');
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);

  const filteredClients = state.clients.filter(client => {
    const matchesSearch = (client.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (client.gstin || client.gstNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (client.pan || client.panNumber || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || client.status === filterStatus;
    const matchesClientGroup = filterClientGroup === 'all' || client.clientGroupId === filterClientGroup;
    
    // Duration filter based on registration date
    let matchesDateRange = true;
    if (filterDateFrom || filterDateTo) {
      const clientDate = client.registrationDate || (client as any).createdAt;
      if (clientDate) {
        const date = new Date(clientDate);
        if (filterDateFrom) {
          const fromDate = new Date(filterDateFrom);
          matchesDateRange = matchesDateRange && date >= fromDate;
        }
        if (filterDateTo) {
          const toDate = new Date(filterDateTo + 'T23:59:59');
          matchesDateRange = matchesDateRange && date <= toDate;
        }
      } else {
        matchesDateRange = false;
      }
    }
    
    return matchesSearch && matchesFilter && matchesDateRange && matchesClientGroup;
  });

  const getClientState = (client: Client): string => {
    // Try to extract state from address
    if (typeof client.address === 'object' && client.address !== null) {
      if ('state' in client.address && client.address.state) {
        return client.address.state;
      }
      if ('stateId' in client.address && client.address.stateId) {
        const stateCode = client.address.stateId;
        const stateName = INDIAN_STATES.find(s => s.startsWith(stateCode))?.split(' - ')[1];
        return stateName || stateCode;
      }
    }
    
    // Fallback: Extract from GSTIN (first 2 digits = state code)
    if (client.gstin && client.gstin.length >= 2) {
      const stateCode = client.gstin.substring(0, 2);
      const gstStateMap: Record<string, string> = {
        '01': 'J&K', '02': 'HP', '03': 'Punjab', '04': 'Chandigarh',
        '05': 'Uttarakhand', '06': 'Haryana', '07': 'Delhi', '08': 'Rajasthan',
        '09': 'UP', '10': 'Bihar', '11': 'Sikkim', '12': 'Arunachal',
        '13': 'Nagaland', '14': 'Manipur', '15': 'Mizoram', '16': 'Tripura',
        '17': 'Meghalaya', '18': 'Assam', '19': 'WB', '20': 'Jharkhand',
        '21': 'Odisha', '22': 'Chhattisgarh', '23': 'MP', '24': 'Gujarat',
        '27': 'Maharashtra', '29': 'Karnataka', '32': 'Kerala', '33': 'TN',
        '34': 'Puducherry', '35': 'A&N', '36': 'Telangana', '37': 'AP'
      };
      return gstStateMap[stateCode] || 'Unknown';
    }
    
    return 'N/A';
  };

  const getAllContactInfo = (client: Client): { emails: string[]; phones: string[] } => {
    const emails: string[] = [];
    const phones: string[] = [];
    
    // Collect from signatories (new system)
    if (client.signatories && client.signatories.length > 0) {
      client.signatories.forEach(signatory => {
        if (signatory.email && !emails.includes(signatory.email)) {
          emails.push(signatory.email);
        }
        if (signatory.phone && !phones.includes(signatory.phone)) {
          phones.push(signatory.phone);
        }
      });
    }
    
    // Fallback to legacy fields
    if (emails.length === 0 && client.email) {
      emails.push(client.email);
    }
    if (phones.length === 0 && client.phone) {
      phones.push(client.phone);
    }
    
    // If still empty, show N/A
    if (emails.length === 0) emails.push('N/A');
    if (phones.length === 0) phones.push('N/A');
    
    // Limit display to first 2 of each
    return {
      emails: emails.slice(0, 2),
      phones: phones.slice(0, 2)
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

      {/* Search and Filters */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="flex flex-col sm:flex-row gap-4 items-center justify-between"
      >
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, GSTIN, or PAN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex gap-2 flex-wrap">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Filter className="mr-2 h-4 w-4" />
                Filter Status
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setFilterStatus('all')}>
                All Status
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setFilterStatus('Active')}>
                Active
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterStatus('Inactive')}>
                Inactive
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterStatus('Pending')}>
                Pending
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Filter className="mr-2 h-4 w-4" />
                Client Group
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setFilterClientGroup('all')}>
                All Groups
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {state.clientGroups.map(group => (
                <DropdownMenuItem key={group.id} onClick={() => setFilterClientGroup(group.id)}>
                  {group.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          
          <div className="flex gap-2 items-center">
            <Input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              placeholder="From Date"
              className="w-40"
              title="Filter by registration date (From)"
            />
            <span className="text-muted-foreground text-sm">to</span>
            <Input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              placeholder="To Date"
              className="w-40"
              title="Filter by registration date (To)"
            />
            {(filterDateFrom || filterDateTo) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilterDateFrom('');
                  setFilterDateTo('');
                }}
                title="Clear date filter"
              >
                Clear
              </Button>
            )}
          </div>
          
          <Button 
            variant="outline"
            onClick={async () => {
              if (filteredClients.length === 0) {
                toast({
                  title: "No data to export",
                  description: "There are no clients matching your current filters.",
                  variant: "destructive"
                });
                return;
              }
              
              toast({
                title: "Exporting data...",
                description: "Preparing your client data export"
              });
              
              try {
                const { exportRows, prepareExportContext } = await import('@/utils/exporter');
                
                await exportRows({
                  moduleKey: 'clients',
                  rows: filteredClients,
                  context: prepareExportContext(state),
                  options: {
                    format: 'xlsx',
                    dateFormat: 'dd-MM-yyyy'
                  }
                });
                
                toast({
                  title: "Export complete!",
                  description: `Exported ${filteredClients.length} clients successfully`
                });
              } catch (error) {
                console.error('Export error:', error);
                toast({
                  title: "Export failed",
                  description: "Failed to export client data",
                  variant: "destructive"
                });
              }
            }}
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
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
          <CardContent className="overflow-x-auto">
            <Table className="min-w-[1200px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Client ID</TableHead>
                  <TableHead>Client Name</TableHead>
                  <TableHead>GSTN/PAN/State</TableHead>
                  <TableHead>Client Group</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Constitution</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Cases</TableHead>
                  <TableHead>Actions</TableHead>
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
                    <TableCell>
                      <span className="text-sm font-mono text-muted-foreground">
                        {client.id.slice(0, 8)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium text-foreground">{client.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Reg: {client.registrationDate || 'N/A'}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="text-sm font-mono">{client.gstin || client.gstNumber || 'N/A'}</p>
                        <p className="text-sm font-mono text-muted-foreground">{client.pan || client.panNumber || 'N/A'}</p>
                        <p className="text-xs text-muted-foreground flex items-center">
                          <MapPin className="h-3 w-3 mr-1" />
                          {getClientState(client)}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {client.clientGroupId ? (
                        <Badge variant="outline" className="text-xs">
                          {state.clientGroups.find(g => g.id === client.clientGroupId)?.name || client.clientGroupId}
                        </Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {getAllContactInfo(client).emails.map((email, idx) => (
                          <div key={idx} className="flex items-center text-xs">
                            <Mail className="mr-1 h-3 w-3 text-muted-foreground" />
                            {email}
                          </div>
                        ))}
                        {getAllContactInfo(client).phones.map((phone, idx) => (
                          <div key={idx} className="flex items-center text-xs text-muted-foreground">
                            <Phone className="mr-1 h-3 w-3" />
                            {phone}
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {client.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={getStatusColor(client.status)}>
                        {client.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-center">
                        <p className="font-medium">{client.activeCases || 0}</p>
                        <p className="text-xs text-muted-foreground">cases</p>
                      </div>
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
            <div className="text-xs text-muted-foreground text-center py-2 md:hidden">
              ← Scroll horizontally to see all columns →
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