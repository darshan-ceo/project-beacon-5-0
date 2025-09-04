import React, { useState, useEffect } from 'react';
import { useAppState } from '@/contexts/AppStateContext';
import { featureFlagService } from '@/services/featureFlagService';
import { hearingsService } from '@/services/hearingsService';
import { Hearing, HearingFilters, HearingListItem } from '@/types/hearings';
import { HearingDrawer } from './HearingDrawer';
import { format } from 'date-fns';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  AlertTriangle, 
  MoreHorizontal,
  Filter,
  Download,
  Plus,
  Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';

interface HearingsListProps {
  filters?: HearingFilters;
  onFiltersChange?: (filters: HearingFilters) => void;
  caseId?: string; // For case-specific hearing lists
}

export const HearingsList: React.FC<HearingsListProps> = ({
  filters,
  onFiltersChange,
  caseId
}) => {
  const { state } = useAppState();
  const [hearings, setHearings] = useState<HearingListItem[]>([]);
  const [selectedHearing, setSelectedHearing] = useState<Hearing | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit' | 'view'>('view');
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [localFilters, setLocalFilters] = useState<HearingFilters>({
    ...filters,
    ...(caseId && { cases: [caseId] })
  });
  const [sortBy, setSortBy] = useState<'date' | 'case' | 'status'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const isEnabled = featureFlagService.isEnabled('hearings_module_v1');

  // Fetch hearings
  useEffect(() => {
    if (!isEnabled) return;
    
    const loadHearings = async () => {
      setIsLoading(true);
      try {
        const data = caseId 
          ? await hearingsService.getCaseHearings(caseId)
          : await hearingsService.getHearings(localFilters);
        
        // Enrich with related data
        const enrichedHearings: HearingListItem[] = data.map(hearing => {
          const case_ = state.cases.find(c => c.id === hearing.case_id || c.id === hearing.clientId);
          const client = case_ ? state.clients.find(cl => cl.id === case_.clientId) : null;
          const court = state.courts.find(c => c.id === hearing.court_id);
          const judges = state.judges.filter(j => 
            hearing.judge_ids?.includes(j.id) || j.id === hearing.judgeId
          );

          return {
            ...hearing,
            case_number: case_?.caseNumber || `Case ${hearing.case_id}`,
            case_title: case_?.title || 'Unknown Case',
            client_name: client?.name || 'Unknown Client',
            court_name: court?.name || 'Unknown Court',
            judge_names: judges.map(j => j.name),
            conflicts: [] // TODO: Fetch conflicts
          };
        });

        setHearings(enrichedHearings);
      } catch (error) {
        console.error('Failed to load hearings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadHearings();
  }, [localFilters, caseId, isEnabled, state.cases, state.clients, state.courts, state.judges]);

  // Filter and sort hearings
  const filteredAndSortedHearings = hearings
    .filter(hearing => {
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          hearing.case_number.toLowerCase().includes(searchLower) ||
          hearing.case_title.toLowerCase().includes(searchLower) ||
          hearing.client_name.toLowerCase().includes(searchLower) ||
          hearing.court_name.toLowerCase().includes(searchLower)
        );
      }
      return true;
    })
    .sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case 'case':
          comparison = a.case_number.localeCompare(b.case_number);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
      }
      
      return sortOrder === 'desc' ? -comparison : comparison;
    });

  const handleHearingClick = (hearing: HearingListItem) => {
    setSelectedHearing(hearing);
    setDrawerMode('view');
    setDrawerOpen(true);
  };

  const handleEdit = (hearing: HearingListItem) => {
    setSelectedHearing(hearing);
    setDrawerMode('edit');
    setDrawerOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      scheduled: 'bg-blue-100 text-blue-800',
      concluded: 'bg-green-100 text-green-800',
      adjourned: 'bg-yellow-100 text-yellow-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    
    return (
      <Badge className={variants[status as keyof typeof variants] || 'bg-gray-100 text-gray-800'}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  const getPurposeBadge = (purpose: string) => {
    const variants = {
      PH: 'bg-purple-100 text-purple-800',
      mention: 'bg-blue-100 text-blue-800',
      final: 'bg-green-100 text-green-800',
      other: 'bg-gray-100 text-gray-800'
    };
    
    return (
      <Badge variant="outline" className={variants[purpose as keyof typeof variants]}>
        {purpose === 'PH' ? 'Pre-hearing' : purpose}
      </Badge>
    );
  };

  const applyFilters = (newFilters: HearingFilters) => {
    setLocalFilters(newFilters);
    onFiltersChange?.(newFilters);
  };

  const exportToCSV = () => {
    const csvData = filteredAndSortedHearings.map(hearing => ({
      'Date': hearing.date,
      'Time': hearing.start_time || hearing.time,
      'Case Number': hearing.case_number,
      'Case Title': hearing.case_title,
      'Client': hearing.client_name,
      'Court': hearing.court_name,
      'Judge': hearing.judge_names.join(', '),
      'Purpose': hearing.purpose,
      'Status': hearing.status,
      'Outcome': hearing.outcome || '',
      'Next Date': hearing.next_hearing_date || ''
    }));

    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).map(val => `"${val}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hearings-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (!isEnabled) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Hearings List is not available.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      {!caseId && (
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Calendar className="h-6 w-6" />
              Hearings List
            </h2>
            <p className="text-muted-foreground">
              View and manage all scheduled hearings
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            
            <Button
              onClick={() => {
                setSelectedHearing(null);
                setDrawerMode('create');
                setDrawerOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Hearing
            </Button>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by case number, title, client, or court..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="case">Case</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                </SelectContent>
              </Select>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </Button>

              {!caseId && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Filter className="h-4 w-4 mr-2" />
                      Filters
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80" align="end">
                    <div className="space-y-4">
                      <h4 className="font-medium">Filter Hearings</h4>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label>From Date</Label>
                          <Input
                            type="date"
                            value={localFilters.dateFrom || ''}
                            onChange={(e) => setLocalFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label>To Date</Label>
                          <Input
                            type="date"
                            value={localFilters.dateTo || ''}
                            onChange={(e) => setLocalFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                          />
                        </div>
                      </div>

                      <div>
                        <Label>Status</Label>
                        <div className="mt-2 space-y-2">
                          {['scheduled', 'concluded', 'adjourned', 'cancelled'].map(status => (
                            <div key={status} className="flex items-center space-x-2">
                              <Checkbox
                                id={status}
                                checked={localFilters.status?.includes(status as any) || false}
                                onCheckedChange={(checked) => {
                                  const newStatus = checked
                                    ? [...(localFilters.status || []), status as any]
                                    : localFilters.status?.filter(s => s !== status) || [];
                                  setLocalFilters(prev => ({ ...prev, status: newStatus }));
                                }}
                              />
                              <Label htmlFor={status} className="capitalize">{status}</Label>
                            </div>
                          ))}
                        </div>
                      </div>

                      <Button 
                        className="w-full" 
                        onClick={() => applyFilters(localFilters)}
                      >
                        Apply Filters
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hearings Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4 py-4">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Case</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Court & Judge</TableHead>
                  <TableHead>Purpose</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Outcome</TableHead>
                  <TableHead>Next Date</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedHearings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      <div className="text-muted-foreground">
                        {searchTerm ? 'No hearings found matching your search.' : 'No hearings scheduled.'}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAndSortedHearings.map((hearing) => (
                    <TableRow 
                      key={hearing.id} 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleHearingClick(hearing)}
                    >
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-sm font-medium">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(hearing.date), 'MMM dd, yyyy')}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {hearing.start_time || hearing.time || 'TBD'}
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium text-sm">{hearing.case_number}</div>
                          <div className="text-xs text-muted-foreground truncate max-w-48">
                            {hearing.case_title}
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span className="text-sm">{hearing.client_name}</span>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-sm">
                            <MapPin className="h-3 w-3" />
                            {hearing.court_name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {hearing.judge_names.join(', ') || 'No judge assigned'}
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        {getPurposeBadge(hearing.purpose)}
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(hearing.status)}
                          {hearing.conflicts && hearing.conflicts.length > 0 && (
                            <AlertTriangle className="h-4 w-4 text-orange-500" />
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="text-sm">
                          {hearing.outcome || '-'}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="text-sm">
                          {hearing.next_hearing_date 
                            ? format(new Date(hearing.next_hearing_date), 'MMM dd, yyyy')
                            : '-'
                          }
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(hearing);
                            }}>
                              Edit Hearing
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              // TODO: Implement reschedule
                            }}>
                              Reschedule
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              // TODO: Implement notifications
                            }}>
                              Send Notifications
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                // TODO: Implement cancel
                              }}
                            >
                              Cancel Hearing
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Hearing Drawer */}
      <HearingDrawer
        hearing={selectedHearing || undefined}
        isOpen={drawerOpen}
        onOpenChange={setDrawerOpen}
        mode={drawerMode}
      />
    </div>
  );
};