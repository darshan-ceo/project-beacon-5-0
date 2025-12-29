import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Scale, 
  Calendar, 
  FileText
} from 'lucide-react';

interface Case {
  id: string;
  case_number: string;
  title: string;
  status: string;
  client_id: string;
}

interface ClientCaseViewProps {
  cases: Case[];
  clientId: string;
  onViewDocuments?: (caseId: string) => void;
  onCaseTimeline?: (caseId: string) => void;
}

export const ClientCaseView: React.FC<ClientCaseViewProps> = ({ cases, clientId, onViewDocuments, onCaseTimeline }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Open':
      case 'Active': return 'bg-success text-success-foreground';
      case 'Pending': return 'bg-warning text-warning-foreground';
      case 'Closed': return 'bg-muted text-muted-foreground';
      default: return 'bg-primary text-primary-foreground';
    }
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
                        <span>{caseItem.case_number}</span>
                      </CardTitle>
                      <CardDescription className="text-base font-medium">
                        {caseItem.title}
                      </CardDescription>
                    </div>
                    <Badge className={getStatusColor(caseItem.status)}>
                      {caseItem.status}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="flex space-x-2 pt-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => onViewDocuments?.(caseItem.id)}
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      View Documents
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => onCaseTimeline?.(caseItem.id)}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
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