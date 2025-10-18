import React, { useState } from 'react';
import { useAppState } from '@/contexts/AppStateContext';
import type { ClientGroup } from '@/contexts/AppStateContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Edit, Trash2, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';

export const ClientGroupMasters: React.FC = () => {
  const { state, dispatch } = useAppState();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ClientGroup | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    headClientId: string;
    status: 'Active' | 'Inactive';
  }>({
    name: '',
    description: '',
    headClientId: '',
    status: 'Active'
  });

  const filteredGroups = state.clientGroups.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenModal = (group?: ClientGroup) => {
    if (group) {
      setEditingGroup(group);
      setFormData({
        name: group.name,
        description: group.description || '',
        headClientId: group.headClientId || '',
        status: group.status
      });
    } else {
      setEditingGroup(null);
      setFormData({
        name: '',
        description: '',
        headClientId: '',
        status: 'Active'
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Group name is required',
        variant: 'destructive'
      });
      return;
    }

    const groupData: ClientGroup = {
      id: editingGroup?.id || `CG-${Date.now()}`,
      name: formData.name.trim(),
      description: formData.description.trim(),
      headClientId: formData.headClientId || undefined,
      totalClients: editingGroup?.totalClients || 0,
      status: formData.status,
      createdAt: editingGroup?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (editingGroup) {
      dispatch({ type: 'UPDATE_CLIENT_GROUP', payload: groupData });
      toast({
        title: 'Success',
        description: 'Client group updated successfully'
      });
    } else {
      dispatch({ type: 'ADD_CLIENT_GROUP', payload: groupData });
      toast({
        title: 'Success',
        description: 'Client group created successfully'
      });
    }

    setIsModalOpen(false);
  };

  const handleDelete = (groupId: string) => {
    const groupClients = state.clients.filter(c => c.clientGroupId === groupId);
    if (groupClients.length > 0) {
      toast({
        title: 'Cannot Delete',
        description: `This group has ${groupClients.length} client(s). Please reassign them first.`,
        variant: 'destructive'
      });
      return;
    }

    dispatch({ type: 'DELETE_CLIENT_GROUP', payload: groupId });
    toast({
      title: 'Deleted',
      description: 'Client group deleted successfully'
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Client Group Masters</h1>
          <p className="text-muted-foreground">Manage client group hierarchies and relationships</p>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <Plus className="h-4 w-4 mr-2" />
          Add Client Group
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search client groups..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Group ID</TableHead>
                <TableHead>Group Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Total Clients</TableHead>
                <TableHead>Head Client</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredGroups.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No client groups found
                  </TableCell>
                </TableRow>
              ) : (
                filteredGroups.map((group) => {
                  const groupClients = state.clients.filter(c => c.clientGroupId === group.id);
                  const headClient = group.headClientId ? state.clients.find(c => c.id === group.headClientId) : null;
                  
                  return (
                    <TableRow key={group.id}>
                      <TableCell className="font-mono text-sm">{group.id}</TableCell>
                      <TableCell className="font-semibold">{group.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {group.description || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="gap-1">
                          <Users className="h-3 w-3" />
                          {groupClients.length}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {headClient ? headClient.name : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={group.status === 'Active' ? 'default' : 'secondary'}>
                          {group.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenModal(group)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(group.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingGroup ? 'Edit Client Group' : 'Add Client Group'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Group Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Landmark Group"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the client group..."
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="headClient">Head Client (Optional)</Label>
              <Select
                value={formData.headClientId}
                onValueChange={(value) => setFormData({ ...formData, headClientId: value })}
              >
                <SelectTrigger id="headClient">
                  <SelectValue placeholder="Select head client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {state.clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: 'Active' | 'Inactive') => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                {editingGroup ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
