import React, { useState, useEffect } from 'react';
import { 
  UserCircle, 
  Search, 
  Plus, 
  Mail, 
  Phone, 
  Building2,
  Filter,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Users
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { clientContactsService, ClientContact } from '@/services/clientContactsService';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface ContactWithClient extends ClientContact {
  clientName?: string;
}

export const ContactsMasters: React.FC = () => {
  const [contacts, setContacts] = useState<ContactWithClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dataScopeFilter, setDataScopeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadContacts();
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

  const getPrimaryEmail = (contact: ClientContact): string => {
    const primary = contact.emails?.find(e => e.isPrimary);
    return primary?.email || contact.emails?.[0]?.email || '-';
  };

  const getPrimaryPhone = (contact: ClientContact): string => {
    const primary = contact.phones?.find(p => p.isPrimary);
    if (primary) {
      return `${primary.countryCode || ''} ${primary.number}`.trim();
    }
    const first = contact.phones?.[0];
    return first ? `${first.countryCode || ''} ${first.number}`.trim() : '-';
  };

  const getDataScopeBadgeVariant = (scope: string) => {
    switch (scope) {
      case 'ALL': return 'default';
      case 'TEAM': return 'secondary';
      case 'OWN': return 'outline';
      default: return 'secondary';
    }
  };

  const filteredContacts = contacts.filter(contact => {
    // Search filter
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery || 
      contact.name.toLowerCase().includes(searchLower) ||
      contact.designation?.toLowerCase().includes(searchLower) ||
      getPrimaryEmail(contact).toLowerCase().includes(searchLower) ||
      contact.clientName?.toLowerCase().includes(searchLower);

    // Data scope filter
    const matchesDataScope = dataScopeFilter === 'all' || 
      contact.dataScope === dataScopeFilter;

    // Status filter
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'active' && contact.isActive) ||
      (statusFilter === 'inactive' && !contact.isActive);

    return matchesSearch && matchesDataScope && matchesStatus;
  });

  if (loading) {
    return (
      <div className="space-y-6 p-6">
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
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Contact Directory</h1>
            <p className="text-sm text-muted-foreground">
              Manage all contacts across clients
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, designation, or client..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={dataScopeFilter} onValueChange={setDataScopeFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Data Scope" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Scopes</SelectItem>
                <SelectItem value="OWN">Own</SelectItem>
                <SelectItem value="TEAM">Team</SelectItem>
                <SelectItem value="ALL">All</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-2">
              <UserCircle className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{contacts.length}</p>
                <p className="text-xs text-muted-foreground">Total Contacts</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">
                  {contacts.filter(c => c.clientId).length}
                </p>
                <p className="text-xs text-muted-foreground">Client-Linked</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">
                  {contacts.filter(c => !c.clientId).length}
                </p>
                <p className="text-xs text-muted-foreground">Standalone</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{filteredContacts.length}</p>
                <p className="text-xs text-muted-foreground">Filtered Results</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contacts Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">All Contacts</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredContacts.length === 0 ? (
            <div className="text-center py-12">
              <UserCircle className="h-12 w-12 mx-auto text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-medium">No contacts found</h3>
              <p className="text-sm text-muted-foreground">
                {searchQuery || dataScopeFilter !== 'all' || statusFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Contacts will appear here once added'}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead>Data Scope</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContacts.map((contact) => (
                    <TableRow key={contact.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <UserCircle className="h-8 w-8 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{contact.name}</p>
                            {contact.designation && (
                              <p className="text-xs text-muted-foreground">
                                {contact.designation}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          {getPrimaryEmail(contact)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          {getPrimaryPhone(contact)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {contact.clientName ? (
                          <Badge variant="outline" className="font-normal">
                            <Building2 className="h-3 w-3 mr-1" />
                            {contact.clientName}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">Standalone</span>
                        )}
                      </TableCell>
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
                      <TableCell>
                        <Badge variant={getDataScopeBadgeVariant(contact.dataScope || 'TEAM')}>
                          {contact.dataScope || 'TEAM'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={contact.isActive ? 'default' : 'secondary'}
                          className={cn(
                            contact.isActive 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                              : ''
                          )}
                        >
                          {contact.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
