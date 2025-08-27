import React, { useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { 
  Scale, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Calendar,
  Users,
  FileText,
  ArrowRight,
  Plus,
  Filter,
  Search,
  Eye,
  Edit
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CaseLifecycleFlow } from './CaseLifecycleFlow';
import { CaseTimeline } from './CaseTimeline';
import { HearingScheduler } from './HearingScheduler';
import { SLATracker } from './SLATracker';
import { CaseModal } from '@/components/modals/CaseModal';
import { HearingCalendar } from './HearingCalendar';
import { Case, useAppState } from '@/contexts/AppStateContext';

export const CaseManagement: React.FC = () => {
  const { state } = useAppState();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [caseModal, setCaseModal] = useState<{ isOpen: boolean; mode: 'create' | 'edit' | 'view'; case?: Case | null }>({
    isOpen: false,
    mode: 'create',
    case: null
  });
  const [hearingCalendarOpen, setHearingCalendarOpen] = useState(false);

  const getSLAColor = (status: string) => {
    switch (status) {
      case 'Green': return 'bg-success text-success-foreground';
      case 'Amber': return 'bg-warning text-warning-foreground';
      case 'Red': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'bg-destructive text-destructive-foreground';
      case 'Medium': return 'bg-warning text-warning-foreground';
      case 'Low': return 'bg-success text-success-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStageProgress = (stage: string) => {
    const stages = ['Scrutiny', 'Demand', 'Adjudication', 'Appeals', 'GSTAT', 'HC', 'SC'];
    return ((stages.indexOf(stage) + 1) / stages.length) * 100;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex justify-between items-center"
      >
        <div>
          <h1 className="text-3xl font-bold text-foreground">Case Management</h1>
          <p className="text-muted-foreground mt-2">
            Comprehensive case lifecycle with SLA tracking and hearing management
          </p>
        </div>
        <Button 
          className="bg-primary hover:bg-primary-hover"
          onClick={() => setCaseModal({ isOpen: true, mode: 'create', case: null })}
        >
          <Plus className="mr-2 h-4 w-4" />
          New Case
        </Button>
      </motion.div>

      {/* Key Metrics */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-6"
      >
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Cases</p>
                <p className="text-2xl font-bold text-foreground">156</p>
                <p className="text-xs text-success mt-1">+12 this month</p>
              </div>
              <Scale className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">SLA Breaches</p>
                <p className="text-2xl font-bold text-destructive">8</p>
                <p className="text-xs text-destructive mt-1">Needs attention</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Upcoming Hearings</p>
                <p className="text-2xl font-bold text-foreground">23</p>
                <p className="text-xs text-warning mt-1">Next 7 days</p>
              </div>
              <Calendar className="h-8 w-8 text-secondary" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completed Cases</p>
                <p className="text-2xl font-bold text-foreground">342</p>
                <p className="text-xs text-success mt-1">This year</p>
              </div>
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Search and Filters */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="flex flex-col sm:flex-row gap-4 items-center justify-between"
      >
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search cases by number, title, or client..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => {
              toast({
                title: "Filter",
                description: "Opening filter options...",
              });
            }}
          >
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
          <Button 
            variant="outline"
            onClick={() => setHearingCalendarOpen(true)}
          >
            <Calendar className="mr-2 h-4 w-4" />
            Hearing Calendar
          </Button>
        </div>
      </motion.div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="lifecycle">Lifecycle</TabsTrigger>
          <TabsTrigger value="sla">SLA Tracker</TabsTrigger>
          <TabsTrigger value="hearings">Hearings</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {state.cases.map((caseItem, index) => (
              <motion.div
                key={caseItem.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <Card className="hover-lift cursor-pointer" onClick={() => setSelectedCase(caseItem)}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-lg font-semibold text-foreground">{caseItem.title}</h3>
                            <p className="text-sm text-muted-foreground">{caseItem.caseNumber} • {state.clients.find(c => c.id === caseItem.clientId)?.name || 'Unknown Client'}</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant="secondary" className={getPriorityColor(caseItem.priority)}>
                              {caseItem.priority} Priority
                            </Badge>
                            <Badge variant="secondary" className={getSLAColor(caseItem.slaStatus)}>
                              SLA {caseItem.slaStatus}
                            </Badge>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground">Current Stage</p>
                            <p className="font-medium">{caseItem.currentStage}</p>
                            <Progress value={getStageProgress(caseItem.currentStage)} className="mt-1 h-2" />
                          </div>
                          
                          <div>
                            <p className="text-xs text-muted-foreground">Assigned To</p>
                            <div className="flex items-center">
                              <Users className="mr-1 h-3 w-3" />
                              <span className="text-sm">{caseItem.assignedToName}</span>
                            </div>
                          </div>
                          
                          <div>
                            <p className="text-xs text-muted-foreground">Documents</p>
                            <div className="flex items-center">
                              <FileText className="mr-1 h-3 w-3" />
                              <span className="text-sm">{caseItem.documents} files</span>
                            </div>
                          </div>
                          
                          {caseItem.nextHearing && (
                            <div>
                              <p className="text-xs text-muted-foreground">Next Hearing</p>
                              <p className="text-sm font-medium">{caseItem.nextHearing.date}</p>
                              <p className="text-xs text-muted-foreground">{state.courts.find(c => c.id === caseItem.nextHearing?.courtId)?.name || 'Unknown Court'}</p>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-border">
                          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                            <span>Created: {caseItem.createdDate}</span>
                            <span>•</span>
                            <span>Updated: {caseItem.lastUpdated}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCaseModal({ isOpen: true, mode: 'view', case: caseItem });
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCaseModal({ isOpen: true, mode: 'edit', case: caseItem });
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </TabsContent>

        <TabsContent value="lifecycle" className="mt-6">
          <CaseLifecycleFlow selectedCase={selectedCase} />
        </TabsContent>

        <TabsContent value="sla" className="mt-6">
          <SLATracker cases={state.cases.map(c => ({ ...c, client: state.clients.find(cl => cl.id === c.clientId)?.name || 'Unknown' }))} />
        </TabsContent>

        <TabsContent value="hearings" className="mt-6">
          <HearingScheduler cases={state.cases.map(c => ({ ...c, client: state.clients.find(cl => cl.id === c.clientId)?.name || 'Unknown' }))} />
        </TabsContent>

        <TabsContent value="timeline" className="mt-6">
          <CaseTimeline selectedCase={selectedCase} />
        </TabsContent>
      </Tabs>

      <CaseModal
        isOpen={caseModal.isOpen}
        onClose={() => setCaseModal({ isOpen: false, mode: 'create', case: null })}
        case={caseModal.case}
        mode={caseModal.mode}
      />

      <HearingCalendar
        isOpen={hearingCalendarOpen}
        onClose={() => setHearingCalendarOpen(false)}
      />
    </div>
  );
};