import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Users,
  UserPlus,
  Mail,
  Calendar,
  Shield,
  Trash2,
  Edit,
  Send,
  Loader2,
  Search,
  RefreshCw
} from 'lucide-react';
import { getPortalRoleLabel } from '@/utils/portalPermissions';

interface ClientPortalUser {
  id: string;
  user_id: string;
  client_id: string;
  email: string;
  portal_role: string;
  is_active: boolean;
  created_at: string;
  last_login_at: string | null;
  clients: {
    display_name: string;
    email: string | null;
    phone: string | null;
  };
}

interface Client {
  id: string;
  display_name: string;
  email: string | null;
}

export const ClientPortalUserManagement: React.FC = () => {
  const { user } = useAuth();
  const [portalUsers, setPortalUsers] = useState<ClientPortalUser[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ClientPortalUser | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);

  // Invite form state
  const [inviteForm, setInviteForm] = useState({
    clientId: '',
    email: '',
    portalRole: 'viewer'
  });

  const fetchPortalUsers = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('client_portal_users')
        .select(`
          *,
          clients!inner(display_name, email, phone)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPortalUsers(data || []);
    } catch (error) {
      console.error('Error fetching portal users:', error);
      toast({
        title: 'Error',
        description: 'Failed to load client portal users',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchClients = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, display_name, email')
        .eq('status', 'active')
        .order('display_name');

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  }, []);

  useEffect(() => {
    fetchPortalUsers();
    fetchClients();
  }, [fetchPortalUsers, fetchClients]);

  const handleInviteClient = async () => {
    if (!inviteForm.clientId || !inviteForm.email) {
      toast({
        title: 'Missing Information',
        description: 'Please select a client and enter an email address',
        variant: 'destructive'
      });
      return;
    }

    setInviteLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('invite-client-portal-user', {
        body: {
          clientId: inviteForm.clientId,
          email: inviteForm.email,
          portalRole: inviteForm.portalRole
        }
      });

      if (error) throw error;

      toast({
        title: 'Invitation Sent',
        description: `An invitation has been sent to ${inviteForm.email}`
      });

      setIsInviteOpen(false);
      setInviteForm({ clientId: '', email: '', portalRole: 'viewer' });
      fetchPortalUsers();
    } catch (error: any) {
      console.error('Error inviting client:', error);
      toast({
        title: 'Invitation Failed',
        description: error.message || 'Failed to send invitation',
        variant: 'destructive'
      });
    } finally {
      setInviteLoading(false);
    }
  };

  const handleToggleActive = async (portalUser: ClientPortalUser) => {
    try {
      const { error } = await supabase
        .from('client_portal_users')
        .update({ is_active: !portalUser.is_active })
        .eq('id', portalUser.id);

      if (error) throw error;

      toast({
        title: portalUser.is_active ? 'Access Disabled' : 'Access Enabled',
        description: `Portal access for ${portalUser.email} has been ${portalUser.is_active ? 'disabled' : 'enabled'}`
      });

      fetchPortalUsers();
    } catch (error) {
      console.error('Error updating portal user:', error);
      toast({
        title: 'Error',
        description: 'Failed to update portal access',
        variant: 'destructive'
      });
    }
  };

  const handleUpdateRole = async () => {
    if (!selectedUser) return;

    try {
      const { error } = await supabase
        .from('client_portal_users')
        .update({ portal_role: selectedUser.portal_role })
        .eq('id', selectedUser.id);

      if (error) throw error;

      toast({
        title: 'Role Updated',
        description: `Portal role updated to ${getPortalRoleLabel(selectedUser.portal_role)}`
      });

      setIsEditOpen(false);
      setSelectedUser(null);
      fetchPortalUsers();
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        title: 'Error',
        description: 'Failed to update portal role',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteUser = async (portalUser: ClientPortalUser) => {
    if (!confirm(`Are you sure you want to remove portal access for ${portalUser.email}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('client_portal_users')
        .delete()
        .eq('id', portalUser.id);

      if (error) throw error;

      toast({
        title: 'Access Removed',
        description: `Portal access for ${portalUser.email} has been removed`
      });

      fetchPortalUsers();
    } catch (error) {
      console.error('Error deleting portal user:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove portal access',
        variant: 'destructive'
      });
    }
  };

  const filteredUsers = portalUsers.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.clients.display_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Client Portal Users</h1>
          <p className="text-muted-foreground">
            Manage client access to the self-service portal
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchPortalUsers}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Invite Client
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite Client to Portal</DialogTitle>
                <DialogDescription>
                  Send an invitation email to give a client access to their self-service portal
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="client">Select Client</Label>
                  <Select
                    value={inviteForm.clientId}
                    onValueChange={(value) => setInviteForm(prev => ({ ...prev, clientId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map(client => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.display_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="client@example.com"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Portal Role</Label>
                  <Select
                    value={inviteForm.portalRole}
                    onValueChange={(value) => setInviteForm(prev => ({ ...prev, portalRole: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="viewer">Viewer - Can only view documents</SelectItem>
                      <SelectItem value="editor">Editor - Can upload documents</SelectItem>
                      <SelectItem value="admin">Admin - Full access</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsInviteOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleInviteClient} disabled={inviteLoading}>
                  {inviteLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Invitation
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by email or client name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No Portal Users Found</h3>
              <p className="text-muted-foreground mt-1">
                {searchTerm ? 'Try adjusting your search' : 'Invite clients to access the portal'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((portalUser) => (
                  <TableRow key={portalUser.id}>
                    <TableCell className="font-medium">
                      {portalUser.clients.display_name}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        {portalUser.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        <Shield className="h-3 w-3 mr-1" />
                        {getPortalRoleLabel(portalUser.portal_role)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={portalUser.is_active}
                        onCheckedChange={() => handleToggleActive(portalUser)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {formatDate(portalUser.last_login_at)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedUser(portalUser);
                            setIsEditOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteUser(portalUser)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Role Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Portal Role</DialogTitle>
            <DialogDescription>
              Update the portal access level for {selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Portal Role</Label>
              <Select
                value={selectedUser?.portal_role || 'viewer'}
                onValueChange={(value) =>
                  setSelectedUser(prev => prev ? { ...prev, portal_role: value } : null)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">Viewer - Can only view documents</SelectItem>
                  <SelectItem value="editor">Editor - Can upload documents</SelectItem>
                  <SelectItem value="admin">Admin - Full access</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateRole}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Portal Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{portalUsers.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {portalUsers.filter(u => u.is_active).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Logged In This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {portalUsers.filter(u => {
                if (!u.last_login_at) return false;
                const lastLogin = new Date(u.last_login_at);
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                return lastLogin > weekAgo;
              }).length}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
