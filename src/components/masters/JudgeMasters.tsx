import React, { useState, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Scale, Clock, Phone, Mail, Search, Filter, Plus, Edit, Eye, Calendar, Upload, Download, List, LayoutGrid } from 'lucide-react';
import { JudgeModal } from '@/components/modals/JudgeModal';
import { UnifiedJudgeSearch } from '@/components/masters/UnifiedJudgeSearch';
import { ImportWizard } from '@/components/importExport/ImportWizard';
import { ExportWizard } from '@/components/importExport/ExportWizard';
import { Judge, useAppState } from '@/contexts/AppStateContext';
import { judgesService } from '@/services/judgesService';
import { useRBAC } from '@/hooks/useAdvancedRBAC';
import { featureFlagService } from '@/services/featureFlagService';
import { JudgeForm } from '@/components/masters/judges/JudgeForm';
import { FilterDropdown } from '@/components/ui/filter-dropdown';
import { useImportRefresh } from '@/hooks/useImportRefresh';
import { uiStateService } from '@/services/UIStateService';

const JudgeMasters: React.FC = () => {
  const { state, dispatch } = useAppState();
  const { hasPermission } = useRBAC();
  const { reloadJudges } = useImportRefresh();
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'card'>('list');
  const [judgeModal, setJudgeModal] = useState<{ isOpen: boolean; mode: 'create' | 'edit' | 'view'; judge?: Judge | null }>({
    isOpen: false,
    mode: 'create',
    judge: null
  });
  const [filterCourt, setFilterCourt] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDesignation, setFilterDesignation] = useState<string>('all');
  const [importWizardOpen, setImportWizardOpen] = useState(false);
  const [exportWizardOpen, setExportWizardOpen] = useState(false);

  // Load persisted view mode
  useEffect(() => {
    uiStateService.getViewMode('judge-masters', 'list').then(mode => {
      setViewMode(mode as 'list' | 'card');
    });
  }, []);

  const handleViewModeChange = (mode: 'list' | 'card') => {
    setViewMode(mode);
    uiStateService.saveViewMode('judge-masters', mode);
  };

  const getCourtName = (courtId: string) => {
    return state.courts.find(c => c.id === courtId)?.name || 'Unknown Court';
  };

  // Filter judges based on search and filters
  const filteredJudges = state.judges.filter(judge => {
    const courtName = getCourtName(judge.courtId);
    const matchesSearch = judge.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         judge.designation.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         courtName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCourt = filterCourt === 'all' || courtName === filterCourt;
    const matchesStatus = filterStatus === 'all' || judge.status === filterStatus;
    const matchesDesignation = filterDesignation === 'all' || judge.designation === filterDesignation;
    
    return matchesSearch && matchesCourt && matchesStatus && matchesDesignation;
  });

  const calculateYearsOfService = (appointmentDate: string) => {
    if (!appointmentDate) return 0;
    const now = new Date();
    const appointment = new Date(appointmentDate);
    return Math.floor((now.getTime() - appointment.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-success text-success-foreground';
      case 'On Leave': return 'bg-warning text-warning-foreground';
      case 'Retired': return 'bg-muted text-muted-foreground';
      case 'Transferred': return 'bg-info text-info-foreground';
      case 'Deceased': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const handleJudgeAction = (judge: Judge, action: 'view' | 'edit') => {
    setJudgeModal({
      isOpen: true,
      mode: action,
      judge: judge
    });
  };

  const handleAddJudge = () => {
    setJudgeModal({
      isOpen: true,
      mode: 'create',
      judge: null
    });
  };

  const uniqueCourts = Array.from(
    new Set(state.judges.map(judge => getCourtName(judge.courtId)))
  );

  const uniqueDesignations = Array.from(
    new Set(state.judges.map(judge => judge.designation))
  );

  const uniqueSpecializations = Array.from(
    new Set(state.judges.flatMap(judge => judge.specialization || []))
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-6 w-6" />
                Judges Master
              </CardTitle>
              <CardDescription>
                Manage judge information, specializations, and court assignments
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {featureFlagService.isEnabled('data_io_v1') && hasPermission('judges', 'write') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setImportWizardOpen(true)}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Import
                </Button>
              )}
              {featureFlagService.isEnabled('data_io_v1') && hasPermission('judges', 'write') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setExportWizardOpen(true)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              )}
              {hasPermission('judges', 'write') && (
                <Button
                  onClick={handleAddJudge}
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Judge
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <UnifiedJudgeSearch
              searchTerm={searchTerm}
              onSearchTermChange={setSearchTerm}
              activeFilters={{
                ...(filterCourt !== 'all' && { legalForum: filterCourt }),
                ...(filterStatus !== 'all' && { status: filterStatus }),
                ...(filterDesignation !== 'all' && { designation: filterDesignation })
              }}
              onFiltersChange={(filters) => {
                setFilterCourt(filters.legalForum || 'all');
                setFilterStatus(filters.status || 'all');
                setFilterDesignation(filters.designation || 'all');
              }}
              legalForums={uniqueCourts}
              designations={uniqueDesignations}
              specializations={uniqueSpecializations}
            />
          </div>

          {/* View Toggle */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleViewModeChange('list')}
                className="flex items-center gap-2"
              >
                <List className="h-4 w-4" />
                List View
              </Button>
              <Button
                variant={viewMode === 'card' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleViewModeChange('card')}
                className="flex items-center gap-2"
              >
                <LayoutGrid className="h-4 w-4" />
                Card View
              </Button>
            </div>
            <span className="text-sm text-muted-foreground">
              {filteredJudges.length} judges
            </span>
          </div>

          <div className="space-y-4">
            {/* List View */}
            {viewMode === 'list' && (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name & Designation</TableHead>
                      <TableHead>Legal Forum</TableHead>
                      <TableHead className="hidden md:table-cell">Bench</TableHead>
                      <TableHead className="hidden lg:table-cell">Contact</TableHead>
                      <TableHead className="hidden lg:table-cell">Specializations</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredJudges.map((judge) => (
                      <TableRow 
                        key={judge.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setJudgeModal({ 
                          isOpen: true, 
                          mode: hasPermission('judges', 'write') ? 'edit' : 'view', 
                          judge 
                        })}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>
                                <User className="h-4 w-4" />
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{judge.name}</p>
                              <p className="text-xs text-muted-foreground">{judge.designation}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{getCourtName(judge.courtId)}</TableCell>
                        <TableCell className="hidden md:table-cell">{judge.bench || '-'}</TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <div className="text-sm space-y-1">
                            {judge.email && (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Mail className="h-3 w-3" />
                                <span className="truncate max-w-[150px]">{judge.email}</span>
                              </div>
                            )}
                            {judge.phone && (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Phone className="h-3 w-3" />
                                <span>{judge.phone}</span>
                              </div>
                            )}
                            {!judge.email && !judge.phone && <span className="text-muted-foreground">-</span>}
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <div className="flex flex-wrap gap-1">
                            {judge.specialization?.slice(0, 2).map(spec => (
                              <Badge key={spec} variant="outline" className="text-xs">
                                {spec}
                              </Badge>
                            ))}
                            {(judge.specialization?.length || 0) > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{judge.specialization!.length - 2}
                              </Badge>
                            )}
                            {(!judge.specialization || judge.specialization.length === 0) && (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(judge.status)}>{judge.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => handleJudgeAction(judge, 'view')}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            {hasPermission('judges', 'write') && (
                              <Button variant="ghost" size="sm" onClick={() => handleJudgeAction(judge, 'edit')}>
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Card View */}
            {viewMode === 'card' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredJudges.map((judge, index) => (
                  <motion.div
                    key={judge.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-card border rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src="" alt={judge.name} />
                          <AvatarFallback>
                            <User className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-medium text-sm">{judge.name}</h3>
                          <p className="text-xs text-muted-foreground">{judge.designation}</p>
                        </div>
                      </div>
                      <Badge variant="secondary" className={getStatusColor(judge.status)}>
                        {judge.status}
                      </Badge>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex items-center gap-2">
                        <Scale className="h-3 w-3 text-muted-foreground" />
                        <span className="truncate">{getCourtName(judge.courtId)}</span>
                      </div>
                      {judge.bench && (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span className="truncate">{judge.bench}</span>
                        </div>
                      )}
                      {judge.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          <span className="truncate">{judge.email}</span>
                        </div>
                      )}
                      {judge.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          <span className="truncate">{judge.phone}</span>
                        </div>
                      )}
                      {judge.specialization && judge.specialization.length > 0 && (
                        <div>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {judge.specialization.slice(0, 2).map(spec => (
                              <Badge key={spec} variant="outline" className="text-xs">
                                {spec}
                              </Badge>
                            ))}
                            {judge.specialization.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{judge.specialization.length - 2} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 mt-4 pt-3 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleJudgeAction(judge, 'view')}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                      {hasPermission('judges', 'write') && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleJudgeAction(judge, 'edit')}
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {filteredJudges.length === 0 && (
            <div className="text-center py-8">
              <Scale className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">No judges found</h3>
              <p className="text-sm text-muted-foreground">
                {searchTerm || filterCourt !== 'all' || filterStatus !== 'all' || filterDesignation !== 'all'
                  ? 'Try adjusting your search criteria'
                  : 'Get started by adding your first judge'
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <JudgeModal
        isOpen={judgeModal.isOpen}
        onClose={() => setJudgeModal({ isOpen: false, mode: 'create', judge: null })}
        judge={judgeModal.judge}
        mode={judgeModal.mode}
      />

      <ImportWizard
        isOpen={importWizardOpen}
        onClose={() => setImportWizardOpen(false)}
        entityType="judge"
        onImportComplete={async (job) => {
          console.log('Judge import completed:', job);
          if (job.counts.processed > 0) {
            await reloadJudges();
            toast({
              title: 'Import Complete',
              description: `${job.counts.processed} judges imported successfully`,
            });
          }
        }}
      />

      <ExportWizard
        isOpen={exportWizardOpen}
        onClose={() => setExportWizardOpen(false)}
        entityType="judge"
      />
    </motion.div>
  );
};

export default JudgeMasters;
