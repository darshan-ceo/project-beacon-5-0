import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Loader2, Users, Shield, Eye, Edit, Crown } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface PortalUser {
  id: string;
  client_id: string;
  email: string;
  portal_role: 'viewer' | 'editor' | 'admin';
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  client_name?: string;
}

interface PortalUserManagementProps {
  clientId?: string; // Optional - if provided, only show users for this client
}

export const PortalUserManagement: React.FC<PortalUserManagementProps> = ({ clientId }) => {
  const [portalUsers, setPortalUsers] = useState<PortalUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    fetchPortalUsers();
  }, [clientId]);

  const fetchPortalUsers = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('client_portal_users')
        .select(`
          id,
          client_id,
          email,
          portal_role,
          is_active,
          last_login_at,
          created_at,
          clients:client_id (display_name)
        `);

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      const usersWithClientName: PortalUser[] = (data || []).map(user => ({
        id: user.id,
        client_id: user.client_id,
        email: user.email,
        portal_role: (user.portal_role || 'viewer') as 'viewer' | 'editor' | 'admin',
        is_active: user.is_active ?? true,
        last_login_at: user.last_login_at,
        created_at: user.created_at,
        client_name: (user.clients as any)?.display_name || 'Unknown Client'
      }));

      setPortalUsers(usersWithClientName);
    } catch (error: any) {
      console.error('Error fetching portal users:', error);
      toast({
        title: 'Error',
        description: 'Failed to load portal users',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const updatePortalRole = async (userId: string, newRole: 'viewer' | 'editor' | 'admin') => {
    try {
      setUpdating(userId);
      const { error } = await supabase
        .from('client_portal_users')
        .update({ portal_role: newRole, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (error) throw error;

      setPortalUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, portal_role: newRole } : user
      ));

      toast({
        title: 'Role Updated',
        description: `Portal user role changed to ${newRole}`
      });
    } catch (error: any) {
      console.error('Error updating portal role:', error);
      toast({
        title: 'Error',
        description: 'Failed to update portal role',
        variant: 'destructive'
      });
    } finally {
      setUpdating(null);
    }
  };

  const toggleUserActive = async (userId: string, isActive: boolean) => {
    try {
      setUpdating(userId);
      const { error } = await supabase
        .from('client_portal_users')
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (error) throw error;

      setPortalUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, is_active: isActive } : user
      ));

      toast({
        title: isActive ? 'User Activated' : 'User Deactivated',
        description: `Portal user has been ${isActive ? 'activated' : 'deactivated'}`
      });
    } catch (error: any) {
      console.error('Error toggling user status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update user status',
        variant: 'destructive'
      });
    } finally {
      setUpdating(null);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Crown className="h-4 w-4" />;
      case 'editor': return <Edit className="h-4 w-4" />;
      default: return <Eye className="h-4 w-4" />;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin': return 'default';
      case 'editor': return 'secondary';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Portal User Management
        </CardTitle>
      </CardHeader>
      <CardContent>
        {portalUsers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Shield className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No portal users found</p>
            <p className="text-sm mt-1">Portal users will appear here when clients are given portal access</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {!clientId && <TableHead>Client</TableHead>}
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {portalUsers.map((user) => (
                <TableRow key={user.id}>
                  {!clientId && (
                    <TableCell className="font-medium">{user.client_name}</TableCell>
                  )}
                  <TableCell className="font-mono text-sm">{user.email}</TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(user.portal_role)} className="flex items-center gap-1 w-fit">
                      {getRoleIcon(user.portal_role)}
                      {user.portal_role.charAt(0).toUpperCase() + user.portal_role.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.is_active ? 'default' : 'destructive'}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {user.last_login_at 
                      ? format(new Date(user.last_login_at), 'MMM dd, yyyy HH:mm')
                      : 'Never'
                    }
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-3">
                      <Select
                        value={user.portal_role}
                        onValueChange={(value: 'viewer' | 'editor' | 'admin') => updatePortalRole(user.id, value)}
                        disabled={updating === user.id}
                      >
                        <SelectTrigger className="w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="viewer">Viewer</SelectItem>
                          <SelectItem value="editor">Editor</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      <Switch
                        checked={user.is_active}
                        onCheckedChange={(checked) => toggleUserActive(user.id, checked)}
                        disabled={updating === user.id}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
