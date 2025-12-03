import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Plus, Search, Edit2, Trash2, ToggleLeft, ToggleRight, 
  Scale, Info, RefreshCw, Loader2
} from 'lucide-react';
import { StatutoryAct } from '@/types/statutory';
import { statutoryActsService } from '@/services/statutoryActsService';
import { StatutoryActModal } from '@/components/modals/StatutoryActModal';
import { StatutoryMastersTabs } from './StatutoryMastersTabs';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export const StatutoryActMasters: React.FC = () => {
  const [acts, setActs] = useState<StatutoryAct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  
  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view'>('add');
  const [selectedAct, setSelectedAct] = useState<StatutoryAct | null>(null);
  
  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [actToDelete, setActToDelete] = useState<StatutoryAct | null>(null);

  // Load acts
  const loadActs = async () => {
    setLoading(true);
    const data = await statutoryActsService.getAll();
    setActs(data);
    setLoading(false);
  };

  useEffect(() => {
    loadActs();
  }, []);

  // Filtered acts
  const filteredActs = useMemo(() => {
    return acts.filter(act => {
      const matchesSearch = 
        act.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        act.code.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = 
        filterStatus === 'all' ||
        (filterStatus === 'active' && act.isActive) ||
        (filterStatus === 'inactive' && !act.isActive);
      
      return matchesSearch && matchesStatus;
    });
  }, [acts, searchTerm, filterStatus]);

  // Stats
  const stats = useMemo(() => ({
    total: acts.length,
    active: acts.filter(a => a.isActive).length,
    inactive: acts.filter(a => !a.isActive).length
  }), [acts]);

  // Handlers
  const handleAdd = () => {
    setSelectedAct(null);
    setModalMode('add');
    setModalOpen(true);
  };

  const handleEdit = (act: StatutoryAct) => {
    setSelectedAct(act);
    setModalMode('edit');
    setModalOpen(true);
  };

  const handleView = (act: StatutoryAct) => {
    setSelectedAct(act);
    setModalMode('view');
    setModalOpen(true);
  };

  const handleDelete = (act: StatutoryAct) => {
    setActToDelete(act);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (actToDelete) {
      const success = await statutoryActsService.delete(actToDelete.id);
      if (success) {
        setActs(prev => prev.filter(a => a.id !== actToDelete.id));
      }
    }
    setDeleteDialogOpen(false);
    setActToDelete(null);
  };

  const handleToggleStatus = async (act: StatutoryAct) => {
    const success = await statutoryActsService.toggleStatus(act.id, !act.isActive);
    if (success) {
      setActs(prev => prev.map(a => 
        a.id === act.id ? { ...a, isActive: !a.isActive } : a
      ));
    }
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setSelectedAct(null);
  };

  const handleModalSave = (savedAct: StatutoryAct) => {
    if (modalMode === 'add') {
      setActs(prev => [...prev, savedAct]);
    } else if (modalMode === 'edit') {
      setActs(prev => prev.map(a => a.id === savedAct.id ? savedAct : a));
    }
    setModalOpen(false);
    setSelectedAct(null);
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <StatutoryMastersTabs />
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Scale className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Statutory Act Master</h1>
            <p className="text-sm text-muted-foreground">
              Manage acts for statutory deadline calculations
            </p>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>This master determines statutory deadlines used across cases. Changing values here impacts future deadline calculations.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Add New Act
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total Acts</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            <p className="text-xs text-muted-foreground">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-gray-400">{stats.inactive}</div>
            <p className="text-xs text-muted-foreground">Inactive</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={filterStatus === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('all')}
              >
                All
              </Button>
              <Button
                variant={filterStatus === 'active' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('active')}
              >
                Active
              </Button>
              <Button
                variant={filterStatus === 'inactive' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('inactive')}
              >
                Inactive
              </Button>
              <Button variant="ghost" size="sm" onClick={loadActs}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Acts List</CardTitle>
          <CardDescription>
            {filteredActs.length} act{filteredActs.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredActs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Scale className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No statutory acts found</p>
              <Button variant="link" onClick={handleAdd}>
                Add your first act
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredActs.map((act) => (
                  <TableRow key={act.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="font-mono font-medium">
                      {act.code}
                    </TableCell>
                    <TableCell 
                      className="font-medium cursor-pointer"
                      onClick={() => handleView(act)}
                    >
                      {act.name}
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">
                      {act.description || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={act.isActive ? 'default' : 'secondary'}>
                        {act.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(act)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Edit</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleToggleStatus(act)}
                              >
                                {act.isActive ? (
                                  <ToggleRight className="h-4 w-4 text-green-600" />
                                ) : (
                                  <ToggleLeft className="h-4 w-4 text-gray-400" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {act.isActive ? 'Deactivate' : 'Activate'}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(act)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal */}
      <StatutoryActModal
        isOpen={modalOpen}
        onClose={handleModalClose}
        onSave={handleModalSave}
        mode={modalMode}
        act={selectedAct}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Statutory Act</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{actToDelete?.name}"? This action cannot be undone.
              {actToDelete && (
                <span className="block mt-2 text-amber-600">
                  Note: Acts with linked event types cannot be deleted.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
