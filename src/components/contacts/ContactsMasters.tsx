import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  UserCircle, 
  Plus, 
  Mail, 
  Phone, 
  Building2,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Users,
  Filter,
  Target,
  X
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { clientContactsService, ClientContact } from '@/services/clientContactsService';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { UnifiedContactSearch, ContactFilters } from './UnifiedContactSearch';
import { ContactModal } from '@/components/modals/ContactModal';
import { MarkAsLeadModal } from '@/components/crm/MarkAsLeadModal';
import { leadService } from '@/services/leadService';
import { LEAD_STATUS_CONFIG, LeadStatus } from '@/types/lead';

interface ContactWithClient extends ClientContact {
  clientName?: string;
  lead_status?: string | null;
  lead_source?: string | null;
}

export const ContactsMasters: React.FC = () => {
  const [contacts, setContacts] = useState<ContactWithClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilters, setActiveFilters] = useState<ContactFilters>({});
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  
  // Modal state
  const [contactModal, setContactModal] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit' | 'view';
    contactId?: string;
  }>({ isOpen: false, mode: 'create' });

  // Mark as Lead modal state
  const [markAsLeadModal, setMarkAsLeadModal] = useState<{
    isOpen: boolean;
    contactId: string;
    contactName: string;
  }>({ isOpen: false, contactId: '', contactName: '' });

  // Delete dialog state
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    contactId?: string;
    contactName?: string;
  }>({ isOpen: false });

  useEffect(() => {
    loadContacts();
    loadClients();
  }, []);

  const loadContacts = async () => {
    setLoading(true);
    try {
      const result = await clientContactsService.getAllContacts();
      if (result.success && result.data) {
        setContacts(result.data);
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to load contacts',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Error loading contacts:', error);
      toast({
        title: 'Error',
        description: 'Failed to load contacts',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadClients = async () => {
    const { data } = await supabase
      .from('clients')
      .select('id, display_name')
      .eq('status', 'active')
      .order('display_name');
    
    if (data) {
      setClients(data.map(c => ({ id: c.id, name: c.display_name })));
    }
  };

  const getPrimaryEmail = (contact: ClientContact): string => {
    const primary = contact.emails?.find(e => e.isPrimary);
    return primary?.email || contact.emails?.[0]?.email || '-';
  };

  const getPrimaryPhone = (contact: ClientContact): string => {
    const primary = contact.phones?.find(p => p.isPrimary);
    if (primary && primary.number) {
      return `${primary.countryCode || ''} ${primary.number}`.trim();
    }
    const first = contact.phones?.[0];
    if (first && first.number) {
      return `${first.countryCode || ''} ${first.number}`.trim();
    }
    return contact.phone || '-';
  };

  const getDataScopeBadgeVariant = (scope: string) => {
    switch (scope) {
      case 'ALL': return 'default';
      case 'TEAM': return 'secondary';
      case 'OWN': return 'outline';
      default: return 'secondary';
    }
  };

  // Stats computed from data
  const stats = useMemo(() => {
    const leads = contacts.filter(c => c.lead_status);
    return {
      total: contacts.length,
      clientLinked: contacts.filter(c => c.clientId).length,
      standalone: contacts.filter(c => !c.clientId).length,
      active: contacts.filter(c => c.isActive).length,
      totalLeads: leads.length,
    };
  }, [contacts]);

  // Filtered contacts
  const filteredContacts = useMemo(() => {
    return contacts.filter(contact => {
      // Search filter
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || 
        contact.name.toLowerCase().includes(searchLower) ||
        contact.designation?.toLowerCase().includes(searchLower) ||
        getPrimaryEmail(contact).toLowerCase().includes(searchLower) ||
        contact.clientName?.toLowerCase().includes(searchLower);

      // Data scope filter
      const matchesDataScope = !activeFilters.dataScope || 
        contact.dataScope === activeFilters.dataScope;

      // Status filter
      const matchesStatus = !activeFilters.status ||
        (activeFilters.status === 'active' && contact.isActive) ||
        (activeFilters.status === 'inactive' && !contact.isActive);

      // Client filter
      const matchesClient = !activeFilters.client ||
        contact.clientId === activeFilters.client;

      // Role filter
      const matchesRole = !activeFilters.role ||
        contact.roles.includes(activeFilters.role as any);

      // Type filter (client-linked vs standalone)
      const matchesType = !activeFilters.type ||
        (activeFilters.type === 'client-linked' && contact.clientId) ||
        (activeFilters.type === 'standalone' && !contact.clientId);

      // Lead status filter
      const matchesLeadStatus = !activeFilters.leadStatus ||
        contact.lead_status === activeFilters.leadStatus;

      // Lead source filter
      const matchesLeadSource = !activeFilters.leadSource ||
        contact.lead_source === activeFilters.leadSource;

      return matchesSearch && matchesDataScope && matchesStatus && matchesClient && matchesRole && matchesType && matchesLeadStatus && matchesLeadSource;
    });
  }, [contacts, searchTerm, activeFilters]);

  const handleRemoveLeadStatus = async (contactId: string, contactName: string) => {
    try {
      const result = await leadService.unmarkAsLead(contactId);
      if (result.success) {
        toast({
          title: 'Lead Status Removed',
          description: `${contactName} is no longer a lead`,
        });
        loadContacts();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to remove lead status',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to remove lead status',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.contactId) return;
    
    try {
      const response = await clientContactsService.deleteContact(deleteDialog.contactId);
      if (response.success) {
        toast({
          title: 'Contact Deleted',
          description: `${deleteDialog.contactName} has been removed`,
        });
        loadContacts();
      } else {
        toast({
          title: 'Error',
          description: response.error || 'Failed to delete contact',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete contact',
        variant: 'destructive',
      });
    } finally {
      setDeleteDialog({ isOpen: false });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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
            <h1 className="text-3xl font-bold text-foreground">Contact Directory</h1>
            <p className="text-muted-foreground mt-2">
              Manage all contacts across clients and standalone contacts
            </p>
          </div>
        </div>
        <Button 
          className="bg-primary hover:bg-primary/90"
          onClick={() => setContactModal({ isOpen: true, mode: 'create' })}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add New Contact
        </Button>
      </motion.div>

      {/* Stats Cards */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-5 gap-6"
      >
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Contacts</p>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              </div>
              <UserCircle className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Leads</p>
                <p className="text-2xl font-bold text-foreground">{stats.totalLeads}</p>
              </div>
              <Target className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Client-Linked</p>
                <p className="text-2xl font-bold text-foreground">{stats.clientLinked}</p>
              </div>
              <Building2 className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Standalone</p>
                <p className="text-2xl font-bold text-foreground">{stats.standalone}</p>
              </div>
              <Users className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-foreground">{stats.active}</p>
              </div>
              <Filter className="h-8 w-8 text-orange-500" />
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
        <UnifiedContactSearch
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          activeFilters={activeFilters}
          onFiltersChange={setActiveFilters}
          clients={clients}
        />
      </motion.div>

      {/* Contacts Table */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>All Contacts</CardTitle>
            <CardDescription>
              {filteredContacts.length} of {contacts.length} contacts shown
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredContacts.length === 0 ? (
              <div className="text-center py-12">
                <UserCircle className="h-12 w-12 mx-auto text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-medium">No contacts found</h3>
                <p className="text-sm text-muted-foreground">
                  {searchTerm || Object.keys(activeFilters).length > 0
                    ? 'Try adjusting your filters'
                    : 'Contacts will appear here once added'}
                </p>
                {!searchTerm && Object.keys(activeFilters).length === 0 && (
                  <Button 
                    className="mt-4"
                    onClick={() => setContactModal({ isOpen: true, mode: 'create' })}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Your First Contact
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">Name</TableHead>
                      <TableHead className="w-[200px]">Contact Details</TableHead>
                      <TableHead className="w-[150px]">Client</TableHead>
                      <TableHead className="w-[150px]">Roles</TableHead>
                      <TableHead className="w-[100px]">Lead Status</TableHead>
                      <TableHead className="w-[100px]">Data Scope</TableHead>
                      <TableHead className="w-[80px]">Status</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredContacts.map((contact, index) => (
                      <motion.tr
                        key={contact.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.03 }}
                        className="hover:bg-muted/50 cursor-pointer"
                        onClick={() => setContactModal({ 
                          isOpen: true, 
                          mode: 'edit', 
                          contactId: contact.id 
                        })}
                      >
                        {/* Name */}
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <UserCircle className="h-8 w-8 text-muted-foreground" />
                            <div>
                              <p className="font-medium text-foreground hover:text-primary transition-colors">
                                {contact.name}
                              </p>
                              {contact.designation && (
                                <p className="text-xs text-muted-foreground">
                                  {contact.designation}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        {/* Contact Details */}
                        <TableCell>
                          <div className="space-y-1">
                            <a 
                              href={`mailto:${getPrimaryEmail(contact)}`}
                              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Mail className="h-3 w-3" />
                              <span className="truncate max-w-[150px]">{getPrimaryEmail(contact)}</span>
                            </a>
                            <a 
                              href={`tel:${getPrimaryPhone(contact)}`}
                              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Phone className="h-3 w-3" />
                              {getPrimaryPhone(contact)}
                            </a>
                          </div>
                        </TableCell>

                        {/* Client */}
                        <TableCell>
                          {contact.clientName ? (
                            <Badge variant="outline" className="font-normal gap-1">
                              <Building2 className="h-3 w-3" />
                              <span className="truncate max-w-[100px]">{contact.clientName}</span>
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">Standalone</span>
                          )}
                        </TableCell>

                        {/* Roles */}
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {contact.roles.slice(0, 2).map((role) => (
                              <Badge key={role} variant="secondary" className="text-xs">
                                {role.replace('_', ' ')}
                              </Badge>
                            ))}
                            {contact.roles.length > 2 && (
                              <Badge variant="secondary" className="text-xs">
                                +{contact.roles.length - 2}
                              </Badge>
                            )}
                          </div>
                        </TableCell>

                        {/* Lead Status */}
                        <TableCell>
                          {contact.lead_status ? (
                            <Badge 
                              className={cn(
                                LEAD_STATUS_CONFIG[contact.lead_status as LeadStatus]?.bgColor,
                                LEAD_STATUS_CONFIG[contact.lead_status as LeadStatus]?.color
                              )}
                            >
                              {LEAD_STATUS_CONFIG[contact.lead_status as LeadStatus]?.label || contact.lead_status}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>

                        {/* Data Scope */}
                        <TableCell>
                          <Badge variant={getDataScopeBadgeVariant(contact.dataScope || 'TEAM')}>
                            {contact.dataScope || 'TEAM'}
                          </Badge>
                        </TableCell>

                        {/* Status */}
                        <TableCell>
                          <Badge 
                            variant={contact.isActive ? 'default' : 'secondary'}
                            className={cn(
                              contact.isActive 
                                ? 'bg-success text-success-foreground' 
                                : ''
                            )}
                          >
                            {contact.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>

                        {/* Actions */}
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setContactModal({ 
                                isOpen: true, 
                                mode: 'view', 
                                contactId: contact.id 
                              })}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setContactModal({ 
                                isOpen: true, 
                                mode: 'edit', 
                                contactId: contact.id 
                              })}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => setContactModal({ 
                                    isOpen: true, 
                                    mode: 'view', 
                                    contactId: contact.id 
                                  })}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => setContactModal({ 
                                    isOpen: true, 
                                    mode: 'edit', 
                                    contactId: contact.id 
                                  })}
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit Contact
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {/* Lead Actions - only for standalone contacts */}
                                {!contact.clientId && !contact.lead_status && (
                                  <DropdownMenuItem
                                    onClick={() => setMarkAsLeadModal({
                                      isOpen: true,
                                      contactId: contact.id,
                                      contactName: contact.name
                                    })}
                                  >
                                    <Target className="h-4 w-4 mr-2" />
                                    Create Inquiry
                                  </DropdownMenuItem>
                                )}
                                {contact.lead_status && (
                                  <DropdownMenuItem
                                    onClick={() => handleRemoveLeadStatus(contact.id, contact.name)}
                                  >
                                    <X className="h-4 w-4 mr-2" />
                                    Remove Inquiry Status
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  className="text-destructive"
                                  onClick={() => setDeleteDialog({
                                    isOpen: true,
                                    contactId: contact.id,
                                    contactName: contact.name
                                  })}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Contact Modal */}
      <ContactModal
        isOpen={contactModal.isOpen}
        onClose={() => setContactModal({ isOpen: false, mode: 'create' })}
        mode={contactModal.mode}
        contactId={contactModal.contactId}
        onSuccess={loadContacts}
      />

      {/* Mark as Lead Modal */}
      <MarkAsLeadModal
        isOpen={markAsLeadModal.isOpen}
        onClose={() => setMarkAsLeadModal({ isOpen: false, contactId: '', contactName: '' })}
        contactId={markAsLeadModal.contactId}
        contactName={markAsLeadModal.contactName}
        onSuccess={loadContacts}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.isOpen} onOpenChange={(open) => setDeleteDialog({ isOpen: open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Contact</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteDialog.contactName}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
