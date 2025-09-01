import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Save, Star, Trash2, Calendar, X, Plus } from 'lucide-react';
import { toast } from 'sonner';

import { ReportType, ReportFilter, SavedView } from '@/types/reports';

interface SavedViewsManagerProps {
  activeReportType: ReportType;
  currentFilters: ReportFilter;
  onViewLoad: (filters: ReportFilter) => void;
  onClose: () => void;
}

// Mock saved views for demonstration
const mockSavedViews: SavedView[] = [
  {
    id: '1',
    name: 'Partner Weekly SLA',
    description: 'Weekly SLA compliance report for partners',
    reportType: 'sla-compliance',
    filters: {
      dateRange: { start: '2024-08-01', end: '2024-08-31' },
      ragStatus: 'Red'
    },
    userId: 'user1',
    isDefault: true,
    createdAt: '2024-08-01T00:00:00Z'
  },
  {
    id: '2',
    name: 'High Priority Cases',
    description: 'All high priority cases in progress',
    reportType: 'case-reports',
    filters: {
      priority: 'high',
      stage: 'arguments'
    },
    userId: 'user1',
    isDefault: false,
    createdAt: '2024-07-15T00:00:00Z'
  },
  {
    id: '3',
    name: 'Next Week Hearings',
    description: 'Upcoming hearings for next 7 days',
    reportType: 'hearings',
    filters: {
      dateRange: { 
        start: new Date().toISOString().split('T')[0],
        end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      }
    },
    userId: 'user1',
    isDefault: false,
    createdAt: '2024-08-15T00:00:00Z'
  }
];

export const SavedViewsManager: React.FC<SavedViewsManagerProps> = ({
  activeReportType,
  currentFilters,
  onViewLoad,
  onClose
}) => {
  const [savedViews, setSavedViews] = useState<SavedView[]>(mockSavedViews);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newViewName, setNewViewName] = useState('');
  const [newViewDescription, setNewViewDescription] = useState('');

  const filteredViews = savedViews.filter(view => view.reportType === activeReportType);

  const handleSaveView = () => {
    if (!newViewName.trim()) {
      toast.error('Please enter a name for the saved view');
      return;
    }

    const newView: SavedView = {
      id: Date.now().toString(),
      name: newViewName.trim(),
      description: newViewDescription.trim(),
      reportType: activeReportType,
      filters: currentFilters,
      userId: 'current-user',
      isDefault: false,
      createdAt: new Date().toISOString()
    };

    setSavedViews(prev => [...prev, newView]);
    setNewViewName('');
    setNewViewDescription('');
    setShowSaveDialog(false);
    toast.success('View saved successfully');
  };

  const handleDeleteView = (viewId: string) => {
    setSavedViews(prev => prev.filter(view => view.id !== viewId));
    toast.success('View deleted successfully');
  };

  const handleSetDefault = (viewId: string) => {
    setSavedViews(prev => prev.map(view => ({
      ...view,
      isDefault: view.id === viewId && view.reportType === activeReportType
    })));
    toast.success('Default view updated');
  };

  const getFilterSummary = (filters: ReportFilter): string => {
    const parts: string[] = [];
    
    if (filters.dateRange) {
      parts.push(`Date: ${filters.dateRange.start} to ${filters.dateRange.end}`);
    }
    if (filters.clientId) parts.push(`Client: ${filters.clientId}`);
    if (filters.stage) parts.push(`Stage: ${filters.stage}`);
    if (filters.priority) parts.push(`Priority: ${filters.priority}`);
    if (filters.ragStatus) parts.push(`RAG: ${filters.ragStatus}`);
    if (filters.status) parts.push(`Status: ${filters.status}`);
    if (filters.channel) parts.push(`Channel: ${filters.channel}`);
    
    return parts.length > 0 ? parts.join(', ') : 'No filters applied';
  };

  const hasCurrentFilters = Object.keys(currentFilters).length > 0;

  return (
    <Card className="m-4 shadow-lg border-2">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Saved Views</CardTitle>
            <CardDescription>
              Manage your saved filter combinations for {activeReportType.replace('-', ' ')} reports
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Save Current Filters */}
        {hasCurrentFilters && (
          <div className="border border-primary/20 rounded-lg p-4 bg-primary/5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h4 className="font-medium text-foreground mb-1">Current Filters</h4>
                <p className="text-sm text-muted-foreground">{getFilterSummary(currentFilters)}</p>
              </div>
              <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Save className="h-4 w-4 mr-2" />
                    Save View
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Save Current View</DialogTitle>
                    <DialogDescription>
                      Save your current filters as a reusable view for quick access later.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="view-name">View Name</Label>
                      <Input
                        id="view-name"
                        placeholder="e.g., Weekly High Priority Cases"
                        value={newViewName}
                        onChange={(e) => setNewViewName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="view-description">Description (Optional)</Label>
                      <Textarea
                        id="view-description"
                        placeholder="Brief description of this view..."
                        value={newViewDescription}
                        onChange={(e) => setNewViewDescription(e.target.value)}
                      />
                    </div>
                    <div className="bg-muted rounded-lg p-3">
                      <p className="text-sm font-medium mb-1">Current Filters:</p>
                      <p className="text-sm text-muted-foreground">{getFilterSummary(currentFilters)}</p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSaveView}>
                      <Save className="h-4 w-4 mr-2" />
                      Save View
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        )}

        <Separator />

        {/* Saved Views List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-foreground">
              Saved Views ({filteredViews.length})
            </h4>
          </div>

          {filteredViews.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Plus className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No saved views for this report type</p>
              <p className="text-sm">Apply some filters and save them as a view</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {filteredViews.map((view) => (
                <div
                  key={view.id}
                  className="border rounded-lg p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h5 className="font-medium text-foreground truncate">{view.name}</h5>
                        {view.isDefault && (
                          <Badge variant="secondary" className="text-xs">
                            <Star className="h-3 w-3 mr-1" />
                            Default
                          </Badge>
                        )}
                      </div>
                      {view.description && (
                        <p className="text-sm text-muted-foreground mb-2">{view.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {getFilterSummary(view.filters)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Created: {new Date(view.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          onViewLoad(view.filters);
                          toast.success(`Loaded view: ${view.name}`);
                        }}
                      >
                        Load
                      </Button>
                      <div className="flex gap-1">
                        {!view.isDefault && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSetDefault(view.id)}
                            className="h-auto p-1"
                          >
                            <Star className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteView(view.id)}
                          className="h-auto p-1 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <Separator />
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Close
          </Button>
          {filteredViews.some(v => v.isDefault) && (
            <Button
              variant="outline"
              onClick={() => {
                const defaultView = filteredViews.find(v => v.isDefault);
                if (defaultView) {
                  onViewLoad(defaultView.filters);
                  toast.success('Loaded default view');
                }
              }}
            >
              Load Default
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};