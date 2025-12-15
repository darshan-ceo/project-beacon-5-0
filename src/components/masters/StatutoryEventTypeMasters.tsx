import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, Search, Edit2, Trash2, ToggleLeft, ToggleRight, 
  FileText, Info, RefreshCw, Loader2, Clock, Calendar, ShieldAlert
} from 'lucide-react';
import { StatutoryEventType, StatutoryAct, BASE_DATE_TYPES, DEADLINE_TYPES } from '@/types/statutory';
import { statutoryEventTypesService } from '@/services/statutoryEventTypesService';
import { statutoryActsService } from '@/services/statutoryActsService';
import { StatutoryEventTypeModal } from '@/components/modals/StatutoryEventTypeModal';
import { StatutoryMastersTabs } from './StatutoryMastersTabs';
import { useRBAC } from '@/hooks/useAdvancedRBAC';
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
import { Alert, AlertDescription } from '@/components/ui/alert';

export const StatutoryEventTypeMasters: React.FC = () => {
  const { hasPermission } = useRBAC();
  const canEdit = hasPermission('settings', 'write');
  const canDelete = hasPermission('settings', 'delete');
  const canCreate = hasPermission('settings', 'write');

  const [eventTypes, setEventTypes] = useState<StatutoryEventType[]>([]);
  const [acts, setActs] = useState<StatutoryAct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [filterAct, setFilterAct] = useState<string>('all');
  
  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view'>('add');
  const [selectedEventType, setSelectedEventType] = useState<StatutoryEventType | null>(null);
  
  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [eventTypeToDelete, setEventTypeToDelete] = useState<StatutoryEventType | null>(null);

  // Load data
  const loadData = async () => {
    setLoading(true);
    const [eventTypesData, actsData] = await Promise.all([
      statutoryEventTypesService.getAll(),
      statutoryActsService.getAll()
    ]);
    setEventTypes(eventTypesData);
    setActs(actsData);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered event types
  const filteredEventTypes = useMemo(() => {
    return eventTypes.filter(et => {
      const matchesSearch = 
        et.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        et.code.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = 
        filterStatus === 'all' ||
        (filterStatus === 'active' && et.isActive) ||
        (filterStatus === 'inactive' && !et.isActive);
      
      const matchesAct = filterAct === 'all' || et.actId === filterAct;
      
      return matchesSearch && matchesStatus && matchesAct;
    });
  }, [eventTypes, searchTerm, filterStatus, filterAct]);

  // Stats
  const stats = useMemo(() => ({
    total: eventTypes.length,
    active: eventTypes.filter(e => e.isActive).length,
    withExtension: eventTypes.filter(e => e.extensionAllowed).length
  }), [eventTypes]);

  // Handlers
  const handleAdd = () => {
    if (!canCreate) return;
    setSelectedEventType(null);
    setModalMode('add');
    setModalOpen(true);
  };

  const handleEdit = (eventType: StatutoryEventType) => {
    if (!canEdit) {
      setSelectedEventType(eventType);
      setModalMode('view');
      setModalOpen(true);
      return;
    }
    setSelectedEventType(eventType);
    setModalMode('edit');
    setModalOpen(true);
  };

  const handleView = (eventType: StatutoryEventType) => {
    setSelectedEventType(eventType);
    setModalMode('view');
    setModalOpen(true);
  };

  const handleDelete = (eventType: StatutoryEventType) => {
    if (!canDelete) return;
    setEventTypeToDelete(eventType);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (eventTypeToDelete) {
      const success = await statutoryEventTypesService.delete(eventTypeToDelete.id);
      if (success) {
        setEventTypes(prev => prev.filter(e => e.id !== eventTypeToDelete.id));
      }
    }
    setDeleteDialogOpen(false);
    setEventTypeToDelete(null);
  };

  const handleToggleStatus = async (eventType: StatutoryEventType) => {
    if (!canEdit) return;
    const updated = await statutoryEventTypesService.update(eventType.id, { isActive: !eventType.isActive });
    if (updated) {
      setEventTypes(prev => prev.map(e => 
        e.id === eventType.id ? { ...e, isActive: !e.isActive } : e
      ));
    }
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setSelectedEventType(null);
  };

  const handleModalSave = (savedEventType: StatutoryEventType) => {
    if (modalMode === 'add') {
      setEventTypes(prev => [...prev, savedEventType]);
    } else if (modalMode === 'edit') {
      setEventTypes(prev => prev.map(e => e.id === savedEventType.id ? savedEventType : e));
    }
    setModalOpen(false);
    setSelectedEventType(null);
  };

  const getDeadlineTypeLabel = (type: string) => {
    return DEADLINE_TYPES.find(dt => dt.value === type)?.label || type;
  };

  const getBaseDateLabel = (type: string) => {
    return BASE_DATE_TYPES.find(bdt => bdt.value === type)?.label || type;
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <StatutoryMastersTabs />
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Statutory Event Types</h1>
            <p className="text-sm text-muted-foreground">
              Configure deadline rules for each statutory event
            </p>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>Event types define the deadline calculation rules (days/months/working days) for each statutory act.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        {canCreate ? (
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Add Event Type
          </Button>
        ) : (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button disabled>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Event Type
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>Admin access required</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {/* RBAC Notice */}
      {!canEdit && (
        <Alert>
          <ShieldAlert className="h-4 w-4" />
          <AlertDescription>
            You have read-only access to statutory event types. Contact an administrator to make changes.
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total Event Types</p>
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
            <div className="text-2xl font-bold text-blue-600">{stats.withExtension}</div>
            <p className="text-xs text-muted-foreground">With Extensions</p>
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
            <Select value={filterAct} onValueChange={setFilterAct}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by Act" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Acts</SelectItem>
                {acts.map(act => (
                  <SelectItem key={act.id} value={act.id}>{act.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              <Button variant="ghost" size="sm" onClick={loadData}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Event Types List</CardTitle>
          <CardDescription>
            {filteredEventTypes.length} event type{filteredEventTypes.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredEventTypes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No event types found</p>
              {canCreate && (
                <Button variant="link" onClick={handleAdd}>
                  Add your first event type
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Act</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead>Base Date</TableHead>
                  <TableHead>Extension</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEventTypes.map((eventType) => (
                  <TableRow 
                    key={eventType.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleView(eventType)}
                  >
                    <TableCell className="font-mono font-medium">
                      {eventType.code}
                    </TableCell>
                    <TableCell className="font-medium">
                      {eventType.name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{eventType.actName || '-'}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span>{eventType.deadlineCount} {getDeadlineTypeLabel(eventType.deadlineType)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {getBaseDateLabel(eventType.baseDateType)}
                    </TableCell>
                    <TableCell>
                      {eventType.extensionAllowed ? (
                        <Badge variant="secondary">
                          +{eventType.extensionDays}d × {eventType.maxExtensionCount}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">No</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={eventType.isActive ? 'default' : 'secondary'}>
                        {eventType.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(eventType)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{canEdit ? 'Edit' : 'View'}</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        
                        {canEdit && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleToggleStatus(eventType)}
                                >
                                  {eventType.isActive ? (
                                    <ToggleRight className="h-4 w-4 text-green-600" />
                                  ) : (
                                    <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                {eventType.isActive ? 'Deactivate' : 'Activate'}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        
                        {canDelete && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDelete(eventType)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Delete</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
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
      <StatutoryEventTypeModal
        isOpen={modalOpen}
        onClose={handleModalClose}
        onSave={handleModalSave}
        mode={modalMode}
        eventType={selectedEventType}
        acts={acts}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event Type</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{eventTypeToDelete?.name}"? This action cannot be undone.
              <span className="block mt-2 text-amber-600">
                Note: Event types with linked case deadlines cannot be deleted.
              </span>
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
