import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Building2, Plus, Search, Filter, Edit2, Trash2, Eye, ToggleLeft, ToggleRight } from 'lucide-react';
import { useAppState } from '@/contexts/AppStateContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ClientGroupModal } from '@/components/modals/ClientGroupModal';
import { useToast } from '@/hooks/use-toast';
import { clientGroupsService } from '@/services/clientGroupsService';

export const ClientGroupMasters: React.FC = () => {
  const { state, dispatch } = useAppState();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'Active' | 'Inactive'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view'>('add');
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Filter and search
  const filteredGroups = useMemo(() => {
    return state.clientGroups.filter(group => {
      const matchesSearch = 
        group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (group.description || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = filterStatus === 'all' || group.status === filterStatus;
      
      return matchesSearch && matchesStatus;
    });
  }, [state.clientGroups, searchTerm, filterStatus]);

  // Summary stats
  const stats = useMemo(() => {
    const total = state.clientGroups.length;
    const active = state.clientGroups.filter(g => g.status === 'Active').length;
    const totalClientsInGroups = state.clientGroups.reduce((sum, g) => sum + g.totalClients, 0);
    
    return { total, active, totalClientsInGroups };
  }, [state.clientGroups]);

  const handleAddNew = () => {
    setModalMode('add');
    setSelectedGroup(null);
    setIsModalOpen(true);
  };

  const handleEdit = (group: any) => {
    setModalMode('edit');
    setSelectedGroup(group);
    setIsModalOpen(true);
  };

  const handleView = (group: any) => {
    setModalMode('view');
    setSelectedGroup(group);
    setIsModalOpen(true);
  };

  const handleDelete = (groupId: string) => {
    const canDeleteResult = clientGroupsService.canDelete(groupId, state.clients);
    
    if (!canDeleteResult.allowed) {
      toast({
        title: 'Cannot Delete',
        description: canDeleteResult.reason,
        variant: 'destructive',
      });
      return;
    }
    
    setDeleteConfirmId(groupId);
  };

  const confirmDelete = async () => {
    if (deleteConfirmId) {
      try {
        await clientGroupsService.delete(deleteConfirmId, state.clients, dispatch);
        // Toast is handled by the service
      } catch (error) {
        // Error toast is handled by the service
        console.error('Failed to delete client group:', error);
      }
      setDeleteConfirmId(null);
    }
  };

  const handleToggleStatus = async (group: any) => {
    const newStatus = group.status === 'Active' ? 'Inactive' : 'Active';
    
    try {
      await clientGroupsService.update(group.id, { status: newStatus }, dispatch);
      // Toast is handled by the service
    } catch (error) {
      // Error toast is handled by the service
      console.error('Failed to toggle status:', error);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Client Group Masters</h1>
          <p className="text-muted-foreground mt-1">
            Organize clients by business group or category
          </p>
        </div>
        <Button onClick={handleAddNew} className="gap-2">
          <Plus className="h-4 w-4" />
          Add New Group
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Total Groups</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <ToggleRight className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-sm text-muted-foreground">Active Groups</p>
              <p className="text-2xl font-bold">{stats.active}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-sm text-muted-foreground">Total Clients in Groups</p>
              <p className="text-2xl font-bold">{stats.totalClientsInGroups}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, code, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Group Name</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Total Clients</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredGroups.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No client groups found. {searchTerm && 'Try adjusting your search.'}
                </TableCell>
              </TableRow>
            ) : (
              filteredGroups.map((group) => (
                <TableRow 
                  key={group.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleView(group)}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      {group.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-2 py-1 rounded">{group.code}</code>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {group.description || '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{group.totalClients} clients</Badge>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleStatus(group)}
                      className="gap-2"
                    >
                      {group.status === 'Active' ? (
                        <>
                          <ToggleRight className="h-4 w-4 text-green-600" />
                          <span className="text-green-600">Active</span>
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-400">Inactive</span>
                        </>
                      )}
                    </Button>
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleView(group)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(group)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(group.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Modal */}
      <ClientGroupModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        mode={modalMode}
        group={selectedGroup}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the client group.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
