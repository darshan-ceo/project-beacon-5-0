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
import { useRBAC } from '@/hooks/useRBAC';
import { featureFlagService } from '@/services/featureFlagService';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

export const ClientMasters: React.FC = () => {
  const { state, dispatch } = useAppState();
  const { hasPermission } = useRBAC();
  const { checkDependencies, safeDelete } = useRelationships();
  const [searchTerm, setSearchTerm] = useState('');
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
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);

  const filteredClients = state.clients.filter(client => {
    const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (client.gstin || client.gstNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (client.pan || client.panNumber || '').toLowerCase().includes(searchTerm.toLowerCase());
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
            <Button 
              variant="outline" 
              onClick={() => setIsImportOpen(true)}
              className="flex items-center space-x-2"
            >
              <Upload className="h-4 w-4" />
              <span>Import Excel</span>
            </Button>
          )}
          {featureFlagService.isEnabled('data_io_v1') && hasPermission('io.export.client', 'write') && (
            <Button 
              variant="outline" 
              onClick={() => setIsExportOpen(true)}
              className="flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Export Excel</span>
            </Button>
          )}
          <Button 
            className="bg-primary hover:bg-primary-hover"
            onClick={() => setClientModal({ isOpen: true, mode: 'create', client: null })}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add New Client
          </Button>
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
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Clients</p>
                <p className="text-2xl font-bold text-foreground">847</p>
              </div>
              <Building2 className="h-8 w-8 text-primary" />
            </div>
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
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Portal Access</p>
                <p className="text-2xl font-bold text-foreground">623</p>
              </div>
              <Eye className="h-8 w-8 text-success" />
            </div>
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
        
        <div className="flex gap-2">
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
          
          <Button 
            variant="outline"
            onClick={async () => {
              try {
                await reportsService.exportCaseList(
                  filteredClients.map(client => ({
                    id: client.id,
                    caseNumber: client.id,
                    title: client.name,
                    clientId: client.id,
                    currentStage: 'Active',
                    slaStatus: client.status === 'Active' ? 'Green' : 'Red'
                  })),
                  'excel'
                );
              } catch (error) {
                toast({
                  title: "Export Failed",
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
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client Details</TableHead>
                  <TableHead>Tax Information</TableHead>
                  <TableHead>Jurisdiction</TableHead>
                  <TableHead>Contact</TableHead>
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
                      <div className="space-y-1">
                        <p className="font-medium text-foreground">{client.name}</p>
                        <p className="text-sm text-muted-foreground">{client.type}</p>
                        <div className="flex items-center gap-1">
                          <Badge variant="secondary" className="text-xs">
                            {client.type}
                          </Badge>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="text-sm font-mono">{client.gstin || client.gstNumber || 'N/A'}</p>
                        <p className="text-sm font-mono text-muted-foreground">{client.pan || client.panNumber || 'N/A'}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <MapPin className="mr-1 h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{client.assignedCAName}</span>
                      </div>
                    </TableCell>
                     <TableCell>
                       <div className="space-y-1">
                         <div className="flex items-center text-sm">
                           <Mail className="mr-1 h-3 w-3 text-muted-foreground" />
                           {getPrimaryContact(client).email}
                         </div>
                         <div className="flex items-center text-sm text-muted-foreground">
                           <Phone className="mr-1 h-3 w-3" />
                           {getPrimaryContact(client).phone}
                         </div>
                       </div>
                     </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={getStatusColor(client.status)}>
                        {client.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-center">
                        <p className="font-medium">{client.activeCases}</p>
                        <p className="text-xs text-muted-foreground">{client.registrationDate}</p>
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
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
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
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Client
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
                            <Plus className="mr-2 h-4 w-4" />
                            New Case
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