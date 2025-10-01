import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CheckCircle, FolderOpen, FileText, Shield, Tag, ChevronDown, ChevronRight } from 'lucide-react';
import { uiStateService } from '@/services/uiStateService';

export const OrganizationGuide: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Load user preference from storage
  useEffect(() => {
    uiStateService.getExpandedState('document-organization-guide', false).then(expanded => {
      setIsExpanded(expanded);
    });
  }, []);

  // Save user preference to storage
  const handleToggle = (expanded: boolean) => {
    setIsExpanded(expanded);
    uiStateService.saveExpandedState('document-organization-guide', expanded);
  };

  return (
    <Collapsible
      open={isExpanded}
      onOpenChange={handleToggle}
      className="mb-6"
    >
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-green-500" />
                <CardTitle className="text-lg">Document Organization Best Practices</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-1"
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggle(!isExpanded);
                }}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </div>
            {!isExpanded && (
              <CardDescription>
                Click to view organization guidelines and folder structure
              </CardDescription>
            )}
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            <CardDescription className="mb-4">
              Our improved system eliminates duplication and ensures proper organization
            </CardDescription>
            
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
                    <span className="text-muted-foreground">→ GST Assessment, Appeals</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">Client Documents</Badge>
                    <span className="text-muted-foreground">→ Client Uploads (from portal)</span>
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
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};