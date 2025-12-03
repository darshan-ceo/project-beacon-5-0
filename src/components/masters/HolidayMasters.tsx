import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, Search, Edit2, Trash2, ToggleLeft, ToggleRight, 
  CalendarDays, Info, RefreshCw, Loader2, ShieldAlert
} from 'lucide-react';
import { Holiday, HOLIDAY_TYPES } from '@/types/statutory';
import { holidayService } from '@/services/holidayService';
import { HolidayModal } from '@/components/modals/HolidayModal';
import { useRBAC } from '@/hooks/useAdvancedRBAC';
import { format, parseISO, getYear } from 'date-fns';
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

// Indian states for filtering
const INDIAN_STATES = [
  { value: 'ALL', label: 'All India' },
  { value: 'AN', label: 'Andaman & Nicobar' },
  { value: 'AP', label: 'Andhra Pradesh' },
  { value: 'AR', label: 'Arunachal Pradesh' },
  { value: 'AS', label: 'Assam' },
  { value: 'BR', label: 'Bihar' },
  { value: 'CG', label: 'Chhattisgarh' },
  { value: 'CH', label: 'Chandigarh' },
  { value: 'DD', label: 'Daman & Diu' },
  { value: 'DL', label: 'Delhi' },
  { value: 'GA', label: 'Goa' },
  { value: 'GJ', label: 'Gujarat' },
  { value: 'HP', label: 'Himachal Pradesh' },
  { value: 'HR', label: 'Haryana' },
  { value: 'JH', label: 'Jharkhand' },
  { value: 'JK', label: 'Jammu & Kashmir' },
  { value: 'KA', label: 'Karnataka' },
  { value: 'KL', label: 'Kerala' },
  { value: 'LA', label: 'Ladakh' },
  { value: 'MH', label: 'Maharashtra' },
  { value: 'ML', label: 'Meghalaya' },
  { value: 'MN', label: 'Manipur' },
  { value: 'MP', label: 'Madhya Pradesh' },
  { value: 'MZ', label: 'Mizoram' },
  { value: 'NL', label: 'Nagaland' },
  { value: 'OD', label: 'Odisha' },
  { value: 'PB', label: 'Punjab' },
  { value: 'PY', label: 'Puducherry' },
  { value: 'RJ', label: 'Rajasthan' },
  { value: 'SK', label: 'Sikkim' },
  { value: 'TN', label: 'Tamil Nadu' },
  { value: 'TS', label: 'Telangana' },
  { value: 'TR', label: 'Tripura' },
  { value: 'UK', label: 'Uttarakhand' },
  { value: 'UP', label: 'Uttar Pradesh' },
  { value: 'WB', label: 'West Bengal' }
];

export const HolidayMasters: React.FC = () => {
  const { hasPermission } = useRBAC();
  const canEdit = hasPermission('settings', 'write');
  const canDelete = hasPermission('settings', 'delete');
  const canCreate = hasPermission('settings', 'write');

  const currentYear = getYear(new Date());
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterState, setFilterState] = useState<string>('all');
  const [filterYear, setFilterYear] = useState<string>(currentYear.toString());
  
  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view'>('add');
  const [selectedHoliday, setSelectedHoliday] = useState<Holiday | null>(null);
  
  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [holidayToDelete, setHolidayToDelete] = useState<Holiday | null>(null);

  // Load holidays
  const loadHolidays = async () => {
    setLoading(true);
    const data = await holidayService.getAll();
    setHolidays(data);
    setLoading(false);
  };

  useEffect(() => {
    loadHolidays();
  }, []);

  // Filtered holidays
  const filteredHolidays = useMemo(() => {
    return holidays.filter(h => {
      const matchesSearch = h.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = 
        filterStatus === 'all' ||
        (filterStatus === 'active' && h.isActive) ||
        (filterStatus === 'inactive' && !h.isActive);
      
      const matchesType = filterType === 'all' || h.type === filterType;
      const matchesState = filterState === 'all' || h.state === filterState || h.state === 'ALL';
      
      const holidayYear = getYear(parseISO(h.date));
      const matchesYear = filterYear === 'all' || holidayYear.toString() === filterYear;
      
      return matchesSearch && matchesStatus && matchesType && matchesState && matchesYear;
    });
  }, [holidays, searchTerm, filterStatus, filterType, filterState, filterYear]);

  // Stats
  const stats = useMemo(() => {
    const yearHolidays = holidays.filter(h => getYear(parseISO(h.date)) === currentYear);
    return {
      total: yearHolidays.length,
      national: yearHolidays.filter(h => h.type === 'national').length,
      state: yearHolidays.filter(h => h.type === 'state').length,
      optional: yearHolidays.filter(h => h.type === 'optional').length
    };
  }, [holidays, currentYear]);

  // Years for filter
  const availableYears = useMemo(() => {
    const years = new Set(holidays.map(h => getYear(parseISO(h.date))));
    return Array.from(years).sort((a, b) => b - a);
  }, [holidays]);

  // Handlers
  const handleAdd = () => {
    if (!canCreate) return;
    setSelectedHoliday(null);
    setModalMode('add');
    setModalOpen(true);
  };

  const handleEdit = (holiday: Holiday) => {
    if (!canEdit) {
      setSelectedHoliday(holiday);
      setModalMode('view');
      setModalOpen(true);
      return;
    }
    setSelectedHoliday(holiday);
    setModalMode('edit');
    setModalOpen(true);
  };

  const handleView = (holiday: Holiday) => {
    setSelectedHoliday(holiday);
    setModalMode('view');
    setModalOpen(true);
  };

  const handleDelete = (holiday: Holiday) => {
    if (!canDelete) return;
    setHolidayToDelete(holiday);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (holidayToDelete) {
      const success = await holidayService.delete(holidayToDelete.id);
      if (success) {
        setHolidays(prev => prev.filter(h => h.id !== holidayToDelete.id));
      }
    }
    setDeleteDialogOpen(false);
    setHolidayToDelete(null);
  };

  const handleToggleStatus = async (holiday: Holiday) => {
    if (!canEdit) return;
    const updated = await holidayService.update(holiday.id, { isActive: !holiday.isActive });
    if (updated) {
      setHolidays(prev => prev.map(h => 
        h.id === holiday.id ? { ...h, isActive: !h.isActive } : h
      ));
    }
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setSelectedHoliday(null);
  };

  const handleModalSave = (savedHoliday: Holiday) => {
    if (modalMode === 'add') {
      setHolidays(prev => [...prev, savedHoliday]);
    } else if (modalMode === 'edit') {
      setHolidays(prev => prev.map(h => h.id === savedHoliday.id ? savedHoliday : h));
    }
    setModalOpen(false);
    setSelectedHoliday(null);
  };

  const getTypeLabel = (type: string) => {
    return HOLIDAY_TYPES.find(ht => ht.value === type)?.label || type;
  };

  const getStateLabel = (stateCode: string) => {
    return INDIAN_STATES.find(s => s.value === stateCode)?.label || stateCode;
  };

  const getTypeBadgeVariant = (type: string): 'default' | 'secondary' | 'outline' => {
    switch (type) {
      case 'national': return 'default';
      case 'state': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CalendarDays className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Holiday Master</h1>
            <p className="text-sm text-muted-foreground">
              Manage holidays for working day calculations
            </p>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>Holidays are used to calculate working days for statutory deadlines. National holidays apply to all states.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        {canCreate ? (
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Add Holiday
          </Button>
        ) : (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button disabled>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Holiday
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
            You have read-only access to holidays. Contact an administrator to make changes.
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total ({currentYear})</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-red-600">{stats.national}</div>
            <p className="text-xs text-muted-foreground">National</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-600">{stats.state}</div>
            <p className="text-xs text-muted-foreground">State</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-muted-foreground">{stats.optional}</div>
            <p className="text-xs text-muted-foreground">Optional</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search holidays..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterYear} onValueChange={setFilterYear}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {availableYears.map(year => (
                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {HOLIDAY_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterState} onValueChange={setFilterState}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="State" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                {INDIAN_STATES.map(state => (
                  <SelectItem key={state.value} value={state.value}>{state.label}</SelectItem>
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
              <Button variant="ghost" size="sm" onClick={loadHolidays}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Holidays List</CardTitle>
          <CardDescription>
            {filteredHolidays.length} holiday{filteredHolidays.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredHolidays.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CalendarDays className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No holidays found</p>
              {canCreate && (
                <Button variant="link" onClick={handleAdd}>
                  Add your first holiday
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHolidays.map((holiday) => (
                  <TableRow key={holiday.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="font-medium">
                      {format(parseISO(holiday.date), 'dd MMM yyyy')}
                      <span className="block text-xs text-muted-foreground">
                        {format(parseISO(holiday.date), 'EEEE')}
                      </span>
                    </TableCell>
                    <TableCell 
                      className="cursor-pointer"
                      onClick={() => handleView(holiday)}
                    >
                      {holiday.name}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getTypeBadgeVariant(holiday.type)}>
                        {getTypeLabel(holiday.type)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {getStateLabel(holiday.state)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={holiday.isActive ? 'default' : 'secondary'}>
                        {holiday.isActive ? 'Active' : 'Inactive'}
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
                                onClick={() => handleEdit(holiday)}
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
                                  onClick={() => handleToggleStatus(holiday)}
                                >
                                  {holiday.isActive ? (
                                    <ToggleRight className="h-4 w-4 text-green-600" />
                                  ) : (
                                    <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                {holiday.isActive ? 'Deactivate' : 'Activate'}
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
                                  onClick={() => handleDelete(holiday)}
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
      <HolidayModal
        isOpen={modalOpen}
        onClose={handleModalClose}
        onSave={handleModalSave}
        mode={modalMode}
        holiday={selectedHoliday}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Holiday</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{holidayToDelete?.name}" ({holidayToDelete?.date && format(parseISO(holidayToDelete.date), 'dd MMM yyyy')})? This action cannot be undone.
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
