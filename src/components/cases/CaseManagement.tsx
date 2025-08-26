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

interface Case {
  id: string;
  caseNumber: string;
  title: string;
  client: string;
  currentStage: 'Scrutiny' | 'Demand' | 'Adjudication' | 'Appeals' | 'GSTAT' | 'HC' | 'SC';
  priority: 'High' | 'Medium' | 'Low';
  slaStatus: 'Green' | 'Amber' | 'Red';
  nextHearing?: {
    date: string;
    court: string;
    type: 'Adjourned' | 'Final' | 'Argued';
  };
  assignedTo: string;
  createdDate: string;
  lastUpdated: string;
  documents: number;
  progress: number;
}

const mockCases: Case[] = [
  {
    id: '1',
    caseNumber: 'CASE-2024-001',
    title: 'Tax Assessment Appeal - Acme Corp',
    client: 'Acme Corporation Ltd',
    currentStage: 'Adjudication',
    priority: 'High',
    slaStatus: 'Red',
    nextHearing: {
      date: '2024-02-15',
      court: 'Income Tax Appellate Tribunal',
      type: 'Final'
    },
    assignedTo: 'John Smith',
    createdDate: '2024-01-10',
    lastUpdated: '2024-01-20',
    documents: 15,
    progress: 65
  },
  {
    id: '2',
    caseNumber: 'CASE-2024-002',
    title: 'GST Demand Notice Challenge',
    client: 'Global Tech Solutions',
    currentStage: 'Demand',
    priority: 'Medium',
    slaStatus: 'Amber',
    assignedTo: 'Sarah Johnson',
    createdDate: '2024-01-15',
    lastUpdated: '2024-01-22',
    documents: 8,
    progress: 40
  },
  {
    id: '3',
    caseNumber: 'CASE-2024-003',
    title: 'Supreme Court Constitutional Matter',
    client: 'Metro Industries Pvt Ltd',
    currentStage: 'SC',
    priority: 'High',
    slaStatus: 'Green',
    nextHearing: {
      date: '2024-02-28',
      court: 'Supreme Court of India',
      type: 'Argued'
    },
    assignedTo: 'Mike Wilson',
    createdDate: '2023-12-01',
    lastUpdated: '2024-01-23',
    documents: 45,
    progress: 90
  }
];

export const CaseManagement: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

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
          onClick={() => {
            toast({
              title: "New Case",
              description: "Opening case creation form...",
            });
          }}
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
            onClick={() => {
              toast({
                title: "Hearing Calendar",
                description: "Opening hearing calendar...",
              });
            }}
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
            {mockCases.map((caseItem, index) => (
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
                            <p className="text-sm text-muted-foreground">{caseItem.caseNumber} • {caseItem.client}</p>
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
                              <span className="text-sm">{caseItem.assignedTo}</span>
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
                              <p className="text-xs text-muted-foreground">{caseItem.nextHearing.court}</p>
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
                                toast({
                                  title: "View Case",
                                  description: `Opening details for ${caseItem.caseNumber}`,
                                });
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                toast({
                                  title: "Edit Case",
                                  description: `Editing ${caseItem.caseNumber}`,
                                });
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
          <SLATracker cases={mockCases} />
        </TabsContent>

        <TabsContent value="hearings" className="mt-6">
          <HearingScheduler cases={mockCases} />
        </TabsContent>

        <TabsContent value="timeline" className="mt-6">
          <CaseTimeline selectedCase={selectedCase} />
        </TabsContent>
      </Tabs>
    </div>
  );
};