import React from 'react';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ActionMatrixDisplay } from '@/components/qa/ActionMatrixDisplay';
import { QuickActionsPanel } from '@/components/qa/QuickActionsPanel';

export const QADashboard: React.FC = () => {
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
          <h1 className="text-3xl font-bold text-foreground">QA Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Quality Assurance tools and action verification
          </p>
        </div>
      </motion.div>

      {/* Main Content */}
      <Tabs defaultValue="matrix" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="matrix">Action Matrix</TabsTrigger>
          <TabsTrigger value="quick-actions">Quick Actions Test</TabsTrigger>
        </TabsList>

        <TabsContent value="matrix" className="mt-6">
          <ActionMatrixDisplay />
        </TabsContent>

        <TabsContent value="quick-actions" className="mt-6">
          <QuickActionsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
};