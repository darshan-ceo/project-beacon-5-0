import React from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowRight, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  FileText,
  Scale,
  Building2,
  Gavel
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface Case {
  id: string;
  caseNumber: string;
  title: string;
  currentStage: 'Scrutiny' | 'Demand' | 'Adjudication' | 'Appeals' | 'GSTAT' | 'HC' | 'SC';
  slaStatus: 'Green' | 'Amber' | 'Red';
}

interface CaseLifecycleFlowProps {
  selectedCase?: Case | null;
}

const lifecycleStages = [
  {
    id: 'scrutiny',
    name: 'Scrutiny',
    description: 'Initial case review and documentation',
    icon: FileText,
    forms: ['ASMT-10', 'ASMT-11'],
    slaHours: 72
  },
  {
    id: 'demand',
    name: 'Demand',
    description: 'Demand notice processing and response',
    icon: AlertCircle,
    forms: ['DRC-01', 'DRC-07'],
    slaHours: 168
  },
  {
    id: 'adjudication',
    name: 'Adjudication',
    description: 'Adjudicating authority proceedings',
    icon: Scale,
    forms: ['ASMT-12'],
    slaHours: 720
  },
  {
    id: 'appeals',
    name: 'Appeals',
    description: 'First appellate authority',
    icon: ArrowRight,
    forms: ['Appeal Form'],
    slaHours: 1440
  },
  {
    id: 'gstat',
    name: 'GSTAT',
    description: 'GST Appellate Tribunal',
    icon: Building2,
    forms: ['GSTAT Form'],
    slaHours: 2160
  },
  {
    id: 'hc',
    name: 'HC',
    description: 'High Court proceedings',
    icon: Gavel,
    forms: ['HC Petition'],
    slaHours: 4320
  },
  {
    id: 'sc',
    name: 'SC',
    description: 'Supreme Court of India',
    icon: Gavel,
    forms: ['SLP/Appeal'],
    slaHours: 8760
  }
];

export const CaseLifecycleFlow: React.FC<CaseLifecycleFlowProps> = ({ selectedCase }) => {
  const getCurrentStageIndex = () => {
    if (!selectedCase) return 0;
    return lifecycleStages.findIndex(stage => 
      stage.name === selectedCase.currentStage
    );
  };

  const currentStageIndex = getCurrentStageIndex();

  const getStageStatus = (index: number) => {
    if (index < currentStageIndex) return 'completed';
    if (index === currentStageIndex) return 'current';
    return 'pending';
  };

  const getStageColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-success text-success-foreground';
      case 'current': return 'bg-primary text-primary-foreground';
      case 'pending': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Scale className="mr-2 h-5 w-5 text-primary" />
              Case Lifecycle Workflow
            </CardTitle>
            <CardDescription>
              {selectedCase ? 
                `Track progress for ${selectedCase.caseNumber} - ${selectedCase.title}` :
                'Select a case to view its lifecycle progression'
              }
            </CardDescription>
          </CardHeader>
          {selectedCase && (
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{selectedCase.title}</h3>
                  <p className="text-sm text-muted-foreground">{selectedCase.caseNumber}</p>
                </div>
                <div className="text-right">
                  <Badge variant="secondary" className={
                    selectedCase.slaStatus === 'Green' ? 'bg-success text-success-foreground' :
                    selectedCase.slaStatus === 'Amber' ? 'bg-warning text-warning-foreground' :
                    'bg-destructive text-destructive-foreground'
                  }>
                    SLA {selectedCase.slaStatus}
                  </Badge>
                  <p className="text-sm text-muted-foreground mt-1">
                    Stage {currentStageIndex + 1} of {lifecycleStages.length}
                  </p>
                </div>
              </div>
              <Progress value={((currentStageIndex + 1) / lifecycleStages.length) * 100} className="mt-4" />
            </CardContent>
          )}
        </Card>
      </motion.div>

      {/* Lifecycle Flow */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="grid grid-cols-1 lg:grid-cols-7 gap-4"
      >
        {lifecycleStages.map((stage, index) => {
          const status = getStageStatus(index);
          const StageIcon = stage.icon;
          
          return (
            <motion.div
              key={stage.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="relative"
            >
              {/* Connection Line */}
              {index < lifecycleStages.length - 1 && (
                <div className="hidden lg:block absolute top-12 right-0 w-full h-0.5 bg-border translate-x-1/2 z-0">
                  <div 
                    className={`h-full transition-all duration-500 ${
                      index < currentStageIndex ? 'bg-success' : 'bg-border'
                    }`}
                    style={{ width: index < currentStageIndex ? '100%' : '0%' }}
                  />
                </div>
              )}
              
              <Card className={`relative z-10 transition-all duration-300 ${
                status === 'current' ? 'ring-2 ring-primary shadow-lg' : ''
              } ${status === 'completed' ? 'bg-success/5' : ''}`}>
                <CardContent className="p-4">
                  <div className="text-center space-y-3">
                    {/* Stage Icon */}
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto transition-all duration-300 ${
                      getStageColor(status)
                    }`}>
                      {status === 'completed' ? (
                        <CheckCircle className="h-6 w-6" />
                      ) : status === 'current' ? (
                        <Clock className="h-6 w-6" />
                      ) : (
                        <StageIcon className="h-6 w-6" />
                      )}
                    </div>
                    
                    {/* Stage Details */}
                    <div>
                      <h3 className={`font-semibold ${
                        status === 'current' ? 'text-primary' : 
                        status === 'completed' ? 'text-success' : 
                        'text-muted-foreground'
                      }`}>
                        {stage.name}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {stage.description}
                      </p>
                    </div>
                    
                    {/* Forms and SLA */}
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-1 justify-center">
                        {stage.forms.map((form) => (
                          <Badge key={form} variant="outline" className="text-xs">
                            {form}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        SLA: {stage.slaHours}h
                      </p>
                    </div>
                    
                    {/* Action Button */}
                    {status === 'current' && (
                      <Button size="sm" className="w-full">
                        Manage Stage
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Stage Details */}
      {selectedCase && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Current Stage: {selectedCase.currentStage}</CardTitle>
              <CardDescription>
                Detailed information and required actions for the current stage
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h4 className="font-semibold mb-2">Required Forms</h4>
                  <div className="space-y-2">
                    {lifecycleStages[currentStageIndex]?.forms.map((form) => (
                      <div key={form} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                        <span className="text-sm">{form}</span>
                        <Badge variant="outline">Required</Badge>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">SLA Tracking</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Time Allocated:</span>
                      <span>{lifecycleStages[currentStageIndex]?.slaHours}h</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Time Elapsed:</span>
                      <span className="text-warning">48h</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Time Remaining:</span>
                      <span className="text-success">24h</span>
                    </div>
                    <Progress value={66} className="mt-2" />
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Next Actions</h4>
                  <div className="space-y-2">
                    <Button variant="outline" size="sm" className="w-full justify-start">
                      <FileText className="mr-2 h-4 w-4" />
                      Upload Response
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start">
                      <Clock className="mr-2 h-4 w-4" />
                      Schedule Hearing
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start">
                      <ArrowRight className="mr-2 h-4 w-4" />
                      Advance Stage
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
};