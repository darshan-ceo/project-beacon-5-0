import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Scale, 
  Calendar, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  FileText,
  User
} from 'lucide-react';
import { formatDateForDisplay } from '@/utils/dateFormatters';

interface Case {
  id: string;
  caseNumber: string;
  title: string;
  currentStage: string;
  priority: 'High' | 'Medium' | 'Low';
  timelineBreachStatus: 'Green' | 'Amber' | 'Red';
  nextHearing?: {
    date: string;
    courtId: string;
    judgeId: string;
    type: string;
  };
  assignedToName: string;
  createdDate: string;
  lastUpdated: string;
  documents: number;
  progress: number;
}

interface ClientCaseViewProps {
  cases: Case[];
  clientId: string;
}

export const ClientCaseView: React.FC<ClientCaseViewProps> = ({ cases, clientId }) => {
  const getTimelineStatusColor = (status: string) => {
    switch (status) {
      case 'Green': return 'bg-success text-success-foreground';
      case 'Amber': return 'bg-warning text-warning-foreground';
      case 'Red': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-muted';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'bg-destructive text-destructive-foreground';
      case 'Medium': return 'bg-warning text-warning-foreground';
      case 'Low': return 'bg-success text-success-foreground';
      default: return 'bg-muted';
    }
  };

  const getStageProgress = (stage: string) => {
    const stageMap: Record<string, number> = {
      'Assessment': 15,
      'Demand': 30,
      'Adjudication': 60,
      'Appeals': 80,
      'GSTAT': 90,
      'HC': 95,
      'SC': 100
    };
    return stageMap[stage] || 0;
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">Your Cases</h2>
        <span className="text-sm text-muted-foreground">
          {cases.length} total cases
        </span>
      </div>

      {cases.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Scale className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No Cases Found</h3>
            <p className="text-muted-foreground text-center">
              You don't have any cases yet. Please contact your legal team for assistance.
            </p>
          </CardContent>
        </Card>
      ) : (
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-4"
        >
          {cases.map((caseItem) => (
            <motion.div key={caseItem.id} variants={itemVariants}>
              <Card className="hover-lift">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <CardTitle className="flex items-center space-x-2">
                        <Scale className="h-5 w-5 text-primary" />
                        <span>{caseItem.caseNumber}</span>
                      </CardTitle>
                      <CardDescription className="text-base font-medium">
                        {caseItem.title}
                      </CardDescription>
                    </div>
                    <div className="flex space-x-2">
                      <Badge className={getTimelineStatusColor(caseItem.timelineBreachStatus)}>
                        {caseItem.timelineBreachStatus}
                      </Badge>
                      <Badge className={getPriorityColor(caseItem.priority)}>
                        {caseItem.priority}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Case Progress */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">
                        Current Stage: {caseItem.currentStage}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {getStageProgress(caseItem.currentStage)}% Complete
                      </span>
                    </div>
                    <Progress value={getStageProgress(caseItem.currentStage)} className="h-2" />
                  </div>

                  {/* Case Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Assigned to:</span>
                        <span className="text-sm font-medium text-foreground">
                          {caseItem.assignedToName}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Documents:</span>
                        <span className="text-sm font-medium text-foreground">
                          {caseItem.documents}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Created:</span>
                        <span className="text-sm font-medium text-foreground">
                          {formatDateForDisplay(caseItem.createdDate)}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Last Updated:</span>
                        <span className="text-sm font-medium text-foreground">
                          {formatDateForDisplay(caseItem.lastUpdated)}
                        </span>
                      </div>

                      {caseItem.nextHearing && (
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-warning" />
                          <span className="text-sm text-muted-foreground">Next Hearing:</span>
                          <span className="text-sm font-medium text-foreground">
                            {formatDateForDisplay(caseItem.nextHearing.date)}
                          </span>
                        </div>
                      )}

                      {caseItem.timelineBreachStatus === 'Red' && (
                        <div className="flex items-center space-x-2">
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                          <span className="text-sm text-destructive font-medium">
                            Urgent attention required
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-2 pt-2">
                    <Button variant="outline" size="sm">
                      <FileText className="mr-2 h-4 w-4" />
                      View Documents
                    </Button>
                    {caseItem.nextHearing && (
                      <Button variant="outline" size="sm">
                        <Calendar className="mr-2 h-4 w-4" />
                        Hearing Details
                      </Button>
                    )}
                    <Button variant="outline" size="sm">
                      <Clock className="mr-2 h-4 w-4" />
                      Case Timeline
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
};