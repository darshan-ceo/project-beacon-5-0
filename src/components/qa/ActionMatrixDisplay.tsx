import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, Eye, CheckCircle, AlertTriangle, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  actionMatrix, 
  downloadActionMatrix, 
  generateActionMatrixReport,
  toggleActionLogging 
} from '@/utils/actionMatrix';
import { toast } from '@/hooks/use-toast';

export const ActionMatrixDisplay: React.FC = () => {
  const [loggingEnabled, setLoggingEnabled] = useState(true);

  const statusCounts = actionMatrix.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OK': return 'bg-success text-success-foreground';
      case 'TOAST_ONLY': return 'bg-warning text-warning-foreground';
      case 'MISSING_HANDLER': return 'bg-destructive text-destructive-foreground';
      case 'BROKEN_SERVICE': return 'bg-secondary text-secondary-foreground';
      case 'VALIDATION_ONLY': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'OK': return <CheckCircle className="h-4 w-4" />;
      case 'TOAST_ONLY': return <AlertTriangle className="h-4 w-4" />;
      case 'MISSING_HANDLER': return <X className="h-4 w-4" />;
      case 'BROKEN_SERVICE': return <X className="h-4 w-4" />;
      case 'VALIDATION_ONLY': return <Eye className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const downloadReport = () => {
    const report = generateActionMatrixReport();
    const blob = new Blob([report], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `QA-Fix-Report-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Report Downloaded",
      description: "QA Fix Report has been saved to your downloads",
    });
  };

  const handleToggleLogging = () => {
    const newState = !loggingEnabled;
    setLoggingEnabled(newState);
    toggleActionLogging(newState);
    toast({
      title: `Action Logging ${newState ? 'Enabled' : 'Disabled'}`,
      description: `Console logging is now ${newState ? 'active' : 'suppressed'}`,
    });
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
          <h1 className="text-3xl font-bold text-foreground">QA Action Matrix</h1>
          <p className="text-muted-foreground mt-2">
            Comprehensive audit of all UI actions across the application
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={handleToggleLogging}
          >
            {loggingEnabled ? 'Disable' : 'Enable'} Logging
          </Button>
          <Button 
            variant="outline"
            onClick={downloadActionMatrix}
          >
            <Download className="mr-2 h-4 w-4" />
            Export Matrix JSON
          </Button>
          <Button 
            onClick={downloadReport}
          >
            <Download className="mr-2 h-4 w-4" />
            Download Report
          </Button>
        </div>
      </motion.div>

      {/* Summary Stats */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-5 gap-6"
      >
        {Object.entries(statusCounts).map(([status, count]) => (
          <Card key={status}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{status.replace('_', ' ')}</p>
                  <p className="text-2xl font-bold text-foreground">{count}</p>
                </div>
                <Badge variant="secondary" className={getStatusColor(status)}>
                  {getStatusIcon(status)}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Action Matrix Table */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="all">All ({actionMatrix.length})</TabsTrigger>
          <TabsTrigger value="OK">OK ({statusCounts.OK || 0})</TabsTrigger>
          <TabsTrigger value="TOAST_ONLY">Toast Only ({statusCounts.TOAST_ONLY || 0})</TabsTrigger>
          <TabsTrigger value="MISSING_HANDLER">Missing ({statusCounts.MISSING_HANDLER || 0})</TabsTrigger>
          <TabsTrigger value="BROKEN_SERVICE">Broken ({statusCounts.BROKEN_SERVICE || 0})</TabsTrigger>
          <TabsTrigger value="VALIDATION_ONLY">Validation ({statusCounts.VALIDATION_ONLY || 0})</TabsTrigger>
        </TabsList>

        {['all', 'OK', 'TOAST_ONLY', 'MISSING_HANDLER', 'BROKEN_SERVICE', 'VALIDATION_ONLY'].map((tab) => (
          <TabsContent key={tab} value={tab} className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Action Matrix - {tab === 'all' ? 'All Actions' : tab.replace('_', ' ')}</CardTitle>
                <CardDescription>
                  Detailed breakdown of UI actions and their current implementation status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {actionMatrix
                    .filter(item => tab === 'all' || item.status === tab)
                    .map((item, index) => (
                      <motion.div
                        key={`${item.screen}-${item.element}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        className="flex items-start justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium text-foreground">{item.screen}</h4>
                            <span className="text-muted-foreground">→</span>
                            <span className="text-sm font-medium">{item.element}</span>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-muted-foreground">
                            <div>
                              <span className="font-medium">Component:</span> {item.component}
                            </div>
                            <div>
                              <span className="font-medium">Service:</span> {item.service}
                            </div>
                            <div>
                              <span className="font-medium">Expected:</span> {item.expected_result}
                            </div>
                          </div>
                          
                          {item.payload_keys.length > 0 && (
                            <div className="text-sm text-muted-foreground">
                              <span className="font-medium">Payload Keys:</span> {item.payload_keys.join(', ')}
                            </div>
                          )}
                          
                          {item.notes && (
                            <div className="text-sm text-muted-foreground">
                              <span className="font-medium">Notes:</span> {item.notes}
                            </div>
                          )}
                        </div>
                        
                        <Badge variant="secondary" className={getStatusColor(item.status)}>
                          {getStatusIcon(item.status)}
                          <span className="ml-1">{item.status.replace('_', ' ')}</span>
                        </Badge>
                      </motion.div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};