import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, FolderOpen, FileText, Shield, Tag } from 'lucide-react';

export const OrganizationGuide: React.FC = () => {
  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-green-500" />
          <CardTitle className="text-lg">Document Organization Best Practices</CardTitle>
        </div>
        <CardDescription>
          Our improved system eliminates duplication and ensures proper organization
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              How It Works Now
            </h4>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-center gap-2">
                <FolderOpen className="h-3 w-3" />
                Documents must be uploaded to specific folders
              </li>
              <li className="flex items-center gap-2">
                <FileText className="h-3 w-3" />
                Duplicate detection prevents file conflicts
              </li>
              <li className="flex items-center gap-2">
                <Tag className="h-3 w-3" />
                Tags replace folder duplication for cross-referencing
              </li>
            </ul>
          </div>
          
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Folder Structure</h4>
            <div className="text-sm space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">Litigation Documents</Badge>
                <span className="text-muted-foreground">→ GSTAT, Appeals</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">Client Documents</Badge>
                <span className="text-muted-foreground">→ Organized by case</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">Internal Documents</Badge>
                <span className="text-muted-foreground">→ Templates, Research</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="pt-3 border-t">
          <p className="text-sm text-muted-foreground">
            <strong>No more confusion:</strong> Folders tab shows organized structure, All Documents tab shows comprehensive search results.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};