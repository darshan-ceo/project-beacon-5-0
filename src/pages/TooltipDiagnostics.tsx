import React from 'react';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  HelpCircle, 
  Target, 
  FileJson, 
  Eye,
  Activity
} from 'lucide-react';
import { TooltipCoveragePanel } from '@/components/qa/TooltipCoveragePanel';
import { TooltipTester } from '@/components/qa/TooltipTester';
import { TooltipJSONValidator } from '@/components/qa/TooltipJSONValidator';
import { TooltipA11yAuditor } from '@/components/qa/TooltipA11yAuditor';
import { ErrorBoundary } from '@/components/qa/ErrorBoundary';

export const TooltipDiagnostics: React.FC = () => {
  return (
    <ErrorBoundary>
      <div className="space-y-6">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <HelpCircle className="h-8 w-8" />
                Tooltip System Diagnostics
              </h1>
              <p className="text-muted-foreground mt-2">
                Comprehensive testing and validation for the three-layer UI help system
              </p>
            </div>
            <Badge variant="outline" className="text-sm px-3 py-1">
              <Activity className="h-3 w-3 mr-1" />
              Phase B Complete
            </Badge>
          </div>
        </motion.div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Coverage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Track</div>
              <p className="text-xs text-muted-foreground">Module implementation</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-primary" />
                Testing
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Preview</div>
              <p className="text-xs text-muted-foreground">Interactive tooltips</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileJson className="h-4 w-4 text-primary" />
                Validation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Validate</div>
              <p className="text-xs text-muted-foreground">JSON structure</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Eye className="h-4 w-4 text-primary" />
                Accessibility
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Audit</div>
              <p className="text-xs text-muted-foreground">WCAG compliance</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="coverage" className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 gap-1 p-1 h-auto">
            <TabsTrigger value="coverage" className="text-xs sm:text-sm py-2 px-3 whitespace-nowrap flex items-center gap-2">
              <Target className="h-4 w-4" />
              Coverage
            </TabsTrigger>
            <TabsTrigger value="tester" className="text-xs sm:text-sm py-2 px-3 whitespace-nowrap flex items-center gap-2">
              <HelpCircle className="h-4 w-4" />
              Tester
            </TabsTrigger>
            <TabsTrigger value="validator" className="text-xs sm:text-sm py-2 px-3 whitespace-nowrap flex items-center gap-2">
              <FileJson className="h-4 w-4" />
              Validator
            </TabsTrigger>
            <TabsTrigger value="a11y" className="text-xs sm:text-sm py-2 px-3 whitespace-nowrap flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Accessibility
            </TabsTrigger>
          </TabsList>

          <TabsContent value="coverage" className="mt-6">
            <TooltipCoveragePanel />
          </TabsContent>

          <TabsContent value="tester" className="mt-6">
            <TooltipTester />
          </TabsContent>

          <TabsContent value="validator" className="mt-6">
            <TooltipJSONValidator />
          </TabsContent>

          <TabsContent value="a11y" className="mt-6">
            <TooltipA11yAuditor />
          </TabsContent>
        </Tabs>

        {/* Implementation Guide */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">System Architecture</CardTitle>
            <CardDescription>
              Three-layer tooltip system implementation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3 p-3 bg-muted rounded-md">
                <Badge variant="outline" className="mt-0.5">1</Badge>
                <div>
                  <div className="font-medium">Label (Always Visible)</div>
                  <div className="text-xs text-muted-foreground">Primary button/field text shown at all times</div>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-3 bg-muted rounded-md">
                <Badge variant="outline" className="mt-0.5">2</Badge>
                <div>
                  <div className="font-medium">Visible Explanation (Always Shown)</div>
                  <div className="text-xs text-muted-foreground">Short contextual text displayed inline</div>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-3 bg-muted rounded-md">
                <Badge variant="outline" className="mt-0.5">3</Badge>
                <div>
                  <div className="font-medium">Tooltip (Hover/Focus)</div>
                  <div className="text-xs text-muted-foreground">Detailed help content shown on interaction</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ErrorBoundary>
  );
};
