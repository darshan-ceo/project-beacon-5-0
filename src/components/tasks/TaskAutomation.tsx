// Temporary simplified TaskAutomation to fix build errors
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const TaskAutomation: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Task Automation</CardTitle>
      </CardHeader>
      <CardContent>
        <Badge variant="outline">Component temporarily disabled for storage migration</Badge>
        <p className="text-sm text-muted-foreground mt-2">
          This component is being updated to use the new unified storage architecture.
        </p>
      </CardContent>
    </Card>
  );
};